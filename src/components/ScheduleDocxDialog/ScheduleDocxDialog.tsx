import { Download, FileDown, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { downloadScheduleDocx } from "@/lib/docx-export";
import type { Lesson } from "@/lib/schedule-store";
import s from "./ScheduleDocxDialog.module.css";

function getDateBounds(lessons: Lesson[]) {
  const dates = lessons
    .map((lesson) => lesson.date)
    .filter((date): date is string => Boolean(date))
    .sort();

  return {
    start: dates[0] ?? "",
    end: dates[dates.length - 1] ?? "",
  };
}

export function ScheduleDocxDialog({
  lessons,
  groups,
  onClose,
}: {
  lessons: Lesson[];
  groups: string[];
  onClose: () => void;
}) {
  const bounds = useMemo(() => getDateBounds(lessons), [lessons]);
  const maxGroups = Math.min(4, groups.length);
  const [groupCount, setGroupCount] = useState(Math.max(1, maxGroups));
  const [selectedGroups, setSelectedGroups] = useState(() =>
    groups.slice(0, Math.max(1, maxGroups)),
  );
  const [startDate, setStartDate] = useState(bounds.start);
  const [endDate, setEndDate] = useState(bounds.end);

  useEffect(() => {
    setGroupCount((current) => Math.min(Math.max(1, current), Math.max(1, maxGroups)));
  }, [maxGroups]);

  useEffect(() => {
    setSelectedGroups((current) =>
      Array.from({ length: groupCount }, (_, index) => current[index] ?? groups[index] ?? ""),
    );
  }, [groupCount, groups]);

  const updateGroup = (index: number, value: string) => {
    setSelectedGroups((current) =>
      current.map((group, itemIndex) => (itemIndex === index ? value : group)),
    );
  };

  const updateCount = (value: string) => {
    const nextCount = Number(value);
    setGroupCount(nextCount);
    setSelectedGroups((current) =>
      Array.from({ length: nextCount }, (_, index) => current[index] ?? groups[index] ?? ""),
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const selected = selectedGroups.slice(0, groupCount).map((group) => group.trim());
    const uniqueGroups = Array.from(new Set(selected.filter(Boolean)));

    if (uniqueGroups.length !== groupCount) {
      alert("Выберите разные группы.");
      return;
    }

    try {
      downloadScheduleDocx(lessons, {
        groups: uniqueGroups,
        startDate,
        endDate,
      });
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Не удалось скачать DOCX.");
    }
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <section className={s.panel} onClick={(event) => event.stopPropagation()}>
        <header className={s.header}>
          <div>
            <h2>Сохранить расписание в DOCX</h2>
            <p>{lessons.length} занятий</p>
          </div>
          <button type="button" className={s.closeBtn} onClick={onClose} title="Закрыть">
            <X />
          </button>
        </header>

        <form className={s.form} onSubmit={handleSubmit}>
          <section className={s.block}>
            <div className={s.blockHead}>
              <FileDown />
              <h3>Группы</h3>
            </div>
            <label className={s.field}>
              <span>Количество групп</span>
              <select
                value={groupCount}
                onChange={(event) => updateCount(event.target.value)}
                disabled={maxGroups === 0}
              >
                {Array.from({ length: maxGroups }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>

            <div className={s.groupGrid}>
              {Array.from({ length: groupCount }, (_, index) => (
                <label key={index} className={s.field}>
                  <span>Группа {index + 1}</span>
                  <select
                    value={selectedGroups[index] ?? ""}
                    onChange={(event) => updateGroup(index, event.target.value)}
                    required
                    disabled={groups.length === 0}
                  >
                    <option value="" disabled>
                      Выберите группу
                    </option>
                    {groups.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section className={s.block}>
            <div className={s.blockHead}>
              <FileDown />
              <h3>Период</h3>
            </div>
            <div className={s.periodGrid}>
              <label className={s.field}>
                <span>Начало</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                />
              </label>
              <label className={s.field}>
                <span>Конец</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                />
              </label>
            </div>
          </section>

          <div className={s.actions}>
            <button type="button" className={s.secondaryBtn} onClick={onClose}>
              <X />
              Отмена
            </button>
            <button type="submit" className={s.primaryBtn} disabled={maxGroups === 0}>
              <Download />
              Скачать
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
