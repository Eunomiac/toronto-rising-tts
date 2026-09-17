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
- Playwright MCP on `http://127.0.0.1:8788/` in the **Cursor** Chrome profile for visual board checks (do not steal OS focus). Startup: [PLAYWRIGHT.md](PLAYWRIGHT.md).

Status: current

This app is Storyteller-only. Player HUD stays in Tabletop Simulator. Dashboard-only tests never require Save & Play.

`npm run dev` and `npm run build` regenerate Scenes catalogs (including STAGE_BOARD size from the live TTS save) before starting. `npm test` uses the committed `data/control-board-snaps.json`.

| Layer | Command / tool |
| --- | --- |
| Pure functions and React shell | `npm test` (Vitest) |
| Control board, GSAP, layout | Playwright headed Chrome in the Cursor profile (`Profile 3`), same tab. [PLAYWRIGHT.md](PLAYWRIGHT.md) |
| Lua import / TTS bridge | Existing TTS E2E playbooks, only if Lua changed |
