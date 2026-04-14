# Global Lua (TTS)

The real Tabletop Simulator **Global** script lives in **`core/global_script.ttslua`** (workspace root).

If your TTS / VS Code extension syncs a thin Global stub, it should use **`require("core.global_script")`** (module resolution is against **this repo**, not the Temp folder next to `Global.-1.lua`). Legacy stubs with **`require("global.global_script")`** still work via [`global/global_script.ttslua`](global/global_script.ttslua) (shim to `core`). Edit **`core/global_script.ttslua`** for all game logic.

For bundling and tooling, see [`.dev/TTS_BUNDLING_SETUP.md`](.dev/TTS_BUNDLING_SETUP.md).
