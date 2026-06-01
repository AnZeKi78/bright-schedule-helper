import { useI18n } from "@/lib/i18n";
import type { Lesson } from "@/lib/schedule-store";
import { teacherColor, teacherColorDark } from "@/lib/teacher-colors";
import { useTheme } from "@/lib/theme";
import s from "./ScheduleTable.module.css";

const dayKeyToTKey: Record<string, string> = {
  mon: "day.mon", tue: "day.tue", wed: "day.wed", thu: "day.thu",
  fri: "day.fri", sat: "day.sat", sun: "day.sun",
};

export function ScheduleTable({
  rows,
  onEdit,
  onDelete,
  canModify,
}: {
  rows: Lesson[];
  onEdit?: (l: Lesson) => void;
  onDelete?: (l: Lesson) => void;
  canModify: boolean;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const palette = theme === "dark" ? teacherColorDark : teacherColor;

  if (rows.length === 0) {
    return (
      <div className={s.tableWrap}>
        <div className={s.empty}>{t("schedule.empty")}</div>
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
            <th>{t("table.day")}</th>
            <th>{t("table.time")}</th>
            <th>{t("table.room")}</th>
            <th>{t("table.group")}</th>
            {canModify && <th style={{ textAlign: "right" }}>{t("table.actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
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
                <td>{t(dayKeyToTKey[l.day])}</td>
                <td className={s.timeCell}>{l.time}</td>
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
        </tbody>
      </table>
    </div>
  );
}