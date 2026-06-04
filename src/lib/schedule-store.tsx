import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  generateSemesterSchedule,
  isIsoDateInRange,
  schedule,
  type SchedulePlanInput,
  type SemesterGenerationInput,
  type SemesterGenerationIssue,
} from "./schedule-generator";

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

export type LessonTemplate = {
  id: string;
  subject: string;
  group: string;
  semesterHours: number;
  createdAt: string;
  updatedAt?: string;
};

export type LessonTemplateInput = Omit<LessonTemplate, "id" | "createdAt" | "updatedAt">;

export type TeacherRecord = {
  id: string;
  name: string;
  groups: string[];
  createdAt: string;
  updatedAt?: string;
};

export type TeacherInput = Omit<TeacherRecord, "id" | "createdAt" | "updatedAt">;

export type SemesterGenerationResult = {
  generated: number;
  removed: number;
  requested: number;
  issues: SemesterGenerationIssue[];
  startDate: string;
  endDate: string;
};

const STORAGE_KEY = "schedule.lessons";
const PLANS_KEY = "schedule.plans";
const GROUPS_KEY = "schedule.groups";
const TEACHERS_KEY = "schedule.teachers";
const ROOMS_KEY = "schedule.rooms";
const LESSON_TEMPLATES_KEY = "schedule.lessonTemplates";
const VERSION_KEY = "schedule.version";
const DATA_VERSION = "2";
const DEFAULT_GROUPS = ["ИС-21", "ИС-22", "ПО-21", "ВТ-21"];
const DEFAULT_TEACHERS: TeacherRecord[] = [
  {
    id: "teacher-mustafina",
    name: "Мустафина А.К.",
    groups: ["ИС-21", "ИС-22"],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "teacher-ivanov",
    name: "Иванов С.П.",
    groups: ["ИС-21", "ПО-21"],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "teacher-sadykova",
    name: "Садыкова М.Н.",
    groups: ["ИС-22", "ВТ-21"],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];
const DEFAULT_ROOMS = ["204", "212", "301"];
const DEFAULT_LESSON_TEMPLATES: LessonTemplate[] = [
  {
    id: "template-programming",
    subject: "Программирование",
    group: "ИС-21",
    semesterHours: 90,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "template-math",
    subject: "Математика",
    group: "ИС-21",
    semesterHours: 72,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "template-database",
    subject: "Базы данных",
    group: "ИС-22",
    semesterHours: 60,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

type Ctx = {
  lessons: Lesson[];
  plans: SchedulePlan[];
  groups: string[];
  teachers: TeacherRecord[];
  rooms: string[];
  lessonTemplates: LessonTemplate[];
  add: (lesson: Omit<Lesson, "id">) => void;
  update: (lesson: Lesson) => void;
  remove: (id: string) => void;
  addGroup: (name: string) => void;
  renameGroup: (currentName: string, nextName: string) => void;
  removeGroup: (name: string) => void;
  addTeacher: (input: TeacherInput) => void;
  updateTeacher: (id: string, input: TeacherInput) => void;
  removeTeacher: (id: string) => void;
  addRoom: (name: string) => void;
  renameRoom: (currentName: string, nextName: string) => void;
  removeRoom: (name: string) => void;
  addLessonTemplate: (input: LessonTemplateInput) => void;
  updateLessonTemplate: (id: string, input: LessonTemplateInput) => void;
  removeLessonTemplate: (id: string) => void;
  generateSemester: (input: SemesterGenerationInput) => SemesterGenerationResult;
  createPlan: (input: SchedulePlanInput) => void;
  updatePlan: (id: string, input: SchedulePlanInput) => void;
  removePlan: (id: string) => void;
  clear: () => void;
};

const ScheduleContext = createContext<Ctx | null>(null);

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function normalizeTeacherInput(input: TeacherInput): TeacherInput | null {
  const clean = {
    name: input.name.trim(),
    groups: uniqueSorted(input.groups),
  };

  if (!clean.name || clean.groups.length === 0) return null;
  return clean;
}

function normalizeSavedTeachers(value: unknown) {
  if (!Array.isArray(value)) return null;

  return value
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();
        if (!name) return null;
        return {
          id: crypto.randomUUID(),
          name,
          groups: DEFAULT_GROUPS,
          createdAt: new Date().toISOString(),
        };
      }

      if (!item || typeof item !== "object") return null;
      const source = item as Partial<TeacherRecord>;
      const clean = normalizeTeacherInput({
        name: String(source.name ?? ""),
        groups: Array.isArray(source.groups) ? source.groups.map(String) : DEFAULT_GROUPS,
      });
      if (!clean) return null;

      return {
        ...clean,
        id: String(source.id || crypto.randomUUID()),
        createdAt: String(source.createdAt || new Date().toISOString()),
        updatedAt: source.updatedAt ? String(source.updatedAt) : undefined,
      };
    })
    .filter((item): item is TeacherRecord => Boolean(item));
}

