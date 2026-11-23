import { useState } from 'react';
import { dispatch, useStore } from '../store';
import type { Kind } from '../types';

function HabitList({ kind, habits }: { kind: Kind; habits: string[] }) {
  const [name, setName] = useState('');
  const label = kind === 'daily' ? 'daily' : 'weekly';

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (habits.includes(n)) return alert(`"${n}" already exists.`);
    dispatch({ action: 'addHabit', kind, name: n });
    setName('');
  };

  const rename = (h: string) => {
    const n = prompt('Rename habit', h)?.trim();
    if (!n || n === h) return;
    if (habits.includes(n)) return alert(`"${n}" already exists.`);
    dispatch({ action: 'renameHabit', kind, oldName: h, newName: n });
  };

  const remove = (h: string) => {
    if (confirm(`Delete "${h}"? This removes its whole column from the ${label} tab, including history.`)) {
      dispatch({ action: 'deleteHabit', kind, name: h });
    }
  };

  return (
    <>
      <form className="add-form" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${label} habit`} enterKeyHint="done" />
        <button type="submit" disabled={!name.trim()}>Add</button>
      </form>
      {habits.length > 0 && (
        <ul className="list">
          {habits.map((h, i) => (
            <li key={h} className="habit-row">
              <span className="check-label" onClick={() => rename(h)}>{h}</span>
              <div className="row-actions">
                <button aria-label="Move up" disabled={i === 0} onClick={() => dispatch({ action: 'moveHabit', kind, name: h, toIndex: i - 1 })}>↑</button>
                <button aria-label="Move down" disabled={i === habits.length - 1} onClick={() => dispatch({ action: 'moveHabit', kind, name: h, toIndex: i + 1 })}>↓</button>
                <button aria-label="Rename" onClick={() => rename(h)}>✎</button>
                <button aria-label="Delete" className="danger" onClick={() => remove(h)}>✕</button>
              </div>
            </li>
          ))}
        </ul>
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
      <HabitList kind="daily" habits={data.daily.habits} />
      <h2 className="section-title">Weekly</h2>
      <HabitList kind="weekly" habits={data.weekly.habits} />
      <p className="hint">
        Each habit is a column in the Daily or Weekly tab of your sheet. Weekly habits are ticked once per week
        (Monday to Sunday). Tap a name to rename it.
      </p>
    </>
  );
}
