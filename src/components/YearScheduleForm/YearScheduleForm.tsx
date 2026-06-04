import { useMemo, useState, type FormEvent } from "react";
import { Calculator, CalendarDays, Pencil, Plus, Trash2, Users } from "lucide-react";
import { getTimeLabel, LESSON_SLOTS } from "@/lib/lesson-slots";
import {
  getKazakhstanHolidayPreset,
  LESSON_HOURS,
  normalizeWeeklySlots,
  schedule,
  type DateRange,
  type SchedulePlanInput,
  type WeeklyLessonSlot,
} from "@/lib/schedule-generator";
import type { DayKey, SchedulePlan } from "@/lib/schedule-store";
import s from "./YearScheduleForm.module.css";

const thisYear = new Date().getFullYear();
const dayOptions: Array<{ key: DayKey; label: string }> = [
  { key: "mon", label: "Понедельник" },
  { key: "tue", label: "Вторник" },
  { key: "wed", label: "Среда" },
  { key: "thu", label: "Четверг" },
  { key: "fri", label: "Пятница" },
];

const emptyDraft: SchedulePlanInput = {
  subject: "",
  maxHours: 90,
  teacher: "",
  group: "",
  room: "",
  startDate: `${thisYear}-09-01`,
  time: "08:30",
  weeklySlots: [{ day: "mon", time: "08:30" }],
  holidays: [],
  practiceRanges: [],
};

function getPairLabel(time: string) {
  return LESSON_SLOTS.find((slot) => slot.start === time)?.pair ?? null;
}

function sortWeeklySlots(slots: WeeklyLessonSlot[]) {
  const order = new Map(dayOptions.map((day, index) => [day.key, index]));
  return [...slots].sort((a, b) => (order.get(a.day) ?? 99) - (order.get(b.day) ?? 99) || a.time.localeCompare(b.time));
}

function getPlanSlots(plan: SchedulePlanInput) {
  if (plan.weeklySlots) return sortWeeklySlots(plan.weeklySlots);
  return normalizeWeeklySlots(plan);
}

function normalizeDraft(plan: SchedulePlanInput): SchedulePlanInput {
  const weeklySlots = sortWeeklySlots(
    Array.from(
      new Map((plan.weeklySlots ?? []).filter((slot) => slot.day && slot.time).map((slot) => [`${slot.day}-${slot.time}`, slot])).values()
    )
  );

  return {
    ...plan,
    subject: plan.subject.trim(),
    teacher: plan.teacher.trim(),
    group: plan.group.trim(),
    room: plan.room.trim(),
    time: weeklySlots[0]?.time ?? plan.time,
    weeklySlots,
    holidays: Array.from(new Set(plan.holidays)).sort(),
    practiceRanges: plan.practiceRanges.filter((range) => range.start && range.end),
  };
}

