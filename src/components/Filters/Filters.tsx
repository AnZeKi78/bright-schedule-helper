import { useI18n, DAY_KEYS } from "@/lib/i18n";
import type { DayKey } from "@/lib/schedule-store";
import s from "./Filters.module.css";

export type FilterState = {
  group: string;
  teacher: string;
  subject: string;
  day: DayKey | "";
  query: string;
};

export const emptyFilters: FilterState = { group: "", teacher: "", subject: "", day: "", query: "" };

export function Filters({
  state,
  onChange,
  teachers,
  subjects,
  groups,
}: {
  state: FilterState;
  onChange: (s: FilterState) => void;
  teachers: string[];
  subjects: string[];
  groups: string[];
}) {
  const { t } = useI18n();
  const set = (patch: Partial<FilterState>) => onChange({ ...state, ...patch });

  return (
    <div className={s.wrap}>
      <div className={s.field}>
        <label className={s.label}>Группа</label>
        <select className={s.select} value={state.group} onChange={(e) => set({ group: e.target.value })}>
          <option value="" disabled hidden>Выберите группу</option>
          {groups.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className={s.field}>
        <label className={s.label}>{t("filters.teacher")}</label>
        <select className={s.select} value={state.teacher} onChange={(e) => set({ teacher: e.target.value })}>
          <option value="">{t("filters.all")}</option>
          {teachers.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className={s.field}>
        <label className={s.label}>{t("filters.subject")}</label>
        <select className={s.select} value={state.subject} onChange={(e) => set({ subject: e.target.value })}>
          <option value="">{t("filters.all")}</option>
          {subjects.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className={s.field}>
        <label className={s.label}>{t("filters.day")}</label>
        <select className={s.select} value={state.day} onChange={(e) => set({ day: e.target.value as DayKey | "" })}>
          <option value="">{t("filters.all")}</option>
          {DAY_KEYS.map((k, i) => {
            const code = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as DayKey[])[i];
            return (
              <option key={code} value={code}>{t(k)}</option>
            );
          })}
        </select>
      </div>
      <div className={s.field}>
        <label className={s.label}>—</label>
        <input
          className={s.input}
          placeholder="Поиск / Іздеу"
          value={state.query}
          onChange={(e) => set({ query: e.target.value })}
        />
      </div>
      <button className={s.resetBtn} onClick={() => onChange(emptyFilters)}>{t("filters.reset")}</button>
    </div>
  );
}
