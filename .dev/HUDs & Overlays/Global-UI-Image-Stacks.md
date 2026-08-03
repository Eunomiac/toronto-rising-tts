# Global UI image stacks & remount weight

## Agent Routing

Read this when:

- trimming Global XmlUI for join / Reload UI timeouts
- migrating exclusive image stacks, chrome banks, or ×5 seat-copied panels
- adding or changing XmlUI `visibility` audience helpers

Source of truth:

- Expanded Global: `ui/Global.xml` include tree → `.tts/bundled/Global.xml`
- Helpers: `lib/util.ttslua` (`U.setVisibleTo` / `U.showTo` / `U.hideFrom`)
- Player HUD: `core/hud_player.ttslua`, `ui/.templates/`

Verification:

- Recount `<Image>` in expanded Global after cuts
- Save & Play; solo Court/refs/sidebar; TOR-439 Reload UI with join client when possible

Status: current (2026-08-03)

Related: [Join-Load Inventory](../Multiplayer%20Functionality/Join-Load%20Inventory.md), [tts-xmlui-visibility-seat-assignment](../../docs/solutions/tts-xmlui-visibility-seat-assignment.md), [lua-ui-full-xml-policy](../../docs/solutions/lua-ui-full-xml-policy.md), TOR-439, TOR-375

---

## Diagnosis

| Intended win | Actual cost |
| --- | --- |
| Avoid slight `setAttribute("image")` cost via predeclared variant stacks | ~**7.4k** `<Image>` nodes in Global (~1.83 MB); remount can drop join clients |
| Per-seat `visibility="<Color>"` copies for same content | ×5 multiplier on Court, refs, etc. |

- `active="false"` helps draw; it does **not** remove nodes from `UI.setXml` parse/build.
- Same asset repeated (tracker squares) is cheap for CustomUIAssets / ImageRaw; node count still hurts remount.
- Court trackers are the largest stack instance; project/trait **pip rows** and ×5 copies are separate taxes.

## Three strategies

| # | Prefer | Avoid |
| --- | --- | --- |
| 1 | One Image + guarded `setAttribute("image")` | Exclusive variant stacks |
| 2 | One Image + XmlUI `color` tint | `_hover` / `_active` sibling Images + triple assets |
| 3 | Shared element; `visibility` unions (`Red\|Orange`) | ×5 trees when attrs are the same for all viewers |

### `active` vs `visibility`

| Attribute | Meaning | Helpers |
| --- | --- | --- |
| `active` | Layout on/off (collapse) | `U.showXmlElement` / `U.hideXmlElement` |
| `visibility` | **Who** may see the element | `U.setVisibleTo` / `U.showTo` / `U.hideFrom` |

Do not conflate them. Hunger TOR-340 sticky-`active` under empty-seat `visibility` is a separate footgun.

### Audience API

- `U.setVisibleTo(elemId, colorsOrString)` — absolute audience; empty → `None`
- `U.showTo(elemId, color)` / `U.hideFrom(elemId, color)` — add/remove one color (errors if element has no `visibility` yet — unrestricted TTS default must be converted via `setVisibleTo` first)
- Change-guard: skip write if serialized union unchanged
- Shared panels: keep Lua-side audience sets; write full unions (don’t rely only on live `getAttribute`)

## Strategy 3 eligibility

**Share:** nestedless `refPanel_*`; Court **page** panels (page1/2/3 — concurrent viewers on different pages via per-page unions); coterie grid/popups when state allows; **scene-transition blindfold** (one random variant + cards for all); location dock (shared session location).

**Keep per-seat (divergent content/interaction):** map (pan/hover); roll controls; **hunger + condition overlays** (different per-PC art at once — keep FadeIn; Images are already per-seat); **camera dock** (left = other players only; right = self controls).

### Animation contract

`UI.show` / `UI.hide` fire XmlUI animations. For shared animated panels: set `visibility` audience first (while inactive), then `UI.show`. Do not keep ×5 copies solely to run per-seat fades when content is shared or the fade is dispensable. Where content already requires per-seat Images (hunger/conditions), keep overlay FadeIn.

Nav: XmlUI `(player, value, id)` → `getPlayerIDAndColor(player)`.

## Court budget (×5 seats)

| Slice | Current | After 1 Image / tracker square |
| --- | ---: | ---: |
| Page-1 `box_*` trackers | ~2375 | ~875 |
| Page-1 other (trait dots, div, nav, bg) | ~370 | ~370 |
| Page-2 domain/trait dots | ~300 | ~300 |
| Page-3 projects (scope/stake pips, etc.) | ~1490 | ~1490 |
| **Court total** | **~4535** | **~3035** |

Further: share Court pages (÷5); collapse pip rows to one Image per meter.

## Catalog — exclusive stacks (strategy 1)

| Family | Template / area | Est. save |
| --- | --- | ---: |
| Court tracker triples | `panel_right_sidebar_referenceLayer` | ~1500 |
| Location-dock district cards | `panel_overlay_location` | ~175 |
| Map district cards / highlights | `panel_map_core` | ~175 + ~155 |
| Blindfold variants | `panel_overlay_blindfold` | ~155 |
| Flat ref popups | referenceLayer | ~55 or share (strategy 3) |
| Hunger tiers | `panel_overlays` | ~25 |

## Catalog — chrome tint (strategy 2)

| Family | Est. save |
| --- | ---: |
| Map district-toggle chrome | ~360 |
| Map overlay-toggle chrome | ~180 |
| Right-sidebar chrome | ~150 |
| Coterie grid hover | ~80 |
| Map pan chrome | ~15 |

## Ballpark after all strategies

| Path | Global Images |
| --- | ---: |
| Today | ~7,435 |
| Aggressive (incl. pip meters + share) | ~1,500–1,800 |
| Without pip-meter collapse | ~2,000–2,500 |

Floor ~800+ while map / rolls / camera stay seat-local.

## Exemplars already in tree

- Location site card — `applySiteCardImageIfChanged` (`core/hud_player.ttslua`)
- Blindfold district/site cards — `core/hud_overlays.ttslua`
- Dice faces — `core/roll_ui.ttslua`
- Domain-claims divider — image swap on hover

## Implementation phases

0. This doc + DOCS_INDEX  
1. Audience helpers in `lib/util.ttslua`  
2. Migrate Global visibility writers onto helpers  
3. Sidebar chrome tint pilot  
4. Shared nestedless ref panels  
5. Shared Court pages + tracker collapse  
6. Remaining stacks/chrome / pip meters  
7. Recount + Save & Play + join Reload UI smoke  
