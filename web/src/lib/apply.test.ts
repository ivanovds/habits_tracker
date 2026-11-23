import { describe, expect, it } from 'vitest';
import { applyMutation } from './apply';
import type { SheetData } from '../types';

const base: SheetData = {
  daily: {
    habits: ['run', 'read'],
    rows: [
      { date: '2026-11-18', values: { run: true, read: false } },
      { date: '2026-11-20', values: { run: false, read: false } },
    ],
  },
  weekly: {
    habits: ['call'],
    rows: [{ date: '2026-11-16', values: { call: false } }],
  },
};

describe('applyMutation', () => {
  it('sets an existing daily cell without touching the input', () => {
    const r = applyMutation(base, { action: 'setCell', kind: 'daily', date: '2026-11-20', habit: 'run', value: true });
    expect(r.daily.rows[1].values.run).toBe(true);
    expect(base.daily.rows[1].values.run).toBe(false);
    expect(r.weekly).toBe(base.weekly);
  });
  it('creates a missing day in sorted position', () => {
    const r = applyMutation(base, { action: 'setCell', kind: 'daily', date: '2026-11-19', habit: 'read', value: true });
    expect(r.daily.rows.map((d) => d.date)).toEqual(['2026-11-18', '2026-11-19', '2026-11-20']);
    expect(r.daily.rows[1].values).toEqual({ run: false, read: true });
  });
  it('stores weekly ticks on the Monday of the week', () => {
    let r = applyMutation(base, { action: 'setCell', kind: 'weekly', date: '2026-11-19', habit: 'call', value: true });
    expect(r.weekly.rows).toEqual([{ date: '2026-11-16', values: { call: true } }]);
    r = applyMutation(r, { action: 'setCell', kind: 'weekly', date: '2026-11-26', habit: 'call', value: true });
    expect(r.weekly.rows.map((w) => w.date)).toEqual(['2026-11-16', '2026-11-23']);
  });
  it('adds, renames, moves and deletes habits per kind', () => {
    let r = applyMutation(base, { action: 'addHabit', kind: 'daily', name: ' gym ' });
    expect(r.daily.habits).toEqual(['run', 'read', 'gym']);
    expect(r.weekly.habits).toEqual(['call']);
    r = applyMutation(r, { action: 'renameHabit', kind: 'daily', oldName: 'run', newName: 'jog' });
    expect(r.daily.habits).toEqual(['jog', 'read', 'gym']);
    expect(r.daily.rows[0].values.jog).toBe(true);
    r = applyMutation(r, { action: 'moveHabit', kind: 'daily', name: 'gym', toIndex: 0 });
    expect(r.daily.habits).toEqual(['gym', 'jog', 'read']);
    r = applyMutation(r, { action: 'deleteHabit', kind: 'daily', name: 'read' });
    expect(r.daily.habits).toEqual(['gym', 'jog']);
    expect('read' in r.daily.rows[0].values).toBe(false);
    r = applyMutation(r, { action: 'addHabit', kind: 'weekly', name: 'clean' });
    expect(r.weekly.habits).toEqual(['call', 'clean']);
  });
  it('ignores duplicate habit names', () => {
    expect(applyMutation(base, { action: 'addHabit', kind: 'daily', name: 'run' })).toBe(base);
    expect(applyMutation(base, { action: 'renameHabit', kind: 'daily', oldName: 'run', newName: 'read' })).toBe(base);
  });
});
