import { dispatch, useStore } from './store';
import { STEP, currentStreak, makeLookup, periodOf } from './lib/stats';
import { today } from './lib/dates';
import type { Kind } from './types';

/**
 * Checkboxes for the given habits of one kind, for the period containing `date`
 * (that day for daily habits, that week for weekly ones).
 */
export function Checklist({ kind, date, habits, emptyText }: { kind: Kind; date: string; habits: string[]; emptyText?: string }) {
  const { data } = useStore();
  if (!data) return null;
  const table = data[kind];
  if (!habits.length) {
    return <p className="empty small">{emptyText ?? `No ${kind} habits yet. Add some in Other → Habits.`}</p>;
  }
  const period = periodOf(kind, date);
  const row = table.rows.find((r) => r.date === period);
  const done = makeLookup(table.rows);
  const current = periodOf(kind, today());
  const unit = kind === 'weekly' ? 'wk' : '';

  return (
    <ul className="list checklist">
      {habits.map((h) => {
        const checked = !!row?.values[h];
        const streak = currentStreak(done, h, current, STEP[kind]);
        return (
          <li key={h}>
            <button
              className={`check-row${checked ? ' checked' : ''}`}
              onClick={() => dispatch({ action: 'setCell', kind, date: period, habit: h, value: !checked })}
              aria-pressed={checked}
            >
              <span className="check-circle" aria-hidden>
                {checked ? '✓' : ''}
              </span>
              <span className="check-label">{h}</span>
              {period === current && streak > 0 && (
                <span className="streak">🔥 {streak}{unit && ` ${unit}`}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ProgressRing({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="ring" aria-label={`${Math.round(value * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="ring-fill"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="ring-text">
        {Math.round(value * 100)}
      </text>
    </svg>
  );
}

export function SyncBadge() {
  const { syncing, offline, pending } = useStore();
  if (syncing) return <span className="badge">Syncing…</span>;
  if (offline) return <span className="badge warn">Offline{pending.length ? ` · ${pending.length} queued` : ''}</span>;
  if (pending.length) return <span className="badge">{pending.length} queued</span>;
  return null;
}
