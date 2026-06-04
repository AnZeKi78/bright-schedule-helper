import { Fragment, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { getTimeLabel } from "@/lib/lesson-slots";
import type { Lesson } from "@/lib/schedule-store";
import { teacherColor, teacherColorDark } from "@/lib/teacher-colors";
import { useTheme } from "@/lib/theme";
import s from "./ScheduleTable.module.css";

const dayKeyToTKey: Record<string, string> = {
  mon: "day.mon", tue: "day.tue", wed: "day.wed", thu: "day.thu",
  fri: "day.fri", sat: "day.sat", sun: "day.sun",
};

const dayOrder = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 } as const;

function parseIsoDate(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function weekStart(date: Date) {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildGroups(rows: Lesson[], t: (key: string) => string) {
  const sorted = [...rows].sort((a, b) => {
    const aDate = a.date ?? "";
    const bDate = b.date ?? "";
    return aDate.localeCompare(bDate) || dayOrder[a.day] - dayOrder[b.day] || a.time.localeCompare(b.time);
  });

  const weeks = new Map<string, { label: string; days: Map<string, { label: string; rows: Lesson[] }> }>();

  for (const lesson of sorted) {
    const parsed = parseIsoDate(lesson.date);
    const start = parsed ? weekStart(parsed) : null;
    const weekKey = start ? dateKey(start) : "without-date";
    const weekLabel = start
      ? `${t("table.week")} ${formatDate(start)} - ${formatDate(addDays(start, 6))}`
      : t("table.noDate");
    const dayKey = parsed ? dateKey(parsed) : lesson.day;
    const dayLabel = parsed ? `${t(dayKeyToTKey[lesson.day])} · ${formatDate(parsed)}` : t(dayKeyToTKey[lesson.day]);

    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, { label: weekLabel, days: new Map() });
    }

    const week = weeks.get(weekKey);
    if (!week) continue;
    if (!week.days.has(dayKey)) {
      week.days.set(dayKey, { label: dayLabel, rows: [] });
    }

    week.days.get(dayKey)?.rows.push(lesson);
  }

  return Array.from(weeks, ([key, week]) => ({
    key,
    label: week.label,
    days: Array.from(week.days, ([dayKey, day]) => ({ key: dayKey, ...day })),
  }));
}

export function ScheduleTable({
  rows,
  onEdit,
  onDelete,
  canModify,
  emptyMessage,
}: {
  rows: Lesson[];
  onEdit?: (l: Lesson) => void;
  onDelete?: (l: Lesson) => void;
  canModify: boolean;
  emptyMessage?: string;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const palette = theme === "dark" ? teacherColorDark : teacherColor;
  const colSpan = canModify ? 9 : 8;
  const groups = useMemo(() => buildGroups(rows, t), [rows, t]);

  if (rows.length === 0) {
    return (
      <div className={s.tableWrap}>
        <div className={s.empty}>{emptyMessage ?? t("schedule.empty")}</div>
      </div>
    );
  }

  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>{t("table.teacher")}</th>
            <th>{t("table.subject")}</th>
            <th>{t("table.date")}</th>
            <th>{t("table.day")}</th>
            <th>{t("table.time")}</th>
            <th>{t("table.duration")}</th>
            <th>{t("table.room")}</th>
            <th>{t("table.group")}</th>
            {canModify && <th style={{ textAlign: "right" }}>{t("table.actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {groups.map((week) => (
            <Fragment key={week.key}>
              <tr className={s.weekRow}>
                <td colSpan={colSpan}>{week.label}</td>
              </tr>
              {week.days.map((day) => (
                <Fragment key={`${week.key}-${day.key}`}>
                  <tr className={s.dayRow}>
                    <td colSpan={colSpan}>{day.label}</td>
                  </tr>
                  {day.rows.map((l) => {
                    const c = palette(l.teacher);
                    return (
                      <tr key={l.id}>
                        <td>
                          <span
                            className={s.teacherCell}
                            style={{ background: c.bg, color: c.text, borderColor: c.border }}
                          >
                            {l.teacher}
                          </span>
                        </td>
                        <td>
                          <span className={s.subjectBlock} style={{ borderColor: c.border, background: c.bg, color: c.text }}>
                            {l.subject}
                          </span>
                        </td>
                        <td>{l.date ?? "—"}</td>
                        <td>{t(dayKeyToTKey[l.day])}</td>
                        <td className={s.timeCell}>{getTimeLabel(l.time)}</td>
                        <td>{l.durationMinutes ? `${l.durationMinutes / 60} ч` : "—"}</td>
                        <td>{l.room}</td>
                        <td>{l.group}</td>
                        {canModify && (
                          <td>
                            <div className={s.actions}>
                              <button className={s.btn} onClick={() => onEdit?.(l)}>{t("schedule.edit")}</button>
                              <button
                                className={`${s.btn} ${s.btnDanger}`}
                                onClick={() => {
                                  if (confirm(t("schedule.confirmDelete"))) onDelete?.(l);
                                }}
                              >
                                {t("schedule.delete")}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
