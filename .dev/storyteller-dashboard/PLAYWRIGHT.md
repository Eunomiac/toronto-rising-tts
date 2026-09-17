# Storyteller Dashboard — Playwright + Cursor Chrome

## Agent Routing

Read this when:
- starting the Storyteller Dashboard for a dashboard session
- Playwright `browser_tabs` shows `Welcome` / `connect.html` or `about:blank`
- changing Cursor MCP Playwright flags

Source of truth:
- this file (verified 2026-09-17 from a full kill → `npm run dev` → extension attach)
- [`.cursor/rules/toronto-rising-playwright-browser-focus.mdc`](../../.cursor/rules/toronto-rising-playwright-browser-focus.mdc)
- Cursor MCP config: `C:/Users/Owner/.cursor/mcp.json` (Playwright server, including local `env`)

Verification:
- Cursor terminal for `npm run dev` is **running** (not aborted) and logs `Storyteller dashboard listening on http://127.0.0.1:8788`
- Playwright `browser_tabs` list includes `http://127.0.0.1:8788/` titled **Toronto Rising Storyteller Dashboard**
- A click on `#tab-scenes` succeeds (list showing only `Welcome` / `connect.html` is **not** enough)

Status: current

## What went wrong (2026-09-17)

Three different Chromes were easy to confuse:

| Window | How it starts | Author can see it? | Agent can click it? |
| --- | --- | --- | --- |
| **Cursor** Chrome profile (`Profile 3`) with the Playwright **extension** | Author opens Chrome as Cursor, or MCP `--extension` | Yes | Yes, after a dashboard tab is in the Playwright group |
| Playwright’s **private** profile | MCP `--user-data-dir` → `AppData/Local/TorontoRising/playwright-chrome-profile` | Often no | Yes, and it looks like success |
| Cursor IDE browser (`cursor-ide-browser`) | Built-in pane | Inside Cursor, not 1920×1080 Chrome | Wrong tool for layout |

A leftover `node dist/server/index.js --dev` can keep port **8788** alive after the integrated terminal is marked aborted. Hitting that leftover, then driving Playwright’s private `about:blank` tab, looks “done” in the agent session while the author sees no terminal and no Cursor-profile window.

## Required MCP flags

Playwright MCP **must connect through the Chrome extension** into the Cursor profile. It must **not** launch a private `--user-data-dir`.

In `C:/Users/Owner/.cursor/mcp.json`, the `playwright` server should look like:

```json
{
  "command": "npx",
  "args": [
    "-y",
    "@playwright/mcp@latest",
    "--browser=chrome",
    "--extension",
    "--profile-dir-name=Profile 3",
    "--caps=vision"
  ],
  "env": {
    "PLAYWRIGHT_MCP_EXTENSION_TOKEN": "<local token from the extension connect page>"
  }
}
```

Do **not** pass `--user-data-dir` or `--config` `playwright-mcp.config.json` while using the extension. After changing this file, **reload the Playwright MCP server** in Cursor (Settings → MCP, toggle `playwright` off/on).

`--profile-dir-name` is Chrome’s folder name (`Profile 3`), not the friendly label “Cursor”. Install the Playwright Chrome extension **only** in that profile.

`PLAYWRIGHT_MCP_EXTENSION_TOKEN` is local-only — **never commit it**. Copy it from the extension connect page into `mcp.json` `env`, then reload MCP. That skips the “cursor-vscode is trying to connect” dialog. If the author regenerates the token, update `mcp.json` and reload again.

The token does **not** skip the Welcome / `connect.html` tab. It only skips the permission dialog. Chrome may still show a debugging infobar; leave it. The **X** detaches Playwright on purpose.

## Cold start (verified)

1. If port **8788** is in use and the Cursor terminal is aborted, kill the orphan `node dist/server/index.js --dev` tree (and its `cmd.exe` parent running `npm run dev`). Confirm `netstat` no longer lists 8788.
2. From `.dev/storyteller-dashboard/` run **`npm run dev`** and **leave that terminal running**. Wait for `Storyteller dashboard listening on http://127.0.0.1:8788`. A Generics Export warning (`expected header filename,label,key,tags`) is non-fatal.
3. `browser_tabs` **list** (do not `select`).
   - **`about:blank` in `TorontoRising/playwright-chrome-profile`:** wrong Chrome. Stop. MCP still has `--user-data-dir`.
   - **`Welcome` / `connect.html`:** extension is attached. This is expected after a token-backed reload. Do **not** treat it as the dashboard, and do **not** spend time clicking on it (clicks time out; the list can keep saying Welcome even after `browser_navigate`).
   - **`http://127.0.0.1:8788/` titled Toronto Rising Storyteller Dashboard:** reuse that tab.
4. If the list does not already show the dashboard URL, open it in the Playwright group:

   ```
   browser_tabs action=new url=http://127.0.0.1:8788/
   ```

   That is the reliable attach. `browser_navigate` on the Welcome tab can load the app in the page object, but `browser_tabs` list may still show Welcome and UI clicks can hang waiting for a “stable” element.
5. Confirm by clicking **Scenes** (`#tab-scenes`). Success is `aria-selected="true"` on that tab, not merely a 200 from port 8788.

Do **not** run `start chrome` (Default / Ryan profile). Do **not** launch a second Chrome with `chrome.exe --profile-directory=Profile 3` if the extension is already attached — that steals focus and is unnecessary.

`npm run storyteller-dashboard:dev` / `npm run dev:open` / the **STORYTELLER DASHBOARD** task start the server and try to open Profile 3. Use those only when the Playwright Cursor window is **not** already open. If it is open, restart the **server only** with `npm run dev`.

## After the window is up

Follow the always-on focus rule: reuse the existing dashboard tab, no new windows, no `bringToFront`, no F11, no `browser_resize` unless the author agreed this turn. Keep the window **open and not minimized**.

Measured viewport on a successful attach was **1920×1009** (`window.innerWidth` / `innerHeight`) — Windows chrome keeps it short of 1080. Do not “fix” that with resize.

HMR of `scenesTab.ts` does not re-bind. Reload `http://127.0.0.1:8788/`, then click `#tab-scenes`.
