# TTS Tools Extension - Bundling Setup Guide

## Overview

Based on the [TTS Tools documentation](https://sebaestschjin.github.io/tts-tools/editor/latest/bundling.html), here's how bundling works and how to troubleshoot issues.

## How Bundling Works

**Important**: The TTS Tools extension works with files in the `.tts/objects/` directory. This is the "output directory" where the extension stores scripts it reads from TTS.

### Global script source of truth (read this)

- **TTS may overwrite** `.tts/objects/Global.lua` when you reload the game or sync from TTS. Treat that file as **volatile**.
- It should stay a **stub** only: `require("global.global_script")`.
- **All global game logic** lives in **`global/global_script.ttslua`** (same `require()` roots as `lib/` and `core/`). Edit that file, not the stub, when adding `onLoad`, HUD handlers, etc.

See also [`global/README.md`](../global/README.md).

1. **Entry Point (stub)**: `.tts/objects/Global.lua` is what the extension bundles first; it should only `require("global.global_script")`.
2. **Module Files**: Your module files (e.g., `lib/util.ttslua`, `core/state.ttslua`, `global/global_script.ttslua`) are in the workspace directory
3. **Require Syntax**: Use dot notation: `require("lib.util")` for `lib/util.lua` or `lib/util.ttslua`
4. **Bundling Process**: When you use "Save and Play":
   - Extension reads `.tts/objects/Global.lua`
   - For each `require()` call, it looks for the file in the workspace directory (based on `ttsEditor.includePath`)
   - It bundles everything into one script
   - Sends the bundled version to TTS
   - Saves a copy to `.tts/bundled/Global.lua`

## Workflow

### Recommended Workflow

1. **Edit global logic**: Use **`global/global_script.ttslua`** (not the `.tts/objects/Global.lua` stub).
2. **Edit other modules**: Edit files in `lib/` and `core/` (and `global/` if you split further) directly.
3. **Keep the stub**: If TTS overwrote `.tts/objects/Global.lua`, restore it to only `require("global.global_script")` (see comments in that file).
4. **Bundle and send**: Use "Save and Play" - extension will:
   - Read `.tts/objects/Global.lua`
   - Resolve all `require()` calls from workspace directory (including `global.global_script`)
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

**Root Cause**: The extension reads from `.tts/objects/Global.lua` for the bundle **entry**, but TTS may have replaced that file. Logic belongs in `global/global_script.ttslua`.

**Solution**:

- Restore `.tts/objects/Global.lua` to the repo stub (`require("global.global_script")`) if it was overwritten.
- Edit **`global/global_script.ttslua`** for global script changes.
- Module files in `lib/`, `core/`, and `global/` are resolved automatically during bundling.

**Important**: The `.tts/objects/` directory is the extension’s sync target; **`global/global_script.ttslua`** is the source of truth for global Lua logic.

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
    │   └── Global.lua     # Stub only: require("global.global_script") — may be overwritten by TTS
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

**`global/global_script.ttslua`** (add temporarily at end of file, then remove after test):

```lua
local Test = require("test")
print(Test.message)
```

Or keep the stub and add the same two lines to a scratch module required from `global_script`. If bundling works, TTS receives the full tree. If not, check extension configuration (and that `global/` is on the include path like `lib/`).

---

## XML UI template generator

Helper script for player (and other) UI XML that is generated from templates.

### What it does

- Templates live in `ui/templates/*.xml`.
- The first non-empty line of each template must be `<!-- TARGET: path/from/repo/root.xml -->`.
- If the template root contains `@@color@@`, it is duplicated once per `C.PlayerColors` value (from `lib/constants.ttslua`); otherwise a single root is written (pass-through).
- Each output file begins with a banner pointing back to the template source.

### Where it writes outputs

- Whatever path is declared in the template `TARGET` line (for example `ui/player/panel_map_core_generated.xml`).

### How to run it

From repo root:

```bash
node dev/scripts/xml_color_template_generator.js
```

Optional: `--templateDir` (defaults to `ui/templates`), `--token` (defaults to `@@color@@`).

### How generated XML is included

- Include the output file directly from other `ui/**/*.xml` files (for example `ui/player/panel_right_sidebar_layers.xml`).

If you change templates, re-run the generator before using TTS Tools "Save and Play".
