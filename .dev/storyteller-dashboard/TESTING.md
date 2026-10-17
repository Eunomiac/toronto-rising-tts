# Storyteller Dashboard testing

## Agent Routing

Read this when:
- adding dashboard logic, React shell, or board behavior
- deciding Vitest vs Playwright vs TTS playbooks

Source of truth:
- `npm test` in `.dev/storyteller-dashboard/`
- [`.cursor/rules/toronto-rising-dashboard-testing.mdc`](../../.cursor/rules/toronto-rising-dashboard-testing.mdc)

Verification:
- `npm test`
- `npm run typecheck`
- Playwright MCP on `http://127.0.0.1:8788/` in the dedicated Playwright Chrome (no extension debugger bar) for visual board checks (do not steal OS focus). Startup: [PLAYWRIGHT.md](PLAYWRIGHT.md).

Status: current

This app is Storyteller-only. Player HUD stays in Tabletop Simulator. Dashboard-only tests never require Save & Play.

`npm run dev` and `npm run build` regenerate Scenes catalogs (including STAGE_BOARD size from the live TTS save) before starting. `npm test` uses the committed `data/control-board-snaps.json`.

| Layer | Command / tool |
| --- | --- |
| Pure functions and React shell | `npm test` (Vitest) |
| Control board, GSAP, layout | Playwright headed Chrome in the dedicated TorontoRising profile (no extension banner), same tab. [PLAYWRIGHT.md](PLAYWRIGHT.md) |
| Lua import / TTS bridge | Existing TTS E2E playbooks, only if Lua changed |

## Drag-and-drop regression checks

With the Vite dashboard running, run `npm run test:dnd` from this app folder. This uses Playwright at 1920×1080, intercepts TTS snapshot/command replies and test persistence in the test browser, and does not require a game connection. It checks present/absent and Downtime PC drags, roll previews, stage-to-roll/bin drops, hover difficulty choices, Escape cancellation, multi-NPC roster groups, invalid group targets, and Scatter tokens. It checks outgoing commands and visible placement; actual game effects still need a live TTS session.

The browser runner uses system Chromium at `/usr/bin/chromium` when available, otherwise Playwright's installed Chromium (`npx playwright install chromium`). Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for another browser path or `DASHBOARD_URL` for a different running Vite address. Screenshots go to the OS temporary directory under `toronto-rising-dnd-smoke`, outside the checkout. No desktop Chrome window is opened.

The dashboard's normal `npm run build` still runs type checking, Vitest, and the production build. `src/client/scenesPanel/dnd/routing.test.ts` covers compatible native drop effects, deferred drag initialization, target priority, group restrictions, and stable hover anchors.
