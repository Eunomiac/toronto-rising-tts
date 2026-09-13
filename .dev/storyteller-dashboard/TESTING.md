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
- Playwright MCP on `http://127.0.0.1:8788/` for visual board checks (do not steal OS focus)

Status: current

This app is Storyteller-only. Player HUD stays in Tabletop Simulator. Dashboard-only tests never require Save & Play.

| Layer | Command / tool |
| --- | --- |
| Pure functions and React shell | `npm test` (Vitest) |
| Control board, GSAP, layout | Playwright headed Chrome, same tab |
| Lua import / TTS bridge | Existing TTS E2E playbooks, only if Lua changed |
