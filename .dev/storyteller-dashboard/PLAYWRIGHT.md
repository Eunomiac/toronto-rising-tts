# Storyteller Dashboard — Playwright Chrome

## Agent Routing

Read this when:
- starting the Storyteller Dashboard for a dashboard session
- Playwright shows a debugger banner, Welcome / `connect.html`, or the wrong Chrome
- the page is not 1920×1080
- changing Cursor MCP Playwright flags

Source of truth:
- this file (the recipe)
- [`.cursor/rules/toronto-rising-playwright-browser-focus.mdc`](../../.cursor/rules/toronto-rising-playwright-browser-focus.mdc) (always-on: do not steal focus)
- Cursor MCP config (not in git): `C:/Users/Owner/.cursor/mcp.json`
- Launch flags (not in git): `C:/Users/Owner/.cursor/playwright-mcp.config.json`

Verification:
- Cursor terminal for `npm run dev` is **running** and logs `Storyteller dashboard listening on http://127.0.0.1:8788`
- Playwright `browser_tabs` **list** shows `http://127.0.0.1:8788/` titled **Toronto Rising Storyteller Dashboard**
- No “Playwright Extension started debugging this browser” bar
- Playwright `window.innerWidth` / `innerHeight` is **1920×1080**
- A **Scenes** click (`#tab-scenes`) succeeds

Status: current

---

## Which Chrome

| Window | Use it? |
| --- | --- |
| Dedicated Playwright Chrome (`%LOCALAPPDATA%/TorontoRising/playwright-chrome-profile`) | **Yes** — this is the agent window |
| Cursor Chrome (Profile 3, Playwright extension installed) | **No** — that is for the author. `--extension` always draws a debugger bar that shrinks the page. Cancel / X detaches Playwright. |
| Ryan / Vault / Default Chrome | **No** |
| Cursor IDE browser pane | **No** |

The Playwright extension can stay installed in Cursor Chrome. MCP must **not** pass `--extension` or `PLAYWRIGHT_MCP_EXTENSION_TOKEN`. Agents do not need the extension; they drive Chrome directly.

`ignoreDefaultArgs: ["--enable-automation"]` hides “Chrome is being controlled by automated software”. Chrome may still show an infobar: **You are using an unsupported command-line flag: `--disable-blink-features=AutomationControlled`**. That bar is in Chrome chrome. Leave it. Do not switch back to `--extension` to “fix” it.

`--start-fullscreen` often does not stick. The author’s monitor may show a windowed Chrome, tabs, taskbar, clipping, or that infobar. **That is not failure.** Success is Playwright’s **page** size, not how the OS window looks.

Do **not** ask the author to turn on Inspector device / aspect-ratio scaling. That can hold 1920×1080 while it is on, then drop the page to the real window height (for example **1920×889**) when they turn it off.

---

## Fast path (window already up)

If `browser_tabs` **list** already shows `http://127.0.0.1:8788/` titled Toronto Rising Storyteller Dashboard, and it is **not** Welcome / `connect.html`:

1. Reuse **that same tab**. Do not `select` other tabs. Do not open a new tab.
2. Measure (step 3 below). If not 1920×1080, restore with CDP (still step 3).
3. Work in that tab. Do not F11, `browser_resize`, `bringToFront`, or relaunch Chrome.

If the dashboard server terminal is aborted but port 8788 still answers, that leftover Node is a **false success**. Kill it (step 1) and start `npm run dev` fresh. Do not attach Playwright to a mystery process.

---

## Recipe (cold start)

Do these in order. Tools are Playwright MCP (`user-playwright`), not `cursor-ide-browser`.

### 1. Dashboard server on 8788

Aborted Cursor terminals often leave `node dist/server/index.js --dev` running. `npm run dev` then fails with **EADDRINUSE**.

From PowerShell:

