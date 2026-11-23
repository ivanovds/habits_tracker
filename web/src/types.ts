export type Kind = 'daily' | 'weekly';

export interface Row {
  date: string; // yyyy-MM-dd; for weekly rows, the Monday the week starts
  values: Record<string, boolean>;
}

/** Stored in the habit's header-cell note. Missing dates mean "unknown": no limit on that side. */
export interface HabitMeta {
  created?: string; // first day the habit exists
  archived?: string; // last day it was active; set = hidden from Daily/Weekly
}

export interface Table {
  habits: string[]; // sheet column order, archived ones included
  meta: Record<string, HabitMeta>;
  rows: Row[];
}

/** One medication entry = one tick per day. `name` is free text: what, when and how much. */
export interface Pill {
  id: string;
  name: string;
  created?: string;
}

/** A day the medication was taken. The text is copied so history survives edits and deletion. */
export interface Intake {
  date: string;
  pillId: string;
  name: string;
}

export interface PillsData {
  items: Pill[];
  log: Intake[];
}

export interface SheetData {
  daily: Table;
  weekly: Table;
  pills: PillsData;
}

export type HabitMutation =
  | { action: 'setCell'; kind: Kind; date: string; habit: string; value: boolean }
  | { action: 'addHabit'; kind: Kind; name: string; created?: string }
  | { action: 'renameHabit'; kind: Kind; oldName: string; newName: string }
  | { action: 'deleteHabit'; kind: Kind; name: string }
  | { action: 'moveHabit'; kind: Kind; name: string; toIndex: number }
  | { action: 'archiveHabit'; kind: Kind; name: string; date: string }
  | { action: 'restoreHabit'; kind: Kind; name: string };

export type PillMutation =
  | { action: 'addPill'; pill: Pill }
  | { action: 'updatePill'; pill: Pill }
  | { action: 'deletePill'; id: string }
  | { action: 'movePill'; id: string; toIndex: number }
  | { action: 'setIntake'; date: string; pillId: string; name: string; value: boolean };

export type Mutation = HabitMutation | PillMutation;
