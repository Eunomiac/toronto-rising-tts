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

Share the target Google Sheet with your Google Cloud service account email, then set one of these in `.env`:

- `GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./service-account.json`
- `GOOGLE_SERVICE_ACCOUNT_JSON={...}`

## Outputs

Generated files are written to `~/output/` with timestamped filenames.
