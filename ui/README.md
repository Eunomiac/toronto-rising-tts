# UI XML Files

## XML Bundling with TTS Tools Extension

The UI is split into modular components using XML bundling via the TTS Tools extension's `<Include>` feature.

### File Structure

- **`ui/hud.xml`** - Main XML file that includes all components
- **`ui/defaults.xml`** - Default styles and CSS-like classes
- **`ui/admin.xml`** - Admin/Storyteller panel (scene controls, phase controls, debug tools)
- **`ui/player_hud.xml`** - Player HUD panels (character stats: hunger, willpower, health)
- **`ui/shared.xml`** - Shared elements (dice results display, scene transition overlay)

### How It Works

1. **Source Files**: Edit the modular XML files in `ui/`
2. **Main File**: `ui/hud.xml` uses `<Include>` tags to combine components:
   ```xml
   <Include src="ui/defaults" />
   <Include src="ui/admin" />
   <Include src="ui/player_hud" />
   <Include src="ui/shared" />
   ```
3. **Bundling**: When you use "Save and Play", the TTS Tools extension:
   - Reads `.tts/objects/Global.xml` (which should be a copy of `ui/hud.xml`)
   - Resolves all `<Include>` tags
   - Bundles everything into a single XML string
   - Saves the bundled result to `.tts/bundled/Global.xml`
4. **Loading**: The bundled XML is loaded in `.tts/objects/Global.lua` via `UI.setXml()`

### Workflow

1. Edit modular XML files in `ui/` directory
2. Copy `ui/hud.xml` to `.tts/objects/Global.xml` (or the extension may do this automatically)
3. Use "Save and Play" - extension bundles the XML automatically
4. The bundled XML in `.tts/bundled/Global.xml` is what gets sent to TTS

### Loading in Lua

The XML is loaded in `.tts/objects/Global.lua`:

```lua
-- Load the bundled XML (extension handles bundling)
-- The bundled XML is in .tts/bundled/Global.xml after "Save and Play"
UI.setXml(HUD_XML)  -- HUD_XML should contain the bundled XML string
```

**Note**: Currently, you may need to embed the bundled XML as a string constant in Lua, or the extension might provide a way to load it automatically. Check the bundled output in `.tts/bundled/Global.xml` after using "Save and Play".

### Notes

- XML bundling uses `/` separators (not dots like `require`)
- Paths in `<Include>` are resolved from the workspace directory (based on `ttsEditor.includePath`)
- Nested includes resolve relative to the file's location
- The XML file uses role-based visibility (`visibility="Host|Black"` for Storyteller, `visibility="Red"` for players, etc.)
- Button onClick handlers must be global functions (e.g., `HUD_changeScene`, `HUD_togglePanel`)
- UI element IDs match the patterns expected by the handlers in `Global.lua`
