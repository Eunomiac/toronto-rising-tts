# Storyteller Dashboard — Playwright Chrome

## Agent Routing

Read this when:
- starting the Storyteller Dashboard for a dashboard session
- Playwright shows a debugger banner, Welcome / `connect.html`, or the wrong Chrome
- changing Cursor MCP Playwright flags

Source of truth:
- this file
- [`.cursor/rules/toronto-rising-playwright-browser-focus.mdc`](../../.cursor/rules/toronto-rising-playwright-browser-focus.mdc)
- Cursor MCP config: `C:/Users/Owner/.cursor/mcp.json`
- Launch flags: `C:/Users/Owner/.cursor/playwright-mcp.config.json`

Verification:
- Cursor terminal for `npm run dev` is **running** and logs `Storyteller dashboard listening on http://127.0.0.1:8788`
- Playwright `browser_tabs` list shows `http://127.0.0.1:8788/` titled **Toronto Rising Storyteller Dashboard**
- The Chrome window has **no** “Playwright Extension started debugging this browser” bar
- `window.innerWidth` / `innerHeight` is the layout we care about (target 1920×1080; do not `browser_resize` after startup)

Status: current

## Why not the Cursor Chrome profile

The Chrome profile named **Cursor** (`Profile 3`) has the Playwright **extension**. Attaching through `--extension` always draws Chrome’s debugger bar (“Playwright Extension started debugging this browser”). That bar cannot be hidden: **Cancel / X detaches Playwright**. It also shrinks the page, so Scenes layout is not what you get in real use.

Layout-accurate agent work uses a **separate** Chrome that Playwright launches itself:

- user data: `%LOCALAPPDATA%/TorontoRising/playwright-chrome-profile`
- `ignoreDefaultArgs: ["--enable-automation"]` so Chrome does **not** show “controlled by automated software”
- `--start-fullscreen` and `--viewport-size=1920x1080`

That window is not Ryan, Vault, or Cursor. Park it on another monitor; do not minimize it. The Playwright extension can stay installed in Cursor Chrome; MCP must **not** use `--extension` for dashboard work.

## Required MCP flags

```json
{
  "command": "npx",
  "args": [
    "-y",
    "@playwright/mcp@latest",
    "--browser=chrome",
    "--config",
    "C:/Users/Owner/.cursor/playwright-mcp.config.json",
    "--user-data-dir",
    "C:/Users/Owner/AppData/Local/TorontoRising/playwright-chrome-profile",
    "--viewport-size=1920x1080",
    "--caps=vision"
  ]
}
```

Do **not** pass `--extension` or `--profile-dir-name`. After changing `mcp.json`, reload Playwright MCP (Settings → MCP, toggle `playwright` off/on).

## Cold start

1. If port **8788** is in use and the Cursor terminal is aborted, kill the orphan `node dist/server/index.js --dev` tree. Confirm `netstat` no longer lists 8788.
2. From `.dev/storyteller-dashboard/` run **`npm run dev`** and leave that terminal running. Wait for `Storyteller dashboard listening on http://127.0.0.1:8788`. A Generics Export sheet warning is non-fatal.
3. `browser_tabs` **list** (do not `select`).
   - **`Welcome` / `connect.html`:** MCP is still in extension mode. Stop. Reload MCP with the flags above. Do not click on Welcome.
   - **`about:blank` in the TorontoRising Playwright profile:** expected right after launch. `browser_navigate` to `http://127.0.0.1:8788/` in **that same tab**.
   - **Dashboard already titled Toronto Rising Storyteller Dashboard:** reuse that tab.
4. Confirm with a **Scenes** click (`#tab-scenes`).

Do **not** use `start chrome` (Default / Ryan). Do **not** launch Cursor Chrome (`--profile-directory=Profile 3`) for agent driving — that path brings the debugger bar back.

`npm run storyteller-dashboard:dev` / `dev:open` / the **STORYTELLER DASHBOARD** task start the server and open Cursor Chrome. Use those only when the author wants that profile for themselves. For agent Playwright, restart the **server only** with `npm run dev` if Chrome is already up.

## After the window is up

Reuse the existing Playwright tab. No `bringToFront`, no extra windows, no F11, no `browser_resize` unless the author agreed this turn. Keep the window **open and not minimized**.

HMR of `scenesTab.ts` does not re-bind. Reload `http://127.0.0.1:8788/`, then click `#tab-scenes`.
