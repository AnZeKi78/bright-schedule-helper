import { createFileRoute, redirect } from "@tanstack/react-router";
import { BookOpen, MapPin, Pencil, Plus, Save, Trash2, UserRound, Users, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { User } from "@/lib/auth";
import { LESSON_HOURS } from "@/lib/schedule-generator";
import {
  useSchedule,
  type LessonTemplate,
  type LessonTemplateInput,
  type TeacherInput,
  type TeacherRecord,
} from "@/lib/schedule-store";
import s from "./data.module.css";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [{ title: "Данные — группы, преподаватели и занятия" }],
  }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("auth.user");
    const user = raw ? (JSON.parse(raw) as User) : null;
    if (!user || user.role !== "admin") {
      throw redirect({ to: "/login" });
    }
  },
  component: DataPage,
});

const emptyLessonDraft: LessonTemplateInput = {
  subject: "",
  group: "",
  semesterHours: 72,
};

const emptyTeacherDraft: TeacherInput = {
  name: "",
  groups: [],
};

function getPairs(hours: number) {
  return Math.ceil((Number(hours) || 0) / LESSON_HOURS);
}

function normalizeDraft(draft: LessonTemplateInput): LessonTemplateInput {
  return {
    subject: draft.subject.trim(),
    group: draft.group.trim(),
    semesterHours: Number(draft.semesterHours) || 0,
  };
}

