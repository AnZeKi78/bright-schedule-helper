import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useSchedule, type Lesson } from "@/lib/schedule-store";
import { Filters, emptyFilters, type FilterState } from "@/components/Filters/Filters";
import { ScheduleTable } from "@/components/ScheduleTable/ScheduleTable";
import { ScheduleForm } from "@/components/ScheduleForm/ScheduleForm";
import { UploadExcel } from "@/components/UploadExcel/UploadExcel";
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

function SchedulePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { lessons, add, update, remove } = useSchedule();
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [open, setOpen] = useState(false);

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

  // 2) Применяем фильтры и сортировку
  const rows = useMemo(() => {
    const dayOrder = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 } as const;
    return scoped
      .filter((l) => !filters.teacher || l.teacher === filters.teacher)
      .filter((l) => !filters.subject || l.subject === filters.subject)
      .filter((l) => !filters.day || l.day === filters.day)
      .filter((l) => {
        if (!filters.query.trim()) return true;
        const q = filters.query.toLowerCase();
        return [l.teacher, l.subject, l.room, l.group].some((x) => x.toLowerCase().includes(q));
      })
      .sort((a, b) => dayOrder[a.day] - dayOrder[b.day] || a.time.localeCompare(b.time));
  }, [scoped, filters]);

  return (
    <main className={s.page}>
      <header className={s.header}>
        <div>
          <h1 className={s.title}>{t("schedule.title")}</h1>
          <p className={s.subtitle}>{t("dashboard.uploadHint")}</p>
        </div>
        {canModify && (
          <button className={s.addBtn} onClick={() => { setEditing(null); setOpen(true); }}>
            + {t("schedule.add")}
          </button>
        )}
      </header>

      {canModify && (
        <section className={s.uploadSection}>
          <UploadExcel />
        </section>
      )}

      <Filters state={filters} onChange={setFilters} teachers={teachers} subjects={subjects} />

      <ScheduleTable
        rows={rows}
        canModify={canModify}
        onEdit={(l) => { setEditing(l); setOpen(true); }}
        onDelete={(l) => remove(l.id)}
      />

      {open && (
        <ScheduleForm
          initial={editing}
          onClose={() => setOpen(false)}
          onSubmit={(d) => {
            if (editing) update({ ...editing, ...d });
            else add(d);
            setOpen(false);
          }}
        />
      )}
    </main>
  );
}