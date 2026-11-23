/**
 * Habit Tracker API — bind this script to your habits spreadsheet.
 *
 * Two tabs, same layout:
 *   Daily:   Date | Habit A | Habit B ...   one row per day
 *   Weekly:  Week | Habit X | Habit Y ...   one row per week (the Monday it starts)
 * Habit cells are checkboxes (TRUE/FALSE).
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
const HEADER_ROW = 1;
const DATE_COL = 1;
const FIRST_HABIT_COL = DATE_COL + 1;

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
      const sh = sheet_(req.kind);
      switch (action) {
        case 'setCell': setCell_(sh, req.kind, req.date, req.habit, !!req.value); break;
        case 'addHabit': addHabit_(sh, req.name); break;
        case 'renameHabit': renameHabit_(sh, req.oldName, req.newName); break;
        case 'deleteHabit': deleteHabit_(sh, req.name); break;
        case 'moveHabit': moveHabit_(sh, req.name, Number(req.toIndex)); break;
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

function habits_(sh) {
  const lastCol = sh.getLastColumn();
  if (lastCol < FIRST_HABIT_COL) return [];
  return sh.getRange(HEADER_ROW, FIRST_HABIT_COL, 1, lastCol - FIRST_HABIT_COL + 1)
    .getValues()[0]
    .map(String)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
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

// ---------- Actions ----------

function readTable_(sh) {
  const habits = habits_(sh);
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
  return { habits: habits, rows: rows };
}

function getData_() {
  return { daily: readTable_(sheet_('daily')), weekly: readTable_(sheet_('weekly')) };
}

function setCell_(sh, kind, date, habit, value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error('Bad date: ' + date);
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

function addHabit_(sh, name) {
  name = String(name || '').trim();
  if (!name) throw new Error('Habit name is empty');
  if (habits_(sh).indexOf(name) !== -1) throw new Error('Habit already exists: ' + name);
  const col = FIRST_HABIT_COL + habits_(sh).length;
  if (col > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), 1);
  sh.getRange(HEADER_ROW, col).setValue(name);
  const lastRow = sh.getLastRow();
  if (lastRow > HEADER_ROW) {
    const r = sh.getRange(HEADER_ROW + 1, col, lastRow - HEADER_ROW, 1);
    r.insertCheckboxes();
    r.setValue(false);
  }
}

function renameHabit_(sh, oldName, newName) {
  newName = String(newName || '').trim();
  if (!newName) throw new Error('New name is empty');
  if (habits_(sh).indexOf(newName) !== -1) throw new Error('Habit already exists: ' + newName);
  sh.getRange(HEADER_ROW, habitCol_(sh, oldName)).setValue(newName);
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