function DataPage() {
  const {
    groups,
    teachers,
    rooms,
    lessonTemplates,
    lessons,
    addGroup,
    renameGroup,
    removeGroup,
    addTeacher,
    updateTeacher,
    removeTeacher,
    addRoom,
    renameRoom,
    removeRoom,
    addLessonTemplate,
    updateLessonTemplate,
    removeLessonTemplate,
  } = useSchedule();

  const [groupDraft, setGroupDraft] = useState("");
  const [teacherDraft, setTeacherDraft] = useState<TeacherInput>(emptyTeacherDraft);
  const [roomDraft, setRoomDraft] = useState("");
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [lessonDraft, setLessonDraft] = useState<LessonTemplateInput>(emptyLessonDraft);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const semesterHours = lessonTemplates.reduce((sum, item) => sum + item.semesterHours, 0);
    const pairs = lessonTemplates.reduce((sum, item) => sum + getPairs(item.semesterHours), 0);
    return { semesterHours, pairs };
  }, [lessonTemplates]);

  const saveGroup = (event: FormEvent) => {
    event.preventDefault();
    addGroup(groupDraft);
    setGroupDraft("");
  };

  const saveTeacher = (event: FormEvent) => {
    event.preventDefault();
    const clean = {
      name: teacherDraft.name.trim(),
      groups: teacherDraft.groups,
    };
    if (!clean.name || clean.groups.length === 0) {
      alert("Заполните ФИО преподавателя и выберите хотя бы одну группу.");
      return;
    }

    if (editingTeacherId) updateTeacher(editingTeacherId, clean);
    else addTeacher(clean);

    setTeacherDraft(emptyTeacherDraft);
    setEditingTeacherId(null);
  };

  const saveRoom = (event: FormEvent) => {
    event.preventDefault();
    addRoom(roomDraft);
    setRoomDraft("");
  };

  const startRename = (kind: "group" | "room", value: string) => {
    if (kind === "group") setEditingGroup(value);
    else setEditingRoom(value);
    setRenameDraft(value);
  };

  const cancelRename = () => {
    setEditingGroup(null);
    setEditingRoom(null);
    setRenameDraft("");
  };

  const commitRename = () => {
    if (editingGroup) renameGroup(editingGroup, renameDraft);
    if (editingRoom) renameRoom(editingRoom, renameDraft);
    cancelRename();
  };

  const toggleTeacherGroup = (group: string) => {
    setTeacherDraft((current) => {
      const has = current.groups.includes(group);
      return {
        ...current,
        groups: has
          ? current.groups.filter((item) => item !== group)
          : [...current.groups, group].sort(),
      };
    });
  };

  const saveLessonTemplate = (event: FormEvent) => {
    event.preventDefault();
    const clean = normalizeDraft(lessonDraft);
    if (!clean.subject || !clean.group || clean.semesterHours <= 0) {
      alert("Заполните предмет, группу и часы за семестр.");
      return;
    }

    if (editingLessonId) updateLessonTemplate(editingLessonId, clean);
    else addLessonTemplate(clean);

    setLessonDraft(emptyLessonDraft);
    setEditingLessonId(null);
  };

  const editLessonTemplate = (template: LessonTemplate) => {
    setLessonDraft({
      subject: template.subject,
      group: template.group,
      semesterHours: template.semesterHours,
    });
    setEditingLessonId(template.id);
  };

  const editTeacher = (teacher: TeacherRecord) => {
    setTeacherDraft({ name: teacher.name, groups: teacher.groups });
    setEditingTeacherId(teacher.id);
  };

  return (
    <main className={s.page}>
      <header className={s.header}>
        <div>
          <h1 className={s.title}>Данные</h1>
          <p className={s.subtitle}>Группы, преподаватели, занятия и часы за семестр.</p>
        </div>
      </header>

      <section className={s.stats} aria-label="Сводка данных">
        <div className={s.stat}>
          <Users />
          <span>{groups.length}</span>
          <small>групп</small>
        </div>
        <div className={s.stat}>
          <UserRound />
          <span>{teachers.length}</span>
          <small>преподавателей</small>
        </div>
        <div className={s.stat}>
          <MapPin />
          <span>{rooms.length}</span>
          <small>кабинетов</small>
        </div>
        <div className={s.stat}>
          <BookOpen />
          <span>{lessonTemplates.length}</span>
          <small>занятий</small>
        </div>
        <div className={s.stat}>
          <Save />
          <span>{totals.semesterHours}</span>
          <small>часов / {totals.pairs} пар</small>
        </div>
      </section>

      <div className={s.columns}>
        <section className={s.panel}>
          <div className={s.panelHead}>
            <h2>Группы</h2>
          </div>
          <form className={s.addRow} onSubmit={saveGroup}>
            <input
              value={groupDraft}
              onChange={(event) => setGroupDraft(event.target.value)}
              placeholder="Например, ИС-23"
            />
            <button type="submit" className={s.iconBtn} title="Добавить группу">
              <Plus />
              Добавить
            </button>
          </form>
          <div className={s.itemList}>
            {groups.map((group) => (
              <div key={group} className={s.itemRow}>
                {editingGroup === group ? (
                  <input
                    className={s.renameInput}
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    autoFocus
                  />
                ) : (
                  <span>{group}</span>
                )}
                <div className={s.itemActions}>
                  {editingGroup === group ? (
                    <>
                      <button
                        type="button"
                        className={s.squareBtn}
                        onClick={commitRename}
                        title="Сохранить"
                      >
                        <Save />
                      </button>
                      <button
                        type="button"
                        className={s.squareBtn}
                        onClick={cancelRename}
                        title="Отмена"
                      >
                        <X />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={s.squareBtn}
                        onClick={() => startRename("group", group)}
                        title="Изменить группу"
                      >
                        <Pencil />
                      </button>
                      <button
                        type="button"
                        className={`${s.squareBtn} ${s.dangerBtn}`}
                        onClick={() => {
                          if (confirm(`Удалить группу "${group}" и связанные с ней данные?`))
                            removeGroup(group);
                        }}
                        title="Удалить группу"
                      >
                        <Trash2 />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={s.panel}>
          <div className={s.panelHead}>
            <h2>Преподаватели</h2>
            {editingTeacherId && (
              <button
                type="button"
                className={s.squareBtn}
                onClick={() => {
                  setTeacherDraft(emptyTeacherDraft);
                  setEditingTeacherId(null);
                }}
                title="Отмена"
              >
                <X />
              </button>
            )}
          </div>
          <form className={s.teacherForm} onSubmit={saveTeacher}>
            <input
              value={teacherDraft.name}
              onChange={(event) => setTeacherDraft({ ...teacherDraft, name: event.target.value })}
              placeholder="ФИО преподавателя"
            />
            <div className={s.groupSelect}>
              {groups.map((group) => {
                const active = teacherDraft.groups.includes(group);
                return (
                  <button
                    key={group}
                    type="button"
                    className={`${s.groupChip} ${active ? s.groupChipActive : ""}`}
                    onClick={() => toggleTeacherGroup(group)}
                  >
                    {active ? "✓ " : ""}
                    {group}
                  </button>
                );
              })}
            </div>
            <button type="submit" className={s.iconBtn} title="Добавить преподавателя">
              {editingTeacherId ? <Save /> : <Plus />}
              {editingTeacherId ? "Сохранить" : "Добавить"}
            </button>
          </form>
          <div className={s.itemList}>
            {teachers.map((teacher) => (
              <div key={teacher.id} className={s.itemRow}>
                <div className={s.itemMain}>
                  <span>{teacher.name}</span>
                  <small>{teacher.groups.join(", ")}</small>
                </div>
                <div className={s.itemActions}>
                  <button
                    type="button"
                    className={s.squareBtn}
                    onClick={() => editTeacher(teacher)}
                    title="Изменить преподавателя"
                  >
                    <Pencil />
                  </button>
                  <button
                    type="button"
                    className={`${s.squareBtn} ${s.dangerBtn}`}
                    onClick={() => {
                      if (
                        confirm(`Удалить преподавателя "${teacher.name}" и связанные с ним данные?`)
                      )
                        removeTeacher(teacher.id);
                    }}
                    title="Удалить преподавателя"
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={s.panel}>
          <div className={s.panelHead}>
            <h2>Кабинеты</h2>
          </div>
          <form className={s.addRow} onSubmit={saveRoom}>
            <input
              value={roomDraft}
              onChange={(event) => setRoomDraft(event.target.value)}
              placeholder="Например, 204"
            />
            <button type="submit" className={s.iconBtn} title="Добавить кабинет">
              <Plus />
              Добавить
            </button>
          </form>
          <div className={s.itemList}>
            {rooms.map((room) => (
              <div key={room} className={s.itemRow}>
                {editingRoom === room ? (
                  <input
                    className={s.renameInput}
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    autoFocus
                  />
                ) : (
                  <span>{room}</span>
                )}
                <div className={s.itemActions}>
                  {editingRoom === room ? (
                    <>
                      <button
                        type="button"
                        className={s.squareBtn}
                        onClick={commitRename}
                        title="Сохранить"
                      >
                        <Save />
                      </button>
                      <button
                        type="button"
                        className={s.squareBtn}
                        onClick={cancelRename}
                        title="Отмена"
                      >
                        <X />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={s.squareBtn}
                        onClick={() => startRename("room", room)}
                        title="Изменить кабинет"
                      >
                        <Pencil />
                      </button>
                      <button
                        type="button"
                        className={`${s.squareBtn} ${s.dangerBtn}`}
                        onClick={() => {
                          if (confirm(`Удалить кабинет "${room}" и связанные с ним занятия?`))
                            removeRoom(room);
                        }}
                        title="Удалить кабинет"
                      >
                        <Trash2 />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={s.lessonPanel}>
        <div className={s.panelHead}>
          <h2>Занятия и часы за семестр</h2>
          {editingLessonId && (
            <button
              type="button"
              className={s.secondaryBtn}
              onClick={() => {
                setLessonDraft(emptyLessonDraft);
                setEditingLessonId(null);
              }}
            >
              <X />
              Отмена
            </button>
          )}
        </div>

        <form className={s.lessonForm} onSubmit={saveLessonTemplate}>
          <label>
            <span>Предмет</span>
            <input
              value={lessonDraft.subject}
              onChange={(event) => setLessonDraft({ ...lessonDraft, subject: event.target.value })}
              required
            />
          </label>
          <label>
            <span>Группа</span>
            <select
              value={lessonDraft.group}
              onChange={(event) => setLessonDraft({ ...lessonDraft, group: event.target.value })}
              required
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
          <label>
            <span>Часы</span>
            <input
              type="number"
              min="1"
              step="0.5"
              value={lessonDraft.semesterHours}
              onChange={(event) =>
                setLessonDraft({ ...lessonDraft, semesterHours: Number(event.target.value) })
              }
              required
            />
          </label>
          <button type="submit" className={s.primaryBtn}>
            {editingLessonId ? <Save /> : <Plus />}
            {editingLessonId ? "Сохранить" : "Добавить"}
          </button>
        </form>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Предмет</th>
                <th>Группа</th>
                <th>Часы</th>
                <th>Пары</th>
                <th aria-label="Действия" />
              </tr>
            </thead>
            <tbody>
              {lessonTemplates.length === 0 && (
                <tr>
                  <td colSpan={5} className={s.empty}>
                    Пока нет данных для генерации.
                  </td>
                </tr>
              )}
              {lessonTemplates.map((template) => (
                <tr key={template.id}>
                  <td>{template.subject}</td>
                  <td>{template.group}</td>
                  <td>{template.semesterHours}</td>
                  <td>{getPairs(template.semesterHours)}</td>
                  <td>
                    <div className={s.rowActions}>
                      <button
                        type="button"
                        className={s.squareBtn}
                        onClick={() => editLessonTemplate(template)}
                        title="Изменить занятие"
                      >
                        <Pencil />
                      </button>
                      <button
                        type="button"
                        className={`${s.squareBtn} ${s.dangerBtn}`}
                        onClick={() => {
                          if (confirm(`Удалить "${template.subject}" из данных?`))
                            removeLessonTemplate(template.id);
                        }}
                        title="Удалить занятие"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={s.note}>
          В расписании сейчас {lessons.length} занятий. Генерация семестра применит список предметов
          к каждой группе, распределит преподавателей и кабинеты по справочникам и заменит занятия
          внутри выбранного периода.
        </p>
      </section>
    </main>
  );
}
