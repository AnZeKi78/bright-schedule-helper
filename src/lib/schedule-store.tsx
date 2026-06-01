import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type Lesson = {
  id: string;
  teacher: string;
  subject: string;
  day: DayKey;
  time: string; // "HH:MM"
  room: string;
  group: string;
};

const STORAGE_KEY = "schedule.lessons";

const SEED: Lesson[] = [
  { id: "s1", teacher: "Мустафина А.К.", subject: "Программирование", day: "mon", time: "09:00", room: "301", group: "ИС-21" },
  { id: "s2", teacher: "Мустафина А.К.", subject: "Программирование", day: "wed", time: "10:30", room: "301", group: "ИС-22" },
  { id: "s3", teacher: "Иванов С.П.", subject: "Математика", day: "mon", time: "11:00", room: "204", group: "ИС-21" },
  { id: "s4", teacher: "Иванов С.П.", subject: "Математика", day: "tue", time: "09:00", room: "204", group: "ИС-22" },
  { id: "s5", teacher: "Ахметова Д.Р.", subject: "Английский язык", day: "thu", time: "14:00", room: "112", group: "ИС-21" },
  { id: "s6", teacher: "Ахметова Д.Р.", subject: "Английский язык", day: "fri", time: "12:30", room: "112", group: "ИС-22" },
];

type Ctx = {
  lessons: Lesson[];
  add: (l: Omit<Lesson, "id">) => void;
  update: (l: Lesson) => void;
  remove: (id: string) => void;
  bulkAdd: (items: Omit<Lesson, "id">[]) => void;
  clear: () => void;
};

const ScheduleContext = createContext<Ctx | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [lessons, setLessons] = useState<Lesson[]>(SEED);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setLessons(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
  }, [lessons]);

  const add = useCallback((l: Omit<Lesson, "id">) => {
    setLessons((p) => [...p, { ...l, id: crypto.randomUUID() }]);
  }, []);

  const update = useCallback((l: Lesson) => {
    setLessons((p) => p.map((x) => (x.id === l.id ? l : x)));
  }, []);

  const remove = useCallback((id: string) => {
    setLessons((p) => p.filter((x) => x.id !== id));
  }, []);

  const bulkAdd = useCallback((items: Omit<Lesson, "id">[]) => {
    setLessons((p) => [...p, ...items.map((x) => ({ ...x, id: crypto.randomUUID() }))]);
  }, []);

  const clear = useCallback(() => setLessons([]), []);

  const value = useMemo(() => ({ lessons, add, update, remove, bulkAdd, clear }), [lessons, add, update, remove, bulkAdd, clear]);

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error("useSchedule must be used within ScheduleProvider");
  return ctx;
}

/** JS getDay() → наш DayKey */
export function jsDayToKey(d: number): DayKey {
  return (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as DayKey[])[d];
}