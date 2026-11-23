import { useStore } from '../store';
import { Checklist, ProgressRing } from '../components';
import { formatWeek, today, weekStart } from '../lib/dates';
import { currentHabits } from '../lib/habits';
import { makeLookup, periodScore } from '../lib/stats';

export function Weekly() {
  const { data } = useStore();
  if (!data) return null;
  const t = today();
  const monday = weekStart(t);
  const habits = currentHabits(data.weekly);
  const score = periodScore(makeLookup(data.weekly.rows), habits, monday);

  return (
    <>
      <header className="screen-header">
        <div>
          <p className="eyebrow">This week · {formatWeek(monday)}</p>
          <h1>Weekly</h1>
        </div>
        {habits.length > 0 && <ProgressRing value={score} />}
      </header>
      <Checklist kind="weekly" date={t} habits={habits} />
    </>
  );
}
