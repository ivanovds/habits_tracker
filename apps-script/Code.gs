/**
 * Habit Tracker API — bind this script to your habits spreadsheet.
 *
 * Habit tabs, same layout:
 *   Daily:   Date | Habit A | Habit B ...   one row per day
 *   Weekly:  Week | Habit X | Habit Y ...   one row per week (the Monday it starts)
 * Habit cells are checkboxes (TRUE/FALSE). Each habit's header cell may carry a note with
 * its metadata, one "key: yyyy-mm-dd" per line:
 *   created: 2026-11-23     shown in History only from this date
 *   archived: 2026-11-30    hidden from Daily/Weekly; History shows it up to this date
 *
 * Medication tabs (created automatically, stored as plain text):
 *   Pills:    Id | Name | Dose | Times | Created     one row per medication, ticked once a day;
 *                                                     Name holds what/when/how much, Dose and Times are unused
 *   PillLog:  Date | Time | Pill Id | Name | Dose    one row per day it was taken (Time, Dose unused)
 *
 * Setup:
 *   1. Project Settings → Script Properties → add API_TOKEN = <long random string>
 *   2. Deploy → New deployment → Web app
 *        Execute as: Me    Who has access: Anyone
 *   3. Copy the /exec URL into the app's Settings screen together with the token.
 *   After editing this file: save, then Deploy → Manage deployments → Edit → New version.
 */

const TABLES = {
  daily: { sheet: 'Daily', dateHeader: 'Date' },
  weekly: { sheet: 'Weekly', dateHeader: 'Week' },
};
const PILLS = { sheet: 'Pills', headers: ['Id', 'Name', 'Dose', 'Times', 'Created'] };
const PILL_LOG = { sheet: 'PillLog', headers: ['Date', 'Time', 'Pill Id', 'Name', 'Dose'] };
const HEADER_ROW = 1;
const DATE_COL = 1;
const FIRST_HABIT_COL = DATE_COL + 1;
const META_KEYS = ['created', 'archived'];

// ---------- HTTP entry points ----------

function doGet(e) {
  return handle_(e.parameter || {});
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'Invalid JSON body' });
  }
  return handle_(body);
}

