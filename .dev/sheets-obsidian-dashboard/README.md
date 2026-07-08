# Sheets → Obsidian Dashboard

## Agent Routing

Read this when:
- running or modifying the standalone Sheets-backed Obsidian markdown dashboard
- debugging OAuth, preset state, search/replace patterns, fixture tests, or markdown output folders for this app

Source of truth:
- this app folder
- this app's `.env.example`
- generated output/log folders under this app, which are local artifacts

Verification:
- `npm run dev` from this folder
- local app at `http://localhost:8787`
- Testing panel fixture workflow

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

## Testing fixture workflow

The dashboard's **Testing** panel runs the same pattern replacement and Markdown generation logic against test Sheets ranges without touching the normal `output/` tree.

1. Put the expected Markdown fixture folder under `testing/validOutput/<fixture-name>/`.
2. Enter `<fixture-name>` in **Markdown Output Root Folder**.
3. Enter the test pattern range and test data range.
4. Click **Run Test**.

The app validates that `testing/validOutput/<fixture-name>/` exists and contains at least one `.md` file. It writes generated files to `testing/testOutput/<fixture-name>/`, compares file names and text content, then writes an organized discrepancy report to `output/_logs/test-discrepancies-*.json`.
