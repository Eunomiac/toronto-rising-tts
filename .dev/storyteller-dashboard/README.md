# Toronto Rising Storyteller Dashboard

## Agent Routing

Read this when:
- running or modifying the standalone Storyteller second-monitor dashboard
- adding a dashboard tab or moving tools between tabs
- showing live game state in a view (read [Listening to TTS.md](../Storyteller%20Dashboard%20Docs/Listening%20to%20TTS.md) first)
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

- **Vite + React** render the tab shell, Scenes, PCs and Lab. The Lua and Generate NPC tab bodies still boot as plain DOM through `initLuaTab` and `initGenerateNpc`. Do **not** wrap the app in React StrictMode while those inits run (it would bind listeners twice).
- **Node** on **8788** keeps secrets, the TTS Lua bridge, and image/catalog files. In `--dev`, Vite middleware provides HMR on that same port. Production serves `dist/public`.
- **SCSS** (nested) is the stylesheet source. Policy: [toronto-rising-dashboard-scss.mdc](../../.cursor/rules/toronto-rising-dashboard-scss.mdc).
- **Tests:** [TESTING.md](TESTING.md). Vitest for logic and the React shell; Playwright MCP for the visual board. Do not steal OS focus from the existing Chrome window.

`gameState` stays in TTS. The dashboard holds drafts and sends small host commands.

Live game state reaches the dashboard as TTS pushes relayed over `GET /api/tts/events` (cache at `GET /api/tts/cache`); the dashboard never polls TTS. What is broadcast and how a view should listen: [Listening to TTS.md](../Storyteller%20Dashboard%20Docs/Listening%20to%20TTS.md). Transport design: [Live Push Channel.md](../Storyteller%20Dashboard%20Docs/Live%20Push%20Channel.md).

## Tabs

A compact tab row sits flush with the top of the viewport:

1. **Scenes** (default) — the live scene console, drawn from the TTS push: phase and spotlight, clocks, location card and hunt odds, weather and sound, the stage (drag tokens; stage edits wait in a queue pop-up over the board until Send), the roster (including the **Generic** catalogue view, see [Generic NPCs.md](../Storyteller%20Dashboard%20Docs/Generic%20NPCs.md)), the scene library, and the Storyteller's roll controls (PC roll rows and the NPC roll panel). Code: `src/client/scenesPanel/` (`ScenesPanel.tsx` is the entry; `glance.tsx`, `sketch.tsx`, `stageEdit.tsx`, `preview.tsx` are the panels the Lab sketches share). Catalogs are generated from Lua plus the live **STAGE_BOARD** size in your TTS save (`npm run dashboard:scene-catalogs`, also on `npm run dev` / `npm run build`). Plan and history: [Scenes Redesign/Build Plan.md](agent/Scenes%20Redesign/Build%20Plan.md); what TTS pushes: [Listening to TTS.md](../Storyteller%20Dashboard%20Docs/Listening%20to%20TTS.md).

   **Token headshots:** tokens crop each figurine cutout to the face automatically in the browser (`src/client/headshots/autoCrop.ts`, chin-anchored where a neck is found). **Right-click a token** to open the crop editor: drag moves the figurine behind the ring, the mouse wheel zooms around the pointer, and closing saves (Cancel discards; Reset to automatic removes the correction). Corrections live in tracked `data/headshot-crops.json` (`{ crops: { <characterKey>: { cx, cy, size } } }`; `cx` is a fraction of image width, `cy` and `size` fractions of image height) via `/api/headshot-crops` (`GET`, `PUT ?key=`, `DELETE ?key=`). The Lab sketches read the same crops.

   **Scene deck file:** the Scenes tab's on-deck scenes, scene notes and roster layout live in git-ignored `data/scene-deck.json` via `/api/scene-deck` (`GET`; `PUT` replaces whole sections). Backups: `<backupDir>/Dashboard Data` from the repo's `tts-assets.config.json`, at most every 10 minutes. See [Scenes Redesign/Build Plan.md](agent/Scenes%20Redesign/Build%20Plan.md) Phase 2.
2. **PCs** — live play sheet only: left player rail plus a two-page spread, filled **exclusively** from Tabletop Simulator (`GlobalDashboardPcSheetSnapshot`). If the TTS bridge is not connected or TTS does not answer, the tab shows an empty notice — never a stand-in sheet. Clicks update the dashboard immediately and queue `GlobalDashboardPcSheetApply`; clicks that pile up while TTS is busy go in one JSON array. The Dashboard uses **`@tts-tools/gateway-client`**: with Cursor / TTS Tools open it registers on the local gateway; otherwise it binds **39998** directly and rejoins when the gateway returns. **Claim Port** connects (and only force-clears 39998 if needed). **Release Port** disconnects until you Claim again.

   Spread tabs **I · II**, **III · IV**, **V · VI** show sheet Pages 1–6 (`src/client/pcSheet/pages.tsx` registry). Pages 7–8 are art only and stay placeholders.

   | Page | Shows / edits | Lua bridge |
   | --- | --- | --- |
   | 1 | Identity, attributes, skills, trackers, Hunger, Desire, XP jewel | `dashboard/pc_sheet.ttslua` |
   | 2 | Disciplines, powers, Blood Sorcery rituals, Oblivion ceremonies (dot ring + add/edit popups) | `dashboard/pc_sheet_traits.ttslua` |
   | 3 | Backgrounds, Merits, Flaws, Status strip (shared Advantage popup with type dropdown) | `dashboard/pc_sheet_traits.ttslua` |
   | 4 | Touchstone, Sire, Childer, Blood Bonds, Other Relationships (Relationship popup) | `dashboard/pc_sheet_relationships.ttslua` (`gameState.relationships`) |
   | 5 | Project cards + Coterie view; Project editor (R, Lock & Begin, Complete, Delete). Equipment / Boons not yet | `dashboard/projects.ttslua` — **own** snapshot (`GlobalDashboardProjectsSnapshot` / `Apply`), fetched when Page 5 opens and after each change |
   | 6 | Experience Log (all sessions) + Experience popup (Apply / Apply to All / Undo) | `dashboard/pc_sheet_xp.ttslua` |

   Pages 1–4 and 6 ride the seat snapshot (`pc_sheet.ttslua` `EXTENSIONS`; see [`dashboard/README.md`](../../dashboard/README.md)). Popup edits wait for TTS and show its error in the popup; dot clicks paint at once and queue. The TTS Storyteller Projects and Stats panels still work alongside these pages until they are retired.
