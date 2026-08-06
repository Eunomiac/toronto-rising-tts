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

Related: [Join-Load Inventory](../Multiplayer%20Functionality/Join-Load%20Inventory.md), [tts-xmlui-visibility-seat-assignment](../../docs/solutions/tts-xmlui-visibility-seat-assignment.md), [lua-ui-full-xml-policy](../../docs/solutions/lua-ui-full-xml-policy.md), TOR-439, TOR-375, **TOR-444**

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

### Strategy 2 ↔ 3 conflict (hover chrome)

One Image has one `color`. If that Image is shared and visible to `Red|Orange`, a hover tint for Red is also seen by Orange. Concurrent per-player hover/active feedback needs a choice:

| Option | Structure | Feedback mechanism |
| --- | --- | --- |
| **A** | Per-player containers (×5); **collapse** stacks → one Image each | Strategy **2** tint / asset swap |
| **B** | **Shared** container (×1); **keep** base/hover/active siblings | Strategy **3** — per-player `visibility` on hover/active layers (`active` union = who has that toggle on; `hover` = who is hovering) |

Cannot combine “shared single Image” + “per-player tint.”

**Locked rule of thumb (author + agent, 2026-08-03):**

- **A** when the container must stay seat-local for other reasons (pan, private layout, already-per-seat HUD chrome).
- **B** when we are sharing the container and still need concurrent hover/active (remount prefers one DOM tree).

Rough chrome Image count for ~54 map sidebar buttons (status quo ≈ 54×3×5 = **810**):

- **A:** 54×5 = **270** (still five sidebar trees)
- **B (locked for map sidebars):** 54×3 = **162** + one shared DOM — better remount than Image delta alone suggests

### `active` vs `visibility`

| Attribute | Meaning | Helpers |
| --- | --- | --- |
| `active` | Layout on/off (collapse) | `U.showXmlElement` / `U.hideXmlElement` |
| `visibility` | **Who** may see the element | `U.setVisibleTo` / `U.showTo` / `U.hideFrom` |

Do not conflate them. Hunger TOR-340 sticky-`active` under empty-seat `visibility` is a separate footgun.

### Audience API

- `U.setVisibleTo(elemId, colorsOrString)` — absolute audience; empty → `None`
- `U.setVisibleTo(elemId, colors)` — absolute audience replace. Empty → `None`. **Missing** live `visibility` (remount / unrestricted) is always rewritten, even when desired is `None` — otherwise empty-audience chrome (map `_active` / `_hover`) stays visible to everyone (TOR-462).
- `U.showTo(elemId, color)` / `U.hideFrom(elemId, color)` — add/remove one color; if `visibility` is missing (remount unread / TTS unrestricted), heal to `None` then mutate (do not use on truly unrestricted panels)
- Change-guard: skip write if serialized union unchanged
- Shared panels: keep Lua-side audience sets; write full unions (don’t rely only on live `getAttribute`). Court page spreads (`applyPrincesCourtPageVisibility` in `core/hud_player.ttslua`) are the canonical example — stale reads left page2 active so its next button showed on the last spread.

### Animation contract

`UI.show` / `UI.hide` fire XmlUI animations. For shared animated panels: set `visibility` audience first (while inactive), then `UI.show`. **Shared transition blindfold:** arm children (variant `image=` + optional district/site cards) **before** parent `UI.show`, then **re-arm after** — parent show re-applies XML defaults (`overlay_blindfold_1`, cards Clear). Canonical procedure: `ui/shared/panel_overlay_transition_blindfold.xml`. Same-frame `UI.getAttribute(..., "image")` can still report the XML default; delay or poll before asserting. Do not keep ×5 copies solely to run per-seat fades when content is shared or the fade is dispensable. Where content already requires per-seat Images (hunger/conditions), keep overlay FadeIn.

Nav: XmlUI `(player, value, id)` → `getPlayerIDAndColor(player)`.

## Strategy 3 eligibility

**Share:** nestedless `refPanel_*`; Court **page** panels (page1/2/3 — concurrent viewers on different pages via per-page unions); Court **coterie/domain/trait content** (`pc_p*_…`, `dot_on_chasse_*`, … — no seat suffix; `Coterie.reconcile*` writes shared ids); coterie grid/popups when state allows; **scene-transition blindfold** (one random variant + cards for all); location dock (shared session location); **map left/right sidebars (Option B)**.

