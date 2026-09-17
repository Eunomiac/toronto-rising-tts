# Storyteller Dashboard — Playwright + Cursor Chrome

## Agent Routing

Read this when:
- starting the Storyteller Dashboard for a dashboard session
- Playwright `browser_tabs` shows `about:blank` or a window the author cannot see
- changing Cursor MCP Playwright flags

Source of truth:
- this file
- [`.cursor/rules/toronto-rising-playwright-browser-focus.mdc`](../../.cursor/rules/toronto-rising-playwright-browser-focus.mdc)
- Cursor MCP config: `C:/Users/Owner/.cursor/mcp.json` (Playwright server)

Verification:
- `GET http://127.0.0.1:8788/` returns 200
- Playwright `browser_tabs` list shows `http://127.0.0.1:8788/` titled **Toronto Rising Storyteller Dashboard**
- Chrome `chrome://version` **Profile Path** ends with `User Data\Profile 3` (friendly name **Cursor**)

Status: current

## What went wrong (2026-09-17)

Three different Chromes were easy to confuse:

| Window | How it starts | Author can see it? | Agent can click it? |
| --- | --- | --- | --- |
| **Cursor** Chrome profile (`Profile 3`) with the Playwright **extension** | Author opens Chrome as Cursor, or `chrome.exe --profile-directory=Profile 3` | Yes | Only if MCP uses `--extension` |
| Playwright’s **private** profile | MCP `--user-data-dir` → `AppData/Local/TorontoRising/playwright-chrome-profile` | Often no / easy to miss | Yes, and it looks like success |
| Cursor IDE browser (`cursor-ide-browser`) | Built-in pane | Inside Cursor, not 1920×1080 Chrome | Wrong tool for layout |

A leftover `node dist/server/index.js --dev` can keep port **8788** alive after the integrated terminal is marked aborted. Hitting that leftover, then navigating Playwright’s private `about:blank` tab, looks “done” in the agent session while the author sees no terminal and no Cursor-profile window.

## Required MCP flags

Playwright MCP **must connect through the Chrome extension** into the Cursor profile. It must **not** launch a private `--user-data-dir`.

In `C:/Users/Owner/.cursor/mcp.json`, the `playwright` server args should be:

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
  ]
}
```

Do **not** pass `--user-data-dir` or `--config` `playwright-mcp.config.json` (`--start-fullscreen` / isolated launch options) while using the extension. After changing this file, **reload the Playwright MCP server** in Cursor (Settings → MCP, toggle `playwright` off/on). Agents cannot finish the attach until that reload happens.

`--profile-dir-name` is Chrome’s folder name (`Profile 3`), not the friendly label “Cursor”. Install the [Playwright Chrome extension](https://chromewebstore.google.com/detail/playwright-extension/mmlmfjhmonkocbjadbfplnigmagldckm) **only** in that profile. If Ryan / Vault / Your Chrome also have it, this version of MCP may attach to the wrong window.

Chrome may show a debugging infobar while the extension is attached. Leave it. The **X** detaches Playwright on purpose.

## Cold start (no dashboard, or wrong Chrome)

1. `browser_tabs` **list** (do not `select`). Treat **`about:blank` only** as failure, not as “Chrome is ready.”
2. Check `http://127.0.0.1:8788/`. If it is down, from `.dev/storyteller-dashboard/` run **`npm run dev`** and leave that terminal running. Wait for `Storyteller dashboard listening on http://127.0.0.1:8788`.
3. If listen fails with **EADDRINUSE**, find `node dist/server/index.js --dev`. If there is no live Cursor terminal for it, kill that orphan tree and start `npm run dev` again so the author can see the server.
4. Open the Cursor profile (not `start chrome`, which uses **Default / Ryan**):

   ```powershell
   Start-Process -FilePath "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--profile-directory=Profile 3","http://127.0.0.1:8788/"
   ```

   If Chrome is already running, Windows may not spawn a new main process with that flag in the command line. Confirm **Profile Path** ends with `Profile 3` if the author is unsure.
5. Confirm Playwright `browser_tabs` now lists the dashboard URL. If it still lists `about:blank` in the private profile, **stop** and tell the author to reload Playwright MCP with the flags above. Do not call the private window a success.

`npm run storyteller-dashboard:dev` / `npm run dev:open` / the **STORYTELLER DASHBOARD** task also start the server and try to open Profile 3. Use those only when the Playwright Cursor window is **not** already open — they steal focus. If Chrome is already up, restart the **server only** with `npm run dev`.

A Generics Export sheet warning (`expected header filename,label,key,tags`) is non-fatal; the server still listens.

## After the window is up

Follow the always-on focus rule: reuse the existing dashboard tab, no new windows, no `bringToFront`, no F11, no `browser_resize` unless the author agreed this turn. Keep the window **open and not minimized**. Target **1920×1080** (`window.innerWidth` / `innerHeight`).

HMR of `scenesTab.ts` does not re-bind. Reload `http://127.0.0.1:8788/`, then click `#tab-scenes`.
