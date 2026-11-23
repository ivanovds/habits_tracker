import { describe, expect, it } from 'vitest';
import { archivedHabits, currentHabits, habitsIn, periodsSince } from './habits';
import type { Table } from '../types';

const t: Table = {
  habits: ['old', 'new', 'gone'],
  meta: { new: { created: '2026-11-23' }, gone: { created: '2026-11-01', archived: '2026-11-15' } },
  rows: [],
};

describe('habit lifetime', () => {
  it('shows a new habit in history only from its creation date', () => {
    expect(habitsIn(t, 'daily', '2026-11-22')).toEqual(['old']);
    expect(habitsIn(t, 'daily', '2026-11-23')).toEqual(['old', 'new']);
  });
  it('keeps an archived habit in history up to its archive date', () => {
    expect(habitsIn(t, 'daily', '2026-10-31')).toEqual(['old']);
    expect(habitsIn(t, 'daily', '2026-11-15')).toEqual(['old', 'gone']);
    expect(habitsIn(t, 'daily', '2026-11-16')).toEqual(['old']);
  });
  it('counts a weekly habit in the week it was created or archived', () => {
    expect(habitsIn(t, 'weekly', '2026-11-16')).toEqual(['old']); // week before creation, after archive
    expect(habitsIn(t, 'weekly', '2026-11-23')).toEqual(['old', 'new']); // created on that Monday
    expect(habitsIn(t, 'weekly', '2026-11-09')).toEqual(['old', 'gone']); // archived on the Sunday
  });
  it('splits current and archived habits', () => {
    expect(currentHabits(t)).toEqual(['old', 'new']);
    expect(archivedHabits(t)).toEqual(['gone']);
  });
  it('counts periods since creation', () => {
    expect(periodsSince('daily', undefined, '2026-11-23')).toBe(Infinity);
    expect(periodsSince('daily', '2026-11-23', '2026-11-23')).toBe(1);
    expect(periodsSince('daily', '2026-11-20', '2026-11-23')).toBe(4);
    expect(periodsSince('weekly', '2026-11-19', '2026-11-23')).toBe(2);
  });
});
