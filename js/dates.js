const ISO = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Whether a content file's date is a real YYYY-MM-DD calendar day, so one typo can't break sorting or display. */
export function isIsoDate(value) {
  if (typeof value !== "string" || !ISO.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  // Date.UTC rolls 31 Feb over to March, so a date that round-trips exists.
  const check = new Date(Date.UTC(y, m - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d;
}

/** "2026-11-25" → "25 Nov 2026". Written by hand so it reads the same in every locale. */
export function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
