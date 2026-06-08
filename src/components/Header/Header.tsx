import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useSchedule } from "@/lib/schedule-store";
import { getSiteNow, SITE_TIME_CITY, SITE_TIME_UTC_OFFSET } from "@/lib/site-time";
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
  const [siteNow, setSiteNow] = useState(() => getSiteNow());

  useEffect(() => {
    const timer = window.setInterval(() => setSiteNow(getSiteNow()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = useMemo(() => {
    let visible = lessons.filter((lesson) =>
      lesson.date ? lesson.date === siteNow.isoDate : lesson.day === siteNow.dayKey,
    );
    if (user?.role === "teacher" && user.subjects.length > 0) {
      visible = visible.filter((l) => user.subjects.includes(l.subject));
    }
    visible.sort((a, b) => a.time.localeCompare(b.time));
    return visible;
  }, [lessons, siteNow.dayKey, siteNow.isoDate, user]);

  const next = today.find((l) => l.time >= siteNow.time) ?? today[0];

  const navItem = (to: string, label: string) => (
    <Link to={to} className={`${s.navLink} ${location.pathname === to ? s.navLinkActive : ""}`}>
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
          {user?.role === "admin" && navItem("/data", t("nav.data"))}
          {navItem("/faq", t("nav.faq"))}
        </nav>

        <div className={s.right}>
          <div className={s.todayBadge} title={`${SITE_TIME_CITY} · ${SITE_TIME_UTC_OFFSET}`}>
            <span className={s.todayDot} />
            <span className={s.todayTime}>
              {SITE_TIME_CITY} {siteNow.time}
            </span>
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
