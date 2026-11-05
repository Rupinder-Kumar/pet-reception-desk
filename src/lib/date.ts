/** Today's date in the *local* time zone as `yyyy-MM-dd` (toISOString would give UTC and be off near midnight). */
export function todayISO(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `2024-01-05` -> `5 Jan 2024`. Parsed manually: `new Date('2024-01-05')` is UTC and can display the previous day. */
export function formatDate(iso: string): string {
  const m = ISO.exec(iso);
  if (!m) return iso;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Compact pet age: months below one year, whole years otherwise. Empty string for unparsable input. */
export function formatAge(birthIso: string, now: Date = new Date()): string {
  const m = ISO.exec(birthIso);
  if (!m) return '';
  let months = (now.getFullYear() - Number(m[1])) * 12 + (now.getMonth() - (Number(m[2]) - 1));
  if (now.getDate() < Number(m[3])) months--;
  months = Math.max(0, months);
  return months < 12 ? `${months} mo` : `${Math.floor(months / 12)} y`;
}
