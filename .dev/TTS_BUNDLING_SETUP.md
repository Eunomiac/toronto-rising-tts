# TTS Tools Extension - Bundling Setup Guide

## Overview

Based on the [TTS Tools documentation](https://sebaestschjin.github.io/tts-tools/editor/latest/bundling.html), here's how bundling works and how to troubleshoot issues.

## How Bundling Works

**Important**: The TTS Tools extension works with files in the `.tts/objects/` directory. This is the "output directory" where the extension stores scripts it reads from TTS.

### Global script source of truth (read this)

- **TTS may overwrite** `.tts/objects/Global.lua` when you reload the game or sync from TTS. Treat that file as **volatile**.
- It should stay a **stub** only: `require("core.global_script")`.
- **All global game logic** lives in **`core/global_script.ttslua`** (same `require()` roots as `lib/` and `core/`). Edit that file, not the stub, when adding `onLoad`, HUD handlers, etc.

See also [`README.md`](../README.md) at the repo root (Global script overview).

**Rolandostar / `Global.-1.lua` in Temp:** The synced file under e.g. `%LocalAppData%\Temp\TabletopSimulator\Tabletop Simulator Lua\` is **not** where `require()` looks. Module names like `core.global_script` resolve against your **project workspace** (`core/global_script.ttslua`, `lib/…`). Prefer **`require("core.global_script")`** in the stub. If a save or old stub still says **`require("global.global_script")`**, the repo provides a one-line shim at [`global/global_script.ttslua`](../global/global_script.ttslua) so that id keeps working; **edit game logic only in `core/global_script.ttslua`.** In a **multi-root** VS Code/Cursor window, put **this repo first** (or use a single-folder window) so the extension’s include path finds `core/` and `global/`.

1. **Entry Point (stub)**: `.tts/objects/Global.lua` is what the extension bundles first; it should only `require("core.global_script")`.
2. **Module Files**: Your module files (e.g., `lib/util.ttslua`, `core/state.ttslua`, `core/global_script.ttslua`) are in the workspace directory
3. **Require Syntax**: Use dot notation: `require("lib.util")` for `lib/util.lua` or `lib/util.ttslua`
4. **Bundling Process**: When you use "Save and Play":
   - Extension reads `.tts/objects/Global.lua`
   - For each `require()` call, it looks for the file in the workspace directory (based on `ttsEditor.includePath`)
   - It bundles everything into one script
   - Sends the bundled version to TTS
   - Saves a copy to `.tts/bundled/Global.lua`

## Rolandostar (`tabletopsimulator-lua`): Temp folder vs this repo

Official reference: [Module resolution](https://github.com/rolandostar/tabletopsimulator-lua-vscode/blob/main/docs/content/extension/moduleResolution/index.md) (same content as [tts-vscode.rolandostar.com — Module resolution](https://tts-vscode.rolandostar.com/extension/moduleResolution)).

**Symptom:** Save & Play / catalog errors like **Could not catalog `<Include />` — file not found: `defaults_classes`** (or similar), and the error or tooltip mentions **`...\AppData\Local\Temp\TabletopSimulator\Tabletop Simulator Lua`**.

**Why:** Pulling scripts from TTS writes copies under that **Temp** tree. **`require`** and **`<Include src="...">`** are **not** resolved from “the folder where `Global.-1.lua` lives” as a project root. The extension uses an **ordered search** per the doc above: **Documents/Tabletop Simulator** first, then **`ttslua.fileManagement.includePaths`**, then **folders opened in the workspace**. In practice (rolandostar with this repo), **`<Include src>`** is resolved from the **workspace folder root**: use paths like **`ui/defaults_tags.xml`**, **`ui/storyteller/panel_camera.xml`**, not bare **`defaults_tags.xml`** (which would look next to the repo root). If catalog runs only against **Temp** while your real **`ui/*.xml`** lives in the **repo**, also ensure the repo is the Save & Play working directory and on the search path.

**Repo defaults (committed):** [`.vscode/settings.json`](../.vscode/settings.json) sets:

- **`ttslua.fileManagement.includePaths`:** `["${workspaceFolder}"]` — adds this clone as an **additional** search root (priority2 in the doc), so `require` / `<Include>` can find **`core/`**, **`lib/`**, **`ui/`** regardless of Temp.
- **`ttslua.fileManagement.luaSearchPattern`:** `["?", "?.lua", "?.ttslua"]` — the extension default is **`?.lua`** only; this project uses **`.ttslua`** modules, so **`?.ttslua`** must be listed per [Lua search-path patterns](https://www.lua.org/pil/8.1.html) as described in the module-resolution doc.

**What to do if errors persist:**

1. **Open this folder as the workspace** — **File → Open Folder…** → `toronto-rising-tts` (single-folder is simplest). For **multi-root**, open the **repo** folder, not only Temp.
2. **Change working directory for Save & Play** — Command **“TTS Lua: Change working directory where scripts will be saved to and loaded from.”** (`ttslua.changeWorkDir`). Point it at **`toronto-rising-tts`** so the extension loads/bundles from **`ui/Global.xml`** and the rest of the tree (see [issue #20](https://github.com/rolandostar/tabletopsimulator-lua-vscode/issues/20)).
3. **Debug resolution** — `"ttslua.misc.debugSearchPaths": true` and **Developer Tools** (**Ctrl+Shift+I**); see [Debugging module resolution](https://tts-vscode.rolandostar.com/support/debugModuleResolution).

**Settings note:** Sebaestschjin uses **`ttsEditor.*`**. Rolandostar uses **`ttslua.*`**. This repo’s layout expects **`core/`**, **`lib/`**, **`ui/`** at the **repository root**.

## Workflow

### Recommended Workflow

1. **Edit global logic**: Use **`core/global_script.ttslua`** (not the `.tts/objects/Global.lua` stub).
2. **Edit other modules**: Edit files in `lib/` and `core/` directly.
3. **Keep the stub**: If TTS overwrote the synced Global entry script, set it back to only `require("core.global_script")` (one line). The stub is **not** tracked in git (see [`.gitignore`](../.gitignore)).
4. **Bundle and send**: Use "Save and Play" - extension will:
   - Read `.tts/objects/Global.lua`
   - Resolve all `require()` calls from workspace directory (including `core.global_script`)
   - Bundle everything together
   - Send to TTS

### Working with Bundled Only

1. Edit `.tts/bundled/Global.lua` directly
2. Use "Save and Play (Bundled)" to send as-is (no bundling)

## Common Issues

### Issue 0: Connection Refused (ECONNREFUSED 127.0.0.1:39999)

**Symptom**: Error in Extension Host: `Error: connect ECONNREFUSED 127.0.0.1:39999`

- "Save & Play" doesn't work
- "Load Objects" doesn't work
- Extension can't communicate with TTS

**Root Cause**: The TTS Tools extension connects to TTS on port 39999 (TTS External Editor API). If TTS isn't running or the API isn't enabled, the connection fails.

**Solution**:

1. **Ensure TTS is Running**:
   - Tabletop Simulator must be open and running
   - Load a game or create a new game (doesn't matter which)
   - The game doesn't need to be saved, but TTS must be running

2. **Enable External Editor API in TTS**:
   - In TTS, go to **Options** → **General** tab
   - Scroll down to find **"External Editor"** section
   - Check **"Enable External Editor"** (or similar checkbox)
   - This enables TTS to listen on port 39999 for editor connections

3. **Verify Port Availability**:
   - Port 39999 should be available (not blocked by firewall)
   - Windows Firewall may block the connection - check if TTS is allowed
   - If using antivirus, ensure it's not blocking localhost connections

4. **Test Connection**:
   - After enabling External Editor API, try "Save & Play" again
   - The extension should now be able to connect to TTS
   - You should see scripts being sent to TTS without connection errors

5. **Alternative: Manual Script Loading**:
   - If connection still fails, you can manually copy bundled scripts:
   - Use "Bundle Scripts" command (if available) to generate `.tts/bundled/Global.lua`
   - Manually copy the content into TTS Global script editor
   - This is a workaround, not a permanent solution

**Note**: The External Editor API must be enabled in TTS for the extension to work. This is a TTS setting, not an extension setting.

### Issue 0b: Port 39998 already in use (EADDRINUSE)

**Symptom**: Local tooling (for example the [TTS MCP server](TTS_MCP.md)) fails with `listen EADDRINUSE` on `127.0.0.1:39998`, or the MCP logs mention that **port 39998** is already in use.

**Root cause**: In the External Editor protocol, **your editor** (or bridge process) must listen on **39998** so Tabletop Simulator can open **outbound** connections to deliver `print` output, errors, return values, etc. Only **one** process at a time can bind that port.

**What to do**:

1. Quit or disable other External Editor integrations that listen on **39998** (e.g. another VS Code / Cursor extension talking to TTS at the same time).
2. Or stop the other tool, then start the MCP / bridge again.

See [TTS_MCP.md](TTS_MCP.md) for setup and Cursor configuration.

### Issue 1: Extension Not Reading Your Script

**Symptom**: Changes don't appear in TTS

**Root Cause**: The extension reads from `.tts/objects/Global.lua` for the bundle **entry**, but TTS may have replaced that file. Logic belongs in `core/global_script.ttslua`.

**Solution**:

- Restore the Global entry script the extension uses (often under `.tts/objects/`) to only `require("core.global_script")` if TTS replaced it with bundled code.
- Edit **`core/global_script.ttslua`** for global script changes.
- Module files in `lib/` and `core/` are resolved automatically during bundling.

**Important**: The `.tts/objects/` directory is the extension’s sync target; **`core/global_script.ttslua`** is the source of truth for global Lua logic.

### Issue 2a: Module only used inside functions → missing from bundle

**Symptom**: Console shows `DEBUG.workspaceNdjsonBegin: lib.workspace_ndjson_log unavailable` (or `require failed: ...`) while other `sendExternalMessage` writes (e.g. `Print State` / `game_state.txt`) still work.

**Cause**: Some bundlers only pull in modules reachable from **top-level** `require("...")` on the dependency graph. A module loaded **only** via `pcall(require, ...)` inside a function may never be embedded, so it is missing at runtime.

**Solution**: Add a **module-level** `require("lib_that_must_ship")` once from an entry module (e.g. `core/debug.ttslua` already preloads `lib.workspace_ndjson_log`). Do the same for any other “lazy” dependency you need in TTS.

**Object scripts** (e.g. character sheet `ui/ui_csheet.ttslua`): stubs are only `require("ui.ui_csheet")`. Anything you `require` **inside** a function may be **missing at runtime**. Keep **`require("lib.workspace_ndjson_log")`** (and similar) at **file top level**.

### Issue 2: Require Path Errors

**Symptom**: `Tried to require "lib.util", but no such module has been registered`

**Solution**:

- Ensure files exist: `lib/util.ttslua` or `lib/util.lua`
- Check require path uses dots: `require("lib.util")` not `require("lib/util")`
- Verify workspace root is correct (extension searches from workspace directory)
- Check if "include path" setting needs adjustment

### Issue 3: Special Characters in Filenames

**Symptom**: Files with `++` or other special chars in names

**Solution**:

- The bundler handles `console++.lua` correctly
- Use `require("lib.Console.console++")` as-is
- If issues persist, consider renaming to `console_plus_plus.lua`

### Issue 4: Extension Settings

**Correct Settings** (for TTS Tools extension):

```json
{
  "ttsEditor.includePath": ".",
  "ttsEditor.enableMessages": true
}
```

**Explanation**:

- `ttsEditor.includePath`: Relative path from workspace root where modules are located. Default is `"src"`, but since our files are in the root (`lib/`, `core/`), we use `"."` (current directory).
- `ttsEditor.enableMessages`: Enables handling of custom messages from TTS (for external command support).

**Old Settings** (for older extension - remove these):

- `TTSLua.includeOtherFiles` - Not used by TTS Tools
- `TTSLua.bundleSearchPattern` - Not used by TTS Tools
- `TTSLua.includeOtherFilesPaths` - Not used by TTS Tools

## Player character data (`lib/json/PCS.json`)

- **Authoring**: Edit chronicle PC definitions in **`lib/json/PCS.json`** (source of truth in git).
- **TTS runtime**: Lua cannot read arbitrary files on disk. After changing the JSON, regenerate the embedded module:
  - From repo root: `node .dev/scripts/generate_pcs_data_lua.js`
  - This rewrites **`lib/pcs_data.ttslua`** (large file, committed) so `require("lib.pcs_data")` decodes the JSON inside Tabletop Simulator.
- Game code uses `PCS.getPC(charKey)`; player seats and `charKey` come from **`lib/constants.ttslua`** (`C.PlayerData`).

## File Structure

```text
workspace/
├── global/
│   ├── global_script.ttslua   # Global game logic (edit this)
│   └── README.md
├── lib/
│   ├── util.ttslua
│   ├── constants.ttslua
│   ├── console.lua
│   └── Console/
│       ├── console.lua
│       └── console++.lua
├── core/
│   ├── state.ttslua
│   ├── main.ttslua
│   └── ...
└── .tts/
    ├── objects/
    │   └── Global.lua     # Stub only: require("core.global_script") — may be overwritten by TTS
    └── bundled/
        └── Global.lua     # Bundled output (generated, not edited)
```

## Debugging Steps

1. **Check Bundled Output**: Look at `.tts/bundled/Global.lua` to see if all modules are included
2. **Check TTS Console**: Look for Lua errors in TTS (press `` ` `` for system console)
3. **Check Extension Logs**: Look for bundling errors in VS Code/Cursor output panel
4. **Verify File Paths**: Ensure all `require`d files exist in the workspace
5. **Test Simple Require**: Try a minimal test to verify bundling works

## Testing Bundling

Create a simple test:

**test.lua**:

```lua
local Test = {}
Test.message = "Hello from test module"
return Test
```

**`core/global_script.ttslua`** (add temporarily at end of file, then remove after test):

```lua
local Test = require("test")
print(Test.message)
```

Or keep the stub and add the same two lines to a scratch module required from `global_script`. If bundling works, TTS receives the full tree. If not, check extension configuration (and that `core/` is on the include path like `lib/`).

---

## XML UI template generator

Helper script for player (and other) UI XML that is generated from templates.

### What it does

- Templates live in `ui/.templates/*.xml`.
- The first non-empty line of each template must be `<!-- TARGET: path/from/repo/root.xml -->`.
- If the template root contains `@@color@@`, it is duplicated once per `C.PlayerColors` value (from `lib/constants.ttslua`); otherwise a single root is written (pass-through).
- Each output file begins with a banner pointing back to the template source.

### Where it writes outputs

- Whatever path is declared in the template `TARGET` line (for example `ui/player/panel_map_core_generated.xml`).

### How to run it

From repo root:

```bash
node .dev/scripts/xml_color_template_generator.js
```

Optional: `--templateDir` (defaults to `ui/.templates`), `--token` (defaults to `@@color@@`).

### How generated XML is included

- Include the output file directly from other `ui/**/*.xml` files (for example `ui/player/panel_right_sidebar_layers.xml`).

If you change templates, re-run the generator before using TTS Tools "Save and Play".
