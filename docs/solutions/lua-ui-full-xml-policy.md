# Lua full-UI XML refresh policy (Toronto Rising TTS)

## Goal

Avoid replacing entire Global or Object UI trees at runtime when **targeted** updates suffice. `UI.setXml` and `UI.setXmlTable` (and the same methods on `object.UI` / `zone.UI`) **replace the whole UI document** for that target — expensive, can drop transient state, and complicates click-route registration.

Prefer pre-declared elements in editor XML (or generated static bundles at Save & Play) plus:

| Need | Use |
|------|-----|
| One attribute | `UI.setAttribute(id, name, value)` |
| Several attributes | `UI.setAttributes(id, { ... })` |
| Inner text | `UI.setValue(id, text)` |
| Show/hide with animation | `UI.show` / `UI.hide` |
| Visibility without animation | `active` via `setAttribute` |

TTS documents both APIs in [`.dev/tts-api/Scripting API/UI.md`](../../.dev/tts-api/Scripting%20API/UI.md): `setXml(xml, assets?)` and `setXmlTable(data, assets?)` each **set/replace the UI** with the provided payload.

## Build gate

`npm run check:pcall-gate` (see [`.tools/pcall-gate/check-pcall-gate.mjs`](../../.tools/pcall-gate/check-pcall-gate.mjs)) also tracks:

| Metric | Regex (all scanned `*.ttslua`) |
|--------|--------------------------------|
| `setXml` | `\bsetXml\s*\(` |
| `setXmlTable` | `\bsetXmlTable\s*\(` |

Log lines in [`.dev/build-logs/pcall-gate.txt`](../../.dev/build-logs/pcall-gate.txt):

`ISO8601\tpcall=N\twaitTime=N\twaitCondition=N\tsetXml=N\tsetXmlTable=N`

The gate fails when any metric **increases** above the last logged baseline. After intentional adds, bump the last line before building.

Counts include **comments and strings** that contain `setXml(` or `setXmlTable(` — same rule as `Wait.time` / `pcall`. In comments, prefer `` `setAttribute` `` or “full XML refresh” without those substrings unless documenting a real call site.

Related: [`lua-wait-api-policy.md`](lua-wait-api-policy.md), [`lua-pcall-policy.md`](lua-pcall-policy.md), [`lua-local-function-order.md`](lua-local-function-order.md).

## When full refresh is acceptable

1. **Object UI with runtime-generated structure** where editor `<Include>` does not apply to strings passed to `setXml` (character sheet page 3: backgrounds / merits / flaws).
2. **Dev/debug panels** with dynamic lists not worth static row matrices, if kept out of player-facing hot paths.
3. **Bootstrap** loading bundled Global XML from the global script when that is the initial `setXml` at load (not counted if it lives outside scanned trees).

## When to refactor away

- Lists, toggles, or labels that can be **pre-declared** in XML with stable `id`s (Scenes library panel pattern: attribute-only refresh via `core/storyteller_scenes_panel.ttslua`).
- Refreshing a subsection by `getXml` + string splice + `setXml` — prefer a static container `id` and update children via attributes.
- Any **per-frame** or **high-frequency** sync path (use `Sync` + targeted attribute reconciliation instead).

## Approved baseline (gate)

Recorded in [`.dev/build-logs/pcall-gate.txt`](../../.dev/build-logs/pcall-gate.txt) (last data line):

| Metric | Approved count |
|--------|----------------|
| `setXml` | **3** |
| `setXmlTable` | **0** |

Do not add call sites without review; bump the **last** log line to the new totals before merging.

## Inventory (approved call sites)

| File | Line | Kind | Verdict |
|------|------|------|---------|
| `ui/ui_csheet_core.ttslua` | 506 | **Runtime** `self.UI.setXml` for PCS dynamic pages | **Approved** — dynamic page XML; runtime strings cannot use editor `<Include>`; fingerprint skip |
| `objects/npc_control_board_ui.ttslua` | 52 | **Runtime** `obj.UI.setXml` for CONTROL_BOARD toolbar | **Approved** — embedded from `ui/objects/npc_control_board.xml` via `npm run npc-control-board-ui:generate`; fingerprint skip |

**No `setXmlTable` in scanned trees.** Scenes library panel uses pre-declared XML rows (`core/storyteller_scenes_panel.ttslua`). Legacy Storyteller NPC toolbar panel (`panel_npcs`) removed TOR-181 — CONTROL_BOARD XmlUI only.

**Outside gate:** `.dev/scripts/generate_csheet_defaults_lua.js`, `.dev/scripts/generate_npc_control_board_ui_lua.js`, and editor-bundled Global XML are not `*.ttslua` under `core/`, `global/`, `lib/`, `objects/`, `ui/`.
