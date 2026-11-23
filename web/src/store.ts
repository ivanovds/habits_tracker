import { useSyncExternalStore } from 'react';
import { ApiError, fetchData, loadSettings, mutate, saveSettings, type ApiSettings } from './api';
import { applyMutation } from './lib/apply';
import type { Mutation, SheetData } from './types';

export interface State {
  settings: ApiSettings | null;
  data: SheetData | null; // server data with pending mutations applied
  pending: Mutation[];
  syncing: boolean;
  offline: boolean;
  error: string | null;
  lastSync: number | null;
}

const CACHE_KEY = 'habits.cache.v3'; // v3: habit meta + pills
const OLD_CACHE_KEY = 'habits.cache.v2';

interface Cache {
  server: SheetData | null;
  pending: Mutation[];
  lastSync: number | null;
}

function readCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as Cache;
    // Older data has a different shape; keep only the queued changes so none are lost.
    const old = localStorage.getItem(OLD_CACHE_KEY);
    if (old) {
      localStorage.removeItem(OLD_CACHE_KEY);
      return { server: null, pending: (JSON.parse(old) as Cache).pending ?? [], lastSync: null };
    }
  } catch {
    /* ignore */
  }
  return { server: null, pending: [], lastSync: null };
}

const cache = readCache();
let server: SheetData | null = cache.server;

function compute(pending: Mutation[]): SheetData | null {
  return server ? pending.reduce(applyMutation, server) : null;
}

let state: State = {
  settings: loadSettings(),
  data: compute(cache.pending),
  pending: cache.pending,
  syncing: false,
  offline: false,
  error: null,
  lastSync: cache.lastSync,
};

const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  if ('pending' in patch) state.data = compute(state.pending);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ server, pending: state.pending, lastSync: state.lastSync }));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, () => state);
}

let flushing: Promise<void> | null = null;

/** Sends queued mutations one by one, then pulls fresh data. Safe to call any time. */
export function sync(): Promise<void> {
  if (!flushing) flushing = doSync().finally(() => (flushing = null));
  return flushing;
}

async function doSync() {
  const s = state.settings;
  if (!s) return;
  set({ syncing: true });
  try {
    if (!state.pending.length) {
      server = await fetchData(s);
      set({ pending: [], lastSync: Date.now(), offline: false });
    }
    while (state.pending.length) {
      const m = state.pending[0];
      // New mutations may be appended while awaiting; only drop the one we sent.
      const without = () => (state.pending[0] === m ? state.pending.slice(1) : state.pending);
      try {
        server = await mutate(s, m);
        set({ pending: without(), lastSync: Date.now(), offline: false });
      } catch (e) {
        if (e instanceof ApiError && !/unauthorized|API_TOKEN|unexpected response/i.test(e.message)) {
          // The server rejected it (e.g. habit was renamed in the sheet) — drop it and keep going.
          set({ pending: without(), error: e.message });
        } else {
          throw e;
        }
      }
    }
  } catch (e) {
    if (e instanceof ApiError) set({ error: e.message });
    else set({ offline: true });
  } finally {
    set({ syncing: false });
  }
}

export function dispatch(m: Mutation) {
  set({ pending: [...state.pending, m], error: null });
  void sync();
}

export function updateSettings(s: ApiSettings) {
  saveSettings(s);
  server = null;
  set({ settings: s, pending: [], error: null, lastSync: null });
  void sync();
}

export function clearError() {
  set({ error: null });
}

// Retry when the network comes back or the app returns to the foreground.
window.addEventListener('online', () => void sync());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void sync();
});
setInterval(() => {
  if (state.pending.length && document.visibilityState === 'visible') void sync();
}, 15000);
