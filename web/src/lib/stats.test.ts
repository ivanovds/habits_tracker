import { describe, expect, it } from 'vitest';
import { bestStreak, completionRate, currentStreak, makeLookup, periodOf, periodScore } from './stats';
import type { Row } from '../types';

const d = (date: string, run: boolean, read = false): Row => ({ date, values: { run, read } });

const days: Row[] = [
  d('2026-11-10', true),
  d('2026-11-11', true),
  d('2026-11-12', true),
  d('2026-11-13', false),
  d('2026-11-17', true, true),
  d('2026-11-18', true),
  d('2026-11-19', true, true),
  d('2026-11-20', false, true),
];
const done = makeLookup(days);

describe('daily stats', () => {
  it('current streak counts back from yesterday when today is not done yet', () => {
    expect(currentStreak(done, 'run', '2026-11-20')).toBe(3);
  });
  it('current streak includes today when done', () => {
    expect(currentStreak(done, 'read', '2026-11-20')).toBe(2);
  });
  it('current streak is 0 after a gap', () => {
    expect(currentStreak(done, 'run', '2026-11-22')).toBe(0);
  });
  it('best streak spans gaps and unsorted input', () => {
    expect(bestStreak(days, 'run')).toBe(3);
    expect(bestStreak([...days].reverse(), 'run')).toBe(3);
    expect(bestStreak(days, 'read')).toBe(2);
    expect(bestStreak(days, 'nope')).toBe(0);
  });
  it('completion rate counts missing rows as not done', () => {
    expect(completionRate(done, 'run', '2026-11-20', 10)).toBeCloseTo(5 / 10);
    expect(completionRate(done, 'run', '2026-11-20', 0)).toBe(0);
  });
  it('period score is the fraction of habits done', () => {
    expect(periodScore(done, ['run', 'read'], '2026-11-17')).toBe(1);
    expect(periodScore(done, ['run', 'read'], '2026-11-18')).toBe(0.5);
    expect(periodScore(done, [], '2026-11-18')).toBe(0);
  });
});

describe('weekly stats', () => {
  const weeks: Row[] = [
    d('2026-10-26', true),
    d('2026-11-02', false),
    d('2026-11-09', true),
    d('2026-11-16', true),
    d('2026-11-23', false),
  ];
  const wdone = makeLookup(weeks);
  it('maps any day to its Monday', () => {
    expect(periodOf('weekly', '2026-11-23')).toBe('2026-11-23'); // Monday
    expect(periodOf('weekly', '2026-11-29')).toBe('2026-11-23'); // Sunday
    expect(periodOf('weekly', '2026-11-20')).toBe('2026-11-16'); // Friday
    expect(periodOf('daily', '2026-11-20')).toBe('2026-11-20');
  });
  it('streaks step by 7 days', () => {
    expect(currentStreak(wdone, 'run', '2026-11-23', 7)).toBe(2);
    expect(bestStreak(weeks, 'run', 7)).toBe(2);
  });
  it('completion rate over weeks', () => {
    expect(completionRate(wdone, 'run', '2026-11-23', 4, 7)).toBeCloseTo(2 / 4);
  });
});
