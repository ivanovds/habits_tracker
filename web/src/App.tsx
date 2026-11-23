import { useEffect, useState } from 'react';
import { clearError, sync, useStore } from './store';
import { SyncBadge } from './components';
import { Today } from './screens/Today';
import { History } from './screens/History';
import { Stats } from './screens/Stats';
import { Habits } from './screens/Habits';
import { Settings } from './screens/Settings';

const TABS = [
  { id: 'today', label: 'Today', icon: '◉' },
  { id: 'history', label: 'History', icon: '▦' },
  { id: 'stats', label: 'Stats', icon: '▲' },
  { id: 'habits', label: 'Habits', icon: '☰' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export function App() {
  const { settings, data, error, syncing } = useStore();
  const [tab, setTabState] = useState<Tab>(() => {
    const fromHash = location.hash.slice(1) as Tab;
    if (TABS.some((t) => t.id === fromHash)) return fromHash;
    return settings ? 'today' : 'settings';
  });
  const setTab = (t: Tab) => {
    setTabState(t);
    history.replaceState(null, '', `#${t}`);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    void sync();
  }, []);

  const needsData = tab !== 'settings' && !data;

  return (
    <div className="app">
      <main className="screen">
        <div className="top-status">
          <SyncBadge />
        </div>
        {error && (
          <div className="error" onClick={clearError} role="alert">
            {error} <span className="muted">(tap to dismiss)</span>
          </div>
        )}
        {needsData ? (
          <p className="empty">{settings ? (syncing ? 'Loading your sheet…' : 'Could not load data yet.') : 'Set up the connection in Settings first.'}</p>
        ) : (
          <>
            {tab === 'today' && <Today />}
            {tab === 'history' && <History />}
            {tab === 'stats' && <Stats />}
            {tab === 'habits' && <Habits />}
            {tab === 'settings' && <Settings onSaved={() => setTab('today')} />}
          </>
        )}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <span className="tab-icon" aria-hidden>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
