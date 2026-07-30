# Lua full-UI XML refresh policy (Toronto Rising TTS)

## Goal

**Runtime `UI.setXml` / `UI.setXmlTable` are banned** for Global UI and most Object UI (TOR-375). They replace the whole UI document — expensive enough to drop join clients on Global, and unnecessary when elements are predeclared.

Prefer pre-declared elements in editor XML (or generated static bundles at Save & Play) plus:

| Need | Use |
|------|-----|
| One attribute | `UI.setAttribute(id, name, value)` |
| Several attributes | `UI.setAttributes(id, { ... })` |
| Inner text | `UI.setValue(id, text)` |
| Show/hide with animation | `UI.show` / `UI.hide` |
| Visibility without animation | `active` via `setAttribute` |
| Seat-change audience rebind | `setAttribute(id, "visibility", seatColor)` (TOR-375; Host hotseat confirmed) |

## Build gate

`npm run check:pcall-gate` tracks:

| Metric | Regex (all scanned `*.ttslua`) |
|--------|--------------------------------|
| `setXml` | `\bsetXml\s*\(` |
| `setXmlTable` | `\bsetXmlTable\s*\(` |

Target baseline: **`setXml≤2`**, **`setXmlTable=0`**.

**Approved exceptions:**

| Site | Notes |
|------|--------|
| CSHEET pages 3–5 `applyPageDynamicXml` (`self.UI.setXml` in `ui/ui_csheet_core.ttslua`) | Small object XML; max-slot static refactor is optional Future work ([TOR-376](https://linear.app/eunomiac-dev/issue/TOR-376)). |
| Global remount (`performFullUiResync` → `applyEmbeddedGlobalXml` in `core/global_script.ttslua`) | **Experiment** ([TOR-439](https://linear.app/eunomiac-dev/issue/TOR-439)): Arm Join XML (minimal embed) and Restore HUD / Refresh (full embed), plus deferred join fallback when Defer setXML is off. One lexical `UI.setXml` call site; remount source is build-embedded XML (`lib.ui_global_xml_docs`), not `UI.getXml()`. Not permanent architecture. |

Do not add other call sites. Comments/strings that contain `setXml(` count — avoid that substring in scanned trees.

Related: [`lua-wait-api-policy.md`](lua-wait-api-policy.md), [`lua-pcall-policy.md`](lua-pcall-policy.md), [`tts-xmlui-visibility-seat-assignment.md`](tts-xmlui-visibility-seat-assignment.md).

## Inventory

| Site | Status |
|------|--------|
| Global remount (`core/global_script.ttslua`) | **Visibility rebind** (TOR-375) + **deferred** join-client full remount fallback (TOR-381). Automatic remount gated by `connectionControls.deferSetXml` (TOR-428). Manual **Refresh XML** / **Arm Join XML** / **Disarm Join XML** on Phases panel (TOR-439). |
| CONTROL_BOARD (`objects/npc_control_board_ui.ttslua`) | **Removed** — baked Include + Save & Play; runtime validates `gb_root` |
| CSHEET pages 3–5 (`ui/ui_csheet_core.ttslua`) | **Permitted exception** — TOR-376 Future optional migrate |

**No `setXmlTable` in scanned trees.**