function handle_(req) {
  try {
    checkToken_(req.token);
    const action = req.action || 'getData';
    if (action === 'getData') return json_({ ok: true, data: getData_() });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sh = function () { return sheet_(req.kind); };
      switch (action) {
        case 'setCell': setCell_(sh(), req.kind, req.date, req.habit, !!req.value); break;
        case 'addHabit': addHabit_(sh(), req.name, req.created); break;
        case 'renameHabit': renameHabit_(sh(), req.oldName, req.newName); break;
        case 'deleteHabit': deleteHabit_(sh(), req.name); break;
        case 'moveHabit': moveHabit_(sh(), req.name, Number(req.toIndex)); break;
        case 'archiveHabit': setMeta_(sh(), req.name, { archived: isoArg_(req.date) }); break;
        case 'restoreHabit': setMeta_(sh(), req.name, { archived: null }); break;
        case 'addPill': addPill_(req.pill); break;
        case 'updatePill': updatePill_(req.pill); break;
        case 'deletePill': deletePill_(req.id); break;
        case 'movePill': movePill_(req.id, Number(req.toIndex)); break;
        case 'setIntake': setIntake_(req); break;
        default: throw new Error('Unknown action: ' + action);
      }
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true, data: getData_() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (!expected) throw new Error('API_TOKEN script property is not set');
  if (token !== expected) throw new Error('Unauthorized');
}

// ---------- Sheet helpers ----------

function sheet_(kind) {
  const t = TABLES[kind];
  if (!t) throw new Error('Unknown kind: ' + kind);
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(t.sheet);
  if (!sh) {
    sh = ss.insertSheet(t.sheet);
    sh.getRange(HEADER_ROW, DATE_COL).setValue(t.dateHeader);
    sh.setFrozenRows(HEADER_ROW);
  }
  return sh;
}

/** A plain-text tab with a fixed header row (Pills, PillLog). */
function textSheet_(def) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(def.sheet);
  if (!sh) {
    sh = ss.insertSheet(def.sheet);
    sh.getRange(1, 1, sh.getMaxRows(), def.headers.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function tz_() {
  return SpreadsheetApp.getActive().getSpreadsheetTimeZone();
}

function toIsoDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  if (typeof v === 'string' && v.trim()) {
    const d = new Date(v);
    if (!isNaN(d)) return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
  }
  return null;
}

function isoArg_(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw new Error('Bad date: ' + v);
  return String(v);
}

/** Monday of the week containing the given yyyy-MM-dd date. */
function weekStart_(iso) {
  const p = iso.split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}

function isTruthy_(v) {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return ['true', 'yes', 'y', 'x', '1', '✓', '✔', '✅', 'done', '+'].indexOf(s) !== -1;
  }
  return false;
}

function parseMeta_(note) {
  const meta = {};
  String(note || '').split('\n').forEach(function (line) {
    const m = /^\s*(\w+)\s*:\s*(\d{4}-\d{2}-\d{2})/.exec(line);
    if (m && META_KEYS.indexOf(m[1]) !== -1) meta[m[1]] = m[2];
  });
  return meta;
}

function formatMeta_(meta) {
  return META_KEYS.filter(function (k) { return meta[k]; })
    .map(function (k) { return k + ': ' + meta[k]; })
    .join('\n');
}

/** Habit header cells: [{name, meta}] in column order. */
function headers_(sh) {
  const lastCol = sh.getLastColumn();
  if (lastCol < FIRST_HABIT_COL) return [];
  const r = sh.getRange(HEADER_ROW, FIRST_HABIT_COL, 1, lastCol - FIRST_HABIT_COL + 1);
  const names = r.getValues()[0];
  const notes = r.getNotes()[0];
  const out = [];
  names.forEach(function (n, i) {
    const name = String(n).trim();
    if (name) out.push({ name: name, meta: parseMeta_(notes[i]) });
  });
  return out;
}

function habits_(sh) {
  return headers_(sh).map(function (h) { return h.name; });
}

function habitCol_(sh, name) {
  const idx = habits_(sh).indexOf(String(name).trim());
  if (idx === -1) throw new Error('Habit not found: ' + name);
  return FIRST_HABIT_COL + idx;
}

/** Returns [{row, date}] for all data rows that contain a parseable date. */
function dateRows_(sh) {
  const lastRow = sh.getLastRow();
  if (lastRow <= HEADER_ROW) return [];
  const vals = sh.getRange(HEADER_ROW + 1, DATE_COL, lastRow - HEADER_ROW, 1).getValues();
  const out = [];
  vals.forEach(function (r, i) {
    const d = toIsoDate_(r[0]);
    if (d) out.push({ row: HEADER_ROW + 1 + i, date: d });
  });
  return out;
}

/** Data rows of a text tab: [{row, v: values, d: display values}]. */
function textRows_(sh, width) {
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return [];
  const r = sh.getRange(2, 1, lastRow - 1, width);
  const v = r.getValues();
  const d = r.getDisplayValues();
  return v.map(function (row, i) { return { row: i + 2, v: row, d: d[i] }; });
}

function writeTextRow_(sh, row, values) {
  sh.getRange(row, 1, 1, values.length).setNumberFormat('@').setValues([values.map(String)]);
}

// ---------- Habit actions ----------

function readTable_(sh) {
  const headers = headers_(sh);
  const habits = headers.map(function (h) { return h.name; });
  const meta = {};
  headers.forEach(function (h) { if (Object.keys(h.meta).length) meta[h.name] = h.meta; });
  const lastRow = sh.getLastRow();
  const rows = [];
  if (lastRow > HEADER_ROW && habits.length) {
    const width = FIRST_HABIT_COL - DATE_COL + habits.length;
    const vals = sh.getRange(HEADER_ROW + 1, DATE_COL, lastRow - HEADER_ROW, width).getValues();
    vals.forEach(function (r) {
      const date = toIsoDate_(r[0]);
      if (!date) return;
      const values = {};
      habits.forEach(function (h, i) { values[h] = isTruthy_(r[FIRST_HABIT_COL - DATE_COL + i]); });
      rows.push({ date: date, values: values });
    });
  }
  return { habits: habits, meta: meta, rows: rows };
}

function getData_() {
  return {
    daily: readTable_(sheet_('daily')),
    weekly: readTable_(sheet_('weekly')),
    pills: readPills_(),
  };
}

function setCell_(sh, kind, date, habit, value) {
  date = isoArg_(date);
  if (kind === 'weekly') date = weekStart_(date);
  const col = habitCol_(sh, habit);
  const row = findOrCreateRow_(sh, date);
  sh.getRange(row, col).setValue(value);
}

function findOrCreateRow_(sh, date) {
  const rows = dateRows_(sh);
  for (let i = 0; i < rows.length; i++) if (rows[i].date === date) return rows[i].row;

  const descending = rows.length > 1 && rows[0].date > rows[rows.length - 1].date;
  let insertAt = null;
  for (let i = 0; i < rows.length; i++) {
    const after = descending ? rows[i].date < date : rows[i].date > date;
    if (after) { insertAt = rows[i].row; break; }
  }

  let row;
  if (insertAt === null) {
    row = Math.max(sh.getLastRow(), HEADER_ROW) + 1;
  } else {
    sh.insertRowBefore(insertAt);
    row = insertAt;
  }

  const parts = date.split('-').map(Number);
  sh.getRange(row, DATE_COL).setValue(new Date(parts[0], parts[1] - 1, parts[2])).setNumberFormat('yyyy-mm-dd');
  const n = habits_(sh).length;
  if (n) {
    const r = sh.getRange(row, FIRST_HABIT_COL, 1, n);
    r.insertCheckboxes();
    r.setValue(false);
  }
  return row;
}

function addHabit_(sh, name, created) {
  name = String(name || '').trim();
  if (!name) throw new Error('Habit name is empty');
  if (habits_(sh).indexOf(name) !== -1) throw new Error('Habit already exists: ' + name);
  const col = FIRST_HABIT_COL + habits_(sh).length;
  if (col > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), 1);
  const head = sh.getRange(HEADER_ROW, col);
  head.setValue(name);
  head.setNote(created ? formatMeta_({ created: isoArg_(created) }) : '');
  const lastRow = sh.getLastRow();
  if (lastRow > HEADER_ROW) {
    const r = sh.getRange(HEADER_ROW + 1, col, lastRow - HEADER_ROW, 1);
    r.insertCheckboxes();
    r.setValue(false);
  }
}

