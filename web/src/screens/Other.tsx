import { Icon } from '../icons';

export type OtherTab = 'stats' | 'habits' | 'settings';

const ITEMS: { id: OtherTab; label: string }[] = [
  { id: 'stats', label: 'Stats' },
  { id: 'habits', label: 'Habits' },
  { id: 'settings', label: 'Settings' },
];

export function Other({ open }: { open: (t: OtherTab) => void }) {
  return (
    <>
      <header className="screen-header">
        <h1>Other</h1>
      </header>
      <ul className="list">
        {ITEMS.map((i) => (
          <li key={i.id}>
            <button className="menu-row" onClick={() => open(i.id)}>
              <Icon name={i.id} className="menu-icon" />
              <span className="check-label">{i.label}</span>
              <span className="chevron" aria-hidden>›</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
