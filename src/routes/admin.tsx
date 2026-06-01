import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth, type User } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useSchedule } from "@/lib/schedule-store";
import { teacherColor, teacherColorDark } from "@/lib/teacher-colors";
import { useTheme } from "@/lib/theme";
import s from "./admin.module.css";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Администрирование — пользователи и права" }],
  }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("auth.user");
    const u = raw ? (JSON.parse(raw) as User) : null;
    if (!u || u.role !== "admin") {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const { t } = useI18n();
  const { users, upsertUser, removeUser } = useAuth();
  const { lessons } = useSchedule();
  const { theme } = useTheme();
  const palette = theme === "dark" ? teacherColorDark : teacherColor;

  const allSubjects = useMemo(
    () => Array.from(new Set(lessons.map((l) => l.subject))).sort(),
    [lessons]
  );

  const [draftName, setDraftName] = useState("");

  const toggleSubject = (u: User, subj: string) => {
    const has = u.subjects.includes(subj);
    upsertUser({ ...u, subjects: has ? u.subjects.filter((x) => x !== subj) : [...u.subjects, subj] });
  };

  return (
    <main className={s.page}>
      <header className={s.header}>
        <h1 className={s.title}>{t("admin.title")}</h1>
        <p className={s.sub}>{t("admin.subtitle")}</p>
      </header>

      <div className={s.addRow}>
        <input
          className={s.input}
          placeholder={t("admin.name")}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
        />
        <button
          className={s.addBtn}
          onClick={() => {
            if (!draftName.trim()) return;
            upsertUser({
              id: crypto.randomUUID(),
              name: draftName.trim(),
              role: "teacher",
              subjects: [],
            });
            setDraftName("");
          }}
        >
          + {t("admin.addUser")}
        </button>
      </div>

      <div className={s.list}>
        {users.map((u) => {
          const c = palette(u.name);
          return (
            <div key={u.id} className={s.userCard} style={{ borderLeft: `4px solid ${c.border}` }}>
              <div className={s.userHead}>
                <div>
                  <div className={s.userName}>{u.name}</div>
                  <div className={s.userRole}>
                    <select
                      className={s.roleSelect}
                      value={u.role}
                      onChange={(e) => upsertUser({ ...u, role: e.target.value as User["role"] })}
                    >
                      <option value="teacher">{t("role.teacher")}</option>
                      <option value="admin">{t("role.admin")}</option>
                    </select>
                  </div>
                </div>
                <button className={s.removeBtn} onClick={() => removeUser(u.id)}>×</button>
              </div>

              {u.role === "teacher" && (
                <div className={s.subjectGroup}>
                  <div className={s.subjectLabel}>{t("admin.subjects")}</div>
                  <div className={s.subjectChips}>
                    {allSubjects.length === 0 && <span className={s.muted}>—</span>}
                    {allSubjects.map((subj) => {
                      const active = u.subjects.includes(subj);
                      return (
                        <button
                          key={subj}
                          className={`${s.chip} ${active ? s.chipActive : ""}`}
                          onClick={() => toggleSubject(u, subj)}
                        >
                          {active ? "✓ " : ""}{subj}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}