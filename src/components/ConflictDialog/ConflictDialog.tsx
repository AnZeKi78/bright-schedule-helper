import type { ScheduleConflict, ConflictReason } from "@/lib/schedule-conflicts";
import s from "./ConflictDialog.module.css";

const reasonText: Record<ConflictReason, string> = {
  teacher: "преподаватель занят",
  group: "группа занята",
  room: "кабинет занят",
};

function lessonSlot(conflict: ScheduleConflict) {
  return `${conflict.candidate.date ?? conflict.candidate.day} · ${conflict.candidate.time}`;
}

export function ConflictDialog({
  conflicts,
  onCancel,
  onReplace,
}: {
  conflicts: ScheduleConflict[];
  onCancel: () => void;
  onReplace: () => void;
}) {
  const visible = conflicts.slice(0, 8);
  const hiddenCount = Math.max(0, conflicts.length - visible.length);

  return (
    <div className={s.overlay} onClick={onCancel}>
      <section className={s.modal} onClick={(event) => event.stopPropagation()}>
        <div className={s.header}>
          <h2>Найден конфликт расписания</h2>
          <p>В это время уже есть занятие. Можно вернуться и исправить данные, либо сохранить новое занятие, а конфликтующие пары перенести в свободное время этого же дня.</p>
        </div>

        <div className={s.list}>
          {visible.map((conflict, index) => (
            <article key={`${conflict.existing.id}-${index}`} className={s.item}>
              <div className={s.itemHead}>
                <strong>{lessonSlot(conflict)}</strong>
                <span>{conflict.reasons.map((reason) => reasonText[reason]).join(", ")}</span>
              </div>
              <div className={s.compare}>
                <div>
                  <b>Новое</b>
                  <p>{conflict.candidate.subject} · {conflict.candidate.teacher}</p>
                  <p>{conflict.candidate.group} · кабинет {conflict.candidate.room || "не указан"}</p>
                </div>
                <div>
                  <b>Уже стоит</b>
                  <p>{conflict.existing.subject} · {conflict.existing.teacher}</p>
                  <p>{conflict.existing.group} · кабинет {conflict.existing.room || "не указан"}</p>
                </div>
              </div>
            </article>
          ))}
          {hiddenCount > 0 && <div className={s.more}>И ещё {hiddenCount} конфликтов</div>}
        </div>

        <div className={s.actions}>
          <button type="button" className={s.secondaryBtn} onClick={onCancel}>Вернуться и исправить</button>
          <button type="button" className={s.dangerBtn} onClick={onReplace}>Заменить конфликтующие занятия</button>
        </div>
      </section>
    </div>
  );
}