function normalizeTemplateInput(input: LessonTemplateInput): LessonTemplateInput | null {
  const clean = {
    subject: input.subject.trim(),
    group: input.group.trim(),
    semesterHours: Number(input.semesterHours) || 0,
  };

  if (!clean.subject || !clean.group || clean.semesterHours <= 0) return null;
  return clean;
}

function getRoomsFromSavedTemplates(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const source = item as { room?: unknown };
      return String(source.room ?? "");
    })
    .filter(Boolean);
}

function normalizeSavedTemplates(value: unknown) {
  if (!Array.isArray(value)) return null;

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const source = item as Partial<LessonTemplate>;
      const clean = normalizeTemplateInput({
        subject: String(source.subject ?? ""),
        group: String(source.group ?? DEFAULT_GROUPS[0]),
        semesterHours: Number(source.semesterHours ?? 0),
      });

      if (!clean) return null;
      return {
        ...clean,
        id: String(source.id || crypto.randomUUID()),
        createdAt: String(source.createdAt || new Date().toISOString()),
        updatedAt: source.updatedAt ? String(source.updatedAt) : undefined,
      };
    })
    .filter((item): item is LessonTemplate => Boolean(item));
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [plans, setPlans] = useState<SchedulePlan[]>([]);
  const [groups, setGroups] = useState<string[]>(DEFAULT_GROUPS);
  const [teachers, setTeachers] = useState<TeacherRecord[]>(DEFAULT_TEACHERS);
  const [rooms, setRooms] = useState<string[]>(DEFAULT_ROOMS);
  const [lessonTemplates, setLessonTemplates] =
    useState<LessonTemplate[]>(DEFAULT_LESSON_TEMPLATES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const version = localStorage.getItem(VERSION_KEY);
    if (version !== DATA_VERSION) {
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      localStorage.setItem(PLANS_KEY, JSON.stringify([]));
      localStorage.setItem(GROUPS_KEY, JSON.stringify(DEFAULT_GROUPS));
      localStorage.setItem(TEACHERS_KEY, JSON.stringify(DEFAULT_TEACHERS));
      localStorage.setItem(ROOMS_KEY, JSON.stringify(DEFAULT_ROOMS));
      localStorage.setItem(LESSON_TEMPLATES_KEY, JSON.stringify(DEFAULT_LESSON_TEMPLATES));
      setLessons([]);
      setPlans([]);
      setGroups(DEFAULT_GROUPS);
      setTeachers(DEFAULT_TEACHERS);
      setRooms(DEFAULT_ROOMS);
      setLessonTemplates(DEFAULT_LESSON_TEMPLATES);
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
        setGroups(uniqueSorted([...DEFAULT_GROUPS, ...saved]));
      } catch {
        /* ignore broken storage */
      }
    }

    const rawTeachers = localStorage.getItem(TEACHERS_KEY);
    if (rawTeachers) {
      try {
        const saved = normalizeSavedTeachers(JSON.parse(rawTeachers));
        if (saved) setTeachers(saved);
      } catch {
        /* ignore broken storage */
      }
    }

    const rawTemplates = localStorage.getItem(LESSON_TEMPLATES_KEY);
    let savedTemplateRooms: string[] = [];
    if (rawTemplates) {
      try {
        const parsed = JSON.parse(rawTemplates);
        savedTemplateRooms = getRoomsFromSavedTemplates(parsed);
        const saved = normalizeSavedTemplates(parsed);
        if (saved) setLessonTemplates(saved);
      } catch {
        /* ignore broken storage */
      }
    }

    const rawRooms = localStorage.getItem(ROOMS_KEY);
    if (rawRooms) {
      try {
        const saved = JSON.parse(rawRooms) as string[];
        setRooms(uniqueSorted([...DEFAULT_ROOMS, ...saved]));
      } catch {
        /* ignore broken storage */
      }
    } else {
      setRooms(uniqueSorted([...DEFAULT_ROOMS, ...savedTemplateRooms]));
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

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    localStorage.setItem(TEACHERS_KEY, JSON.stringify(teachers));
  }, [teachers, hydrated]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  }, [rooms, hydrated]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    localStorage.setItem(LESSON_TEMPLATES_KEY, JSON.stringify(lessonTemplates));
  }, [lessonTemplates, hydrated]);

  const addGroup = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setGroups((prev) => uniqueSorted([...prev, trimmed]));
  }, []);

  const renameGroup = useCallback((currentName: string, nextName: string) => {
    const current = currentName.trim();
    const next = nextName.trim();
    if (!current || !next || current === next) return;

    setGroups((prev) => uniqueSorted(prev.map((group) => (group === current ? next : group))));
    setLessons((prev) =>
      prev.map((lesson) => (lesson.group === current ? { ...lesson, group: next } : lesson)),
    );
    setPlans((prev) =>
      prev.map((plan) =>
        plan.group === current
          ? { ...plan, group: next, updatedAt: new Date().toISOString() }
          : plan,
      ),
    );
    setTeachers((prev) =>
      prev.map((teacher) => ({
        ...teacher,
        groups: uniqueSorted(teacher.groups.map((group) => (group === current ? next : group))),
        updatedAt: teacher.groups.includes(current) ? new Date().toISOString() : teacher.updatedAt,
      })),
    );
    setLessonTemplates((prev) =>
      prev.map((template) =>
        template.group === current
          ? { ...template, group: next, updatedAt: new Date().toISOString() }
          : template,
      ),
    );
  }, []);

  const removeGroup = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setGroups((prev) => prev.filter((group) => group !== trimmed));
    setLessons((prev) => prev.filter((lesson) => lesson.group !== trimmed));
    setPlans((prev) => prev.filter((plan) => plan.group !== trimmed));
    setTeachers((prev) =>
      prev
        .map((teacher) => ({
          ...teacher,
          groups: teacher.groups.filter((group) => group !== trimmed),
        }))
        .filter((teacher) => teacher.groups.length > 0),
    );
    setLessonTemplates((prev) => prev.filter((template) => template.group !== trimmed));
  }, []);

  const addTeacher = useCallback((input: TeacherInput) => {
    const clean = normalizeTeacherInput(input);
    if (!clean) return;
    setTeachers((prev) => {
      const existing = prev.find((teacher) => teacher.name === clean.name);
      if (existing) {
        return prev.map((teacher) =>
          teacher.id === existing.id
            ? {
                ...teacher,
                groups: uniqueSorted([...teacher.groups, ...clean.groups]),
                updatedAt: new Date().toISOString(),
              }
            : teacher,
        );
      }

      return [
        ...prev,
        {
          ...clean,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const ensureTeacher = useCallback((name: string, group?: string) => {
    const cleanName = name.trim();
    const cleanGroup = group?.trim();
    if (!cleanName) return;

    setTeachers((prev) => {
      const existing = prev.find((teacher) => teacher.name === cleanName);
      if (existing) {
        if (!cleanGroup || existing.groups.includes(cleanGroup)) return prev;
        return prev.map((teacher) =>
          teacher.id === existing.id
            ? {
                ...teacher,
                groups: uniqueSorted([...teacher.groups, cleanGroup]),
                updatedAt: new Date().toISOString(),
              }
            : teacher,
        );
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: cleanName,
          groups: cleanGroup ? [cleanGroup] : DEFAULT_GROUPS,
          createdAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const updateTeacher = useCallback(
    (id: string, input: TeacherInput) => {
      const clean = normalizeTeacherInput(input);
      if (!clean) return;
      const previousName = teachers.find((teacher) => teacher.id === id)?.name;

      setTeachers((prev) =>
        prev.map((teacher) =>
          teacher.id === id
            ? { ...teacher, ...clean, updatedAt: new Date().toISOString() }
            : teacher,
        ),
      );

      if (previousName && previousName !== clean.name) {
        setLessons((prev) =>
          prev.map((lesson) =>
            lesson.teacher === previousName ? { ...lesson, teacher: clean.name } : lesson,
          ),
        );
        setPlans((prev) =>
          prev.map((plan) =>
            plan.teacher === previousName
              ? { ...plan, teacher: clean.name, updatedAt: new Date().toISOString() }
              : plan,
          ),
        );
      }
    },
    [teachers],
  );

  const removeTeacher = useCallback(
    (id: string) => {
      const removedName = teachers.find((teacher) => teacher.id === id)?.name;
      setTeachers((prev) => prev.filter((teacher) => teacher.id !== id));
      if (!removedName) return;
      setLessons((prev) => prev.filter((lesson) => lesson.teacher !== removedName));
      setPlans((prev) => prev.filter((plan) => plan.teacher !== removedName));
    },
    [teachers],
  );

  const addRoom = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setRooms((prev) => uniqueSorted([...prev, trimmed]));
  }, []);

  const renameRoom = useCallback((currentName: string, nextName: string) => {
    const current = currentName.trim();
    const next = nextName.trim();
    if (!current || !next || current === next) return;

    setRooms((prev) => uniqueSorted(prev.map((room) => (room === current ? next : room))));
    setLessons((prev) =>
      prev.map((lesson) => (lesson.room === current ? { ...lesson, room: next } : lesson)),
    );
    setPlans((prev) =>
      prev.map((plan) =>
        plan.room === current ? { ...plan, room: next, updatedAt: new Date().toISOString() } : plan,
      ),
    );
  }, []);

  const removeRoom = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setRooms((prev) => prev.filter((room) => room !== trimmed));
    setLessons((prev) => prev.filter((lesson) => lesson.room !== trimmed));
    setPlans((prev) => prev.filter((plan) => plan.room !== trimmed));
  }, []);

  const addLessonTemplate = useCallback((input: LessonTemplateInput) => {
    const clean = normalizeTemplateInput(input);
    if (!clean) return;

    setLessonTemplates((prev) => [
      ...prev,
      {
        ...clean,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const updateLessonTemplate = useCallback((id: string, input: LessonTemplateInput) => {
    const clean = normalizeTemplateInput(input);
    if (!clean) return;

    setLessonTemplates((prev) =>
      prev.map((template) =>
        template.id === id
          ? { ...template, ...clean, updatedAt: new Date().toISOString() }
          : template,
      ),
    );
  }, []);

  const removeLessonTemplate = useCallback((id: string) => {
    setLessonTemplates((prev) => prev.filter((template) => template.id !== id));
  }, []);

  const add = useCallback(
    (lesson: Omit<Lesson, "id">) => {
      addGroup(lesson.group);
      ensureTeacher(lesson.teacher, lesson.group);
      addRoom(lesson.room);
      setLessons((prev) => [...prev, { ...lesson, id: crypto.randomUUID() }]);
    },
    [addGroup, ensureTeacher, addRoom],
  );

  const update = useCallback(
    (lesson: Lesson) => {
      addGroup(lesson.group);
      ensureTeacher(lesson.teacher, lesson.group);
      addRoom(lesson.room);
      setLessons((prev) => prev.map((item) => (item.id === lesson.id ? lesson : item)));
    },
    [addGroup, ensureTeacher, addRoom],
  );

  const remove = useCallback((id: string) => {
    setLessons((prev) => prev.filter((lesson) => lesson.id !== id));
    setPlans((prev) =>
      prev.map((plan) => ({
        ...plan,
        lessonIds: plan.lessonIds.filter((lessonId) => lessonId !== id),
      })),
    );
  }, []);

  const createPlan = useCallback(
    (input: SchedulePlanInput) => {
      const planId = crypto.randomUUID();
      const generated = schedule(input);
      const lessonIds = generated.map(() => crypto.randomUUID());

      addGroup(input.group);
      ensureTeacher(input.teacher, input.group);
      addRoom(input.room);
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
    },
    [addGroup, ensureTeacher, addRoom],
  );

  const updatePlan = useCallback(
    (id: string, input: SchedulePlanInput) => {
      const generated = schedule(input);
      const lessonIds = generated.map(() => crypto.randomUUID());

      addGroup(input.group);
      ensureTeacher(input.teacher, input.group);
      addRoom(input.room);
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
            ? {
                ...input,
                id,
                lessonIds,
                createdAt: plan.createdAt,
                updatedAt: new Date().toISOString(),
              }
            : plan,
        ),
      );
    },
    [addGroup, ensureTeacher, addRoom],
  );

  const removePlan = useCallback((id: string) => {
    setLessons((prev) => prev.filter((lesson) => lesson.sourcePlanId !== id));
    setPlans((prev) => prev.filter((plan) => plan.id !== id));
  }, []);

  const generateSemester = useCallback(
    (input: SemesterGenerationInput): SemesterGenerationResult => {
      if (groups.length === 0) throw new Error("Добавьте хотя бы одну группу во вкладке Данные.");
      if (teachers.length === 0)
        throw new Error("Добавьте хотя бы одного преподавателя во вкладке Данные.");
      if (rooms.length === 0) throw new Error("Добавьте хотя бы один кабинет во вкладке Данные.");
      if (lessonTemplates.length === 0)
        throw new Error("Добавьте хотя бы один предмет с часами во вкладке Данные.");

      const templatesWithoutTeachers = lessonTemplates.filter(
        (template) => !teachers.some((teacher) => teacher.groups.includes(template.group)),
      );
      if (templatesWithoutTeachers.length > 0) {
        const labels = templatesWithoutTeachers
          .map((template) => `${template.subject} (${template.group})`)
          .join(", ");
        throw new Error(`Для этих предметов нет преподавателей с нужной группой: ${labels}.`);
      }

      const templatesForGeneration = lessonTemplates.map((template, templateIndex) => {
        const eligibleTeachers = teachers
          .filter((teacher) => teacher.groups.includes(template.group))
          .map((teacher) => teacher.name);

        return {
          id: template.id,
          subject: template.subject,
          semesterHours: template.semesterHours,
          group: template.group,
          teachers: eligibleTeachers,
          room: rooms[templateIndex % rooms.length],
        };
      });
      const output = generateSemesterSchedule(input, templatesForGeneration);
      const sourcePlanId = `semester-${crypto.randomUUID()}`;
      const generated = output.lessons.map((lesson) => ({
        ...lesson,
        id: crypto.randomUUID(),
        sourcePlanId,
      }));
      const removedLessons = lessons.filter(
        (lesson) => lesson.date && isIsoDateInRange(lesson.date, input.startDate, input.endDate),
      );
      const removedIds = new Set(removedLessons.map((lesson) => lesson.id));

      setLessons((prev) => [
        ...prev.filter(
          (lesson) =>
            !lesson.date || !isIsoDateInRange(lesson.date, input.startDate, input.endDate),
        ),
        ...generated,
      ]);

      if (removedIds.size > 0) {
        setPlans((prev) =>
          prev.map((plan) => ({
            ...plan,
            lessonIds: plan.lessonIds.filter((lessonId) => !removedIds.has(lessonId)),
          })),
        );
      }

      return {
        generated: generated.length,
        removed: removedLessons.length,
        requested: output.requestedLessons,
        issues: output.issues,
        startDate: input.startDate,
        endDate: input.endDate,
      };
    },
    [groups, teachers, rooms, lessonTemplates, lessons],
  );

  const clear = useCallback(() => {
    setLessons([]);
    setPlans([]);
  }, []);

  const value = useMemo(
    () => ({
      lessons,
      plans,
      groups,
      teachers,
      rooms,
      lessonTemplates,
      add,
      update,
      remove,
      addGroup,
      renameGroup,
      removeGroup,
      addTeacher,
      updateTeacher,
      removeTeacher,
      addRoom,
      renameRoom,
      removeRoom,
      addLessonTemplate,
      updateLessonTemplate,
      removeLessonTemplate,
      generateSemester,
      createPlan,
      updatePlan,
      removePlan,
      clear,
    }),
    [
      lessons,
      plans,
      groups,
      teachers,
      rooms,
      lessonTemplates,
      add,
      update,
      remove,
      addGroup,
      renameGroup,
      removeGroup,
      addTeacher,
      updateTeacher,
      removeTeacher,
      addRoom,
      renameRoom,
      removeRoom,
      addLessonTemplate,
      updateLessonTemplate,
      removeLessonTemplate,
      generateSemester,
      createPlan,
      updatePlan,
      removePlan,
      clear,
    ],
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
