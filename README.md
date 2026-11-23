# Habits — iPhone app for a Google Sheet habit tracker

A PWA (installable web app) that shows your Google Sheet as an iPhone app:

- **Daily and weekly habits**: daily ones are ticked each day, weekly ones once per week (Mon–Sun)
- **Daily** / **Weekly**: today's daily habits and this week's weekly habits, with streaks and progress
- **Pills**: one line per medication (name, when and how much), ticked once a day; browse and edit past days
- **History**: month calendar shaded by daily completion, plus a weekly column; tap a day to edit that day and its week.
  A habit appears only from the day it was created
- **Other → Stats**: current/best streaks, completion rates and heatmaps for both kinds
- **Other → Habits**: add, rename, reorder, archive/restore and delete daily and weekly habits (= sheet columns)
- **Other → Settings**: connection to your sheet
- Works offline: changes are queued and synced when you're back online

```
iPhone (PWA on GitHub Pages) ──HTTPS──▶ Apps Script Web App ──▶ Google Sheet
```

## 1. Prepare the sheet

The script expects two tabs with the same layout:

**`Daily`**: one row per day

| Date       | Exercise | Read | Meditate |
|------------|----------|------|----------|
| 2026-11-22 | ☑        | ☐    | ☑        |
| 2026-11-23 | ☐        | ☑    | ☐        |

**`Weekly`**: one row per week, dated by the Monday it starts

| Week       | Call parents | Clean flat | Plan next week |
|------------|--------------|------------|----------------|
| 2026-11-16 | ☑            | ☐          | ☑              |
| 2026-11-23 | ☐            | ☐          | ☐              |

- Row 1: the date header, then one column per habit
- Column A: dates (real dates or `yyyy-mm-dd` text); rows may be ascending or descending
- Habit cells: checkboxes / TRUE/FALSE (also understood when reading: `x`, `✓`, `yes`, `1`)
- Missing rows are fine: the app adds a row (with checkboxes) the first time you tick a new day or week.
  A missing tab is created automatically.

**Habit notes**: the app stores each habit's dates in a note on its header cell, one per line:

```
created: 2026-11-23
archived: 2026-11-30
```

- `created`: History shows the habit from this date only. Habits without it show for all dates.
- `archived`: hidden from Daily, Weekly and Stats; History keeps it up to this date. Restoring removes the line.

**`Pills`** and **`PillLog`** tabs are created automatically and hold plain text:

| Pills: Id | Name                      | Dose | Times | Created    |
|-----------|---------------------------|------|-------|------------|
| m3x9a1    | Урсосан, 1 капсула на ніч |      |       | 2026-11-23 |

| PillLog: Date | Time | Pill Id | Name                      | Dose |
|---------------|------|---------|---------------------------|------|
| 2026-11-23    |      | m3x9a1  | Урсосан, 1 капсула на ніч |      |

Each medication is one line of free text and gets one tick per day. `PillLog` has one row per day it was taken
and copies the text, so the history survives editing or deleting the medication. The Dose and Time columns are
no longer used (kept so older rows still line up). Manage medications in the app rather than editing `Pills` by
hand (the Id links the two tabs).

If your tab names differ, edit `TABLES`, `PILLS` and `PILL_LOG` at the top of `apps-script/Code.gs`.

## 2. Deploy the Apps Script API

1. In the sheet: **Extensions → Apps Script**. Replace `Code.gs` with `apps-script/Code.gs`.
2. **Project Settings (⚙) → Script Properties → Add property**:
   `API_TOKEN` = a long random string (e.g. output of `openssl rand -hex 24`).
3. **Deploy → New deployment → type: Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Authorize, then copy the **Web app URL** (ends in `/exec`).
5. Test it:
   ```bash
   curl -L "https://script.google.com/macros/s/XXXX/exec?action=getData&token=YOUR_TOKEN"
   ```

> After changing `Code.gs` later, use **Deploy → Manage deployments → Edit → New version**
> so the same URL keeps working.

## 3. Run / build the web app

```bash
cd web
npm install
npm test            # unit tests for streaks/stats and optimistic updates
npm run dev         # http://localhost:5173 (also reachable from your phone on the same Wi-Fi)
npm run build       # production build in web/dist
npm run icons       # regenerate app icons in web/public/icons
```

## 4. Publish (GitHub Pages)

1. Create a GitHub repo and push this folder to `main`.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. The workflow `.github/workflows/deploy.yml` tests, builds and deploys to
   `https://<your-user>.github.io/<repo>/` on every push.

## 5. Install on the iPhone

No App Store, developer account or cable is needed.

1. Open `https://<your-user>.github.io/<repo>/` in **Safari** (HTTPS is required).
2. Tap **Share** (square with an up arrow) → **Add to Home Screen**.
   If shown, keep **Open as Web App** on. Name it "Habits" → **Add**.
3. Launch it from the home-screen icon — it runs full-screen without Safari bars.
4. On first launch **Settings** opens: paste the Web App URL and your `API_TOKEN`,
   tap **Save & connect**. These are stored only on the device.
5. **Updates**: just push to GitHub; the app picks up the new version the next time it's opened.
6. **Remove**: long-press the icon → Remove App (the sheet is not affected).

Tip: `npm run dev` + `http://<laptop-ip>:5173` on the phone is handy for previewing UI changes,
but installing to the home screen should be done from the HTTPS deployment.

## Security notes

- The Web App runs as you, so anyone with both the URL **and** the token can edit the sheet.
  Never commit the token; it lives only in Script Properties and on your phone.
- The GitHub Pages site itself is public but useless without the token.
- To rotate the token: change `API_TOKEN` in Script Properties, then update it in the app's Settings.

## Project layout

```
apps-script/Code.gs        Apps Script API (getData, habits: setCell, add/rename/delete/move/archive/restore; pills: add/update/delete/move, setIntake)
web/src/api.ts             HTTP client (POST text/plain → no CORS preflight)
web/src/store.ts           state, localStorage cache, offline mutation queue, sync
web/src/lib/apply.ts       optimistic local version of each mutation
web/src/lib/stats.ts       streaks / completion rates
web/src/lib/habits.ts      which habits exist on a date (created / archived)
web/src/lib/pills.ts       doses scheduled on a date
web/src/screens/*.tsx      Daily, Weekly, Pills, History, Other (Stats, Habits, Settings)
```
