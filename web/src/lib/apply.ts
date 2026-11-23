import type { HabitMeta, HabitMutation, Mutation, PillMutation, PillsData, SheetData, Table } from '../types';
import { weekStart } from './dates';

/** Applies a mutation locally (optimistic update), mirroring what Code.gs does to the sheet. */
export function applyMutation(data: SheetData, m: Mutation): SheetData {
  if ('kind' in m) {
    const table = data[m.kind];
    const next = applyToTable(table, m);
    return next === table ? data : { ...data, [m.kind]: next };
  }
  const pills = applyToPills(data.pills, m);
  return pills === data.pills ? data : { ...data, pills };
}

function withMeta(meta: Record<string, HabitMeta>, name: string, m: HabitMeta | null): Record<string, HabitMeta> {
  const { [name]: _old, ...rest } = meta;
  void _old;
  return m && Object.keys(m).length ? { ...rest, [name]: m } : rest;
}

function applyToTable(t: Table, m: HabitMutation): Table {
  switch (m.action) {
    case 'setCell': {
      if (!t.habits.includes(m.habit)) return t;
      const date = m.kind === 'weekly' ? weekStart(m.date) : m.date;
      const exists = t.rows.some((r) => r.date === date);
      const rows = exists
        ? t.rows.map((r) => (r.date === date ? { ...r, values: { ...r.values, [m.habit]: m.value } } : r))
        : [
            ...t.rows,
            { date, values: { ...Object.fromEntries(t.habits.map((h) => [h, false])), [m.habit]: m.value } },
          ].sort((a, b) => a.date.localeCompare(b.date));
      return { ...t, rows };
    }
    case 'addHabit': {
      const name = m.name.trim();
      if (!name || t.habits.includes(name)) return t;
      return {
        habits: [...t.habits, name],
        meta: withMeta(t.meta, name, m.created ? { created: m.created } : null),
        rows: t.rows.map((r) => ({ ...r, values: { ...r.values, [name]: false } })),
      };
    }
    case 'renameHabit': {
      const newName = m.newName.trim();
      if (!newName || !t.habits.includes(m.oldName) || t.habits.includes(newName)) return t;
      return {
        habits: t.habits.map((h) => (h === m.oldName ? newName : h)),
        meta: withMeta(withMeta(t.meta, m.oldName, null), newName, t.meta[m.oldName] ?? null),
        rows: t.rows.map((r) => {
          const { [m.oldName]: v, ...rest } = r.values;
          return { ...r, values: { ...rest, [newName]: !!v } };
        }),
      };
    }
    case 'deleteHabit':
      if (!t.habits.includes(m.name)) return t;
      return {
        habits: t.habits.filter((h) => h !== m.name),
        meta: withMeta(t.meta, m.name, null),
        rows: t.rows.map((r) => {
          const { [m.name]: _removed, ...rest } = r.values;
          void _removed;
          return { ...r, values: rest };
        }),
      };
    case 'moveHabit': {
      const from = t.habits.indexOf(m.name);
      if (from === -1 || m.toIndex < 0 || m.toIndex >= t.habits.length || from === m.toIndex) return t;
      const habits = [...t.habits];
      habits.splice(from, 1);
      habits.splice(m.toIndex, 0, m.name);
      return { ...t, habits };
    }
    case 'archiveHabit':
      if (!t.habits.includes(m.name)) return t;
      return { ...t, meta: withMeta(t.meta, m.name, { ...t.meta[m.name], archived: m.date }) };
    case 'restoreHabit': {
      if (!t.habits.includes(m.name) || !t.meta[m.name]?.archived) return t;
      const { archived: _a, ...rest } = t.meta[m.name];
      void _a;
      return { ...t, meta: withMeta(t.meta, m.name, rest) };
    }
  }
}

function applyToPills(p: PillsData, m: PillMutation): PillsData {
  switch (m.action) {
    case 'addPill': {
      const name = m.pill.name.trim();
      if (!m.pill.id || !name || p.items.some((i) => i.id === m.pill.id)) return p;
      return { ...p, items: [...p.items, { id: m.pill.id, name, created: m.pill.created }] };
    }
    case 'updatePill': {
      const old = p.items.find((i) => i.id === m.pill.id);
      const name = m.pill.name.trim();
      if (!old || !name || name === old.name) return p;
      return { ...p, items: p.items.map((i) => (i === old ? { ...old, name } : i)) };
    }
    case 'deletePill':
      if (!p.items.some((i) => i.id === m.id)) return p;
      return { ...p, items: p.items.filter((i) => i.id !== m.id) };
    case 'movePill': {
      const from = p.items.findIndex((i) => i.id === m.id);
      if (from === -1 || m.toIndex < 0 || m.toIndex >= p.items.length || from === m.toIndex) return p;
      const items = [...p.items];
      const [moved] = items.splice(from, 1);
      items.splice(m.toIndex, 0, moved);
      return { ...p, items };
    }
    case 'setIntake': {
      const same = (l: { date: string; pillId: string }) => l.date === m.date && l.pillId === m.pillId;
      const exists = p.log.some(same);
      if (m.value === exists) return p;
      const log = m.value
        ? [...p.log, { date: m.date, pillId: m.pillId, name: m.name }]
        : p.log.filter((l) => !same(l));
      return { ...p, log };
    }
  }
}
