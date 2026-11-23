import { useState } from 'react';
import { sync, updateSettings, useStore } from '../store';

export function Settings({ onSaved }: { onSaved?: () => void }) {
  const { settings, lastSync, syncing, pending, offline } = useStore();
  const [url, setUrl] = useState(settings?.url ?? '');
  const [token, setToken] = useState(settings?.token ?? '');

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ url: url.trim(), token: token.trim() });
    onSaved?.();
  };

  return (
    <>
      <header className="screen-header">
        <h1>Settings</h1>
      </header>
      {!settings && (
        <p className="hint">
          Connect the app to your Google Sheet: paste the Apps Script Web App URL (ends with <code>/exec</code>) and the
          <code> API_TOKEN</code> you set in Script Properties.
        </p>
      )}
      <form className="card form" onSubmit={save}>
        <label>
          Web App URL
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec"
            autoCapitalize="off"
            autoCorrect="off"
            required
          />
        </label>
        <label>
          API token
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" required />
        </label>
        <button type="submit" className="primary">Save &amp; connect</button>
      </form>
      {settings && (
        <section className="card">
          <p className="muted">
            {offline ? 'Offline. ' : ''}
            {pending.length ? `${pending.length} change(s) waiting to sync. ` : ''}
            Last synced: {lastSync ? new Date(lastSync).toLocaleString() : 'never'}
          </p>
          <button className="primary" onClick={() => void sync()} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </section>
      )}
    </>
  );
}
