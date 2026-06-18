# CSV to Markdown Parser

A local one-page dashboard for converting Google Sheet ranges into JSON and converting JSON into Markdown.

## Setup

```bash
npm install
cp .env.example .env
npm start
```

Open <http://localhost:3100>.

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

## Outputs

Generated files are written to `~/output/` with timestamped filenames.
