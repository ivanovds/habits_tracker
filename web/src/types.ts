export type Kind = 'daily' | 'weekly';

export interface Row {
  date: string; // yyyy-MM-dd; for weekly rows, the Monday the week starts
  values: Record<string, boolean>;
}

export interface Table {
  habits: string[];
  rows: Row[];
}

export type SheetData = Record<Kind, Table>;

export type Mutation =
  | { action: 'setCell'; kind: Kind; date: string; habit: string; value: boolean }
  | { action: 'addHabit'; kind: Kind; name: string }
  | { action: 'renameHabit'; kind: Kind; oldName: string; newName: string }
  | { action: 'deleteHabit'; kind: Kind; name: string }
  | { action: 'moveHabit'; kind: Kind; name: string; toIndex: number };
