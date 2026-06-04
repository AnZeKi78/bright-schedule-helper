import type { DayKey, Lesson } from "./schedule-store";
import { getLessonEndTime, LESSON_SLOTS } from "./lesson-slots";

export type DateRange = {
  start: string;
  end: string;
};

export type WeeklyLessonSlot = {
  day: DayKey;
  time: string;
};

export type SchedulePlanInput = {
  subject: string;
  maxHours: number;
  teacher: string;
  group: string;
  room: string;
  startDate: string;
  time: string;
  weeklySlots?: WeeklyLessonSlot[];
  holidays: string[];
  practiceRanges: DateRange[];
};

export type SemesterGenerationInput = {
  startDate: string;
  endDate: string;
  holidays: string[];
  practiceRanges: DateRange[];
};

export type SemesterLessonTemplateInput = {
  id?: string;
  subject: string;
  semesterHours: number;
  teacher?: string;
  teachers?: string[];
  group: string;
  room: string;
};

export type SemesterGenerationIssue = {
  templateId?: string;
  subject: string;
  teacher: string;
  group: string;
  requestedLessons: number;
  generatedLessons: number;
  missingLessons: number;
};

export type SemesterGenerationOutput = {
  lessons: Omit<Lesson, "id">[];
  issues: SemesterGenerationIssue[];
  requestedLessons: number;
  availableDates: string[];
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as DayKey[];
const WORK_DAYS = new Set<DayKey>(["mon", "tue", "wed", "thu", "fri"]);
const WORK_DAY_ORDER: Record<DayKey, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};
const LESSON_DURATION_MINUTES = 90;
export const LESSON_HOURS = LESSON_DURATION_MINUTES / 60;

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isIsoDateInRange(value: string, startDate: string, endDate: string) {
  const date = parseIsoDate(value);
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  return Boolean(date && start && end && date >= start && date <= end);
}

export function weekend(dates: string[]) {
  return new Set(dates.filter((date) => parseIsoDate(date)).sort());
}

export function practic(ranges: DateRange[]) {
  const dates = new Set<string>();

  for (const range of ranges) {
    const start = parseIsoDate(range.start);
    const end = parseIsoDate(range.end);
    if (!start || !end || start > end) continue;

    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
      dates.add(formatIsoDate(cursor));
    }
  }

  return dates;
}

export function normalizeWeeklySlots(input: Pick<SchedulePlanInput, "time" | "weeklySlots">) {
  const slots =
    input.weeklySlots !== undefined
      ? input.weeklySlots
      : (["mon", "tue", "wed", "thu", "fri"] as DayKey[]).map((day) => ({ day, time: input.time }));

  const unique = new Map<string, WeeklyLessonSlot>();
  for (const slot of slots) {
    if (!WORK_DAYS.has(slot.day) || !slot.time) continue;
    unique.set(`${slot.day}-${slot.time}`, { day: slot.day, time: slot.time });
  }

  return Array.from(unique.values()).sort(
    (a, b) => WORK_DAY_ORDER[a.day] - WORK_DAY_ORDER[b.day] || a.time.localeCompare(b.time),
  );
}