**Keep per-seat (divergent content/interaction):** map **pan surface** + in-map overlays (see Map); roll controls; **hunger + condition overlays** (different per-PC art at once — keep FadeIn); **camera dock** (left = other players only; right = self controls); player HUD right-sidebar chrome (Phase 3 — Option **A**, container already seat-local).

### Map

Pan/`offsetXY` cannot differ per viewer on one Image → keep per-seat: map base, feature/domain overlays, pins, district highlight (collapsed), district card (collapsed; selection still per-player).

| Slice | Locked approach |
| --- | --- |
| District highlight / card exclusive stacks | Strategy **1** — one Image + `image=` **per seat** |
| Left overlay-toggle + right district-toggle sidebars | Option **B** — one shared tree; keep base/hover/active; per-player layer `visibility` |
| Pan nav chrome | Prefer **B** if lifted beside shared sidebars; else **A** if it remains inside per-seat map root |

Shared map sidebars (B): root audience = players with map open; each `_active` / `_hover` sibling’s `visibility` = the subset of those players in that chrome state. Overlay on/off and district hover stay in per-player `hud.map.*`; layer visibility encodes that for concurrent viewers.

**Chrome opacity:** shared `_hover` / `_active` Images must use opaque `hover_button_map_shared_layer` (`color="#FFFFFF"`). Do **not** reuse Defaults `hover_button_hover` / `hover_button_active` (`color="clear"`) — those are for per-seat pan/recenter tint-hide. Visibility alone cannot show a clear-tinted Image.

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
| --- | ---: | ---: |
| Court tracker triples | `panel_right_sidebar_referenceLayer` | ~1500 |
| Location-dock district cards | `panel_overlay_location` | ~175 |
| Map district cards / highlights | `panel_map_core` | **done** (~340→10) |
| Blindfold variants | `panel_overlay_blindfold` | ~155 (plus drop ×5 seat copies when shared) |
| Flat ref popups | referenceLayer | ~55 or share (strategy 3) |
| Hunger tiers | `panel_overlays` | **done** (~30→5) |

## Catalog — chrome

| Family | Approach | Est. note |
| --- | --- | --- |
| Map overlay + district sidebars | **B** (share + keep stacks) | **done** (~810→~162) |
| Map pan chrome | B if shared with sidebars; else A | ~15 |
| Right-sidebar HUD chrome | **A** (done Phase 3) | ~150 (triple → one ×5) |
| Coterie grid hover | A unless grid is shared | ~80 |

## Ballpark after all strategies

| Path | Global Images |
| --- | ---: |
| Today | ~7,435 |
| Aggressive (incl. pip meters + share) | ~1,500–1,800 |
| Without pip-meter collapse | ~2,000–2,500 |

Floor ~800+ while map **pan surface** / rolls / camera stay seat-local (map **sidebars** are shared under Option B).

## Exemplars already in tree

- Location site card — `applySiteCardImageIfChanged` (`core/hud_player.ttslua`)
- Blindfold district/site cards — `core/hud_overlays.ttslua`
- Dice faces — `core/roll_ui.ttslua`
- Domain-claims divider — image swap on hover
- Right-sidebar HUD tint — Phase 3 Option A (`core/hud_player.ttslua`)

## Implementation phases

0. This doc + DOCS_INDEX — **done**
1. Audience helpers in `lib/util.ttslua` — **done**
2. Migrate Global visibility writers onto helpers — **done**
3. Sidebar chrome tint pilot (Option A, seat-local HUD) — **done**
4. Shared nestedless ref panels — **done**
5. Shared Court + tracker collapse — **done** (pip meters: branch `tor-444-court-pip-meters`)
6. Shared transition blindfold — **done**; location dock — **done**; map district Strategy 1 — **done**; map sidebars Option B — **done**; hunger Strategy 1 — **done**; optional: location full share; pip meters on branch `tor-444-court-pip-meters`
7. Recount + Save & Play + join Reload UI smoke (extend TOR-444 remount playbook)

### Remount ballpark (Image tags in embedded Global)

| Checkpoint | ~Images | Embed size |
| --- | ---: | ---: |
| Start (TOR-444) | ~7,435 | ~1.83 MB |
| After nestedless share | ~7,216 | |
| After Court share + trackers | ~3,297 | ~1.14 MB |
| After shared blindfold + location collapse | ~2,958 | ~1.10 MB |
| After map district Strategy 1 | ~2,589 | ~1.06 MB |
| After map sidebars Option B | ~1,833 | ~0.93 MB |
| After hunger Strategy 1 | **~1,808** | **~0.93 MB** |
