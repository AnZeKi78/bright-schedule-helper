import * as XLSX from "xlsx";
import type { DayKey, Lesson } from "./schedule-store";

/** Нормализует название дня недели в DayKey */
function normalizeDay(s: string): DayKey | null {
  const v = String(s).toLowerCase().trim();
  if (/^(пн|понедельник|mon|dü|дүйсенбі)/.test(v)) return "mon";
  if (/^(вт|вторник|tue|сейсенбі)/.test(v)) return "tue";
  if (/^(ср|среда|wed|сәрсенбі)/.test(v)) return "wed";
  if (/^(чт|четверг|thu|бейсенбі)/.test(v)) return "thu";
  if (/^(пт|пятница|fri|жұма)/.test(v)) return "fri";
  if (/^(сб|суббота|sat|сенбі)/.test(v)) return "sat";
  if (/^(вс|воскресенье|sun|жексенбі)/.test(v)) return "sun";
  return null;
}

/** Ищет колонку по нескольким вариантам названия */
function pick(row: Record<string, unknown>, ...names: string[]): string {
  for (const k of Object.keys(row)) {
    const lk = k.toLowerCase().trim();
    if (names.some((n) => lk.includes(n))) {
      const v = row[k];
      if (v != null) return String(v).trim();
    }
  }
  return "";
}

/** Парсит Excel-файл и возвращает список занятий (без id) */
export async function parseExcel(file: File): Promise<Omit<Lesson, "id">[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const out: Omit<Lesson, "id">[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    for (const row of rows) {
      const teacher = pick(row, "препод", "оқытушы", "teacher");
      const subject = pick(row, "предмет", "пән", "subject", "дисциплин");
      const dayRaw = pick(row, "день", "күн", "day");
      const day = normalizeDay(dayRaw);
      const time = pick(row, "время", "уақыт", "time");
      const room = pick(row, "кабинет", "аудитор", "room");
      const group = pick(row, "групп", "топ", "group");
      if (!teacher || !subject || !day || !time) continue;
      out.push({ teacher, subject, day, time, room, group });
    }
  }
  return out;
}