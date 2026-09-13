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

SD-9 asks for creative widgets instead of a stack of labeled rows. Later tasklist items (SD-10–SD-19) should follow whatever layout is working here. If a later item fights a widget that already landed, skip that item and ask under the tasklist.

## Keep

- Toasts on the right, click to dismiss (SD-8).
- Group-move handles over parchment names; kept visible while positioning (SD-3).
- One **Table B** chip; import still sends the family key `Table B` (SD-17).
- Add NPCs modal stays open; tiles already on the board/palette turn gold (SD-10). This is a stopgap until left pop-out trays (SD-14) replace the modal.

## Next experiments

- Place / table / clock / weather / lighting as compact widgets, not a fourth chrome row.
- Left: group trays that open in place of the Add NPCs modal.
- Right: move leftover chrome off the top of the board.
- Token names, board crop, drop animation, and the targeting reticule after the chrome settles.
