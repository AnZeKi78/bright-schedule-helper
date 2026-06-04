export type LessonSlot = {
  pair: number;
  start: string;
  end: string;
};

export const LESSON_SLOTS: LessonSlot[] = [
  { pair: 1, start: "08:30", end: "10:00" },
  { pair: 2, start: "10:10", end: "11:40" },
  { pair: 3, start: "12:00", end: "13:30" },
  { pair: 4, start: "13:40", end: "15:10" },
  { pair: 5, start: "15:20", end: "16:50" },
  { pair: 6, start: "17:00", end: "18:30" },
];

export function getSlotByStart(time: string) {
  return LESSON_SLOTS.find((slot) => slot.start === time) ?? null;
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

export function minutesToTime(value: number) {
  const minutesInDay = 24 * 60;
  const normalized = ((value % minutesInDay) + minutesInDay) % minutesInDay;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getLessonEndTime(time: string, durationMinutes = 90) {
  const start = timeToMinutes(time);
  if (start === null) return "";
  return minutesToTime(start + durationMinutes);
}

export function getDurationMinutes(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || end <= start) return null;
  return end - start;
}

export function getTimeLabel(time: string, endTime?: string, durationMinutes = 90) {
  if (endTime) return `${time}-${endTime}`;
  const slot = getSlotByStart(time);
  if (!slot) return `${time}-${getLessonEndTime(time, durationMinutes)}`;
  return `${slot.start}-${slot.end}`;
}
