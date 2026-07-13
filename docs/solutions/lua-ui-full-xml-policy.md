# Lua full-UI XML refresh policy (Toronto Rising TTS)

## Goal

**Runtime `UI.setXml` / `UI.setXmlTable` are banned** for Global and Object UI (TOR-375). They replace the whole UI document — expensive enough to drop join clients on Global, and unnecessary when elements are predeclared.

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

Target baseline: **`setXml=0`**, **`setXmlTable=0`**.

Until [TOR-376](https://linear.app/eunomiac-dev/issue/TOR-376) (CSHEET max-slot migrate) lands, the only remaining approved call is CSHEET `applyPageDynamicXml` (`setXml=1`). Do not add others. Comments/strings that contain `setXml(` count — avoid that substring in scanned trees.

Related: [`lua-wait-api-policy.md`](lua-wait-api-policy.md), [`lua-pcall-policy.md`](lua-pcall-policy.md), [`tts-xmlui-visibility-seat-assignment.md`](tts-xmlui-visibility-seat-assignment.md).

## Inventory

| Site | Status |
|------|--------|
| Global seat assign (`core/global_script.ttslua`) | **Removed** — `revealSeatHudVisibility` + `UpdateUIDisplays` (TOR-375) |
| CONTROL_BOARD (`objects/npc_control_board_ui.ttslua`) | **Removed** — baked Include + Save & Play; runtime validates `gb_root` |
| CSHEET pages 3–5 (`ui/ui_csheet_core.ttslua`) | **Remaining** — TOR-376 max-slot static XML + attribute reconcile |

**No `setXmlTable` in scanned trees.**
