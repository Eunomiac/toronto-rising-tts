# Toronto Rising Storyteller Dashboard MVP (PR #9 archive)

> **Archived:** This is the PR #9 implementation (`server.mjs` monolith). The canonical app lives at `.dev/storyteller-dashboard/` (PR #10). Kept for comparison during merge.

A standalone, browser-based second-monitor dashboard for running a Vampire: The Masquerade 5th Edition chronicle. The MVP focuses on AI-assisted NPC generation and does **not** integrate with Tabletop Simulator. It intentionally uses only Node built-ins at runtime plus a small TypeScript build step, keeping the tool easy to run during a game.

## What this app does now

- Runs a local Node HTTP server for all OpenAI calls, keeping `OPENAI_API_KEY` server-side.
- Serves a vanilla TypeScript dashboard optimized for live play.
- Generates one or more structured V5 NPC cards from rough prompts or keywords.
- Supports quick controls for species, gender, scene role, threat, tone, and PC relationship.
- Supports keyboard generation shortcuts:
  - `Enter`: generate one NPC.
  - `Shift+Enter`: generate multiples.
  - `Ctrl+Enter`: generate one NPC and then a portrait.
  - `Ctrl+Shift+Enter`: generate multiples and then portraits.
- Generates portraits separately after text cards appear, so the table-facing content is not blocked by image latency.
- Provides field-level `REROLL` and `LOCK` controls plus full unlocked reroll.
- Provides a compact full-detail modal intended to be pinned or captured with ShareX.
- Keeps generated NPC history in browser `sessionStorage` for the current browser session.

## Project structure

```text
.dev/storyteller-dashboard/
  (no local chronicle folder) # Chronicle context comes from OPENAI_VECTOR_STORE_ID only.
  src/client/                # Vanilla TypeScript dashboard UI.
  server.mjs                 # Node HTTP API and OpenAI Responses API calls.
  src/shared/                # Shared schemas/types for NPC contracts.
  .env.example               # Server-side configuration template.
  README.md                  # This guide.
```

This app is intentionally isolated under `.dev/storyteller-dashboard-pr9` so it does not interfere with the existing Tabletop Simulator Lua/XML tooling.

## OpenAI architecture notes

The MVP uses the OpenAI Responses API from the server. Structured NPC text is requested with JSON schema output. Portraits use the Responses API image generation tool in a second request so text can render immediately.

Chronicle knowledge is **vector-store only**. Upload your Custom GPT source Markdown/JSON files to an OpenAI vector store, then set `OPENAI_VECTOR_STORE_ID` in `.env`. The server attaches the Responses API `file_search` tool on every NPC generate/reroll request. No local `chronicle/` folder is required or read.

Do **not** call the existing Custom GPT directly from this app unless OpenAI provides a clean app/backend API for that specific GPT.

## Setup

From this folder:

```powershell
cd .dev/storyteller-dashboard-pr9
npm install
Copy-Item .env.example .env
```

Edit `.env` and set:

```text
OPENAI_API_KEY=sk-...
OPENAI_VECTOR_STORE_ID=vs_...
```

Optional model/config overrides:

```text
OPENAI_TEXT_MODEL=gpt-5-mini
OPENAI_IMAGE_MODEL=gpt-5-mini
DASHBOARD_PORT=8787
```

## Run locally

**From Cursor / VS Code:** Run Task → **Storyteller Dashboard (PR9): Dev (server + browser)**. This builds the client, starts the Node server on `http://127.0.0.1:8787`, and opens Chrome. PR #10 runs separately on port **8788**.

**From a terminal:**

```powershell
npm run dev
```

Then open:

```text
http://localhost:8787
```

The local Node server runs on port `8787` by default and serves the compiled dashboard from `dist/`. For production-style restarts after a build:

```powershell
npm run build
npm run preview
```

## Chronicle vector store

1. Create an OpenAI vector store and upload chronicle files (`.md`, `.json`, etc.) — include player data and NPC lore.
2. Set `OPENAI_VECTOR_STORE_ID=vs_...` in `.env`.
3. Restart the server. The status line in the UI should show `Chronicle context: OpenAI vector store (...)`.

`GET /api/health` also reports `chronicleMode`, `hasVectorStore`, and `chronicleStatus` for quick verification.

## Checks

```powershell
npm run typecheck
npm run build
```

## Future extensions

The current separation of `client`, `server`, and `shared` leaves room for additional live-play tools using the same backend conventions:

- Location generator.
- Scene complication generator.
- Faction move generator.
- Session recap and situation dashboard.
- Later Tabletop Simulator export/integration, if desired.
