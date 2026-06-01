import { useState, type FormEvent } from "react";
import { useI18n, DAY_KEYS } from "@/lib/i18n";
import type { DayKey, Lesson } from "@/lib/schedule-store";
import s from "./ScheduleForm.module.css";

type Draft = Omit<Lesson, "id"> & { id?: string };

const emptyDraft: Draft = { teacher: "", subject: "", day: "mon", time: "09:00", room: "", group: "" };

export function ScheduleForm({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: Lesson | null;
  onClose: () => void;
  onSubmit: (data: Draft) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Draft>(initial ?? emptyDraft);

  const handle = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.teacher || !draft.subject) return;
    onSubmit(draft);
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <form className={s.modal} onClick={(e) => e.stopPropagation()} onSubmit={handle}>
        <h2 className={s.title}>{initial ? t("schedule.edit") : t("schedule.add")}</h2>
        <div className={s.grid}>
          <div className={`${s.field} ${s.full}`}>
            <label className={s.label}>{t("form.teacher")}</label>
            <input className={s.input} value={draft.teacher} onChange={(e) => setDraft({ ...draft, teacher: e.target.value })} required />
          </div>
          <div className={`${s.field} ${s.full}`}>
            <label className={s.label}>{t("form.subject")}</label>
            <input className={s.input} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} required />
          </div>
          <div className={s.field}>
            <label className={s.label}>{t("form.day")}</label>
            <select className={s.select} value={draft.day} onChange={(e) => setDraft({ ...draft, day: e.target.value as DayKey })}>
              {DAY_KEYS.map((k, i) => {
                const code = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as DayKey[])[i];
                return <option key={code} value={code}>{t(k)}</option>;
              })}
            </select>
          </div>
          <div className={s.field}>
            <label className={s.label}>{t("form.time")}</label>
            <input type="time" className={s.input} value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
          </div>
          <div className={s.field}>
            <label className={s.label}>{t("form.room")}</label>
            <input className={s.input} value={draft.room} onChange={(e) => setDraft({ ...draft, room: e.target.value })} />
          </div>
          <div className={s.field}>
            <label className={s.label}>{t("form.group")}</label>
            <input className={s.input} value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })} />
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