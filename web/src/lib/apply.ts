import type { Mutation, SheetData, Table } from '../types';
import { weekStart } from './dates';

/** Applies a mutation locally (optimistic update), mirroring what Code.gs does to the sheet. */
export function applyMutation(data: SheetData, m: Mutation): SheetData {
  const table = data[m.kind];
  const next = applyToTable(table, m);
  return next === table ? data : { ...data, [m.kind]: next };
}

function applyToTable(t: Table, m: Mutation): Table {
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
        rows: t.rows.map((r) => ({ ...r, values: { ...r.values, [name]: false } })),
      };
    }
    case 'renameHabit': {
      const newName = m.newName.trim();
      if (!newName || !t.habits.includes(m.oldName) || t.habits.includes(newName)) return t;
      return {
        habits: t.habits.map((h) => (h === m.oldName ? newName : h)),
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
  }
}
