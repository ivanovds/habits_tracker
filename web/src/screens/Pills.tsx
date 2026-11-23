import { useState } from 'react';
import { dispatch, useStore } from '../store';
import { addDays, formatLong, today } from '../lib/dates';
import { newPillId, slotsFor, type Slot } from '../lib/pills';
import type { Pill, PillsData } from '../types';

type View = 'doses' | 'history' | 'manage';
const VIEWS: { id: View; label: string }[] = [
  { id: 'doses', label: 'Doses' },
  { id: 'history', label: 'History' },
  { id: 'manage', label: 'Medications' },
];
const HISTORY_PAGE = 30;

const toggle = (date: string, s: Slot) =>
  dispatch({ action: 'setIntake', date, pillId: s.pillId, name: s.name, value: !s.taken });

export function Pills() {
  const { data } = useStore();
  const [view, setView] = useState<View>('doses');
  const [date, setDate] = useState(today);
  if (!data) return null;

  return (
    <>
      <header className="screen-header">
        <h1>Pills</h1>
      </header>
      <div className="segmented" role="tablist">
        {VIEWS.map((v) => (
          <button key={v.id} role="tab" aria-selected={view === v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      {view === 'doses' && <Doses pills={data.pills} date={date} setDate={setDate} />}
      {view === 'history' && (
        <PillHistory
          pills={data.pills}
          open={(d) => {
            setDate(d);
            setView('doses');
          }}
        />
      )}
      {view === 'manage' && <ManagePills pills={data.pills} />}
    </>
  );
}

function Doses({ pills, date, setDate }: { pills: PillsData; date: string; setDate: (d: string) => void }) {
  const t = today();
  const slots = slotsFor(pills, date);
  const taken = slots.filter((s) => s.taken).length;

  return (
    <>
      <div className="day-nav">
        <button onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">‹</button>
        <div>
          <strong>{date === t ? 'Today' : formatLong(date)}</strong>
          {slots.length > 0 && <span className="muted">{taken} of {slots.length} taken</span>}
        </div>
        <button onClick={() => setDate(addDays(date, 1))} disabled={date >= t} aria-label="Next day">›</button>
      </div>
      {!pills.items.length && !slots.length ? (
        <p className="empty small">No medications yet. Add them under Medications.</p>
      ) : !slots.length ? (
        <p className="empty small">Nothing scheduled on this day.</p>
      ) : (
        <ul className="list checklist">
          {slots.map((s) => (
            <li key={s.pillId}>
              <button className={`check-row${s.taken ? ' checked' : ''}`} onClick={() => toggle(date, s)} aria-pressed={s.taken}>
                <span className="check-circle" aria-hidden>{s.taken ? '✓' : ''}</span>
                <span className="pill-label">
                  <span className="pill-name">{s.name}</span>
                  {!s.scheduled && <span className="sub">deleted</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function PillHistory({ pills, open }: { pills: PillsData; open: (date: string) => void }) {
  const [limit, setLimit] = useState(HISTORY_PAGE);
  const t = today();
  const days = Array.from({ length: limit }, (_, i) => addDays(t, -i))
    .map((d) => [d, slotsFor(pills, d)] as const)
    .filter(([, s]) => s.length);

  if (!days.length) return <p className="empty small">No history yet.</p>;
  return (
    <>
      {days.map(([d, slots]) => (
        <section key={d} className="card">
          <div className="habit-card-head">
            <h3>{d === t ? 'Today' : formatLong(d)}</h3>
            <span className="muted">
              {slots.filter((s) => s.taken).length}/{slots.length}
              <button className="link" onClick={() => open(d)}>Edit</button>
            </span>
          </div>
          <ul className="dose-lines">
            {slots.map((s) => (
              <li key={s.pillId} className={s.taken ? 'taken' : d < t ? 'missed' : ''}>
                <span className="dose-mark" aria-label={s.taken ? 'taken' : d < t ? 'missed' : 'not yet'}>
                  {s.taken ? '✓' : d < t ? '✕' : '○'}
                </span>
                <span>{s.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <button className="more" onClick={() => setLimit(limit + HISTORY_PAGE)}>Show earlier days</button>
    </>
  );
}

function ManagePills({ pills }: { pills: PillsData }) {
  const [text, setText] = useState('');

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const name = text.trim();
    if (!name) return;
    dispatch({ action: 'addPill', pill: { id: newPillId(), name, created: today() } });
    setText('');
  };

  const edit = (p: Pill) => {
    const name = prompt('Edit medication', p.name)?.trim();
    if (name && name !== p.name) dispatch({ action: 'updatePill', pill: { ...p, name } });
  };

  const remove = (p: Pill) => {
    if (confirm(`Delete "${p.name}"? Days it was already taken stay in the history.`)) dispatch({ action: 'deletePill', id: p.id });
  };

  return (
    <>
      <form className="add-form" onSubmit={add}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Vitamin D, 1 tablet in the morning" enterKeyHint="done" />
        <button type="submit" disabled={!text.trim()}>Add</button>
      </form>
      {pills.items.length > 0 && (
        <ul className="list">
          {pills.items.map((p, i) => (
            <li key={p.id} className="habit-row">
              <span className="check-label" onClick={() => edit(p)}>{p.name}</span>
              <div className="row-actions">
                <button aria-label="Move up" disabled={i === 0} onClick={() => dispatch({ action: 'movePill', id: p.id, toIndex: i - 1 })}>↑</button>
                <button aria-label="Move down" disabled={i === pills.items.length - 1} onClick={() => dispatch({ action: 'movePill', id: p.id, toIndex: i + 1 })}>↓</button>
                <button aria-label="Edit" onClick={() => edit(p)}>✎</button>
                <button aria-label="Delete" className="danger" onClick={() => remove(p)}>✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">
        Write the name, when and how much in one line. Each line gets one tick per day, so add separate lines for a
        morning and an evening dose. Tap a line to edit it; ↑ ↓ change the order.
      </p>
    </>
  );
}
