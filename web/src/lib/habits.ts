import type { HabitMeta, Kind, Table } from '../types';
import { addDays, daysBetween } from './dates';
import { STEP, periodOf } from './stats';

/** Whether a habit existed at some point during [start, end]. */
export function isActive(meta: HabitMeta | undefined, start: string, end: string): boolean {
  if (meta?.created && meta.created > end) return false;
  if (meta?.archived && meta.archived < start) return false;
  return true;
}

/** Habits that existed during the period with the given key (a day, or a week's Monday). */
export function habitsIn(t: Table, kind: Kind, period: string): string[] {
  const end = kind === 'weekly' ? addDays(period, 6) : period;
  return t.habits.filter((h) => isActive(t.meta[h], period, end));
}

/** Habits shown on Daily/Weekly and in Stats. */
export function currentHabits(t: Table): string[] {
  return t.habits.filter((h) => !t.meta[h]?.archived);
}

export function archivedHabits(t: Table): string[] {
  return t.habits.filter((h) => t.meta[h]?.archived);
}

/** Number of periods from the one containing `created` up to and including `current`. */
export function periodsSince(kind: Kind, created: string | undefined, current: string): number {
  if (!created) return Infinity;
  const days = daysBetween(periodOf(kind, created), current);
  return days < 0 ? 0 : Math.floor(days / STEP[kind]) + 1;
}
