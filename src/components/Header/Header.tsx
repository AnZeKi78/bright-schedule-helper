import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { jsDayToKey, useSchedule } from "@/lib/schedule-store";
import s from "./Header.module.css";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Header() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { lessons } = useSchedule();
  const { location } = useRouterState();

  const today = useMemo(() => {
    const now = new Date();
    const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const dayKey = jsDayToKey(now.getDay());
    let visible = lessons.filter((lesson) => (lesson.date ? lesson.date === isoToday : lesson.day === dayKey));
    if (user?.role === "teacher" && user.subjects.length > 0) {
      visible = visible.filter((l) => user.subjects.includes(l.subject));
    }
    visible.sort((a, b) => a.time.localeCompare(b.time));
    return visible;
  }, [lessons, user]);

  const next = today.find((l) => l.time >= new Date().toTimeString().slice(0, 5)) ?? today[0];

  const navItem = (to: string, label: string) => (
    <Link
      to={to}
      className={`${s.navLink} ${location.pathname === to ? s.navLinkActive : ""}`}
    >
      {label}
    </Link>
  );

  return (
    <header className={s.header}>
      <div className={s.inner}>
        <Link to="/" className={s.brand}>
          <span className={s.logoMark}>K</span>
          <span className={s.brandName}>{t("app.title")}</span>
        </Link>

        <nav className={s.nav}>
          {navItem("/", t("nav.dashboard"))}
          {navItem("/schedule", t("nav.schedule"))}
          {user?.role === "admin" && navItem("/admin", t("nav.admin"))}
        </nav>

        <div className={s.right}>
          <div className={s.todayBadge} title={t("header.today")}>
            <span className={s.todayDot} />
            <span className={s.todayCount}>{today.length}</span>
            <span className={s.todayMuted}>
              {today.length === 0
                ? t("header.noLessonsToday")
                : `${t("header.lessons")} · ${t("header.nextAt")} ${next?.time ?? ""}`}
            </span>
          </div>

          <button
            className={s.iconBtn}
            onClick={() => setLocale(locale === "ru" ? "kk" : "ru")}
            aria-label={t("lang.toggle")}
            title={t("lang.toggle")}
          >
            {locale === "ru" ? "RU" : "KZ"}
          </button>
          <button
            className={s.iconBtn}
            onClick={toggle}
            aria-label={t("theme.toggle")}
            title={t("theme.toggle")}
          >
            {theme === "light" ? "☾" : "☀"}
          </button>

          {user ? (
            <>
              <span className={s.userChip}>
                <span className={s.avatar}>{initials(user.name)}</span>
                {user.name}
              </span>
              <button className={s.iconBtn} onClick={logout} title={t("nav.logout")}>
                ⎋
              </button>
            </>
          ) : (
            <Link to="/login" className={s.primaryBtn}>
              {t("nav.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
