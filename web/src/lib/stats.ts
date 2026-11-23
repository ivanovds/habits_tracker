import type { Kind, Row } from '../types';
import { addDays, weekStart } from './dates';

export type DoneLookup = (date: string, habit: string) => boolean;

/** Days between consecutive periods: 1 for daily habits, 7 for weekly. */
export const STEP: Record<Kind, number> = { daily: 1, weekly: 7 };

/** The key of the period containing `date` (the date itself, or its Monday). */
export function periodOf(kind: Kind, date: string): string {
  return kind === 'weekly' ? weekStart(date) : date;
}

export function makeLookup(rows: Row[]): DoneLookup {
  const map = new Map(rows.map((r) => [r.date, r.values]));
  return (date, habit) => !!map.get(date)?.[habit];
}

/**
 * Current streak: consecutive done periods ending with the current one. If the
 * current period isn't done yet, the streak ending with the previous one still
 * counts (the day/week isn't over).
 */
export function currentStreak(done: DoneLookup, habit: string, current: string, step = 1): number {
  let p = done(current, habit) ? current : addDays(current, -step);
  let n = 0;
  while (done(p, habit)) {
    n++;
    p = addDays(p, -step);
  }
  return n;
}

export function bestStreak(rows: Row[], habit: string, step = 1): number {
  const doneDates = rows.filter((r) => r.values[habit]).map((r) => r.date).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of doneDates) {
    run = prev !== null && addDays(prev, step) === date ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

/** Fraction (0..1) of the last `n` periods (including the current one) the habit was done. */
export function completionRate(done: DoneLookup, habit: string, current: string, n: number, step = 1): number {
  if (n <= 0) return 0;
  let count = 0;
  for (let i = 0; i < n; i++) if (done(addDays(current, -i * step), habit)) count++;
  return count / n;
}

/** Fraction of habits done in a given period. */
export function periodScore(done: DoneLookup, habits: string[], date: string): number {
  if (!habits.length) return 0;
  return habits.filter((h) => done(date, h)).length / habits.length;
}