export function YearScheduleForm({
  groups,
  plans,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: {
  groups: string[];
  plans: SchedulePlan[];
  onClose: () => void;
  onCreate: (input: SchedulePlanInput) => boolean | void;
  onUpdate: (id: string, input: SchedulePlanInput) => boolean | void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<SchedulePlanInput>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [holidayDate, setHolidayDate] = useState("");
  const [practiceStart, setPracticeStart] = useState("");
  const [practiceEnd, setPracticeEnd] = useState("");
  const [groupsOpen, setGroupsOpen] = useState(false);

  const lessonCount = useMemo(() => Math.ceil((Number(draft.maxHours) || 0) / LESSON_HOURS), [draft.maxHours]);
  const weeklySlots = useMemo(() => getPlanSlots(draft), [draft]);
  const preview = useMemo(() => {
    if (!draft.subject || !draft.teacher || !draft.group || !draft.startDate || !draft.maxHours) return null;
    try {
      const rows = schedule(normalizeDraft(draft));
      return rows.length > 0 ? rows[rows.length - 1] : null;
    } catch {
      return null;
    }
  }, [draft]);

  const toggleWeeklySlot = (day: DayKey, time: string) => {
    setDraft((current) => {
      const currentSlots = current.weeklySlots ?? [];
      const exists = currentSlots.some((slot) => slot.day === day && slot.time === time);
      const nextSlots = exists
        ? currentSlots.filter((slot) => !(slot.day === day && slot.time === time))
        : [...currentSlots, { day, time }];

      return {
        ...current,
        time: nextSlots[0]?.time ?? current.time,
        weeklySlots: sortWeeklySlots(nextSlots),
      };
    });
  };

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

  const validate = () => {
    const clean = normalizeDraft(draft);
    if (!clean.subject || !clean.teacher || !clean.group || !clean.room || !clean.startDate) {
      alert("Заполните предмет, преподавателя, группу, кабинет и дату начала.");
      return null;
    }
    if (clean.maxHours <= 0) {
      alert("Максимум часов должен быть больше нуля.");
      return null;
    }
    if ((clean.weeklySlots ?? []).length === 0) {
      alert("Выберите хотя бы одну пару в недельном шаблоне.");
      return null;
    }
    if (clean.holidays.length === 0) {
      alert("Обязательно выберите праздничные/выходные даты, чтобы система не поставила на них занятия.");
      return null;
    }
    if (clean.practiceRanges.length === 0) {
      alert("Обязательно выберите даты практики, чтобы система не поставила на них занятия.");
      return null;
    }
    try {
      schedule(clean);
    } catch {
      alert("Не удалось разместить все занятия в пределах одного учебного года. Уменьшите часы или проверьте исключённые даты.");
      return null;
    }
    return clean;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const clean = validate();
    if (!clean) return;

    const saved = editingId ? onUpdate(editingId, clean) : onCreate(clean);
    if (saved === false) return;

    setDraft(emptyDraft);
    setEditingId(null);
    setGroupsOpen(false);
  };

  const editPlan = (plan: SchedulePlan) => {
    setDraft({
      subject: plan.subject,
      maxHours: plan.maxHours,
      teacher: plan.teacher,
      group: plan.group,
      room: plan.room,
      startDate: plan.startDate,
      time: plan.time,
      weeklySlots: getPlanSlots(plan),
      holidays: plan.holidays,
      practiceRanges: plan.practiceRanges,
    });
    setEditingId(plan.id);
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(event) => event.stopPropagation()}>
        <div className={s.header}>
          <div>
            <h2 className={s.title}>Создание расписания предмета</h2>
            <p className={s.subtitle}>Один предмет на учебный год: рабочие дни, праздники и практика учитываются автоматически.</p>
          </div>
          <button type="button" className={s.closeBtn} onClick={onClose}>×</button>
        </div>

        <form className={s.form} onSubmit={handleSubmit}>
          <div className={s.grid}>
            <label className={`${s.field} ${s.full}`}>
              <span>Название предмета</span>
              <input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} required />
            </label>
            <label className={s.field}>
              <span>Максимум часов</span>
              <input
                type="number"
                min="1"
                step="0.5"
                value={draft.maxHours}
                onChange={(event) => setDraft({ ...draft, maxHours: Number(event.target.value) })}
                required
              />
            </label>
            <div className={s.calculator}>
              <Calculator data-icon="inline-start" />
              <span>{lessonCount || 0} пар по 1.5 часа</span>
              <span>{weeklySlots.length || 0} пар в неделю</span>
              {preview?.date && <strong>до {preview.date}</strong>}
            </div>
            <label className={s.field}>
              <span>Преподаватель</span>
              <input value={draft.teacher} onChange={(event) => setDraft({ ...draft, teacher: event.target.value })} required />
            </label>
            <label className={s.field}>
              <span>Кабинет</span>
              <input value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} required />
            </label>
            <div className={`${s.field} ${s.full}`}>
              <span>Группа</span>
              <div className={s.groupRow}>
                <input value={draft.group} onChange={(event) => setDraft({ ...draft, group: event.target.value })} required />
                <button type="button" className={s.secondaryBtn} onClick={() => setGroupsOpen((value) => !value)}>
                  <Users data-icon="inline-start" />
                  Выбрать группу
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
            <label className={s.field}>
              <span>Дата начала пары</span>
              <input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} required />
            </label>
          </div>

          <section className={s.dateBlock}>
            <div className={s.blockHead}>
              <div>
                <h3>Шаблон недели</h3>
                <p>Выберите конкретные пары по дням. Можно поставить несколько пар одного предмета в один день.</p>
              </div>
              <div className={s.patternStat}>{weeklySlots.length} пар в неделю</div>
            </div>
            <div className={s.patternGrid}>
              {dayOptions.map((day) => (
                <div key={day.key} className={s.patternDay}>
                  <div className={s.patternDayName}>{day.label}</div>
                  <div className={s.slotGrid}>
                    {LESSON_SLOTS.map((slot) => {
                      const active = weeklySlots.some((item) => item.day === day.key && item.time === slot.start);
                      return (
                        <button
                          type="button"
                          key={`${day.key}-${slot.start}`}
                          className={`${s.slotBtn} ${active ? s.slotBtnActive : ""}`}
                          onClick={() => toggleWeeklySlot(day.key, slot.start)}
                          title={`${slot.pair} пара · ${getTimeLabel(slot.start)}`}
                        >
                          <span>{slot.pair}</span>
                          <small>{getTimeLabel(slot.start)}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className={s.patternSummary}>
              {weeklySlots.length === 0 ? (
                <span className={s.muted}>Пока не выбрано ни одной пары</span>
              ) : (
                weeklySlots.map((slot) => {
                  const day = dayOptions.find((item) => item.key === slot.day)?.label ?? slot.day;
                  const pair = getPairLabel(slot.time);
                  return (
                    <span key={`${slot.day}-${slot.time}`} className={s.patternChip}>
                      {day}, {pair ? `${pair} пара` : slot.time}
                    </span>
                  );
                })
              )}
            </div>
          </section>

          <section className={s.dateBlock}>
            <div className={s.blockHead}>
              <div>
                <h3>Праздники и выходные</h3>
                <p>Выбор обязателен. Эти даты функция weekend исключит из расписания.</p>
              </div>
              <button
                type="button"
                className={s.secondaryBtn}
                onClick={() => setDraft((current) => ({ ...current, holidays: Array.from(new Set([...current.holidays, ...getKazakhstanHolidayPreset(current.startDate)])).sort() }))}
              >
                <CalendarDays data-icon="inline-start" />
                Праздники РК
              </button>
            </div>
            <div className={s.inlineAdd}>
              <input type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} />
              <button type="button" className={s.secondaryBtn} onClick={() => addHoliday(holidayDate)}>
                <Plus data-icon="inline-start" />
                Добавить
              </button>
            </div>
            <div className={s.chips}>
              {draft.holidays.map((date) => (
                <button type="button" key={date} className={s.chip} onClick={() => setDraft({ ...draft, holidays: draft.holidays.filter((item) => item !== date) })}>
                  {date} ×
                </button>
              ))}
              {draft.holidays.length === 0 && <span className={s.muted}>Пока не выбрано</span>}
            </div>
          </section>

          <section className={s.dateBlock}>
            <div className={s.blockHead}>
              <div>
                <h3>Даты практики</h3>
                <p>Выбор обязателен. Эти периоды функция practic исключит из расписания.</p>
              </div>
            </div>
            <div className={s.inlineAdd}>
              <input type="date" value={practiceStart} onChange={(event) => setPracticeStart(event.target.value)} />
              <input type="date" value={practiceEnd} onChange={(event) => setPracticeEnd(event.target.value)} />
              <button type="button" className={s.secondaryBtn} onClick={addPractice}>
                <Plus data-icon="inline-start" />
                Добавить
              </button>
            </div>
            <div className={s.chips}>
              {draft.practiceRanges.map((range: DateRange, index) => (
                <button
                  type="button"
                  key={`${range.start}-${range.end}-${index}`}
                  className={s.chip}
                  onClick={() => setDraft({ ...draft, practiceRanges: draft.practiceRanges.filter((_, itemIndex) => itemIndex !== index) })}
                >
                  {range.start} - {range.end} ×
                </button>
              ))}
              {draft.practiceRanges.length === 0 && <span className={s.muted}>Пока не выбрано</span>}
            </div>
          </section>

          <div className={s.actions}>
            {editingId && (
              <button
                type="button"
                className={s.secondaryBtn}
                onClick={() => {
                  setDraft(emptyDraft);
                  setEditingId(null);
                }}
              >
                Отменить изменение
              </button>
            )}
            <button type="submit" className={s.primaryBtn}>
              {editingId ? "Сохранить изменения" : "Создать расписание"}
            </button>
          </div>
        </form>

        <section className={s.planList}>
          <h3>Созданные предметы</h3>
          {plans.length === 0 && <p className={s.muted}>Пока нет созданных расписаний.</p>}
          {plans.map((plan) => {
            const slots = getPlanSlots(plan);
            return (
              <article key={plan.id} className={s.planCard}>
                <div>
                  <strong>{plan.subject}</strong>
                  <span>{plan.teacher} · {plan.group} · {plan.lessonIds.length} пар · {slots.length} пар в неделю</span>
                </div>
                <div className={s.planActions}>
                  <button type="button" className={s.smallBtn} onClick={() => editPlan(plan)}>
                    <Pencil data-icon="inline-start" />
                    Изменить
                  </button>
                  <button
                    type="button"
                    className={`${s.smallBtn} ${s.dangerBtn}`}
                    onClick={() => {
                      if (confirm("Удалить предмет и все созданные для него занятия?")) onDelete(plan.id);
                    }}
                  >
                    <Trash2 data-icon="inline-start" />
                    Удалить
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
