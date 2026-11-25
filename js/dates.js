const ISO = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Whether a content file's date is a usable YYYY-MM-DD, so one typo can't break sorting or display. */
export function isIsoDate(value) {
  return typeof value === "string" && ISO.test(value);
}

/** "2026-11-25" → "25 Nov 2026". Written by hand so it reads the same in every locale. */
export function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