```powershell
netstat -ano | findstr ":8788"
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like '*dist/server/index.js*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

Confirm `netstat` no longer lists 8788. Then:

```powershell
cd D:\Projects\.CODING\toronto-rising-tts\.dev\storyteller-dashboard
npm run dev
```

Wait for `Storyteller dashboard listening on http://127.0.0.1:8788`. Leave that terminal running.

A **Generics Export** sheet-header warning is non-fatal.

Do **not** use `npm run dev:open`, `npm run storyteller-dashboard:dev`, or the **STORYTELLER DASHBOARD** task while this Playwright Chrome should stay up — those open Cursor Chrome and steal keyboard focus. If Chrome is already open, restart **only** the server with `npm run dev`.

### 2. Confirm MCP is the dedicated Chrome (not the extension)

`C:/Users/Owner/.cursor/mcp.json` Playwright args must be:

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

`C:/Users/Owner/.cursor/playwright-mcp.config.json` must be:

```json
{
  "browser": {
    "launchOptions": {
      "channel": "chrome",
      "chromiumSandbox": true,
      "ignoreDefaultArgs": ["--enable-automation"],
      "args": ["--start-fullscreen"]
    },
    "contextOptions": {
      "viewport": { "width": 1920, "height": 1080 }
    }
  }
}
```

**No** `--extension`. **No** `--profile-dir-name`. After changing `mcp.json`, the **author** reloads Playwright MCP (Settings → MCP, toggle `playwright` off/on). Do not relaunch Chrome yourself unless they asked this turn.

Then `browser_tabs` **list** (never `select` for this check):

| What you see | Meaning | What to do |
| --- | --- | --- |
| `http://127.0.0.1:8788/` titled Toronto Rising Storyteller Dashboard | Correct window | Reuse that tab |
| `about:blank` (TorontoRising profile, just after MCP launch) | Expected | `browser_navigate` **that same tab** to `http://127.0.0.1:8788/` |
| `Welcome` / Playwright `connect.html`, or a bar that says the extension is debugging the browser | MCP is still in `--extension` mode | **Stop.** Do not click Welcome. Ask the author to reload MCP with the flags above. |

Do not `start chrome`. Do not launch `--profile-directory=Profile 3`.

### 3. Force the page to 1920×1080

Launch flags *should* set this, but Inspector device mode (or a windowed Chrome) can clear it. Always measure:

`browser_evaluate`:

```js
() => ({ innerWidth: window.innerWidth, innerHeight: window.innerHeight })
```

If that is **not** `{ innerWidth: 1920, innerHeight: 1080 }`, restore from Playwright. Do **not** F11, `browser_resize`, or ask the author to scale in Inspector.

`browser_run_code_unsafe`:

```js
async (page) => {
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });
  return await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  }));
}
```

Expect `{ innerWidth: 1920, innerHeight: 1080 }`. The author’s window size does not need to change. Their monitor may still clip the page; that is fine.

If a later evaluate drops below 1080 (they closed Inspector, navigated, or Chrome reset metrics), run this CDP restore again.

### 4. Prove it

Click **Scenes**: `#tab-scenes`. If that click times out, you are probably still on Welcome / the wrong tab — go back to step 2.

### 5. Keep working without stealing focus

Reuse the existing Playwright tab. No `bringToFront`, no extra windows, no F11, no `browser_resize` unless the author agreed **this turn**. Keep the window **open and not minimized**.

If another URL is required, reuse **that same tab**, then navigate back to `http://127.0.0.1:8788/`.

Startup may steal OS focus **once** (MCP launching Chrome). After that, background work only.

---

## After the window is up

HMR of `scenesTab.ts` does not re-bind. Reload `http://127.0.0.1:8788/`, then click `#tab-scenes`. Re-measure 1920×1080 after reload; restore with the CDP snippet if needed.

Dashboard-only work skips Linear and Pending Author Verification. Track it on [agent/Running Tasklist.md](agent/Running%20Tasklist.md).
