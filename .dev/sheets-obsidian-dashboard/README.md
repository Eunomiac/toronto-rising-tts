# Sheets → Obsidian Dashboard

A self-contained local web app for Google Sheets batch editing and Sheets-backed Obsidian Markdown generation. It intentionally uses only built-in Node.js APIs so it stays isolated from the main repository tooling and does not need an install step.

## Setup

1. Copy `.env.example` to `.env` and fill in your Google OAuth client credentials.
2. Run `npm run dev` in this folder.
3. Open `http://localhost:8787`.
4. Click **Connect** and complete the Google OAuth flow.

Runtime credentials, tokens, presets, generated Markdown, logs, and backups stay inside this app folder and are ignored by git.

## Dashboard capabilities

- Compact 1920×1031 dashboard layout.
- Google Sheets OAuth with spreadsheet URL/ID input and app-owned state sheet name.
- Five local preset slots.
- Pattern-list search/replace using JavaScript regex literal strings such as `/pattern/giu` and native replacement syntax such as `$1`.
- Backup-first pattern application with local reset support and state-sheet audit rows.
- Markdown export from a source range whose first two headers are `path` and `tags`, with an optional third `yaml` column.
- Output files are written under `output/`, which is treated as the Obsidian vault root.
- Existing Markdown files are copied into timestamped folders under `output/_backups/` before overwrite.
- Corrected TSV data, warning logs, and run summaries are written under `output/_logs/`.
