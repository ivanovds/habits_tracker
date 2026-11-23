import { useStore } from '../store';
import { addDays, today, weekStart } from '../lib/dates';
import {
  STEP,
  bestStreak,
  completionRate,
  currentStreak,
  makeLookup,
  periodScore,
  type DoneLookup,
} from '../lib/stats';
import { ProgressRing } from '../components';
import { currentHabits, habitsIn, periodsSince } from '../lib/habits';
import type { HabitMeta, Kind, Row } from '../types';

const WEEKS = 15;
const CELL = 14;
const GAP = 3;

/** GitHub-style heatmap of the last WEEKS weeks, Monday-first columns. */
function DayHeatmap({ value }: { value: (date: string) => number }) {
  const t = today();
  const start = addDays(weekStart(t), -(WEEKS - 1) * 7);
  const rects = [];
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      if (date > t) continue;
      rects.push(<HeatCell key={date} x={w} y={d} date={date} v={value(date)} />);
    }
  }
  return (
    <svg className="heatmap" viewBox={`0 0 ${WEEKS * (CELL + GAP) - GAP} ${7 * (CELL + GAP) - GAP}`} role="img">
      {rects}
    </svg>
  );
}

/** One square per week for the last WEEKS weeks. */
function WeekStrip({ value }: { value: (monday: string) => number }) {
  const current = weekStart(today());
  const rects = Array.from({ length: WEEKS }, (_, i) => {
    const monday = addDays(current, -(WEEKS - 1 - i) * 7);
    return <HeatCell key={monday} x={i} y={0} date={`week of ${monday}`} v={value(monday)} />;
  });
  return (
    <svg className="heatmap" viewBox={`0 0 ${WEEKS * (CELL + GAP) - GAP} ${CELL}`} role="img">
      {rects}
    </svg>
  );
}

function HeatCell({ x, y, date, v }: { x: number; y: number; date: string; v: number }) {
  return (
    <rect
      x={x * (CELL + GAP)}
      y={y * (CELL + GAP)}
      width={CELL}
      height={CELL}
      rx={3}
      className="heat"
      style={{ '--v': v } as React.CSSProperties}
    >
      <title>{`${date}: ${Math.round(v * 100)}%`}</title>
    </rect>
  );
}

function HabitCard({ kind, habit, meta, rows, done }: { kind: Kind; habit: string; meta?: HabitMeta; rows: Row[]; done: DoneLookup }) {
  const step = STEP[kind];
  const current = kind === 'weekly' ? weekStart(today()) : today();
  const unit = kind === 'weekly' ? 'weeks' : 'days';
  // A habit created recently is only rated over the periods it has existed.
  const avail = periodsSince(kind, meta?.created, current);
  const [shortN, longN] = (kind === 'weekly' ? [4, 12] : [7, 30]).map((n) => Math.max(1, Math.min(n, avail)));
  return (
    <section className="card habit-card">
      <div className="habit-card-head">
        <h3>{habit}</h3>
        <ProgressRing value={completionRate(done, habit, current, longN, step)} size={40} />
      </div>
      <div className="stat-row">
        <div><strong>{currentStreak(done, habit, current, step)}</strong><span>{kind === 'weekly' ? 'week' : 'day'} streak</span></div>
        <div><strong>{bestStreak(rows, habit, step)}</strong><span>best streak</span></div>
        <div>
          <strong>{Math.round(completionRate(done, habit, current, shortN, step) * 100)}%</strong>
          <span>last {shortN} {unit}</span>
        </div>
      </div>
      {kind === 'weekly' ? (
        <WeekStrip value={(d) => (done(d, habit) ? 1 : 0)} />
      ) : (
        <DayHeatmap value={(d) => (done(d, habit) ? 1 : 0)} />
      )}
      <p className="muted ring-note">Ring: last {longN} {unit}</p>
    </section>
  );
}

export function Stats() {
  const { data } = useStore();
  if (!data) return null;
  const t = today();
  const daily = makeLookup(data.daily.rows);
  const weekly = makeLookup(data.weekly.rows);
  const dailyHabits = currentHabits(data.daily);
  const weeklyHabits = currentHabits(data.weekly);
  const dayScore = (d: string) => periodScore(daily, habitsIn(data.daily, 'daily', d), d);
  const weekScore = (m: string) => periodScore(weekly, habitsIn(data.weekly, 'weekly', m), m);
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(t, -i)).filter((d) => habitsIn(data.daily, 'daily', d).length);
  const avg30 = last30.length ? last30.reduce((a, d) => a + dayScore(d), 0) / last30.length : 0;

  return (
    <>
      <header className="screen-header">
        <h1>Stats</h1>
      </header>

      <h2 className="section-title">Daily habits</h2>
      {!dailyHabits.length ? (
        <p className="empty small">No daily habits yet.</p>
      ) : (
        <>
          <section className="card">
            <div className="habit-card-head">
              <h3>All daily habits</h3>
              <span className="muted">{Math.round(avg30 * 100)}% avg · {last30.length} days</span>
            </div>
            <DayHeatmap value={dayScore} />
          </section>
          {dailyHabits.map((h) => (
            <HabitCard key={h} kind="daily" habit={h} meta={data.daily.meta[h]} rows={data.daily.rows} done={daily} />
          ))}
        </>
      )}

      <h2 className="section-title">Weekly habits</h2>
      {!weeklyHabits.length ? (
        <p className="empty small">No weekly habits yet.</p>
      ) : (
        <>
          <section className="card">
            <div className="habit-card-head">
              <h3>All weekly habits</h3>
              <span className="muted">last {WEEKS} weeks</span>
            </div>
            <WeekStrip value={weekScore} />
          </section>
          {weeklyHabits.map((h) => (
            <HabitCard key={h} kind="weekly" habit={h} meta={data.weekly.meta[h]} rows={data.weekly.rows} done={weekly} />
          ))}
        </>
      )}
    </>
  );
}
