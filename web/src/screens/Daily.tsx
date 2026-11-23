import { useStore } from '../store';
import { Checklist, ProgressRing } from '../components';
import { formatLong, today } from '../lib/dates';
import { currentHabits } from '../lib/habits';
import { makeLookup, periodScore } from '../lib/stats';

export function Daily() {
  const { data } = useStore();
  if (!data) return null;
  const t = today();
  const habits = currentHabits(data.daily);
  const score = periodScore(makeLookup(data.daily.rows), habits, t);

  return (
    <>
      <header className="screen-header">
        <div>
          <p className="eyebrow">{formatLong(t)}</p>
          <h1>Daily</h1>
        </div>
        {habits.length > 0 && <ProgressRing value={score} />}
      </header>
      <Checklist kind="daily" date={t} habits={habits} />
    </>
  );
}