/** Merges `patch` into the habit's header note; a null value removes that key. */
function setMeta_(sh, name, patch) {
  const cell = sh.getRange(HEADER_ROW, habitCol_(sh, name));
  const meta = parseMeta_(cell.getNote());
  Object.keys(patch).forEach(function (k) {
    if (patch[k]) meta[k] = patch[k];
    else delete meta[k];
  });
  cell.setNote(formatMeta_(meta));
}

function renameHabit_(sh, oldName, newName) {
  newName = String(newName || '').trim();
  if (!newName) throw new Error('New name is empty');
  if (habits_(sh).indexOf(newName) !== -1) throw new Error('Habit already exists: ' + newName);
  sh.getRange(HEADER_ROW, habitCol_(sh, oldName)).setValue(newName); // the note stays with the cell
}

function deleteHabit_(sh, name) {
  sh.deleteColumn(habitCol_(sh, name));
}

function moveHabit_(sh, name, toIndex) {
  const n = habits_(sh).length;
  if (!(toIndex >= 0 && toIndex < n)) throw new Error('Bad index: ' + toIndex);
  const from = habitCol_(sh, name);
  const fromIndex = from - FIRST_HABIT_COL;
  if (fromIndex === toIndex) return;
  // moveColumns' destination is the column index *before* the move happens.
  const dest = FIRST_HABIT_COL + (toIndex > fromIndex ? toIndex + 1 : toIndex);
  sh.moveColumns(sh.getRange(1, from), dest);
}

