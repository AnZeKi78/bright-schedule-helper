import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { jsDayToKey, useSchedule } from "@/lib/schedule-store";
import { ScheduleTable } from "@/components/ScheduleTable/ScheduleTable";
import s from "./index.module.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Главная — Расписание преподавателей" },
      { name: "description", content: "Дашборд с актуальным расписанием на сегодня" },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { lessons } = useSchedule();

  const today = useMemo(() => {
    const dk = jsDayToKey(new Date().getDay());
    let v = lessons.filter((l) => l.day === dk);
    if (user?.role === "teacher" && user.subjects.length > 0) {
      v = v.filter((l) => user.subjects.includes(l.subject));
    }
    return v.sort((a, b) => a.time.localeCompare(b.time));
  }, [lessons, user]);

  const uniqueTeachers = new Set(lessons.map((l) => l.teacher)).size;
  const uniqueSubjects = new Set(lessons.map((l) => l.subject)).size;

  return (
    <main className={s.page}>
      <section className={s.hero}>
        <p className={s.eyebrow}>{t("app.tagline")}</p>
        <h1 className={s.title}>
          {user ? `${t("dashboard.greeting")}, ${user.name}` : t("app.title")}
        </h1>
        <p className={s.lead}>{t("dashboard.uploadHint")}</p>
        <div className={s.ctaRow}>
          <Link to="/schedule" className={s.ctaPrimary}>{t("dashboard.cta")}</Link>
          {!user && <Link to="/login" className={s.ctaSecondary}>{t("nav.login")}</Link>}
        </div>
      </section>

      <section className={s.stats}>
        <div className={s.statCard}>
          <div className={s.statValue}>{lessons.length}</div>
          <div className={s.statLabel}>{t("table.subject")} · {t("schedule.title")}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statValue}>{uniqueTeachers}</div>
          <div className={s.statLabel}>{t("filters.teacher")}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statValue}>{uniqueSubjects}</div>
          <div className={s.statLabel}>{t("filters.subject")}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statValue}>{today.length}</div>
          <div className={s.statLabel}>{t("header.today")}</div>
        </div>
      </section>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>{t("dashboard.todayTitle")}</h2>
        <ScheduleTable rows={today} canModify={false} />
      </section>

      <footer className={s.footer}>{t("footer.note")}</footer>
    </main>
  );
}