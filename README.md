# Global Lua (TTS)

The real Tabletop Simulator **Global** script lives in **`core/global_script.ttslua`** (workspace root).

The file `.tts/objects/Global.lua` is a **stub** only (`require("core.global_script")`). TTS may overwrite that stub when you reload; restore the stub from git if needed, or re-add the single `require` line.

For bundling and tooling, see [`.dev/TTS_BUNDLING_SETUP.md`](.dev/TTS_BUNDLING_SETUP.md).
