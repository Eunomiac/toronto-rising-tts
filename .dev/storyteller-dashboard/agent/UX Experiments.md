# Scenes UX experiments

## Agent Routing

Read this when:
- changing Storyteller Dashboard Scenes chrome, widgets, or picker layout (SD-9 and related)

Source of truth:
- live dashboard Scenes tab
- this log of what was tried

Verification:
- Playwright on `http://127.0.0.1:8788/` Scenes tab (do not steal OS focus)

Status: current

SD-9 asks for creative widgets instead of a stack of labeled rows. Later tasklist items should follow whatever layout is working here. If a later item fights a widget that already landed, skip that item and ask under the tasklist.

## Keep

- Toasts on the right, click to dismiss (SD-8).
- Group-move handles over parchment names; invisible until hover, then a blink, and they stay visible while the pointer is over them or while dragged (SD-3).
- One **Table B** chip; import still sends the family key `Table B` (SD-17).
- Three-column Scenes workspace: left group trays, cropped board, right widgets.
- game-icons.net SVGs (CC BY 3.0) in `public/icons/scenes/` — no emoji icons.
- Debug tools under the board: Debug toggle, Fill snaps (debug only), Clear Stage.
- Drawer tokens exist in one place. Seated NPCs who are also on the polar stage stay duplicated (Lexie case).
- Weather axes are independent (rain / snow / wind / thunder). Snow stays on the dashboard draft only; Copy JSON does not emit a `snow` field yet.
- Fog lives on the place widget (skybox seam smoke), not weather.
- Slot 1 of the seated row is centered at `u = 0.50` on the dashboard image. Crop now trims unused left parchment as well as the right, so the polar packs can be larger.

## Tried this pass

- **Place widget:** District / Site / Skybox as stacked rows with a small game-icon and a tooltip. Fog checkbox sits with them. Empty values stay muted placeholder text. Works well; keep.
- **Clock widget:** Two-line readout matching the in-game overlay rhythm (weekday date, then 12-hour time), with Now + sliders underneath.
- **Weather widget:** Rain cycles none → light → heavy. Wind cycles none → low → med → max (winter catalog keys in Nov–Feb or whenever snow is on). Thunder forces heavy rain and max wind. Snow cycles none → light → medium → heavy on the draft only.
- **Left trays:** One open group at a time. Tokens already on the board or in a seat disappear from the drawer. Parenthetical group names merge. Important groups sort to the top of their theme block. A grab handle on the right of each drawer header places that drawer’s remaining tokens onto the nearest polar pack, leader on the anchor snap.
- **Board crop:** Crop UV is now `u 0.165–0.835`, `v 0.05–0.875` (contain scale × 0.99). Far Right keeps a little padding; seated slots no longer force a left-side margin.
- **Family-first snaps:** Drop targeting picks the nearest polar *pack*, then the nearest snap inside it.
- **Ghost drag + FLIP:** Tokens are keyed by `data-token-id` (`polar:…` vs `seat:…`) so a seated copy does not tween onto the stage copy. Tray pickup recenters on the cursor. Drop scales down first, then a short bounce.
- **Names:** `0.75rem`, strong text-shadow, `overflow: visible`, plus a per-snap `translateX` map (`SNAP_NAME_TRANSLATE_X`) with a family-median heuristic until authored percentages land. Fill snaps (Debug mode) populates every polar snap for inspection.
- **Lit tokens:** Gold disc background and a defined `tr-token-glow` pulse.

## Rejected / not yet

- Keeping the Add NPCs modal or the old palette strip — trays are the source.
- Emitting `snow` on import JSON before Lua has a field.
- Changing the in-game CONTROL_BOARD seat-row Lua (`uMin`/`uMax`) — only the dashboard overlay was remapped to the new webp.
- Redesigning the board art itself (that is what the reticule is for).
