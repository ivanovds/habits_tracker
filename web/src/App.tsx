import { useEffect, useState } from 'react';
import { clearError, sync, useStore } from './store';
import { SyncBadge } from './components';
import { Icon } from './icons';
import { Daily } from './screens/Daily';
import { Weekly } from './screens/Weekly';
import { Pills } from './screens/Pills';
import { History } from './screens/History';
import { Other, type OtherTab } from './screens/Other';
import { Stats } from './screens/Stats';
import { Habits } from './screens/Habits';
import { Settings } from './screens/Settings';

const TABS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'pills', label: 'Pills' },
  { id: 'history', label: 'History' },
  { id: 'other', label: 'Other' },
] as const;
const OTHER_TABS: OtherTab[] = ['stats', 'habits', 'settings'];
type Tab = (typeof TABS)[number]['id'] | OtherTab;

function isTab(s: string): s is Tab {
  return TABS.some((t) => t.id === s) || (OTHER_TABS as string[]).includes(s);
}

export function App() {
  const { settings, data, error, syncing } = useStore();
  const [tab, setTabState] = useState<Tab>(() => {
    const fromHash = location.hash.slice(1);
    if (fromHash === 'today') return 'daily'; // old bookmark
    if (isTab(fromHash)) return fromHash;
    return settings ? 'daily' : 'settings';
  });
  const setTab = (t: Tab) => {
    setTabState(t);
    history.replaceState(null, '', `#${t}`);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    void sync();
  }, []);

  const inOther = (OTHER_TABS as string[]).includes(tab);
  const activeTab = inOther ? 'other' : tab;
  const needsData = tab !== 'settings' && tab !== 'other' && !data;

  return (
    <div className="app">
      <main className="screen">
        <div className="top-status">
          {inOther && (
            <button className="back" onClick={() => setTab('other')}>‹ Other</button>
          )}
          <SyncBadge />
        </div>
        {error && (
          <div className="error" onClick={clearError} role="alert">
            {error} <span className="muted">(tap to dismiss)</span>
          </div>
        )}
        {needsData ? (
          <p className="empty">{settings ? (syncing ? 'Loading your sheet…' : 'Could not load data yet.') : 'Set up the connection in Other → Settings first.'}</p>
        ) : (
          <>
            {tab === 'daily' && <Daily />}
            {tab === 'weekly' && <Weekly />}
            {tab === 'pills' && <Pills />}
            {tab === 'history' && <History />}
            {tab === 'other' && <Other open={setTab} />}
            {tab === 'stats' && <Stats />}
            {tab === 'habits' && <Habits />}
            {tab === 'settings' && <Settings onSaved={() => setTab('daily')} />}
          </>
        )}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={activeTab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <Icon name={t.id} className="tab-icon" />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
