import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { findScheduleConflicts, uniqueConflictLessonIds, type ScheduleConflict } from "@/lib/schedule-conflicts";
import { LESSON_SLOTS } from "@/lib/lesson-slots";
import { schedule, type SchedulePlanInput } from "@/lib/schedule-generator";
import { jsDayToKey, useSchedule, type Lesson } from "@/lib/schedule-store";
import { Filters, emptyFilters, type FilterState } from "@/components/Filters/Filters";
import { ScheduleTable } from "@/components/ScheduleTable/ScheduleTable";
import { ScheduleForm } from "@/components/ScheduleForm/ScheduleForm";
import { YearScheduleForm } from "@/components/YearScheduleForm/YearScheduleForm";
import { ConflictDialog } from "@/components/ConflictDialog/ConflictDialog";
import s from "./schedule.module.css";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Расписание — управление занятиями" },
      { name: "description", content: "Просмотр, фильтрация и редактирование расписания преподавателей" },
    ],
  }),
  component: SchedulePage,
});

type PendingConflict =
  | { kind: "addLesson"; lesson: Omit<Lesson, "id">; conflicts: ScheduleConflict[] }
  | { kind: "updateLesson"; lesson: Lesson; conflicts: ScheduleConflict[] }
  | { kind: "createPlan"; input: SchedulePlanInput; conflicts: ScheduleConflict[] }
  | { kind: "updatePlan"; id: string; input: SchedulePlanInput; conflicts: ScheduleConflict[] };

function SchedulePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { lessons, plans, groups, add, update, remove, createPlan, updatePlan, removePlan } = useSchedule();
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [open, setOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [pendingConflict, setPendingConflict] = useState<PendingConflict | null>(null);

  const canModify = user?.role === "admin";

  // 1) Сначала ограничиваем по предметам преподавателя (RBAC)
  const scoped = useMemo(() => {
    if (user?.role === "teacher" && user.subjects.length > 0) {
      return lessons.filter((l) => user.subjects.includes(l.subject));
    }
    return lessons;
  }, [lessons, user]);

  const teachers = useMemo(() => Array.from(new Set(scoped.map((l) => l.teacher))).sort(), [scoped]);
  const subjects = useMemo(() => Array.from(new Set(scoped.map((l) => l.subject))).sort(), [scoped]);
  const groupsWithLessons = useMemo(
    () => Array.from(new Set(scoped.map((l) => l.group).filter(Boolean))).sort(),
    [scoped]
  );

  // 2) Применяем фильтры и сортировку
  const rows = useMemo(() => {
    const dayOrder = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 } as const;
    if (!filters.group) return [];
    return scoped
      .filter((l) => l.group === filters.group)
      .filter((l) => !filters.teacher || l.teacher === filters.teacher)
      .filter((l) => !filters.subject || l.subject === filters.subject)
      .filter((l) => !filters.day || l.day === filters.day)
      .filter((l) => {
        if (!filters.query.trim()) return true;
        const q = filters.query.toLowerCase();
        return [l.teacher, l.subject, l.room, l.group, l.date ?? ""].some((x) => x.toLowerCase().includes(q));
      })
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || dayOrder[a.day] - dayOrder[b.day] || a.time.localeCompare(b.time));
  }, [scoped, filters]);

  const findRelocationSlot = (lesson: Lesson, occupied: Lesson[]) => {
    for (const slot of LESSON_SLOTS) {
      const candidate = { ...lesson, time: slot.start, durationMinutes: 90 };
      const conflicts = findScheduleConflicts({ candidates: [candidate], lessons: occupied });
      if (conflicts.length === 0) return candidate;
    }
    return null;
  };

  const getNewLessonsForPendingConflict = (pending: PendingConflict): Omit<Lesson, "id">[] => {
    if (pending.kind === "addLesson") return [pending.lesson];
    if (pending.kind === "updateLesson") return [pending.lesson];
    if (pending.kind === "createPlan") return schedule(pending.input);
    return schedule(pending.input);
  };

  const getReplacementExcludedIds = (pending: PendingConflict, movingIds: string[]) => {
    const excluded = new Set(movingIds);
    if (pending.kind === "updateLesson") excluded.add(pending.lesson.id);
    if (pending.kind === "updatePlan") {
      for (const lesson of lessons) {
        if (lesson.sourcePlanId === pending.id) excluded.add(lesson.id);
      }
    }
    return excluded;
  };

  const normalizeManualLesson = (lesson: Omit<Lesson, "id">) => {
    if (!lesson.date) return lesson;
    const [year, month, day] = lesson.date.split("-").map(Number);
    return {
      ...lesson,
      day: jsDayToKey(new Date(year, month - 1, day).getDay()),
      durationMinutes: lesson.durationMinutes ?? 90,
    };
  };

  const saveLesson = (lesson: Omit<Lesson, "id">, current?: Lesson | null) => {
    const conflicts = findScheduleConflicts({
      candidates: [lesson],
      lessons,
      excludeLessonIds: current ? [current.id] : [],
    });

    if (conflicts.length > 0) {
      setPendingConflict(
        current
          ? { kind: "updateLesson", lesson: { ...current, ...lesson }, conflicts }
          : { kind: "addLesson", lesson, conflicts }
      );
      return false;
    }

    if (current) update({ ...current, ...lesson });
    else add(lesson);
    return true;
  };

  const savePlan = (input: SchedulePlanInput, id?: string) => {
    const generated = schedule(input);
    const conflicts = findScheduleConflicts({
      candidates: generated,
      lessons,
      excludePlanId: id,
    });

    if (conflicts.length > 0) {
      setPendingConflict(
        id
          ? { kind: "updatePlan", id, input, conflicts }
          : { kind: "createPlan", input, conflicts }
      );
      return false;
    }

    if (id) updatePlan(id, input);
    else createPlan(input);
    return true;
  };

  const replaceConflictingLessons = () => {
    if (!pendingConflict) return;

    const movingIds = uniqueConflictLessonIds(pendingConflict.conflicts);
    const excluded = getReplacementExcludedIds(pendingConflict, movingIds);
    const newLessons = getNewLessonsForPendingConflict(pendingConflict).map((lesson, index) => ({
      ...lesson,
      id: `pending-${index}`,
    }));
    const occupied: Lesson[] = [
      ...lessons.filter((lesson) => !excluded.has(lesson.id)),
      ...newLessons,
    ];
    const movedLessons: Lesson[] = [];

    for (const id of movingIds) {
      const lesson = lessons.find((item) => item.id === id);
      if (!lesson) continue;
      const moved = findRelocationSlot(lesson, occupied);
      if (!moved) {
        alert(`Не удалось перенести занятие "${lesson.subject}" в свободное время этого же дня. Освободите слот вручную.`);
        return;
      }
      movedLessons.push(moved);
      occupied.push(moved);
    }

    for (const lesson of movedLessons) {
      update(lesson);
    }

    if (pendingConflict.kind === "addLesson") {
      add(pendingConflict.lesson);
      setOpen(false);
    }
    if (pendingConflict.kind === "updateLesson") {
      update(pendingConflict.lesson);
      setOpen(false);
    }
    if (pendingConflict.kind === "createPlan") {
      createPlan(pendingConflict.input);
      setYearOpen(false);
    }
    if (pendingConflict.kind === "updatePlan") {
      updatePlan(pendingConflict.id, pendingConflict.input);
      setYearOpen(false);
    }

    setPendingConflict(null);
  };

  return (
    <main className={s.page}>
      <header className={s.header}>
        <div>
          <h1 className={s.title}>{t("schedule.title")}</h1>
          <p className={s.subtitle}>{t("dashboard.uploadHint")}</p>
        </div>
        {canModify && (
          <div className={s.headerActions}>
            <button className={s.secondaryBtn} onClick={() => setYearOpen(true)}>
              + {t("schedule.createYear")}
            </button>
            <button className={s.addBtn} onClick={() => { setEditing(null); setOpen(true); }}>
              + {t("schedule.add")}
            </button>
          </div>
        )}
      </header>

      <Filters state={filters} onChange={setFilters} teachers={teachers} subjects={subjects} groups={groupsWithLessons} />

      <ScheduleTable
        rows={rows}
        canModify={canModify}
        emptyMessage={!filters.group ? "Группа не выбрана" : undefined}
        onEdit={(l) => { setEditing(l); setOpen(true); }}
        onDelete={(l) => remove(l.id)}
      />

      {open && (
        <ScheduleForm
          initial={editing}
          groups={groups}
          onClose={() => setOpen(false)}
          onSubmit={(d) => {
            const lesson = normalizeManualLesson(d);
            if (saveLesson(lesson, editing)) setOpen(false);
          }}
        />
      )}

      {yearOpen && (
        <YearScheduleForm
          groups={groups}
          plans={plans}
          onClose={() => setYearOpen(false)}
          onCreate={(input) => savePlan(input)}
          onUpdate={(id, input) => savePlan(input, id)}
          onDelete={removePlan}
        />
      )}

      {pendingConflict && (
        <ConflictDialog
          conflicts={pendingConflict.conflicts}
          onCancel={() => setPendingConflict(null)}
          onReplace={replaceConflictingLessons}
        />
      )}
    </main>
  );
}
