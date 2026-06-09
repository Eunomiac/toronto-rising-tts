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
  chronicle/                 # Add chronicle Markdown context here later.
  src/client/                # Vanilla TypeScript dashboard UI.
  server.mjs                 # Node HTTP API and OpenAI Responses API calls.
  src/shared/                # Shared schemas/types for NPC contracts.
  .env.example               # Server-side configuration template.
  README.md                  # This guide.
```

This app is intentionally isolated under `.dev/storyteller-dashboard` so it does not interfere with the existing Tabletop Simulator Lua/XML tooling.

## OpenAI architecture notes

The MVP uses the OpenAI Responses API from the server. Structured NPC text is requested with JSON schema output. Portraits use the Responses API image generation tool in a second request so text can render immediately.

For chronicle knowledge, the best MVP path is:

1. Add your Custom GPT source Markdown files under `chronicle/`.
2. Run locally with inline Markdown context while the notes are still small.
3. When you want a more durable RAG setup, upload those same Markdown files to an OpenAI vector store and set `OPENAI_VECTOR_STORE_ID` in `.env`. The server will then attach the Responses API `file_search` tool instead of inline Markdown context.

Do **not** call the existing Custom GPT directly from this app unless OpenAI provides a clean app/backend API for that specific GPT. Keeping chronicle notes as source files or vector-store files makes the dashboard portable, testable, and easier to evolve.

## Setup

From this folder:

```powershell
cd .dev/storyteller-dashboard
npm install
Copy-Item .env.example .env
```

Edit `.env` and set:

```text
OPENAI_API_KEY=sk-...
```

Optional model/config overrides:

```text
OPENAI_TEXT_MODEL=gpt-5-mini
OPENAI_IMAGE_MODEL=gpt-5-mini
OPENAI_VECTOR_STORE_ID=
DASHBOARD_PORT=8787
```

## Run locally

**From Cursor / VS Code:** Run Task → **Storyteller Dashboard: Dev (server + browser)**. This builds the client, starts the Node server in a dedicated terminal (click the printed `http://localhost:8787` link), and opens Chrome to that URL.

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

## Add chronicle Markdown files

Copy your Custom GPT source Markdown files into:

```text
.dev/storyteller-dashboard/chronicle/
```

Use clear filenames, for example:

```text
.dev/storyteller-dashboard/chronicle/setting.md
.dev/storyteller-dashboard/chronicle/player-characters.md
.dev/storyteller-dashboard/chronicle/factions.md
.dev/storyteller-dashboard/chronicle/locations.md
.dev/storyteller-dashboard/chronicle/plot-threads.md
```

The local inline context mode is meant for MVP use. If the folder grows large, create an OpenAI vector store, upload the Markdown files, put that vector store ID in `.env`, and restart the server.

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
