# Toronto Rising Storyteller Dashboard

## Agent Routing

Read this when:
- running or modifying the standalone Storyteller second-monitor dashboard
- debugging OpenAI-backed NPC generation, image generation, local server behavior, or vector-store chronicle retrieval

Source of truth:
- this app folder
- this app's `.env.example`
- `data/chronicle/README.md` for chronicle-source routing

Verification:
- `npm run typecheck`
- `npm run build`
- local app at `http://127.0.0.1:8788`

A standalone second-monitor web dashboard for live Vampire: the Masquerade 5th Edition play. This MVP is intentionally independent from Tabletop Simulator and focuses on fast AI-assisted NPC generation.

Runs on **port 8788** by default.

## What is included

- Dependency-light TypeScript frontend served by a local Node HTTP server.
- Local Node API server so `OPENAI_API_KEY` stays server-side.
- NPC text generation through the OpenAI Responses API with structured JSON output and **vector-store `file_search`** chronicle retrieval.
- Optional NPC portrait generation through the OpenAI Images API.
- Compact NPC cards, full screen-pin-friendly modal export cards, local browser-session history, pinned/favorite NPCs, field reroll buttons, and field locks for mass rerolls.

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

**From Cursor / VS Code:** Run Task → **Storyteller Dashboard: Dev (server + browser)**. Builds, starts the server on `http://127.0.0.1:8788`, and opens Chrome.

**From a terminal:**

```powershell
cd .dev/storyteller-dashboard
npm install
npm run start
```

Open <http://127.0.0.1:8788> in a browser. `npm run dev` aliases the same build-and-start flow.

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
npm run typecheck
npm run build
```
