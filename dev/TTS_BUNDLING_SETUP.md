# TTS Tools Extension - Bundling Setup Guide

## Overview

Based on the [TTS Tools documentation](https://sebaestschjin.github.io/tts-tools/editor/latest/bundling.html), here's how bundling works and how to troubleshoot issues.

## How Bundling Works

**Important**: The TTS Tools extension works with files in the `.tts/objects/` directory. This is the "output directory" where the extension stores scripts it reads from TTS.

1. **Entry Point**: `.tts/objects/Global.lua` is the main script file the extension works with
2. **Module Files**: Your module files (e.g., `lib/util.ttslua`, `core/state.ttslua`) are in the workspace directory
3. **Require Syntax**: Use dot notation: `require("lib.util")` for `lib/util.lua` or `lib/util.ttslua`
4. **Bundling Process**: When you use "Save and Play":
   - Extension reads `.tts/objects/Global.lua`
   - For each `require()` call, it looks for the file in the workspace directory (based on `ttsEditor.includePath`)
   - It bundles everything into one script
   - Sends the bundled version to TTS
   - Saves a copy to `.tts/bundled/Global.lua`

## Workflow

### Recommended Workflow:

1. **Edit entry point**: Work directly in `.tts/objects/Global.lua` (this is what the extension reads from)
2. **Edit module files**: Edit files in `lib/` and `core/` directories directly
3. **Bundle and send**: Use "Save and Play" - extension will:
   - Read `.tts/objects/Global.lua`
   - Resolve all `require()` calls from workspace directory
   - Bundle everything together
   - Send to TTS

**Note**: The `.tts/objects/Global.lua` file is your main entry point. There's no need for a separate `global.ttslua` file - work directly in `.tts/objects/Global.lua`.

**Note**: The extension does NOT automatically sync `global.ttslua` to `.tts/objects/Global.lua`. You must manually keep them in sync, or work directly in `.tts/objects/Global.lua`.

### Working with Bundled Only:
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

### Issue 1: Extension Not Reading Your Script

**Symptom**: Changes don't appear in TTS

**Root Cause**: The extension reads from `.tts/objects/Global.lua`. Make sure you're editing the correct file.

**Solution**:
- Always edit `.tts/objects/Global.lua` directly (this is your main entry point)
- The extension reads from this file when bundling
- Module files in `lib/` and `core/` are resolved automatically during bundling

**Important**: The `.tts/objects/` directory is what the extension uses as the source of truth for bundling. Work directly in `.tts/objects/Global.lua`.

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

```
workspace/
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
    │   └── Global.lua     # Main entry point (you edit this)
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

**.tts/objects/Global.lua** (add temporarily):
```lua
local Test = require("test")
print(Test.message)
```

If this works, bundling is functioning. If not, check extension configuration.
