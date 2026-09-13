# Toronto Rising Storyteller Dashboard

## Agent Routing

Read this when:
- running or modifying the standalone Storyteller second-monitor dashboard
- adding a dashboard tab or moving tools between tabs
- debugging OpenAI-backed NPC generation, image generation, local server behavior, or vector-store chronicle retrieval

Source of truth:
- this app folder
- this app's `.env.example`
- `data/chronicle/README.md` for chronicle-source routing

Verification:
- `npm run typecheck`
- `npm test`
- `npm run build`
- local app at `http://127.0.0.1:8788`

This is a **Storyteller-only** second-monitor web app. It will not grow into a player HUD. Players keep using Tabletop Simulator for the table and their own UI. The dashboard is a localhost control surface on port **8788**.

It lives in **this same git repo and GitHub remote** as the TTS mod. Do not split it into another workspace or GitHub project. Dashboard-only UI work is tracked on [agent/Running Tasklist.md](agent/Running%20Tasklist.md) — not Linear, and not Pending Author Verification. When a change also ships Lua (import JSON, snaps, `GlobalImportSceneJson`, image paths), land the Lua, dashboard, and [Scene Import Guide](../Storyteller%20Dashboard%20Docs/Scene%20Import%20Guide.md) together.

The GitHub remote is public. Never commit `.env`, API keys, or private chronicle dumps.

## Architecture

- **Vite + React** render the tab shell. Existing tab bodies still boot through `initStageNpcs`, `initScenesTab`, `initLuaTab`, and `initGenerateNpc` until those tabs are migrated. Do **not** wrap the app in React StrictMode while those hybrid inits run (it would bind listeners twice).
- **Node** on **8788** keeps secrets, the TTS Lua bridge, and image/catalog files. In `--dev`, Vite middleware provides HMR on that same port. Production serves `dist/public`.
- **SCSS** (nested) is the stylesheet source. Policy: [toronto-rising-dashboard-scss.mdc](../../.cursor/rules/toronto-rising-dashboard-scss.mdc).
- Control-board tokens stay a **GSAP Draggable** island — do not re-render React on every pointer move.
- **Tests:** [TESTING.md](TESTING.md). Vitest for logic and the React shell; Playwright MCP for the visual board. Do not steal OS focus from the existing Chrome window.

`gameState` stays in TTS. The dashboard holds drafts and sends small host commands.

## Tabs

A compact tab row sits flush with the top of the viewport:

1. **Stage NPCs** (default) — searchable generic cutout grid, saved search tags, 300px hover preview of the full cutout, selection queue, copy comma-separated keys. Catalogue refreshes from **Generics Export** when this server starts. See [Generic NPCs.md](../Storyteller%20Dashboard%20Docs/Generic%20NPCs.md).
2. **Scenes** — Standard / Scatter control-board editor with labeled chrome (placement, table, clock, weather, location). The library id (`sceneKey`) is derived from the title. Copy JSON or Import in TTS writes a **library row only** (does not Apply). Catalogs are generated from Lua plus the live **STAGE_BOARD** size in your TTS save (`npm run dashboard:scene-catalogs`, also on `npm run dev` / `npm run build`). Token dragging uses **GSAP Draggable**. See [Scene Import Guide.md](../Storyteller%20Dashboard%20Docs/Scene%20Import%20Guide.md).
3. **Lua** — Execute Code into a live TTS session (same External Editor hook as the TTS Tools extension). Disable the extension first; only one process can listen on port 39998.
4. **Generate NPC** — the existing OpenAI NPC generator (prompt, cards, session history).

## What is included

- Vite + React client with a local Node HTTP API so `OPENAI_API_KEY` stays server-side.
- NPC text generation through the OpenAI Responses API with structured JSON output and **vector-store `file_search`** chronicle retrieval.
- Optional NPC portrait generation through the OpenAI Images API.
- Compact NPC cards, full screen-pin-friendly modal export cards, local browser-session history, pinned/favorite NPCs, field reroll buttons, and field locks for mass rerolls.
- Token dragging uses the free GSAP `Draggable` plugin (`npm` `gsap`), bundled by Vite.
- Named NPC cutouts are served from the repo folder `assets/images/NPCs/Catalogued/` at `/catalogued-npc-images/`.

## Repository placement

This app lives under `.dev/storyteller-dashboard/`.

## Setup

```powershell
cd .dev/storyteller-dashboard
Copy-Item .env.example .env
```

Edit `.env` and set:

```text
OPENAI_API_KEY=sk-...
OPENAI_VECTOR_STORE_ID=vs_...
```

Optional model overrides:

```text
OPENAI_TEXT_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-1
PORT=8788
```

## Run locally

**From Cursor / VS Code:** Run Task → **STORYTELLER DASHBOARD**. Builds, starts the server on `http://127.0.0.1:8788`, and opens the **Cursor** Chrome profile (`npm run storyteller-dashboard:dev` from repo root). Skip that task if a Playwright Chrome window is already open — it would steal keyboard focus. `dev:open` used to run `start chrome`, which always used the Default profile; it now launches `chrome.exe` with `--profile-directory` for the profile named Cursor. Override with `STORYTELLER_DASHBOARD_CHROME_PROFILE_DIR` (folder such as `Profile 3`) if needed.

**From a terminal:**

```powershell
cd .dev/storyteller-dashboard
npm install
npm run dev
```

Open <http://127.0.0.1:8788> in a browser. `npm run dev` first refreshes Scenes catalogs from Lua and the live **STAGE_BOARD** object in your TTS save (`tts-assets.config.json`), then compiles the Node server and serves the Vite client with hot reload (`--dev`). After you resize or move STAGE_BOARD in-game, save the game and restart this server (or run `npm run scene-catalogs` here / `npm run dashboard:scene-catalogs` from the repo root). `npm run start` is the production build (no HMR). `npm run dev:open` also launches the Cursor Chrome profile; do not use it while the Playwright window is already running.

## Chronicle vector store

1. Create an OpenAI vector store and upload chronicle files (`.md`, `.json`, etc.).
2. Set `OPENAI_VECTOR_STORE_ID=vs_...` in `.env`.
3. Restart the server. Status line and `GET /api/health` report `chronicleMode`, `hasVectorStore`, and `chronicleStatus`.

No local `data/chronicle/` folder is required.

## Live-play controls

- `Enter`: generate one NPC.
- `Shift+Enter`: generate three NPCs from the same prompt.
- `Ctrl+Enter`: generate one NPC and then generate its image asynchronously.
- `Ctrl+Shift+Enter`: generate three NPCs and generate images asynchronously.
- Use the visible buttons if keyboard focus/shortcuts are inconvenient during play.
- Each compact card has a `FULL CARD` button for a modal designed to be pinned or captured with ShareX.
- `REROLL` changes one field. `LOCK` protects a field from mass rerolls.
- Bottom mutation buttons make current generated NPCs more political, monstrous, sympathetic, or chronicle-tied.

## OpenAI notes

- Text generation uses the Responses API with JSON Schema output and `file_search` against your vector store.
- Image generation is a separate request so text cards can render immediately and portraits can populate when ready.
- API keys are read only by the Node server from environment variables; the frontend never receives the key.

## Useful commands

```powershell
npm run scene-catalogs
npm run typecheck
npm test
npm run build
npm run dev
```
