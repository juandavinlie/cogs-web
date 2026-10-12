// All times on the site are shown in Singapore time, regardless of the visitor's device.
export const TIME_ZONE = "Asia/Singapore";

const dayFmt = new Intl.DateTimeFormat("en-SG", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-SG", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true });
const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** "Sunday, 19 Oct" */
export function formatDay(value: string | Date) {
  return dayFmt.format(new Date(value));
}

/** "9:00 am" */
export function formatTime(value: string | Date) {
  return timeFmt.format(new Date(value));
}

/** "9:00 am – 10:30 am" */
export function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** YYYY-MM-DD for an instant, in SGT. */
export function sgDate(value: string | Date = new Date()) {
  return keyFmt.format(new Date(value));
}

/** Formats a plain YYYY-MM-DD date column (no time) as "Sunday, 19 Oct". */
export function formatDateOnly(date: string) {
  return formatDay(`${date}T12:00:00+08:00`);
}
