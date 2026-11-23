import { useState } from 'react';
import { useStore } from '../store';
import { Checklist } from '../components';
import { formatLong, formatWeek, isoDate, today, weekStart } from '../lib/dates';
import { habitsIn } from '../lib/habits';
import { makeLookup, periodScore } from '../lib/stats';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function History() {
  const { data } = useStore();
  const t = today();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(t);

  if (!data) return null;
  const daily = makeLookup(data.daily.rows);
  const weekly = makeLookup(data.weekly.rows);

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (month.getDay() + 6) % 7; // Monday-first
  const cells: (string | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoDate(new Date(month.getFullYear(), month.getMonth(), i + 1))),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const selectedWeek = weekStart(selected);

  return (
    <>
      <header className="screen-header">
        <h1>History</h1>
      </header>
      <section className="card">
        <div className="month-nav">
          <button onClick={() => shift(-1)} aria-label="Previous month">‹</button>
          <strong>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
          <button onClick={() => shift(1)} aria-label="Next month">›</button>
        </div>
        <div className="calendar">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="weekday">{w}</span>
          ))}
          <span className="weekday" title="Weekly habits">Wk</span>
          {weeks.map((week) => {
            const firstDay = week.find(Boolean)!;
            const monday = weekStart(firstDay);
            const wScore = periodScore(weekly, habitsIn(data.weekly, 'weekly', monday), monday);
            return [
              ...week.map((date, i) => {
                if (!date) return <span key={`${monday}-${i}`} />;
                const future = date > t;
                return (
                  <button
                    key={date}
                    disabled={future}
                    className={`day${date === selected ? ' selected' : ''}${date === t ? ' is-today' : ''}`}
                    style={{ '--score': periodScore(daily, habitsIn(data.daily, 'daily', date), date) } as React.CSSProperties}
                    onClick={() => setSelected(date)}
                  >
                    {Number(date.slice(8))}
                  </button>
                );
              }),
              <button
                key={`w-${monday}`}
                disabled={monday > t}
                className={`week-cell${monday === selectedWeek ? ' selected' : ''}`}
                style={{ '--score': wScore } as React.CSSProperties}
                onClick={() => setSelected(monday > t ? t : monday)}
                aria-label={`Week of ${formatWeek(monday)}: ${Math.round(wScore * 100)}% of weekly habits`}
              />,
            ];
          })}
        </div>
      </section>

      <h2 className="section-title">{formatLong(selected)}</h2>
      <Checklist kind="daily" date={selected} habits={habitsIn(data.daily, 'daily', selected)} emptyText="No daily habits on this day." />

      <h2 className="section-title">Week of {formatWeek(selectedWeek)}</h2>
      <Checklist kind="weekly" date={selected} habits={habitsIn(data.weekly, 'weekly', selectedWeek)} emptyText="No weekly habits in this week." />
    </>
  );
}
