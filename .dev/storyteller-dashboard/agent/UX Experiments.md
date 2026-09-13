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

## Tried this pass

- **Place widget:** District / Site / Skybox as stacked rows with a small icon and a tooltip. Empty values stay muted placeholder text. Works well; keep.
- **Clock widget:** Large time readout, a Now checkbox, then compact day/month/year sliders. Better than a fourth chrome row. The analog-clock idea was skipped — sliders are still the fastest way to set an exact chronicle time.
- **Weather widget:** Rain cycles none → light → heavy, Wind and Storm toggle, Fog and Lighting sit in the same card. Snow is disabled because the import catalog has no snow key. Rain+wind together still collapse to whichever catalog key is closest (there is no light-rain-and-wind row).
- **Left trays:** One open group at a time. Tokens already on the board show a gold ring and are not dragged from the tray. Replaces the Add NPCs modal.
- **Board crop:** The board image is about 2:1 and the middle column is closer to 5:4, so filling the height always clips either the table or the far packs. This pass **contains** UV `u 0–0.80`, `v 0.08–0.88` in the wrap (dark bars if needed) so the table and polar packs stay on screen together.
- **Family-first snaps:** Drop targeting picks the nearest polar *pack*, then the nearest snap inside it, so the six tight center packs steal less often from their neighbors.
- **Ghost drag + FLIP:** The original token stays faded; the dragged copy pulses on pickup and drop; after a valid drop, tokens tween from their old screen position to the new one (including swaps and group moves).

## Rejected / not yet

- Keeping the Add NPCs modal next to trays — redundant.
- Independent snow, or rain+wind combinations the catalog cannot represent.
- Redesigning the board art itself (that is what the reticule is for).
