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

export function getTimeLabel(time: string) {
  const slot = getSlotByStart(time);
  if (!slot) return time;
  return `${slot.start}-${slot.end}`;
}
