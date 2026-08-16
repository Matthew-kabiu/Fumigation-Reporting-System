/**
 * Shared date formatters.
 *
 * `Intl.DateTimeFormat` construction is expensive and was previously happening
 * on every call, inside render loops. Each formatter is built once here and
 * reused. Locale stays `undefined` so the browser's own locale wins.
 */
const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export function formatDateTime(value: number) {
  return dateTime.format(value);
}

export function formatDate(value: number) {
  return dateOnly.format(value);
}

const timeOnly = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayHeading = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const dayAndTime = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function formatTime(value: number) {
  return timeOnly.format(value);
}

export function formatDayHeading(value: number) {
  return dayHeading.format(value);
}

export function formatDayAndTime(value: number) {
  return dayAndTime.format(value);
}