export function schedule(input: SchedulePlanInput): Omit<Lesson, "id">[] {
  const start = parseIsoDate(input.startDate);
  if (!start) throw new Error("Start date is required");
  if (input.maxHours <= 0) throw new Error("Max hours must be greater than zero");

  const holidays = weekend(input.holidays);
  const practiceDates = practic(input.practiceRanges);
  const weeklySlots = normalizeWeeklySlots(input);
  if (weeklySlots.length === 0) throw new Error("Weekly slots are required");

  const lessonsCount = Math.ceil(input.maxHours / LESSON_HOURS);
  const lessons: Omit<Lesson, "id">[] = [];

  let cursor = start;
  const academicYearEnd = addDays(start, 365);
  while (lessons.length < lessonsCount && cursor <= academicYearEnd) {
    const date = formatIsoDate(cursor);
    const day = DAY_KEYS[cursor.getDay()];

    if (WORK_DAYS.has(day) && !holidays.has(date) && !practiceDates.has(date)) {
      for (const slot of weeklySlots.filter((item) => item.day === day)) {
        lessons.push({
          teacher: input.teacher.trim(),
          subject: input.subject.trim(),
          day,
          time: slot.time,
          endTime: getLessonEndTime(slot.time, LESSON_DURATION_MINUTES),
          room: input.room.trim(),
          group: input.group.trim(),
          date,
          durationMinutes: LESSON_DURATION_MINUTES,
        });

        if (lessons.length >= lessonsCount) break;
      }
    }

    cursor = addDays(cursor, 1);
  }

  if (lessons.length < lessonsCount) {
    throw new Error("Could not place all lessons inside one academic year");
  }

  return lessons;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

function rangesOverlap(a: Omit<Lesson, "id">, b: Omit<Lesson, "id">) {
  const aStart = timeToMinutes(a.time);
  const bStart = timeToMinutes(b.time);
  const aEnd = aStart + (a.durationMinutes ?? LESSON_DURATION_MINUTES);
  const bEnd = bStart + (b.durationMinutes ?? LESSON_DURATION_MINUTES);
  return aStart < bEnd && bStart < aEnd;
}

function hasGeneratedConflict(candidate: Omit<Lesson, "id">, lessons: Omit<Lesson, "id">[]) {
  return lessons.some((lesson) => {
    if (candidate.date !== lesson.date || !rangesOverlap(candidate, lesson)) return false;
    return (
      normalize(candidate.teacher) === normalize(lesson.teacher) ||
      normalize(candidate.group) === normalize(lesson.group) ||
      normalize(candidate.room) === normalize(lesson.room)
    );
  });
}

function rotateSlots(offset: number) {
  const normalized = offset % LESSON_SLOTS.length;
  return [...LESSON_SLOTS.slice(normalized), ...LESSON_SLOTS.slice(0, normalized)];
}

function getWorkingDates(input: SemesterGenerationInput) {
  const start = parseIsoDate(input.startDate);
  const end = parseIsoDate(input.endDate);
  if (!start || !end) throw new Error("Generation period is required");
  if (start > end) throw new Error("Generation period start must be before end");

  const holidays = weekend(input.holidays);
  const practiceDates = practic(input.practiceRanges);
  const dates: string[] = [];

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const date = formatIsoDate(cursor);
    const day = DAY_KEYS[cursor.getDay()];
    if (WORK_DAYS.has(day) && !holidays.has(date) && !practiceDates.has(date)) {
      dates.push(date);
    }
  }

  return dates;
}

function getTemplateLessonCount(template: SemesterLessonTemplateInput) {
  return Math.ceil(Math.max(0, Number(template.semesterHours) || 0) / LESSON_HOURS);
}

function normalizeTemplate(template: SemesterLessonTemplateInput) {
  const teachers = Array.from(
    new Set(
      [...(template.teachers ?? []), template.teacher ?? ""]
        .map((teacher) => teacher.trim())
        .filter(Boolean),
    ),
  );

  return {
    ...template,
    subject: template.subject.trim(),
    teacher: teachers[0] ?? "",
    teachers,
    group: template.group.trim(),
    room: template.room.trim(),
    semesterHours: Number(template.semesterHours) || 0,
  };
}

function getTeacherCountKey(group: string, teacher: string) {
  return `${group}::${teacher}`;
}

function sortTeachersByGroupLoad(teachers: string[], group: string, counts: Map<string, number>) {
  return [...teachers].sort((a, b) => {
    const byCount =
      (counts.get(getTeacherCountKey(group, a)) ?? 0) -
      (counts.get(getTeacherCountKey(group, b)) ?? 0);
    if (byCount !== 0) return byCount;
    return a.localeCompare(b);
  });
}

