# Toronto Rising Storyteller Dashboard

A standalone second-monitor web dashboard for live Vampire: the Masquerade 5th Edition play. This MVP is intentionally independent from Tabletop Simulator and focuses on fast AI-assisted NPC generation.

## What is included

- Dependency-light TypeScript frontend served by a local Node HTTP server.
- Local Node API server so `OPENAI_API_KEY` stays server-side.
- NPC text generation through the OpenAI Responses API with structured JSON output.
- Optional NPC portrait generation through the OpenAI Images API.
- Compact NPC cards, full screen-pin-friendly modal export cards, local browser-session history, pinned/favorite NPCs, field reroll buttons, and field locks for mass rerolls.
- A Markdown chronicle context folder at `data/chronicle/` that can be filled later without changing code.

## Repository placement

This app lives under `.dev/storyteller-dashboard/` so it does not interfere with the existing Tabletop Simulator Lua/XML tooling.

## Setup

```powershell
cd .dev/storyteller-dashboard
Copy-Item .env.example .env
```

Edit `.env` and set:

```text
OPENAI_API_KEY=sk-...
```

Optional model overrides:

```text
OPENAI_TEXT_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-1
PORT=8787
CHRONICLE_CONTEXT_DIR=data/chronicle
```

## Run locally

```powershell
cd .dev/storyteller-dashboard
npm run start
```

Open <http://127.0.0.1:8787> in a browser on your second monitor. `npm run dev` currently aliases the same local build-and-start flow.

## Live-play controls

- `Enter`: generate one NPC.
- `Shift+Enter`: generate three NPCs from the same prompt.
- `Ctrl+Enter`: generate one NPC and then generate its image asynchronously.
- `Ctrl+Shift+Enter`: generate three NPCs and generate images asynchronously.
- Use the visible buttons if keyboard focus/shortcuts are inconvenient during play.
- Each compact card has a `FULL CARD` button for a modal designed to be pinned or captured with ShareX.
- `REROLL` changes one field. `LOCK` protects a field from mass rerolls.
- Bottom mutation buttons make current generated NPCs more political, monstrous, sympathetic, or chronicle-tied.

## Adding chronicle context

Put your Custom GPT Markdown source files under:

```text
.dev/storyteller-dashboard/data/chronicle/
```

You can use nested folders. The MVP reads all `.md` files at generation time and includes a bounded amount of text in the server-side prompt. If no Markdown exists yet, the generator is instructed not to invent chronicle certainty.

Recommended initial files:

- `setting.md`
- `player-characters.md`
- `important-npcs.md`
- `factions.md`
- `locations.md`
- `mysteries.md`
- `tone.md`

### Why not call the existing Custom GPT directly?

The MVP uses project-local Markdown because it is explicit, auditable, easy to version, and does not depend on Custom GPT runtime access. The server boundary is also ready for a later upgrade to hosted retrieval using OpenAI file search/vector stores while keeping reusable V5 NPC generation, chronicle files, UI components, and API code separate.

## OpenAI notes

- Text generation uses the Responses API with a JSON Schema response format so the UI receives predictable NPC fields.
- Image generation is a separate request so text cards can render immediately and portraits can populate when ready.
- API keys are read only by the Node server from environment variables; the frontend never receives the key.

## Useful commands

```powershell
npm run typecheck
npm run build
```
