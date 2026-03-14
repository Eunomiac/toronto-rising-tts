# UI XML Files

## XML Bundling with TTS Tools Extension

The UI is split into modular components using XML bundling via the TTS Tools extension's `<Include>` feature.

### File Structure

```
ui/
  defaults_tags.xml       → Tag-based defaults only (include first)
  defaults_classes.xml    → General shared classes (submitButton, statusLabel, etc.)
  hud.xml                 → Root bundle file; includes all submodules in order

  storyteller/
    hud_storyteller_defaults.xml  → Classes for admin panel, sidebar, and camera controls
    hud_storyteller.xml           → Heritage admin panel layout (game phases, debug controls)
    panel_sidebar.xml             → Right sidebar (reference image toggles + popup images)
    panel_camera.xml              → Camera control bar + faction icons
    panel_lighting.xml            → (empty - removed during Heritage migration)
    panel_scenes.xml              → (empty - removed during Heritage migration)
    panel_pcs.xml                 → (empty - removed during Heritage migration)
    panel_phases.xml              → (empty - removed during Heritage migration)

  player/
    hud_player.xml        → Player HUD panels (character stats per color)
    (hud_player_defaults.xml    → Optional; add when needed)

  shared/
    hud_shared.xml        → Shared elements (dice results, scene transition overlay)
```

### How It Works

1. **Source Files**: Edit the modular XML files in `ui/`
2. **Root File**: `ui/hud.xml` includes defaults and submodules in the correct order
3. **Bundling**: When you use "Save and Play", the TTS Tools extension reads `.tts/objects/Global.xml`, resolves all `<Include>` tags (including nested ones), bundles into a single XML string, and saves to `.tts/bundled/Global.xml`
4. **Loading**: The bundled XML is loaded in `.tts/objects/Global.lua` via `UI.setXml()`

### Workflow

1. Edit modular XML files in `ui/` directory
2. **Keep `.tts/objects/Global.xml` in sync with `ui/hud.xml`** – copy hud.xml content to Global.xml before Save and Play
3. Use "Save and Play" – extension bundles and sends to TTS
4. **No hardcoded XML in Lua** – `LightDebug.refreshLightDebugPanel()` injects dynamic spotlight rows at `lightTableRowsPlaceholder`

---

## Style and Defaults Organization

### Class Naming Conventions (MANDATORY)

**Future agents and contributors MUST follow these conventions when creating or editing TTS UI classes.**

| Scope | Convention | Examples |
|-------|------------|----------|
| **General (shared across components)** | No prefix | `submitButton`, `statusLabel`, `panelBase` |
| **Area-specific** | `area_` prefix | `storyteller_root`, `storyteller_toggleButton`, `storyteller_heading` |
| **Component-specific** | `componentName_elementRole` | `lightPanel_tableRow` |

- **General classes** live in `defaults_classes.xml` and are used across multiple components
- **Area-specific classes** use a prefix to avoid collisions (e.g. `storyteller_`, `player_`)
- **Component-specific classes** go in `panel_X_defaults.xml` or inline when the panel is simple

### Include Order (TTS Constraint)

TTS Defaults apply only to elements **after** them in the bundled XML. Order in `hud.xml` must be:

1. `defaults_tags` (tag-based)
2. `defaults_classes` (global classes)
3. `storyteller/hud_storyteller_defaults`
4. `storyteller/hud_storyteller` (includes the 4 panels)
5. `player/hud_player` (optional `hud_player_defaults` before if needed)
6. `shared/hud_shared`

### Layout: 3×4 Conceptual Positioning Grid

UI positioning uses a **conceptual 3 columns × 4 rows grid** (no physical `GridLayout`). Components are placed via `rectAlignment` and `offsetXY` to correspond to grid regions (e.g. bottom-right = `LowerRight` + offset). This is a reference system for consistent placement, not a TTS layout container.

---

## Notes

- XML bundling uses `/` separators (not dots like `require`)
- Paths in `<Include>` are resolved from the workspace directory
- Visibility: `Host|Black` for Storyteller, `Red`/`Brown`/etc. for players
- Button onClick handlers must be global functions (e.g. `HUD_changeScene`)
- UI element IDs must match handler expectations in `Global.lua`
- Admin panel ID: `adminControls` (Heritage admin button column + debug panels)
- Sidebar panel ID: `hudSidebarHost` (reference image toggles)
- Camera panel ID: `cameraControlPanel` (camera zoom buttons + faction icons)
- Debug panel IDs: `debugControls`, `debugStatePanel`, `debugTraitsPanel`
