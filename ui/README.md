# UI XML Files

## XML bundling (Save & Play)

The UI is split into modular components using TTS `<Include>`. Sebaestschjin **TTS Tools** and **rolandostar (`tabletopsimulator-lua`)** both support this; include paths must be explicit for the latter (see step 3 below). For rolandostar, this repo commits **[`.vscode/settings.json`](../.vscode/settings.json)** (`ttslua.fileManagement.includePaths` + `luaSearchPattern`) per [module resolution](https://github.com/rolandostar/tabletopsimulator-lua-vscode/blob/main/docs/content/extension/moduleResolution/index.md).

### File Structure

```text
ui/
  Global.xml              → Root bundle file; includes all submodules in order
  defaults_tags.xml       → Tag-based defaults only (include first)
  defaults_classes.xml    → General shared classes (submitButton, statusLabel, etc.)
  templates/              → Source templates for generated player XML (see below)

  storyteller/
    hud_storyteller_defaults.xml  → Classes for admin panel, sidebar, and camera controls
    hud_storyteller.xml           → Storyteller HUD layout (game phases, debug controls)
    panel_sidebar.xml             → Right sidebar (reference image toggles + popup images)
    panel_camera.xml              → Camera control bar + faction icons
    panel_lighting.xml            → Reserved (empty stub)
    panel_scenes.xml              → Reserved (empty stub)
    panel_soundscape.xml          → Storyteller soundscape controls (music mood, inspect, stop)
    panel_pcs.xml                 → Storyteller PCs panel (health / will / humanity / XP / hunger)
    panel_phases.xml              → Reserved (empty stub)

  player/
    hud_player.xml        → Player HUD panels (character stats per color)
    *_generated.xml       → Generated from ui/.templates/ (do not edit by hand)
    (hud_player_defaults.xml    → Optional; add when needed)

  shared/
    hud_shared.xml        → Shared elements (dice results, scene transition overlay)
```

### How It Works

1. **Source Files**: Edit the modular XML files in `ui/`
2. **Root File**: `ui/Global.xml` includes defaults and submodules in the correct order
3. **`<Include>` paths (rolandostar):** `src` is resolved from the **workspace folder root**, not from the XML file’s directory under `ui/`. Use **`ui/...`** prefixes and the **`.xml`** suffix, e.g. `ui/defaults_classes.xml`, `ui/storyteller/hud_storyteller.xml`, `ui/player/csheets/csheet_defaults.xml`. (Paths like `defaults_classes.xml` alone fail because they look for a file at the repo root.) Sebaestschjin may still accept older relative forms; this repo standardizes on **workspace-root `ui/` paths** for portability.
4. **Lua `require`:** Unchanged — still **`require("core.foo")`**, **`require("lib.bar")`** (module id maps to `core/`, `lib/` at workspace root via the extension). No `ui.` prefix on Lua modules unless you add such a file under `ui/` as Lua (this project does not).
5. **Bundling**: When you use "Save and Play", the extension reads the workspace Global / UI entry, resolves all `<Include>` tags (including nested ones), bundles into a single XML string, and may save a copy under `.tts/bundled/` (layout depends on extension).
6. **Loading**: The bundled XML is loaded from the global script (`core/global_script.ttslua`, via the extension’s synced Global entry / stub) via `UI.setXml()` where applicable

### Workflow

1. Edit modular XML files in `ui/` directory
2. The extension’s synced **Global** entry should keep a thin stub that loads your workspace global script and UI bundle path per that extension’s docs. If TTS replaces it with inlined code, restore the one-line `require`/include pattern.
3. Use "Save and Play" – extension bundles and sends to TTS
4. **No hardcoded XML in Lua** – prefer static XML under `ui/`; focused light debug uses `panel_debug_light.xml` + `LightDebugFocus` (no dynamic row injection).

---

## Style and Defaults Organization

### Class Naming Conventions (MANDATORY)

**Future agents and contributors MUST follow these conventions when creating or editing TTS UI classes.**

| Scope | Convention | Examples |
| ------- | ---------- | -------- |
| **General (shared across components)** | No prefix | `submitButton`, `statusLabel`, `panelBase` |
| **Area-specific** | `area_` prefix | `storyteller_root`, `storyteller_toggleButton`, `storyteller_heading` |
| **Component-specific** | `componentName_elementRole` | `lightPanel_tableRow` |

- **General classes** live in `defaults_classes.xml` and are used across multiple components
- **Area-specific classes** use a prefix to avoid collisions (e.g. `storyteller_`, `player_`)
- **Component-specific classes** go in `panel_X_defaults.xml` or inline when the panel is simple

### Include Order (TTS Constraint)

TTS Defaults apply only to elements **after** them in the bundled XML. Order in `Global.xml` must be:

1. `defaults_tags` (tag-based)
2. `defaults_classes` (global classes)
3. `storyteller/hud_storyteller_defaults`
4. `storyteller/hud_storyteller` (includes Storyteller toolbar panels)
5. `player/hud_player` (optional `hud_player_defaults` before if needed)
6. `shared/hud_shared`

### Layout: 3×4 Conceptual Positioning Grid

UI positioning uses a **conceptual 3 columns × 4 rows grid** (no physical `GridLayout`). Components are placed via `rectAlignment` and `offsetXY` to correspond to grid regions (e.g. bottom-right = `LowerRight` + offset). This is a reference system for consistent placement, not a TTS layout container.

---

## Notes

- XML bundling uses `/` separators (not dots like `require`)
- Paths in `<Include>` are resolved from the workspace directory
- Visibility: `Black` for Storyteller, `Red`/`Brown`/etc. for players
- Button onClick handlers must be global functions (e.g. `HUD_changeScene`)
- UI element IDs must match handler expectations in `core/global_script.ttslua`
- Soundscape UI should call `HUD_soundscape*` handlers and route runtime work through `core.soundscape`
- Admin panel ID: `adminControls` (left button column + debug panels)
- Sidebar panel ID: `hudSidebarHost` (reference image toggles)
- Camera panel ID: `cameraControlPanel` (camera zoom buttons + faction icons)
- Debug panel IDs: `debugControls`, `debugStatePanel`, `debugTraitsPanel`

---

## UI XML template generator

Some UI components need the same XML duplicated once per player color (from `lib/constants.ttslua` `C.PlayerColors`). Others are a single root written from a template file. Both are driven from **`ui/.templates/*.xml`**.

### Files and locations

- **Template sources:** `ui/.templates/*.xml`
- **Outputs:** Paths declared in each template’s `TARGET` comment (typically `ui/player/*.xml`)
- **Script:** `.dev/scripts/xml_color_template_generator.js`

### TARGET comment (required)

The **first non-empty line** of each template must be exactly (path relative to repo root, forward slashes):

```xml
<!-- TARGET: ui/player/example_generated.xml -->
```

If this line is missing or malformed, the generator throws an error.

### Generated file banner

Each output file starts with a banner pointing back to the template, for example:

```xml
<!-- Generated file. Edit ui/.templates/panel_map_core.xml only. -->
```

Do not edit generated files by hand; change the template and re-run the generator.

### Token contract (per-color expansion)

- Placeholder token: `@@color@@` (exact substring).
- Replacement values: the player color strings from `C.PlayerColors` (case-sensitive).
- If the template root **contains** `@@color@@`, the generator emits one copy of the root per color with all placeholders replaced.
- If the root **does not** contain `@@color@@`, the generator emits a **single** copy (pass-through).

### Template requirements

- Each file must contain **exactly one root element** (after the `TARGET` comment).
- For per-color templates, include `@@color@@` inside that root (for example in `id` and `visibility` attributes).

### How to run

From repo root:

```bash
node .dev/scripts/xml_color_template_generator.js
```

Optional: `--templateDir` (defaults to `ui/.templates`), `--token` (defaults to `@@color@@`).

The generator ensures no `@@color@@` remains in outputs when expansion was required.

### Wiring into the bundle

Add `<Include src="player/your_file_generated.xml" />` (or the path relative to `ui/` used in your layout XML) from the appropriate parent under `ui/Global.xml`’s include graph.

### ST roll dashboard rows (`ui/.templates/roll/`)

Storyteller **Active Rolls** dashboard rows (`rollDash_row_*`, slot strip) are composed at **build time** from partials:

- **Partials:** `ui/.templates/roll/partials/` (`dash_row_pc.xml`, `dash_slot_row.xml`, headers)
- **Composer:** `ui/.templates/roll/dash_body.xml` (`<!-- TARGET: ui/shared/roll_dash_generated.xml -->`)
- **Script:** `.dev/scripts/generate_roll_dashboard_xml.js` (uses `.dev/scripts/ui_xml_template_engine.js` — same `@@KEY@@` + `##IF @@KEY@@##` semantics as `lib/ui_xml_template.ttslua`)
- **Output:** `ui/shared/roll_dash_generated.xml` — included from `rollDash_ST` in `ui/shared/roll_panels.xml`
- **Run:** `npm run roll-dashboard:generate` (also in `npm run build`)

Edit partials to change layout (`offsetXY`, `preferredWidth`/`preferredHeight`); `RUI.refreshSTDashboard()` still drives labels and visibility via element ids (no Global `setXml`). Dashboard content width is `DASH_LAYOUT.WIDTH` in `generate_roll_dashboard_xml.js` (730px today = `rollPanel_ST` outer 750px minus 10px horizontal padding each side); change `ST_PANEL_OUTER_WIDTH` / `ST_PANEL_PADDING_H` and `rollPanel_ST` width together.

### Grid strip controls (`lib/grid_strip.ttslua`)

Reusable hover/select strips for pool counts, difficulty, etc. **Live consumers:** [`ui/storyteller/panel_storyteller_roll_controls.xml`](storyteller/panel_storyteller_roll_controls.xml) (`gridStrip_rollPanelST_*`); ST Roll Dashboard PC rows (`gridStrip_rollDash<Color>_difficulty` in generated `roll_dash_generated.xml`). **Design mockup** (always visible, non-interactive strips): [`ui/storyteller/db_panel_storyteller_roll_controls.xml`](storyteller/db_panel_storyteller_roll_controls.xml).

**Handlers** (wire in XML `Defaults` or per-element): `HUD_gridStripCellMouseEnter`, `HUD_gridStripCellMouseDown`, `HUD_gridStripCellMouseUp`, `HUD_gridStripMouseExit` (on strip `GridLayout` parent).

**ID contract** — every id contains a `gridStrip` underscore segment; optional prefix (e.g. `db_`) before it:

| Element | Tokens after prefix | Example |
| --- | --- | --- |
| Strip | `gridStrip`, `context`, `kind` | `db_gridStrip_rollPanelST_hunger` |
| Cell | above + numeric `index` | `db_gridStrip_rollPanelST_hunger_3` |

**Register a new panel:** `GridStrip.registerContext("myContext", { buildStripId = function(kind) return "db_gridStrip_myContext_" .. kind end, kinds = { ... } })` with per-kind `minValue`, `maxValue`, `baseAlpha`, optional `leadingZeroTransparent` (difficulty strips: cell **0** stays transparent when left of the selected value; full green when **0** is selected), `canInteract(ctx)`, `getSelectedValue(ctx)`, `onCommit(ctx, value)`. Refresh via `GridStrip.refreshContext("myContext", function(kind) return selected end)`.

See [Dice System Outline §10.4–10.5](../.dev/Dice%20System/Dice%20System%20Outline.md) for ST roll panel and dashboard wiring.

### Adding a new template

1. Add `ui/.templates/<name>.xml` with the `TARGET` line first, then a single root element.
2. Run the generator.
3. Reference the output file from the relevant `ui/**/*.xml` include.
