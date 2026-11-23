import { describe, expect, it } from 'vitest';
import { applyMutation } from './apply';
import type { SheetData } from '../types';

const base: SheetData = {
  daily: {
    habits: ['run', 'read'],
    meta: {},
    rows: [
      { date: '2026-11-18', values: { run: true, read: false } },
      { date: '2026-11-20', values: { run: false, read: false } },
    ],
  },
  weekly: {
    habits: ['call'],
    meta: {},
    rows: [{ date: '2026-11-16', values: { call: false } }],
  },
  pills: { items: [], log: [] },
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
  it('stores the creation date and carries meta through rename and delete', () => {
    let r = applyMutation(base, { action: 'addHabit', kind: 'daily', name: 'gym', created: '2026-11-23' });
    expect(r.daily.meta).toEqual({ gym: { created: '2026-11-23' } });
    r = applyMutation(r, { action: 'renameHabit', kind: 'daily', oldName: 'gym', newName: 'lift' });
    expect(r.daily.meta).toEqual({ lift: { created: '2026-11-23' } });
    r = applyMutation(r, { action: 'deleteHabit', kind: 'daily', name: 'lift' });
    expect(r.daily.meta).toEqual({});
  });
  it('archives and restores a habit without touching its history', () => {
    let r = applyMutation(base, { action: 'archiveHabit', kind: 'daily', name: 'run', date: '2026-11-23' });
    expect(r.daily.meta.run).toEqual({ archived: '2026-11-23' });
    expect(r.daily.rows).toBe(base.daily.rows);
    expect(r.daily.habits).toEqual(['run', 'read']);
    r = applyMutation(r, { action: 'restoreHabit', kind: 'daily', name: 'run' });
    expect(r.daily.meta).toEqual({});
    expect(applyMutation(base, { action: 'restoreHabit', kind: 'daily', name: 'run' })).toBe(base);
  });
});

describe('applyMutation: pills', () => {
  const pill = { id: 'p1', name: ' Vitamin D, 1 tablet ', created: '2026-11-20' };
  it('adds, edits and deletes medications, keeping the log', () => {
    let r = applyMutation(base, { action: 'addPill', pill });
    expect(r.pills.items).toEqual([{ ...pill, name: 'Vitamin D, 1 tablet' }]);
    expect(applyMutation(r, { action: 'addPill', pill })).toBe(r);
    r = applyMutation(r, { action: 'setIntake', date: '2026-11-23', pillId: 'p1', name: 'Vitamin D, 1 tablet', value: true });
    r = applyMutation(r, { action: 'updatePill', pill: { id: 'p1', name: 'Vitamin D, 2 tablets' } });
    expect(r.pills.items[0]).toEqual({ id: 'p1', name: 'Vitamin D, 2 tablets', created: '2026-11-20' });
    r = applyMutation(r, { action: 'deletePill', id: 'p1' });
    expect(r.pills.items).toEqual([]);
    expect(r.pills.log).toEqual([{ date: '2026-11-23', pillId: 'p1', name: 'Vitamin D, 1 tablet' }]);
  });
  it('reorders medications', () => {
    let r = applyMutation(base, { action: 'addPill', pill: { id: 'a', name: 'A' } });
    r = applyMutation(r, { action: 'addPill', pill: { id: 'b', name: 'B' } });
    r = applyMutation(r, { action: 'addPill', pill: { id: 'c', name: 'C' } });
    r = applyMutation(r, { action: 'movePill', id: 'c', toIndex: 0 });
    expect(r.pills.items.map((i) => i.id)).toEqual(['c', 'a', 'b']);
    r = applyMutation(r, { action: 'movePill', id: 'c', toIndex: 2 });
    expect(r.pills.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(applyMutation(r, { action: 'movePill', id: 'a', toIndex: 5 })).toBe(r);
  });
  it('ticks and unticks a day', () => {
    const m = { action: 'setIntake', date: '2026-11-23', pillId: 'p1', name: 'Vitamin D' } as const;
    let r = applyMutation(base, { ...m, value: true });
    expect(r.pills.log).toEqual([{ date: '2026-11-23', pillId: 'p1', name: 'Vitamin D' }]);
    expect(applyMutation(r, { ...m, value: true })).toBe(r);
    r = applyMutation(r, { ...m, value: false });
    expect(r.pills.log).toEqual([]);
  });
});
