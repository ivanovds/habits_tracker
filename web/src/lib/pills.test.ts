import { describe, expect, it } from 'vitest';
import { slotsFor } from './pills';
import type { PillsData } from '../types';

const data: PillsData = {
  items: [
    { id: 'a', name: 'Урсосан зранку', created: '2026-11-20' },
    { id: 'b', name: 'Iron, 1 tablet after lunch', created: '2026-11-23' },
  ],
  log: [
    { date: '2026-11-23', pillId: 'a', name: 'Урсосан зранку' },
    { date: '2026-11-23', pillId: 'deleted', name: 'Old pill' },
    { date: '2026-11-23', pillId: 'deleted', name: 'Old pill' },
  ],
};

describe('pills', () => {
  it('lists each medication once per day, plus deleted ones that were taken', () => {
    expect(slotsFor(data, '2026-11-23').map((s) => [s.name, s.taken, s.scheduled])).toEqual([
      ['Урсосан зранку', true, true],
      ['Iron, 1 tablet after lunch', false, true],
      ['Old pill', true, false],
    ]);
  });
  it('skips medications on days before they were added', () => {
    expect(slotsFor(data, '2026-11-22').map((s) => s.name)).toEqual(['Урсосан зранку']);
    expect(slotsFor(data, '2026-11-19')).toEqual([]);
  });
});
