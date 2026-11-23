import type { PillsData } from '../types';

/** One medication to tick on a given day. */
export interface Slot {
  pillId: string;
  name: string;
  taken: boolean;
  scheduled: boolean; // false: logged, but the medication has since been deleted
}

/** Medications for a day: every one that existed then, plus any deleted one that was taken. */
export function slotsFor(data: PillsData, date: string): Slot[] {
  const logged = data.log.filter((l) => l.date === date);
  const taken = new Set(logged.map((l) => l.pillId));
  const slots: Slot[] = data.items
    .filter((p) => !p.created || p.created <= date)
    .map((p) => ({ pillId: p.id, name: p.name, taken: taken.has(p.id), scheduled: true }));
  const known = new Set(data.items.map((p) => p.id));
  for (const l of logged) {
    if (!known.has(l.pillId)) {
      known.add(l.pillId);
      slots.push({ pillId: l.pillId, name: l.name, taken: true, scheduled: false });
    }
  }
  return slots;
}

export function newPillId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
