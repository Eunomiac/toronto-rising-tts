# CSV to Markdown Parser

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

## Schema notes

The Sheet-to-JSON schema accepts JSON with comments and trailing commas. Blank header cells in the selected input range are ignored; only named columns can be referenced by schema leaf values or square-bracket key interpolation.

## Field cache

The dashboard saves the current input fields to `.form-cache.json` as you type and restores them when the app starts. Named saves are stored in `.saved-presets.json`; use the Save field/button to create or overwrite a named save, then use the top-row preset buttons to restore one. These files are local-only and ignored by git.

## Outputs

Generated files are written to `.dev/CSV to Markdown Parser/output/` with timestamped filenames by default. Set `OUTPUT_DIR` in `.env` to override it; relative paths are resolved from the app workspace, and absolute paths are used as-is.
