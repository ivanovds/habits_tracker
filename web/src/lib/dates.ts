export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function today(): string {
  return isoDate(new Date());
}

export function formatLong(s: string): string {
  return parseIso(s).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Monday of the week containing the given date. */
export function weekStart(s: string): string {
  const d = parseIso(s);
  return addDays(s, -((d.getDay() + 6) % 7));
}

/** "16 – 22 Nov" style label for the week starting on the given Monday. */
export function formatWeek(monday: string): string {
  const a = parseIso(monday);
  const b = parseIso(addDays(monday, 6));
  const day = (d: Date) => d.getDate();
  const mon = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' });
  return a.getMonth() === b.getMonth()
    ? `${day(a)} – ${day(b)} ${mon(b)}`
    : `${day(a)} ${mon(a)} – ${day(b)} ${mon(b)}`;
}
