# CSV to Markdown Parser

## Agent Routing

Read this when:
- running or modifying the local CSV/Google Sheets to JSON/Markdown converter
- debugging Google auth, range targeting, field cache, or TypeScript markdown generation for this app

Source of truth:
- this folder's local app files
- package scripts in the repository root
- `.env.example` in this folder

Verification:
- `npm run csv-to-markdown:start`
- local app at `http://localhost:3100`
- `npm run csv-to-markdown:ts:run` for custom TypeScript generation

A local one-page dashboard for converting Google Sheet ranges into JSON and converting JSON into Markdown.

## Setup

From this app folder:

```bash
npm install
cp .env.example .env
npm start
```

Or from the repository root, use the convenience script:

```bash
npm run csv-to-markdown:start
```

Keep that npm process running, then open <http://localhost:3100>. The **Connect Google** button points at the same local server; if `http://localhost:3100/api/auth/google` says it cannot be reached, the server process is not running on port `3100` or it was started with a different `PORT`.

## Google Sheets auth

You can use either a normal OAuth client or a service account. Do not turn a `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` pair into `service-account.json`; those are different Google credential types.

### Option A: OAuth client ID and secret

Use this when you already have credentials like:

```dotenv
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3100/api/auth/callback
PORT=3100
```

The redirect URI must exactly match one of the authorized redirect URIs configured on the OAuth client in Google Cloud. After starting the app, open <http://localhost:3100/api/auth/google>, approve access, and the app will save a local `.google-token.json` refresh token.

### Option B: Service account

Use this when you have a downloaded service-account key JSON file. Place it at `./service-account.json`, set `GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./service-account.json`, and share the target Google Sheet with the service account `client_email`.

## Range targeting

The range field accepts a full A1 range like `Sheet1!A1:Z`, a named range, or an exact sheet tab name. When an exact sheet tab name is entered, the app fetches the entire sheet and treats row 1 as the header row.

## Schema notes

The Sheet-to-JSON schema accepts JSON with comments and trailing commas. Blank header cells in the selected input range are ignored; only named columns can be referenced by schema leaf values or square-bracket key interpolation.

## Field cache

The dashboard saves the current input fields to `.form-cache.json` as you type and restores them when the app starts. Named saves are stored in `.saved-presets.json`; use the Save field/button to create or overwrite a named save, then use the top-row preset buttons to restore one. These files are local-only and ignored by git.

## TypeScript Markdown generation

The app creates `ts/entry.ts` in the app workspace at startup. Edit that file to rapidly iterate on custom Markdown generation, then run `npm run csv-to-markdown:ts:run` from the repo root or click **Run TS** in the dashboard. To emit a stripped JavaScript copy next to the entry file, run `npm run csv-to-markdown:ts:compile`. The generated entry includes typed helpers: `processOutputJSON(target)`, `outputMarkdownFile(filePath, content)`, and `purgeMarkdownFiles()`. Markdown files are written under `md/` by default. Override `TS_DIR` or `MD_DIR` in `.env` if you need absolute paths.

## Outputs

Generated files are written to `.dev/CSV to Markdown Parser/output/` with timestamped filenames by default. Set `OUTPUT_DIR` in `.env` to override it; relative paths are resolved from the app workspace, and absolute paths are used as-is.
