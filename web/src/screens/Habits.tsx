import { useState } from 'react';
import { dispatch, useStore } from '../store';
import { parseIso, today } from '../lib/dates';
import { archivedHabits, currentHabits } from '../lib/habits';
import type { Kind, Table } from '../types';

const shortDate = (s: string) => parseIso(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function HabitList({ kind, table }: { kind: Kind; table: Table }) {
  const [name, setName] = useState('');
  const label = kind === 'daily' ? 'daily' : 'weekly';
  const all = table.habits;
  const active = currentHabits(table);
  const archived = archivedHabits(table);

  const exists = (n: string) => {
    if (!all.includes(n)) return false;
    alert(`"${n}" already exists${archived.includes(n) ? ' in the archive' : ''}.`);
    return true;
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || exists(n)) return;
    dispatch({ action: 'addHabit', kind, name: n, created: today() });
    setName('');
  };

  const rename = (h: string) => {
    const n = prompt('Rename habit', h)?.trim();
    if (!n || n === h || exists(n)) return;
    dispatch({ action: 'renameHabit', kind, oldName: h, newName: n });
  };

  const remove = (h: string) => {
    if (confirm(`Delete "${h}" permanently? This removes its whole column from the ${label} tab, including history.\n\nTo hide it but keep its history, archive it instead.`)) {
      dispatch({ action: 'deleteHabit', kind, name: h });
    }
  };

  // Up/down moves among the visible (active) habits; the sheet keeps archived columns in between.
  const move = (i: number, dir: -1 | 1) =>
    dispatch({ action: 'moveHabit', kind, name: active[i], toIndex: all.indexOf(active[i + dir]) });

  return (
    <>
      <form className="add-form" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${label} habit`} enterKeyHint="done" />
        <button type="submit" disabled={!name.trim()}>Add</button>
      </form>
      {active.length > 0 && (
        <ul className="list">
          {active.map((h, i) => (
            <li key={h} className="habit-row">
              <span className="check-label" onClick={() => rename(h)}>{h}</span>
              <div className="row-actions">
                <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button aria-label="Move down" disabled={i === active.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button aria-label="Rename" onClick={() => rename(h)}>✎</button>
                <button aria-label="Archive" onClick={() => dispatch({ action: 'archiveHabit', kind, name: h, date: today() })}>📦</button>
                <button aria-label="Delete" className="danger" onClick={() => remove(h)}>✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {archived.length > 0 && (
        <>
          <h3 className="subsection-title">Archived {label}</h3>
          <ul className="list">
            {archived.map((h) => (
              <li key={h} className="habit-row archived">
                <span className="check-label">
                  {h}
                  <span className="sub">archived {shortDate(table.meta[h].archived!)}</span>
                </span>
                <div className="row-actions">
                  <button aria-label="Restore" onClick={() => dispatch({ action: 'restoreHabit', kind, name: h })}>↺</button>
                  <button aria-label="Delete" className="danger" onClick={() => remove(h)}>✕</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export function Habits() {
  const { data } = useStore();
  if (!data) return null;
  return (
    <>
      <header className="screen-header">
        <h1>Habits</h1>
      </header>
      <h2 className="section-title">Daily</h2>
      <HabitList kind="daily" table={data.daily} />
      <h2 className="section-title">Weekly</h2>
      <HabitList kind="weekly" table={data.weekly} />
      <p className="hint">
        Each habit is a column in the Daily or Weekly tab of your sheet. Weekly habits are ticked once per week
        (Monday to Sunday). Tap a name to rename it. 📦 archives a habit: it disappears from Daily and Weekly but
        stays in History, and ↺ brings it back.
      </p>
    </>
  );
}
