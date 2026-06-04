import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { schedule, type SchedulePlanInput } from "./schedule-generator";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type Lesson = {
  id: string;
  teacher: string;
  subject: string;
  day: DayKey;
  time: string;
  endTime?: string;
  room: string;
  group: string;
  date?: string;
  durationMinutes?: number;
  sourcePlanId?: string;
};

export type SchedulePlan = SchedulePlanInput & {
  id: string;
  lessonIds: string[];
  createdAt: string;
  updatedAt?: string;
};

const STORAGE_KEY = "schedule.lessons";
const PLANS_KEY = "schedule.plans";
const GROUPS_KEY = "schedule.groups";
const VERSION_KEY = "schedule.version";
const DATA_VERSION = "2";
const DEFAULT_GROUPS = ["ИС-21", "ИС-22", "ПО-21", "ВТ-21"];

type Ctx = {
  lessons: Lesson[];
  plans: SchedulePlan[];
  groups: string[];
  add: (lesson: Omit<Lesson, "id">) => void;
  update: (lesson: Lesson) => void;
  remove: (id: string) => void;
  addGroup: (name: string) => void;
  createPlan: (input: SchedulePlanInput) => void;
  updatePlan: (id: string, input: SchedulePlanInput) => void;
  removePlan: (id: string) => void;
  clear: () => void;
};

const ScheduleContext = createContext<Ctx | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [plans, setPlans] = useState<SchedulePlan[]>([]);
  const [groups, setGroups] = useState<string[]>(DEFAULT_GROUPS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const version = localStorage.getItem(VERSION_KEY);
    if (version !== DATA_VERSION) {
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      localStorage.setItem(PLANS_KEY, JSON.stringify([]));
      localStorage.setItem(GROUPS_KEY, JSON.stringify(DEFAULT_GROUPS));
      setLessons([]);
      setPlans([]);
      setGroups(DEFAULT_GROUPS);
      setHydrated(true);
      return;
    }

    const rawLessons = localStorage.getItem(STORAGE_KEY);
    if (rawLessons) {
      try {
        setLessons(JSON.parse(rawLessons));
      } catch {
        /* ignore broken storage */
      }
    }

    const rawPlans = localStorage.getItem(PLANS_KEY);
    if (rawPlans) {
      try {
        setPlans(JSON.parse(rawPlans));
      } catch {
        /* ignore broken storage */
      }
    }

    const rawGroups = localStorage.getItem(GROUPS_KEY);
    if (rawGroups) {
      try {
        const saved = JSON.parse(rawGroups) as string[];
        setGroups(Array.from(new Set([...DEFAULT_GROUPS, ...saved])).sort());
      } catch {
        /* ignore broken storage */
      }
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
  }, [hydrated, lessons]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  }, [hydrated, plans]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  }, [groups, hydrated]);

  const addGroup = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setGroups((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed].sort()));
  }, []);

  const add = useCallback((lesson: Omit<Lesson, "id">) => {
    addGroup(lesson.group);
    setLessons((prev) => [...prev, { ...lesson, id: crypto.randomUUID() }]);
  }, [addGroup]);

  const update = useCallback((lesson: Lesson) => {
    addGroup(lesson.group);
    setLessons((prev) => prev.map((item) => (item.id === lesson.id ? lesson : item)));
  }, [addGroup]);

  const remove = useCallback((id: string) => {
    setLessons((prev) => prev.filter((lesson) => lesson.id !== id));
    setPlans((prev) => prev.map((plan) => ({ ...plan, lessonIds: plan.lessonIds.filter((lessonId) => lessonId !== id) })));
  }, []);

  const createPlan = useCallback((input: SchedulePlanInput) => {
    const planId = crypto.randomUUID();
    const generated = schedule(input);
    const lessonIds = generated.map(() => crypto.randomUUID());

    addGroup(input.group);
    setLessons((prev) => [
      ...prev,
      ...generated.map((lesson, index) => ({
        ...lesson,
        id: lessonIds[index],
        sourcePlanId: planId,
      })),
    ]);
    setPlans((prev) => [
      ...prev,
      {
        ...input,
        id: planId,
        lessonIds,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [addGroup]);

  const updatePlan = useCallback((id: string, input: SchedulePlanInput) => {
    const generated = schedule(input);
    const lessonIds = generated.map(() => crypto.randomUUID());

    addGroup(input.group);
    setLessons((prev) => [
      ...prev.filter((lesson) => lesson.sourcePlanId !== id),
      ...generated.map((lesson, index) => ({
        ...lesson,
        id: lessonIds[index],
        sourcePlanId: id,
      })),
    ]);
    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === id
          ? { ...input, id, lessonIds, createdAt: plan.createdAt, updatedAt: new Date().toISOString() }
          : plan
      )
    );
  }, [addGroup]);

  const removePlan = useCallback((id: string) => {
    setLessons((prev) => prev.filter((lesson) => lesson.sourcePlanId !== id));
    setPlans((prev) => prev.filter((plan) => plan.id !== id));
  }, []);

  const clear = useCallback(() => {
    setLessons([]);
    setPlans([]);
  }, []);

  const value = useMemo(
    () => ({
      lessons,
      plans,
      groups,
      add,
      update,
      remove,
      addGroup,
      createPlan,
      updatePlan,
      removePlan,
      clear,
    }),
    [lessons, plans, groups, add, update, remove, addGroup, createPlan, updatePlan, removePlan, clear]
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error("useSchedule must be used within ScheduleProvider");
  return ctx;
}

export function jsDayToKey(day: number): DayKey {
  return (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as DayKey[])[day];
}