export function generateSemesterSchedule(
  input: SemesterGenerationInput,
  templates: SemesterLessonTemplateInput[],
): SemesterGenerationOutput {
  const availableDates = getWorkingDates(input);
  if (availableDates.length === 0) throw new Error("No working dates in generation period");

  const normalizedTemplates = templates
    .map(normalizeTemplate)
    .filter(
      (template) =>
        template.subject &&
        template.teachers.length > 0 &&
        template.group &&
        template.room &&
        template.semesterHours > 0,
    )
    .sort((a, b) => {
      const byCount = getTemplateLessonCount(b) - getTemplateLessonCount(a);
      if (byCount !== 0) return byCount;
      return `${a.group}${a.subject}`.localeCompare(`${b.group}${b.subject}`);
    });

  if (normalizedTemplates.length === 0) {
    throw new Error("Lesson data is required for generation");
  }

  const lessons: Omit<Lesson, "id">[] = [];
  const issues: SemesterGenerationIssue[] = [];
  const teacherGroupCounts = new Map<string, number>();
  let requestedLessons = 0;

  normalizedTemplates.forEach((template, templateIndex) => {
    const requested = getTemplateLessonCount(template);
    let generated = 0;
    requestedLessons += requested;

    for (let cycle = 0; generated < requested && cycle < LESSON_SLOTS.length; cycle += 1) {
      let placedInCycle = 0;

      for (
        let dateIndex = 0;
        dateIndex < availableDates.length && generated < requested;
        dateIndex += 1
      ) {
        const date = availableDates[dateIndex];
        const [year, month, dayOfMonth] = date.split("-").map(Number);
        const day = DAY_KEYS[new Date(year, month - 1, dayOfMonth).getDay()];
        let selected: Omit<Lesson, "id"> | null = null;

        for (const slot of rotateSlots(templateIndex + cycle + dateIndex)) {
          const teachers = sortTeachersByGroupLoad(
            template.teachers,
            template.group,
            teacherGroupCounts,
          );
          const candidate = teachers
            .map((teacher) => ({
              teacher,
              subject: template.subject,
              day,
              time: slot.start,
              endTime: slot.end,
              room: template.room,
              group: template.group,
              date,
              durationMinutes: LESSON_DURATION_MINUTES,
            }))
            .find((item) => !hasGeneratedConflict(item, lessons));

          if (candidate) {
            selected = candidate;
            break;
          }
        }

        if (!selected) continue;

        lessons.push(selected);
        const key = getTeacherCountKey(template.group, selected.teacher);
        teacherGroupCounts.set(key, (teacherGroupCounts.get(key) ?? 0) + 1);
        generated += 1;
        placedInCycle += 1;
      }

      if (placedInCycle === 0) break;
    }

    if (generated < requested) {
      issues.push({
        templateId: template.id,
        subject: template.subject,
        teacher: template.teachers.join(", "),
        group: template.group,
        requestedLessons: requested,
        generatedLessons: generated,
        missingLessons: requested - generated,
      });
    }
  });

  return {
    lessons,
    issues,
    requestedLessons,
    availableDates,
  };
}

export function getKazakhstanHolidayPreset(startDate: string) {
  const start = parseIsoDate(startDate) ?? new Date();
  const end = addDays(start, 365);
  const years = [start.getFullYear(), start.getFullYear() + 1];
  const fixedHolidays = [
    [1, 1],
    [1, 2],
    [1, 7],
    [3, 8],
    [3, 21],
    [3, 22],
    [3, 23],
    [5, 1],
    [5, 7],
    [5, 9],
    [7, 6],
    [8, 30],
    [10, 25],
    [12, 16],
  ];

  return years
    .flatMap((year) =>
      fixedHolidays.map(([month, day]) => formatIsoDate(new Date(year, month - 1, day))),
    )
    .filter((date) => {
      const parsed = parseIsoDate(date);
      return parsed && parsed >= start && parsed <= end;
    })
    .sort();
}
