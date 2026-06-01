import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import s from "./login.module.css";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Вход — Расписание преподавателей" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const { login, users } = useAuth();
  const navigate = useNavigate();
  const [teacherId, setTeacherId] = useState(users.find((u) => u.role === "teacher")?.id ?? "");

  const onAdmin = () => {
    const a = users.find((u) => u.role === "admin")!;
    login(a);
    navigate({ to: "/" });
  };

  const onTeacher = () => {
    const u = users.find((x) => x.id === teacherId);
    if (!u) return;
    login(u);
    navigate({ to: "/" });
  };

  return (
    <main className={s.page}>
      <div className={s.card}>
        <h1 className={s.title}>{t("login.title")}</h1>
        <p className={s.sub}>{t("login.subtitle")}</p>

        <button className={`${s.btn} ${s.btnPrimary}`} onClick={onAdmin}>
          {t("login.asAdmin")}
        </button>

        <div className={s.divider}><span>—</span></div>

        <label className={s.label}>{t("login.teacherName")}</label>
        <select className={s.select} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          {users
            .filter((u) => u.role === "teacher")
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.subjects.join(", ") || "—"})
              </option>
            ))}
        </select>
        <button className={s.btn} onClick={onTeacher}>{t("login.asTeacher")}</button>
      </div>
    </main>
  );
}