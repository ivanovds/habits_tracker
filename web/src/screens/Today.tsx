import { useStore } from '../store';
import { Checklist, ProgressRing } from '../components';
import { formatLong, formatWeek, today, weekStart } from '../lib/dates';
import { makeLookup, periodScore } from '../lib/stats';

export function Today() {
  const { data } = useStore();
  if (!data) return null;
  const t = today();
  const monday = weekStart(t);
  const dayScore = periodScore(makeLookup(data.daily.rows), data.daily.habits, t);
  const weekScore = periodScore(makeLookup(data.weekly.rows), data.weekly.habits, monday);

  return (
    <>
      <header className="screen-header">
        <div>
          <p className="eyebrow">{formatLong(t)}</p>
          <h1>Today</h1>
        </div>
        {data.daily.habits.length > 0 && <ProgressRing value={dayScore} />}
      </header>
      <Checklist kind="daily" date={t} />

      <div className="section-head">
        <div>
          <h2 className="section-title">This week</h2>
          <p className="eyebrow">{formatWeek(monday)}</p>
        </div>
        {data.weekly.habits.length > 0 && <ProgressRing value={weekScore} size={38} />}
      </div>
      <Checklist kind="weekly" date={t} />
    </>
  );
}
