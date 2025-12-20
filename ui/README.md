# UI XML Files

## hud.xml

This is the main UI XML file for the VTM5E module. It contains all UI elements:

- Defaults (styles, classes)
- Admin/Storyteller panel (scene controls, phase controls, debug tools)
- Player HUD panels (character stats: hunger, willpower, health)
- Shared elements (dice results display, scene transition overlay)

## Loading the XML in TTS

TTS requires UI XML to be loaded as a string via `UI.setXml()`. The XML content from `ui/hud.xml` needs to be embedded as a string constant in `global.ttslua`.

### Option 1: Embed XML as String (Recommended)

Copy the entire contents of `ui/hud.xml` and embed it in `global.ttslua`:

```lua
local HUD_XML = [[
<!-- Paste entire contents of ui/hud.xml here -->
<Defaults>
  ...
</Defaults>
...
]]

-- Then use it:
UI.setXml(HUD_XML)
```

### Option 2: Use TTS Extension Bundling

If your TTS extension supports XML bundling, you may be able to load it differently. Check your extension's documentation.

## Notes

- TTS does NOT support XML includes, so everything must be in one file
- The XML file uses role-based visibility (`visibility="Host|Black"` for Storyteller, `visibility="Red"` for players, etc.)
- Button onClick handlers must be global functions (e.g., `HUD_changeScene`, `HUD_togglePanel`)
- UI element IDs match the patterns expected by the handlers in `global.ttslua`
