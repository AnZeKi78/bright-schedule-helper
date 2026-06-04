import { useState, type FormEvent } from "react";
import { Users } from "lucide-react";
import { useI18n, DAY_KEYS } from "@/lib/i18n";
import type { DayKey, Lesson } from "@/lib/schedule-store";
import s from "./ScheduleForm.module.css";

type Draft = Omit<Lesson, "id"> & { id?: string };

const emptyDraft: Draft = {
  teacher: "",
  subject: "",
  day: "mon",
  time: "09:00",
  room: "",
  group: "",
  date: "",
  durationMinutes: 90,
};

export function ScheduleForm({
  initial,
  groups,
  onClose,
  onSubmit,
}: {
  initial?: Lesson | null;
  groups: string[];
  onClose: () => void;
  onSubmit: (data: Draft) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Draft>(initial ?? emptyDraft);
  const [groupsOpen, setGroupsOpen] = useState(false);

  const handle = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.teacher.trim() || !draft.subject.trim() || !draft.group.trim() || !draft.room.trim()) return;
    onSubmit({
      ...draft,
      teacher: draft.teacher.trim(),
      subject: draft.subject.trim(),
      room: draft.room.trim(),
      group: draft.group.trim(),
      date: draft.date || undefined,
    });
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <form className={s.modal} onClick={(event) => event.stopPropagation()} onSubmit={handle}>
        <h2 className={s.title}>{initial ? t("schedule.edit") : t("schedule.add")}</h2>
        <div className={s.grid}>
          <div className={`${s.field} ${s.full}`}>
            <label className={s.label}>{t("form.teacher")}</label>
            <input className={s.input} value={draft.teacher} onChange={(event) => setDraft({ ...draft, teacher: event.target.value })} required />
          </div>
          <div className={`${s.field} ${s.full}`}>
            <label className={s.label}>{t("form.subject")}</label>
            <input className={s.input} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} required />
          </div>
          <div className={s.field}>
            <label className={s.label}>{t("form.day")}</label>
            <select className={s.select} value={draft.day} onChange={(event) => setDraft({ ...draft, day: event.target.value as DayKey })}>
              {DAY_KEYS.map((key, index) => {
                const code = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as DayKey[])[index];
                return <option key={code} value={code}>{t(key)}</option>;
              })}
            </select>
          </div>
          <div className={s.field}>
            <label className={s.label}>{t("form.date")}</label>
            <input type="date" className={s.input} value={draft.date ?? ""} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
          </div>
          <div className={s.field}>
            <label className={s.label}>{t("form.time")}</label>
            <input type="time" className={s.input} value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} />
          </div>
          <div className={s.field}>
            <label className={s.label}>{t("form.room")}</label>
            <input className={s.input} value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} required />
          </div>
          <div className={`${s.field} ${s.full}`}>
            <label className={s.label}>{t("form.group")}</label>
            <div className={s.groupRow}>
              <input className={s.input} value={draft.group} onChange={(event) => setDraft({ ...draft, group: event.target.value })} required />
              <button type="button" className={s.iconBtn} onClick={() => setGroupsOpen((value) => !value)} title={t("form.chooseGroup")}>
                <Users data-icon="inline-start" />
                {t("form.chooseGroup")}
              </button>
            </div>
            {groupsOpen && (
              <div className={s.groupPanel}>
                {groups.map((group) => (
                  <button
                    type="button"
                    key={group}
                    className={`${s.groupOption} ${draft.group === group ? s.groupOptionActive : ""}`}
                    onClick={() => {
                      setDraft({ ...draft, group });
                      setGroupsOpen(false);
                    }}
                  >
                    {group}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={s.actions}>
          <button type="button" className={s.btn} onClick={onClose}>{t("form.cancel")}</button>
          <button type="submit" className={`${s.btn} ${s.btnPrimary}`}>{t("form.save")}</button>
        </div>
      </form>
    </div>
  );
}
