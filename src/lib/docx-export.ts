import { getTimeLabel } from "./lesson-slots";
import type { Lesson } from "./schedule-store";

export type ScheduleDocxExportOptions = {
  groups: string[];
  startDate: string;
  endDate: string;
  title?: string;
};

type TextLine = {
  text: string;
  bold?: boolean;
};

type ZipEntry = {
  name: string;
  data: Uint8Array;
};

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const DAY_LABELS = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDate(value: string) {
  const date = parseIsoDate(value);
  if (!date) return value;
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function getDayLabel(value: string) {
  const date = parseIsoDate(value);
  return date ? DAY_LABELS[date.getDay()] : "Без даты";
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraph(line: TextLine, align: "left" | "center" = "left") {
  const jc = align === "center" ? '<w:jc w:val="center"/>' : "";
  const bold = line.bold ? "<w:rPr><w:b/></w:rPr>" : "";
  return `<w:p><w:pPr>${jc}</w:pPr><w:r>${bold}<w:t xml:space="preserve">${escapeXml(line.text)}</w:t></w:r></w:p>`;
}

function cell(
  lines: TextLine[],
  width: number,
  options: { shaded?: boolean; align?: "left" | "center" } = {},
) {
  const fill = options.shaded ? '<w:shd w:fill="D9EAF7"/>' : "";
  const content =
    lines.length > 0 ? lines.map((line) => paragraph(line, options.align)).join("") : "<w:p/>";
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${fill}<w:vAlign w:val="center"/></w:tcPr>${content}</w:tc>`;
}

function tableRow(cells: string[]) {
  return `<w:tr>${cells.join("")}</w:tr>`;
}

function sortLessons(a: Lesson, b: Lesson) {
  return (
    (a.date ?? "").localeCompare(b.date ?? "") ||
    a.time.localeCompare(b.time) ||
    a.group.localeCompare(b.group) ||
    a.subject.localeCompare(b.subject)
  );
}

function getSelectedLessons(lessons: Lesson[], options: ScheduleDocxExportOptions) {
  const groupSet = new Set(options.groups);
  return lessons
    .filter(
      (lesson) =>
        lesson.date &&
        lesson.date >= options.startDate &&
        lesson.date <= options.endDate &&
        groupSet.has(lesson.group),
    )
    .sort(sortLessons);
}

function getLessonLines(lessons: Lesson[]): TextLine[] {
  if (lessons.length === 0) return [{ text: "" }];

  return lessons.flatMap((lesson, index) => {
    const lines: TextLine[] = [
      { text: lesson.subject, bold: true },
      { text: lesson.teacher },
      { text: `Кабинет: ${lesson.room || "-"}` },
    ];

    if (index < lessons.length - 1) lines.push({ text: "" });
    return lines;
  });
}

function buildRows(lessons: Lesson[], groups: string[]) {
  const byRow = new Map<string, Map<string, Lesson[]>>();

  for (const lesson of lessons) {
    if (!lesson.date) continue;
    const key = `${lesson.date}__${lesson.time}`;
    if (!byRow.has(key)) byRow.set(key, new Map());
    const row = byRow.get(key);
    if (!row) continue;
    row.set(lesson.group, [...(row.get(lesson.group) ?? []), lesson]);
  }

  return Array.from(byRow.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, groupLessons]) => {
      const [date, time] = key.split("__");
      const sample = lessons.find((lesson) => lesson.date === date && lesson.time === time);
      return {
        date,
        time,
        left: [
          { text: getDayLabel(date), bold: true },
          { text: formatDate(date) },
          {
            text: sample ? getTimeLabel(sample.time, sample.endTime, sample.durationMinutes) : time,
          },
        ] satisfies TextLine[],
        cells: groups.map((group) => getLessonLines(groupLessons.get(group) ?? [])),
      };
    });
}

function buildDocumentXml(lessons: Lesson[], options: ScheduleDocxExportOptions) {
  const title = options.title ?? "Расписание занятий";
  const groups = options.groups.slice(0, 4);
  const rows = buildRows(getSelectedLessons(lessons, { ...options, groups }), groups);
  const tableWidth = 15360;
  const leftWidth = 2600;
  const groupWidth = Math.floor((tableWidth - leftWidth) / Math.max(groups.length, 1));
  const grid = [leftWidth, ...groups.map(() => groupWidth)]
    .map((width) => `<w:gridCol w:w="${width}"/>`)
    .join("");

  const header = tableRow([
    cell([{ text: "День недели / дата / время", bold: true }], leftWidth, {
      shaded: true,
      align: "center",
    }),
    ...groups.map((group) =>
      cell([{ text: group, bold: true }, { text: "Кабинет указывается в занятии" }], groupWidth, {
        shaded: true,
        align: "center",
      }),
    ),
  ]);

  const bodyRows =
    rows.length > 0
      ? rows
          .map((row) =>
            tableRow([
              cell(row.left, leftWidth),
              ...row.cells.map((lines) => cell(lines, groupWidth)),
            ]),
          )
          .join("")
      : tableRow([
          cell(
            [
              { text: "Период", bold: true },
              { text: `${formatDate(options.startDate)} - ${formatDate(options.endDate)}` },
            ],
            leftWidth,
          ),
          ...groups.map(() => cell([{ text: "Занятий нет" }], groupWidth, { align: "center" })),
        ]);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${WORD_NS}" xmlns:r="${OFFICE_REL_NS}">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Title"/><w:jc w:val="center"/></w:pPr>
      <w:r><w:t>${escapeXml(title)}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:t>${escapeXml(`Период: ${formatDate(options.startDate)} - ${formatDate(options.endDate)}`)}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:t>${escapeXml(`Группы: ${groups.join(", ")}`)}</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="0" w:type="auto"/>
        <w:tblLook w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
      </w:tblPr>
      <w:tblGrid>${grid}</w:tblGrid>
      ${header}
      ${bodyRows}
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${WORD_NS}">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="9AA6B2"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="9AA6B2"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="9AA6B2"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="9AA6B2"/>
        <w:insideH w:val="single" w:sz="6" w:space="0" w:color="9AA6B2"/>
        <w:insideV w:val="single" w:sz="6" w:space="0" w:color="9AA6B2"/>
      </w:tblBorders>
    </w:tblPr>
  </w:style>
</w:styles>`;
}

function buildContentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
}

function buildRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${REL_NS}">
  <Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < table.length; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function writeString(value: string) {
  return new TextEncoder().encode(value);
}

function setUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function setUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function getDosDateTime() {
  const date = new Date();
  const dosTime =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function createZip(entries: ZipEntry[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const { dosTime, dosDate } = getDosDateTime();

  for (const entry of entries) {
    const name = writeString(entry.name);
    const checksum = crc32(entry.data);
    const localHeader = new Uint8Array(30 + name.length);
    const localView = new DataView(localHeader.buffer);

    setUint32(localView, 0, 0x04034b50);
    setUint16(localView, 4, 20);
    setUint16(localView, 6, 0x0800);
    setUint16(localView, 8, 0);
    setUint16(localView, 10, dosTime);
    setUint16(localView, 12, dosDate);
    setUint32(localView, 14, checksum);
    setUint32(localView, 18, entry.data.length);
    setUint32(localView, 22, entry.data.length);
    setUint16(localView, 26, name.length);
    setUint16(localView, 28, 0);
    localHeader.set(name, 30);

    const centralHeader = new Uint8Array(46 + name.length);
    const centralView = new DataView(centralHeader.buffer);
    setUint32(centralView, 0, 0x02014b50);
    setUint16(centralView, 4, 20);
    setUint16(centralView, 6, 20);
    setUint16(centralView, 8, 0x0800);
    setUint16(centralView, 10, 0);
    setUint16(centralView, 12, dosTime);
    setUint16(centralView, 14, dosDate);
    setUint32(centralView, 16, checksum);
    setUint32(centralView, 20, entry.data.length);
    setUint32(centralView, 24, entry.data.length);
    setUint16(centralView, 28, name.length);
    setUint16(centralView, 30, 0);
    setUint16(centralView, 32, 0);
    setUint16(centralView, 34, 0);
    setUint16(centralView, 36, 0);
    setUint32(centralView, 38, 0);
    setUint32(centralView, 42, offset);
    centralHeader.set(name, 46);

    localParts.push(localHeader, entry.data);
    centralParts.push(centralHeader);
    offset += localHeader.length + entry.data.length;
  }

  const centralDirectory = concat(centralParts);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  setUint32(endView, 0, 0x06054b50);
  setUint16(endView, 4, 0);
  setUint16(endView, 6, 0);
  setUint16(endView, 8, entries.length);
  setUint16(endView, 10, entries.length);
  setUint32(endView, 12, centralDirectory.length);
  setUint32(endView, 16, offset);
  setUint16(endView, 20, 0);

  return concat([...localParts, centralDirectory, endRecord]);
}

function xmlEntry(name: string, content: string): ZipEntry {
  return { name, data: writeString(content) };
}

export function buildScheduleDocx(lessons: Lesson[], options: ScheduleDocxExportOptions) {
  const groups = Array.from(
    new Set(options.groups.map((group) => group.trim()).filter(Boolean)),
  ).slice(0, 4);
  if (groups.length === 0) throw new Error("Выберите хотя бы одну группу.");
  if (!options.startDate || !options.endDate) throw new Error("Выберите период расписания.");
  if (options.startDate > options.endDate) {
    throw new Error("Дата начала не может быть позже даты окончания.");
  }

  const zip = createZip([
    xmlEntry("[Content_Types].xml", buildContentTypesXml()),
    xmlEntry("_rels/.rels", buildRelsXml()),
    xmlEntry("word/document.xml", buildDocumentXml(lessons, { ...options, groups })),
    xmlEntry("word/styles.xml", buildStylesXml()),
  ]);

  return new Blob([zip], { type: DOCX_MIME });
}

export function downloadScheduleDocx(lessons: Lesson[], options: ScheduleDocxExportOptions) {
  const blob = buildScheduleDocx(lessons, options);
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `schedule-${options.startDate}-${options.endDate}.docx`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
