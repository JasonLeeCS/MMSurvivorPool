# March Madness Survivor Pool

Production-ready v1 for a men's NCAA March Madness survivor pool built for GitHub Pages.

## Architecture

- `frontend/`: React + Vite + TypeScript static app for GitHub Pages.
- `apps-script/`: Google Apps Script backend that reads/writes Google Sheets and exposes JSON APIs with `doGet` / `doPost`.
- `docs/`: sample sheet definitions and seed data the commissioner can copy into Google Sheets.

The frontend supports two modes:

- Mock mode for local development and UI validation.
- Live mode backed by a deployed Google Apps Script web app.

The frontend defaults to the shared-name dropdown pick flow first. Users do not need accounts. Admin access uses a hidden route slug plus passcode validation handled by Apps Script.

## Features

- Public dashboard with alive/eliminated status, buy-backs, missing picks, lock state, and historical picks.
- Shared-name pick submission page with server-enforced eligibility rules.
- Passcode-gated admin page for user CRUD, pick overrides, buy-backs, team sync, and CSV export.
- Google Sheet as the source of truth.
- NCAA sync provider abstraction with failure-safe fallback to last known sheet data.
- GitHub Pages-safe hash routing and static deployment.

## Repo Layout

```text
.
|-- README.md
|-- apps-script
|   |-- Code.gs
|   |-- appsscript.json
|   |-- sheets.gs
|   `-- sync.gs
|-- docs
|   |-- SAMPLE_DATA.md
|   `-- SHEET_SCHEMA.md
`-- frontend
    |-- .env.example
    |-- index.html
    |-- package.json
    |-- tsconfig.json
    |-- tsconfig.node.json
    |-- vite.config.ts
    |-- public
    |   `-- 404.html
    |-- .github
    |   `-- workflows
    |       `-- deploy-pages.yml
    `-- src
        |-- App.tsx
        |-- main.tsx
        |-- styles.css
        |-- components
        |-- hooks
        |-- lib
        |-- pages
        |-- services
        `-- types
```

## Run The App

### Local Development

1. Open a terminal in the repo root.
2. Move into the frontend app:

```bash
cd frontend
```

3. Install dependencies:

```bash
npm install
```

4. Create `.env` from `.env.example`.
5. Keep `VITE_USE_MOCK_API=true` if you want to run the app without deploying Apps Script yet.
6. Start the dev server:

```bash
npm run dev
```

7. Open the local URL printed by Vite, usually `http://localhost:5173`.

### Production Build Preview

To test the GitHub Pages build locally:

```bash
cd frontend
npm run build
npm run preview
```

### Run Against Google Apps Script

After deploying the Apps Script web app:

1. Set `VITE_USE_MOCK_API=false` in `frontend/.env`.
2. Set `VITE_APPS_SCRIPT_BASE_URL` to your deployed Apps Script web app URL.
3. Restart the Vite dev server with `npm run dev`.

## Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Create `.env` from `.env.example`.

3. Start local development:

```bash
npm run dev
```

Mock mode stays enabled if `VITE_USE_MOCK_API=true`.

## GitHub Pages Deployment

1. Push the repo to GitHub.
2. In `frontend/.env`, set:
   - `VITE_APPS_SCRIPT_BASE_URL`
   - `VITE_USE_MOCK_API=false`
   - `VITE_BASE_PATH=/YOUR_REPO_NAME/`
   - `VITE_ADMIN_ROUTE_SLUG=commissioner-portal` or another secret-ish slug
3. In GitHub:
   - Enable Pages.
   - Set source to GitHub Actions.
4. The included workflow at [frontend/.github/workflows/deploy-pages.yml](/C:/Users/Jason%20Lee/Documents/New%20project/frontend/.github/workflows/deploy-pages.yml) builds and deploys the static site.

The app uses hash routing, so GitHub Pages routing is safe even on refresh. `public/404.html` is included as an extra fallback.

## Commissioner Settings

The commissioner edits settings in the `Settings` tab of Google Sheets.

Recommended keys:

- `season_year`
- `timezone`
- `default_lock_mode`
- `admin_passcode_salt`
- `admin_passcode_hash`
- `ncaa_provider`
- `ncaa_scoreboard_base_url`
- `sync_enabled`
- `last_sync_status`
- `last_sync_message`
- `last_sync_at`

The frontend also has deploy-time settings in [frontend/.env.example](/C:/Users/Jason%20Lee/Documents/New%20project/frontend/.env.example):

- `VITE_APPS_SCRIPT_BASE_URL`
- `VITE_USE_MOCK_API`
- `VITE_SEASON_YEAR`
- `VITE_BASE_PATH`
- `VITE_ADMIN_ROUTE_SLUG`
- `VITE_ENABLE_UNIQUE_LINK_FLOW`

## Google Sheet Setup

Create one Google Sheet with these tabs:

- `Settings`
- `Users`
- `Picks`
- `Teams`
- `Games`
- `Buybacks`
- `AdminMeta`

Exact column definitions are documented in [docs/SHEET_SCHEMA.md](/C:/Users/Jason%20Lee/Documents/New%20project/docs/SHEET_SCHEMA.md).

Sample rows are documented in [docs/SAMPLE_DATA.md](/C:/Users/Jason%20Lee/Documents/New%20project/docs/SAMPLE_DATA.md).

## Apps Script Deployment

1. Open the Google Sheet.
2. Extensions -> Apps Script.
3. Copy the contents of:
   - [apps-script/Code.gs](/C:/Users/Jason%20Lee/Documents/New%20project/apps-script/Code.gs)
   - [apps-script/sheets.gs](/C:/Users/Jason%20Lee/Documents/New%20project/apps-script/sheets.gs)
   - [apps-script/sync.gs](/C:/Users/Jason%20Lee/Documents/New%20project/apps-script/sync.gs)
4. Replace the default manifest with [apps-script/appsscript.json](/C:/Users/Jason%20Lee/Documents/New%20project/apps-script/appsscript.json).
5. Update the `SPREADSHEET_ID` script property if you are binding the script to a different spreadsheet.
6. Deploy:
   - Deploy -> New deployment
   - Type: Web app
   - Execute as: Me
   - Who has access: Anyone
7. Copy the web app URL into `VITE_APPS_SCRIPT_BASE_URL`.

## How To Set The Admin Passcode

1. Pick a passcode.
2. In Apps Script, run `createAdminHashForSetup('your-passcode')` from the editor.
3. Copy the returned `salt` and `hash`.
4. Paste them into the `Settings` sheet rows:
   - `admin_passcode_salt`
   - `admin_passcode_hash`

The frontend never needs the raw passcode value.

## NCAA Sync Config

Apps Script uses a provider abstraction:

- `ncaa` provider: fetches NCAA scoreboard JSON by date and updates `Games` and `Teams`.
- Manual fallback: if sync fails, the app continues to use the latest sheet data.

Commissioner-editable settings:

- `sync_enabled`
- `ncaa_provider`
- `ncaa_scoreboard_base_url`

Admin users can also trigger a manual refresh from the admin page.

## CSV Export

The admin page includes an export action that downloads a picks CSV generated from current sheet data. The CSV includes one row per pick with date, user, team, timestamps, result, and override flags.

## Local Development Notes

- The frontend uses mock data by default so the UI works before Apps Script is deployed.
- The mock API mirrors the live endpoint contract closely enough to switch by env flag.
- To test production behavior, deploy Apps Script first and then set `VITE_USE_MOCK_API=false`.
