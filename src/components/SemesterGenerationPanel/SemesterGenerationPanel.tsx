import { useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Check, Plus, Trash2, WandSparkles, X } from "lucide-react";
import {
  getKazakhstanHolidayPreset,
  LESSON_HOURS,
  type DateRange,
  type SemesterGenerationInput,
} from "@/lib/schedule-generator";
import type { LessonTemplate, SemesterGenerationResult, TeacherRecord } from "@/lib/schedule-store";
import { getSiteNow } from "@/lib/site-time";
import s from "./SemesterGenerationPanel.module.css";

const thisYear = getSiteNow().year;
const emptyDraft: SemesterGenerationInput = {
  startDate: `${thisYear}-09-01`,
  endDate: `${thisYear}-12-31`,
  holidays: [],
  practiceRanges: [],
};

function getPairs(hours: number) {
  return Math.ceil((Number(hours) || 0) / LESSON_HOURS);
}

export function SemesterGenerationPanel({
  templates,
  groups,
  teachers,
  rooms,
  onClose,
  onGenerate,
}: {
  templates: LessonTemplate[];
  groups: string[];
  teachers: TeacherRecord[];
  rooms: string[];
  onClose: () => void;
  onGenerate: (input: SemesterGenerationInput) => SemesterGenerationResult;
}) {
  const [draft, setDraft] = useState<SemesterGenerationInput>(emptyDraft);
  const [holidayDate, setHolidayDate] = useState("");
  const [practiceStart, setPracticeStart] = useState("");
  const [practiceEnd, setPracticeEnd] = useState("");

  const totals = useMemo(() => {
    const hours = templates.reduce((sum, template) => sum + template.semesterHours, 0);
    const pairs = templates.reduce((sum, template) => sum + getPairs(template.semesterHours), 0);
    return { hours, pairs };
  }, [templates]);

  const addHoliday = (date: string) => {
    if (!date) return;
    setDraft((current) => ({
      ...current,
      holidays: Array.from(new Set([...current.holidays, date])).sort(),
    }));
    setHolidayDate("");
  };

  const addPractice = () => {
    if (!practiceStart || !practiceEnd) return;
    if (practiceStart > practiceEnd) {
      alert("Дата начала практики не может быть позже даты окончания.");
      return;
    }
    setDraft((current) => ({
      ...current,
      practiceRanges: [...current.practiceRanges, { start: practiceStart, end: practiceEnd }],
    }));
    setPracticeStart("");
    setPracticeEnd("");
  };

  const addHolidayPreset = () => {
    const preset = getKazakhstanHolidayPreset(draft.startDate).filter(
      (date) => date >= draft.startDate && date <= draft.endDate,
    );
    setDraft((current) => ({
      ...current,
      holidays: Array.from(new Set([...current.holidays, ...preset])).sort(),
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (templates.length === 0) {
      alert("Во вкладке Данные нет занятий для генерации.");
      return;
    }
    if (groups.length === 0 || teachers.length === 0 || rooms.length === 0) {
      alert("Заполните группы, преподавателей и кабинеты во вкладке Данные.");
      return;
    }
    const templateWithoutTeacher = templates.find(
      (template) => !teachers.some((teacher) => teacher.groups.includes(template.group)),
    );
    if (templateWithoutTeacher) {
      alert(`Для группы ${templateWithoutTeacher.group} нет преподавателя.`);
      return;
    }
    if (!draft.startDate || !draft.endDate) {
      alert("Выберите начало и конец периода генерации.");
      return;
    }
    if (draft.startDate > draft.endDate) {
      alert("Дата начала периода не может быть позже даты окончания.");
      return;
    }

    try {
      onGenerate({
        ...draft,
        holidays: Array.from(new Set(draft.holidays)).sort(),
        practiceRanges: draft.practiceRanges.filter((range) => range.start && range.end),
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Не удалось сгенерировать расписание.");
    }
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <section className={s.panel} onClick={(event) => event.stopPropagation()}>
        <header className={s.header}>
          <div>
            <h2>Генерация расписания на семестр</h2>
            <p>
              {templates.length} предметов · {totals.hours} часов · {totals.pairs} пар
            </p>
          </div>
          <button type="button" className={s.closeBtn} onClick={onClose} title="Закрыть">
            <X />
          </button>
        </header>

        <form className={s.form} onSubmit={handleSubmit}>
          <section className={s.block}>
            <div className={s.blockHead}>
              <h3>Период</h3>
            </div>
            <div className={s.periodGrid}>
              <label className={s.field}>
                <span>Начало</span>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                  required
                />
              </label>
              <label className={s.field}>
                <span>Конец</span>
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                  required
                />
              </label>
            </div>
          </section>

          <section className={s.block}>
            <div className={s.blockHead}>
              <h3>Праздники</h3>
              <button type="button" className={s.secondaryBtn} onClick={addHolidayPreset}>
                <CalendarDays />
                Праздники РК
              </button>
            </div>
            <div className={s.inlineAdd}>
              <input
                type="date"
                value={holidayDate}
                onChange={(event) => setHolidayDate(event.target.value)}
              />
              <button
                type="button"
                className={s.secondaryBtn}
                onClick={() => addHoliday(holidayDate)}
              >
                <Plus />
                Добавить
              </button>
            </div>
            <div className={s.chips}>
              {draft.holidays.length === 0 && <span className={s.muted}>Не выбрано</span>}
              {draft.holidays.map((date) => (
                <button
                  type="button"
                  key={date}
                  className={s.chip}
                  onClick={() =>
                    setDraft({ ...draft, holidays: draft.holidays.filter((item) => item !== date) })
                  }
                >
                  {date}
                  <Trash2 />
                </button>
              ))}
            </div>
          </section>

          <section className={s.block}>
            <div className={s.blockHead}>
              <h3>Практика</h3>
            </div>
            <div className={s.inlineAdd}>
              <input
                type="date"
                value={practiceStart}
                onChange={(event) => setPracticeStart(event.target.value)}
              />
              <input
                type="date"
                value={practiceEnd}
                onChange={(event) => setPracticeEnd(event.target.value)}
              />
              <button type="button" className={s.secondaryBtn} onClick={addPractice}>
                <Plus />
                Добавить
              </button>
            </div>
            <div className={s.chips}>
              {draft.practiceRanges.length === 0 && <span className={s.muted}>Не выбрано</span>}
              {draft.practiceRanges.map((range: DateRange, index) => (
                <button
                  type="button"
                  key={`${range.start}-${range.end}-${index}`}
                  className={s.chip}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      practiceRanges: draft.practiceRanges.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  {range.start} - {range.end}
                  <Trash2 />
                </button>
              ))}
            </div>
          </section>

          <section className={s.dataPreview}>
            <div className={s.previewHead}>
              <WandSparkles />
              <strong>Данные для генерации</strong>
            </div>
            <div className={s.previewList}>
              {templates.slice(0, 5).map((template) => (
                <span key={template.id}>
                  {template.group} · {template.subject} · {getPairs(template.semesterHours)} пар
                </span>
              ))}
              {templates.length > 5 && <span>+ ещё {templates.length - 5}</span>}
              {templates.length === 0 && <span>Нет занятий во вкладке Данные</span>}
              {groups.length > 0 && <span>{groups.length} групп</span>}
              {teachers.length > 0 && <span>{teachers.length} преподавателей</span>}
              {rooms.length > 0 && <span>{rooms.length} кабинетов</span>}
            </div>
          </section>

          <div className={s.actions}>
            <button type="button" className={s.secondaryBtn} onClick={onClose}>
              <X />
              Отмена
            </button>
            <button type="submit" className={s.primaryBtn}>
              <Check />
              Готово
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
