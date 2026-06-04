import type { Lesson } from "./schedule-store";

export type ConflictReason = "teacher" | "group" | "room";

export type ScheduleConflict = {
  candidate: Omit<Lesson, "id">;
  existing: Lesson;
  reasons: ConflictReason[];
};

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

function rangesOverlap(a: Omit<Lesson, "id">, b: Lesson) {
  const aStart = timeToMinutes(a.time);
  const bStart = timeToMinutes(b.time);
  const aEnd = aStart + (a.durationMinutes ?? 90);
  const bEnd = bStart + (b.durationMinutes ?? 90);
  return aStart < bEnd && bStart < aEnd;
}

function sameScheduleDay(a: Omit<Lesson, "id">, b: Lesson) {
  if (a.date && b.date) return a.date === b.date;
  return a.day === b.day;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getReasons(candidate: Omit<Lesson, "id">, existing: Lesson): ConflictReason[] {
  const reasons: ConflictReason[] = [];
  if (normalize(candidate.teacher) && normalize(candidate.teacher) === normalize(existing.teacher)) {
    reasons.push("teacher");
  }
  if (normalize(candidate.group) && normalize(candidate.group) === normalize(existing.group)) {
    reasons.push("group");
  }
  if (normalize(candidate.room) && normalize(candidate.room) === normalize(existing.room)) {
    reasons.push("room");
  }
  return reasons;
}

export function findScheduleConflicts({
  candidates,
  lessons,
  excludeLessonIds = [],
  excludePlanId,
}: {
  candidates: Omit<Lesson, "id">[];
  lessons: Lesson[];
  excludeLessonIds?: string[];
  excludePlanId?: string | null;
}) {
  const excluded = new Set(excludeLessonIds);
  const conflicts: ScheduleConflict[] = [];

  for (const candidate of candidates) {
    for (const existing of lessons) {
      if (excluded.has(existing.id)) continue;
      if (excludePlanId && existing.sourcePlanId === excludePlanId) continue;
      if (!sameScheduleDay(candidate, existing) || !rangesOverlap(candidate, existing)) continue;

      const reasons = getReasons(candidate, existing);
      if (reasons.length > 0) {
        conflicts.push({ candidate, existing, reasons });
      }
    }
  }

  return conflicts;
}

export function uniqueConflictLessonIds(conflicts: ScheduleConflict[]) {
  return Array.from(new Set(conflicts.map((conflict) => conflict.existing.id)));
}
