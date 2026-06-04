import { jsDayToKey, type DayKey } from "./schedule-store";

export const SITE_TIME_ZONE = "Asia/Almaty";
export const SITE_TIME_CITY = "Усть-Каменогорск";
export const SITE_TIME_UTC_OFFSET = "UTC+5";

type SiteNow = {
  isoDate: string;
  dayKey: DayKey;
  time: string;
  year: number;
};

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function getSiteNow(date = new Date()): SiteNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIME_ZONE,
    weekday: "short",
  }).format(date);
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);

  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  const hour = getPart(parts, "hour");
  const minute = getPart(parts, "minute");

  return {
    isoDate: `${year}-${month}-${day}`,
    dayKey: jsDayToKey(dayIndex >= 0 ? dayIndex : date.getDay()),
    time: `${hour}:${minute}`,
    year: Number(year),
  };
}
