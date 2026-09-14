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
- Three-column Scenes workspace: left collection tabs + group trays, cropped board, right widgets.
- game-icons.net SVGs (CC BY 3.0) in `public/icons/scenes/` — no emoji icons.
- Debug tools under the board: Debug toggle, **Fill Stage** (Rashid on every polar snap and chair), **Fill and Lock** (same fill, then drag names instead of tokens; double-click a name to cycle left/center/right with green/yellow/cyan), **Get Name Offsets** (copies polar + seat `{ ox, oy, align }` JSON), **Restore PCs** (default five PCs on chairs, NPC chairs emptied), Clear Stage.
- Drawer tokens exist in one place. Seated NPCs who are also on the polar stage stay duplicated (Lexie case).
- Weather axes are independent (rain / snow / wind / thunder). Intensity is a **centered flex row** of adjacent icons, not a stacked overlap. Snow stays on the dashboard draft only; Copy JSON does not emit a `snow` field yet.
- Fog lives on the place widget (skybox seam smoke), not weather.
- Slot 1 of the seated row is centered at `u = 0.50` on the dashboard image. Crop now trims unused left parchment as well as the right, so the polar packs can be larger.
- Group theme colors: Camarilla gold, Anarch red, Sabbat deep purple, Independents grey, Hecata inverted grey, Werewolves brown, Aapilu deep blood red.
- Left rail tabs: Scenes / Main NPCs / Generic NPCs / Memoriam NPCs (Memoriam stays disabled until Memoriam scenes exist).

## Tried this pass

- **Place widget:** District / Site / Skybox as stacked rows with a small game-icon and a tooltip. Fog checkbox sits with them. Empty values stay muted placeholder text. Works well; keep.
- **Clock widget:** Two-line readout matching the in-game overlay rhythm (weekday date, then 12-hour time), with Now + sliders underneath.
- **Weather widget:** Rain cycles none → light → heavy. Wind cycles none → low → med → max (winter catalog keys in Nov–Feb or whenever snow is on). Thunder forces heavy rain and max wind. Snow cycles none → light → medium → heavy on the draft only. Matching icon counts sit in a centered flex row. Button fill ramps dark red → `#FF0000` by intensity. Winter wind uses a cyan **outline**, not a border.
- **Left trays:** One open group at a time. Tokens already on the board or in a seat disappear from the drawer. Parenthetical group names merge. Important groups sort to the top of their theme block. A grab handle on the right of each drawer header places that drawer’s remaining tokens onto the nearest polar pack, leader on the anchor snap. Double-click a drawer header to clear that group’s staged NPCs (seated copies restore like an off-board drop). Dragging a polar group-move handle off the board image clears that pack.
- **Board crop:** Crop UV is now `u 0.165–0.835`, `v 0.05–0.875` (contain scale × 0.99). Far Right keeps a little padding; seated slots no longer force a left-side margin.
- **Family-first snaps:** Drop targeting picks the nearest polar *pack*, then the nearest snap inside it. Polar UVs use the Lua recipe (ellipse, then radial stagger in **live STAGE_BOARD inches** from the save’s STAGE_BOARD Transform — not the 440×400 Lua fallback). Regenerating catalogs (`npm run scene-catalogs`, dashboard `dev`/`build`, or repo `dashboard:scene-catalogs`) re-reads that object. `validSnaps` drops unused rays; a pack whose center token is in the box keeps all five on-board members. Far packs have stagger 0, so they already matched the art.
- **Ghost drag + FLIP:** The held ghost vanishes as soon as the pointer is released. Tokens already on the board then tween from their old screen position to the new one. Tray pickup recenters on the cursor. Off-board means **outside the visible parchment** (the cropped wrap intersecting the board frame), including the hidden left and right crop margins — red clear cue, then drop clears the token or whole pack. A group drag that leaves the parchment does not snap onto a pack.
- **Names:** Pack-aware sides (left/right for the outer packs, above for Mid / Far Center, CENTER names to the sides so they miss the chairs). Per-snap overrides live in `SNAP_NAME_LAYOUT` / `SEAT_NAME_LAYOUT`. Fill Stage (Debug) puts Rashid on every polar snap and chair.
- **Lit tokens:** Gold disc plus a halo that pulses on the token (`inset: 0%`).
- **District picker:** Toronto map at 800×1000, no header bar or inner scroll; floating **X** on the image. Pins are invisible (zero-alpha text, still hit-sized), gold translucent fill on hover, gold border and no fill when selected. Click a pin to choose that district.
- **Family handles:** Stay visible while hovered; fade only after pointer leave. Double-click toggles the lead token’s light and copies that mode to the rest of the pack.
- **Occupied snaps:** Polar tokens swap in place. Seated tokens swap occupancy (each chair keeps its table slot). Polar onto an occupied seat sends the seat occupant to the origin snap.

## Rejected / not yet

- Keeping the Add NPCs modal or the old palette strip — trays are the source.
- Emitting `snow` on import JSON before Lua has a field.
- Changing the in-game CONTROL_BOARD seat-row Lua — the dashboard image is centered; the TTS board stays left-offset for its XML overlay buttons.
- A Clear Palette button — the palette strip is gone.
- Redesigning the board art itself (that is what the reticule is for).
