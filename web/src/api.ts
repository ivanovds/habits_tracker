import type { Mutation, SheetData } from './types';

export interface ApiSettings {
  url: string;
  token: string;
}

const SETTINGS_KEY = 'habits.settings';

export function loadSettings(): ApiSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const s = raw ? (JSON.parse(raw) as ApiSettings) : null;
    return s && s.url && s.token ? s : null;
  } catch {
    return null;
  }
}

export function saveSettings(s: ApiSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

interface ApiResponse {
  ok: boolean;
  data?: SheetData;
  error?: string;
}

/** Thrown for errors the server reported (bad token, unknown habit) — retrying won't help. */
export class ApiError extends Error {}

// POST with text/plain is a "simple" CORS request, so no preflight — Apps Script can't answer OPTIONS.
async function call(s: ApiSettings, body: Record<string, unknown>): Promise<SheetData> {
  const res = await fetch(s.url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, token: s.token }),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let json: ApiResponse;
  try {
    json = (await res.json()) as ApiResponse;
  } catch {
    throw new ApiError('Unexpected response — check the Web App URL ends with /exec and access is "Anyone".');
  }
  if (!json.ok || !json.data) throw new ApiError(json.error || 'Unknown server error');
  const d = json.data;
  if (!d.daily || !d.weekly || !d.pills) {
    throw new ApiError('Unexpected response: the deployed Apps Script is outdated. Paste the new Code.gs and deploy a new version.');
  }
  d.daily.meta ??= {};
  d.weekly.meta ??= {};
  return d;
}

export function fetchData(s: ApiSettings): Promise<SheetData> {
  return call(s, { action: 'getData' });
}

export function mutate(s: ApiSettings, m: Mutation): Promise<SheetData> {
  return call(s, { ...m });
}