3. **Lua** — Execute Code into a live TTS session through the **same** shared bridge as PCs / Scenes. You do **not** need to disable TTS Tools when the gateway is running. Claim / Release on the PCs tab connects or disconnects that bridge. To stop a leftover dashboard `node` stuck on 39998 without closing Cursor: Run Task **FREE TTS EDITOR PORT (39998)**, or `npm run tts-bridge:free-port` from the repo root.
4. **Generate NPC** — the existing OpenAI NPC generator (prompt, cards, session history).
5. **Lab** (dev server only; absent from `npm run build`) — throwaway grey-box design sketches on a fixed 1920×1042 canvas (`src/client/lab/`; the panels they draw live in `src/client/scenesPanel/`, shared with the Scenes tab). `?lab=<sketch id>` opens a sketch directly; sketch buttons and state toggles sit at the right of the tab bar. **Add note** drops a numbered feedback pin; pins are stored in tracked `agent/lab-notes.json` through `/api/lab-notes` (dev only). Agents answer a pin by writing its `reply` field in that file, and clear resolved pins with `DELETE /api/lab-notes?id=N`. Lab pop-ups go through `Overlay` (`sketch.tsx`), which dims the canvas below the pins so pop-ups can be pinned too. This pin loop is the author's preferred way to iterate on UI design. Round history: [Scenes Redesign/Job Inventory.md](agent/Scenes%20Redesign/Job%20Inventory.md).

## Term tooltips (clipboard image + markdown text)

Right-click any tagged term (a discipline, power, skill, advantage, …) to open a popup. Paste an image with **Ctrl+V** (or drop an image file), write optional **markdown** notes in the text box (live preview beside it), and Save. Hovering that term anywhere on the dashboard then shows the tooltip. Right-click again to Update it, **Clear image** (keeps the text), or **Remove tooltip** (both). **Shift+right-click** still opens the normal browser menu, and elements with their own right-click action (Hunger, the dot ring) keep it.

- **Layout:** a landscape (or square) image puts the text below it at the image's width; a portrait image puts the text in a column to its right; text-only tooltips show just the text. The tooltip sits beside the cursor, flips to the other side near an edge, and is clamped (and size-capped) so it never leaves the browser window.
- **Markdown:** `react-markdown` + `remark-gfm` (tables, strikethrough, task lists). Raw HTML in the text is shown as text, never rendered.
- **Keys:** one tooltip per term name, shared by every copy (`termProps(kind, name)` in `src/client/termImages/store.ts` adds `data-term="<kind>:<name>"`; normalisation in `src/shared/termKey.ts`). To tag a new element, spread `termProps(...)` onto it — the page-wide layer (`TermImageLayer.tsx`, mounted in `App.tsx`) handles right-click, paste and hover.
- **Storage:** `data/term-images/` (image files + `index.json`; each entry has an image `file`, markdown `text`, or both), **git-ignored** because the remote is public and pasted images may be rulebook screenshots. Back the folder up yourself if you care about it. Routes on `/api/term-images`: `GET` (index), `PUT ?key=` (raw image body), `DELETE ?key=` (whole entry) or `DELETE ?key=&part=image` (image only); `PUT /api/term-images/text?key=` with `{ "text": "…" }` (blank clears the text). Images at `/term-images/<file>`. PNG, JPEG, WebP or GIF up to 15 MB; text up to 20,000 characters.
- **Tagged today:** PCs tab sheet Pages 1–4.

## What is included

- Vite + React client with a local Node HTTP API so `OPENAI_API_KEY` stays server-side.
- NPC text generation through the OpenAI Responses API with structured JSON output and **vector-store `file_search`** chronicle retrieval.
- Optional NPC portrait generation through the OpenAI Images API.
- Compact NPC cards, full screen-pin-friendly modal export cards, local browser-session history, pinned/favorite NPCs, field reroll buttons, and field locks for mass rerolls.
- PC sheet animations use GSAP (`npm` `gsap`), bundled by Vite.
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

Agents driving the UI must use Playwright MCP in a **dedicated Chrome** (no extension debugger bar), not the Cursor-profile window and not the IDE browser pane. Recipe: [PLAYWRIGHT.md](PLAYWRIGHT.md).

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