// ---------- Medication actions ----------

function readPills_() {
  const items = textRows_(textSheet_(PILLS), PILLS.headers.length)
    .map(function (r) {
      return { id: String(r.v[0]).trim(), name: String(r.d[1]).trim(), created: toIsoDate_(r.v[4]) || '' };
    })
    .filter(function (p) { return p.id && p.name; });
  const log = textRows_(textSheet_(PILL_LOG), PILL_LOG.headers.length)
    .map(function (r) {
      return { date: toIsoDate_(r.v[0]), pillId: String(r.v[2]).trim(), name: String(r.d[3]).trim() };
    })
    .filter(function (l) { return l.date && l.pillId; });
  return { items: items, log: log };
}

function pillRow_(sh, id) {
  const rows = textRows_(sh, PILLS.headers.length);
  for (let i = 0; i < rows.length; i++) if (String(rows[i].v[0]).trim() === id) return rows[i];
  return null;
}

function cleanPill_(p) {
  p = p || {};
  const id = String(p.id || '').trim();
  const name = String(p.name || '').trim();
  if (!id) throw new Error('Medication id is empty');
  if (!name) throw new Error('Medication name is empty');
  return { id: id, name: name };
}

function addPill_(pill) {
  const p = cleanPill_(pill);
  const sh = textSheet_(PILLS);
  if (pillRow_(sh, p.id)) throw new Error('Medication already exists: ' + p.id);
  const created = pill.created ? isoArg_(pill.created) : '';
  writeTextRow_(sh, sh.getLastRow() + 1, [p.id, p.name, '', '', created]);
}

function updatePill_(pill) {
  const p = cleanPill_(pill);
  const sh = textSheet_(PILLS);
  const r = pillRow_(sh, p.id);
  if (!r) throw new Error('Medication not found: ' + p.name);
  writeTextRow_(sh, r.row, [p.id, p.name, '', '', toIsoDate_(r.v[4]) || '']);
}

function deletePill_(id) {
  const sh = textSheet_(PILLS);
  const r = pillRow_(sh, String(id || '').trim());
  if (r) sh.deleteRow(r.row); // PillLog keeps the days it was taken
}

function movePill_(id, toIndex) {
  const sh = textSheet_(PILLS);
  const rows = textRows_(sh, PILLS.headers.length).filter(function (r) {
    return String(r.v[0]).trim() && String(r.d[1]).trim();
  });
  if (!(toIndex >= 0 && toIndex < rows.length)) throw new Error('Bad index: ' + toIndex);
  let from = -1;
  for (let i = 0; i < rows.length; i++) if (String(rows[i].v[0]).trim() === String(id).trim()) from = i;
  if (from === -1) throw new Error('Medication not found: ' + id);
  if (from === toIndex) return;
  // moveRows' destination is the row index *before* the move happens.
  const target = rows[toIndex].row;
  sh.moveRows(sh.getRange(rows[from].row, 1), toIndex > from ? target + 1 : target);
}

function setIntake_(req) {
  const date = isoArg_(req.date);
  const pillId = String(req.pillId || '').trim();
  if (!pillId) throw new Error('Medication id is empty');
  const sh = textSheet_(PILL_LOG);
  const matches = textRows_(sh, PILL_LOG.headers.length).filter(function (r) {
    return toIsoDate_(r.v[0]) === date && String(r.v[2]).trim() === pillId;
  });
  if (req.value && !matches.length) {
    writeTextRow_(sh, sh.getLastRow() + 1, [date, '', pillId, String(req.name || ''), '']);
  } else if (!req.value) {
    for (let i = matches.length - 1; i >= 0; i--) sh.deleteRow(matches[i].row);
  }
}
