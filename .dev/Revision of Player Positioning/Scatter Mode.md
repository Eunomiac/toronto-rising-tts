# Scatter Mode

This document is the full definition of Scatter Mode. It replaces any earlier Scatter, orbit, or join-cluster notes (including the Scatter sketch in `Revision of Player Positioning Proposal.md`).

The NPC stage and control board have two modes of operation:

- **Standard Mode:** The existing behavior, using the table and the existing PC/NPC snap-group families.
- **Scatter Mode:** A new mode for scenes in which the PCs are free to move around the game world and interact with different groups of NPCs. Instead of occupying a fixed PC group, each PC belongs to one of six spatially separated **scatter groups**.

Scatter Mode is a **table type** in `C.Tables["Scatter"]` with `shape = C.TableShapes.SCATTER` (the “no table” playfield). Entering or leaving it is a change-of-table transition (same class of work as switching `Table A` / `Table B` / `Table C`). Scene data names it with `tableKey: "Scatter"` (and may also set `placementMode: "scatter"` as a dashboard/import mirror). `C.Scatter` is a thin alias of that Tables row.

Nested-circle world layout and control-board hole parking stay in dedicated modules (`lib/scatter_layout.ttslua`, `core/scatter_mode.ttslua`) — they are the SCATTER shape backend, not circular/facing chair walking.

---

## General Changes

In **Scatter Mode**:

- There is no table.
- There are no thrones or chairs. `C.Tables["Scatter"].objectsToHide` (also available as `C.Scatter.objectsToHide`) lists objects (chairs, Prince signet and curtain, and anything else you add) that Scatter disables and hides from every player, including the Storyteller. Leaving Scatter restores their usual visibility.
- PCs are not positioned in a separate group of their own.
- Both PCs and NPCs are assigned to one of six **scatter groups** distributed around the game world.
- A PC can move from one scatter group to another during play.
- The Storyteller controls which PCs and NPCs belong to each scatter group, but does not directly control their exact world positions or orientations. Each scatter group calculates those from occupancy using the rules below.

Unlike Standard Mode, external control of PC/NPC positioning is therefore limited primarily to adding an occupant to a scatter group, removing an occupant from a scatter group, or transferring an occupant between scatter groups.

Hand zones, character sheets, bags, candles, seat lights, cameras, and any other seat objects **not** listed as hidden stay in play and move with their PC. The floor height (`y`) for Scatter layout is the **default in-use Y** of PC figurines (the same default location used when a figurine is on the table, not the `y = -200` hide override).

NPC occupancy per scatter group is **unlimited**. The four NPC seats in Standard Mode are a table-seating cap only; they do not apply here.

---

## Occupancy UI (Stage Control Board)

In Scatter Mode the Stage Control Board uses the art in `.dev/Revision of Player Positioning/Stage Control Board in Scatter Mode.jpg`.

- There are **no snap points** on the board in this mode.
- Tokens dropped onto a group are moved automatically into a free **board hole**: NPCs around that group’s outer ring, PCs in the inner cluster.
- A token’s place on the board records **which of the six groups** it occupies. It does **not** author the figurine’s exact game-world pose.

Each group’s inner cluster is **five** PC holes: a **gold** hole in the center of a square of **four white** holes. The first PC to join that group goes to the gold center (the same idea as world slot 3, the arc midpoint). Later PCs fill the white holes. That matches the five stable world PC slots; the board holes are occupancy UI, not a map of table-plane coordinates.

The outer ring has **twelve** NPC holes (`BOARD_NPC_HOLE_COUNT`). Game-world NPC occupancy is still unlimited: extra NPCs beyond the hole count remain in the group and still receive world positions. The board may stack those extras on the group (implementation detail at wiring time).

### Board-hole calibration

Token auto-place needs authored hole positions on the control board. Those are measured in-world, not guessed from the PNG.

`DEBUG.calibrateScatterGroup(scatterGroupNum)` records one group at a time. `scatterGroupNum` is `1`–`6`, where `1` is the first scatter group (world angle `270°`, negative X / far left, after the control board’s 180° yaw) and the rest follow clockwise (`330°`, `30°`, `90°`, `150°`, `210°`). An out-of-range number is an error.

**How to run it**

1. Put the board in Scatter Mode.
2. Clear other control tokens off the board (or leave none except the three below).
3. Place **three** PC or NPC control tokens on the group you are calibrating:
   - one on the **gold** center hole
   - one on the **white** hole to the **upper left** of the gold hole
   - one on the **NPC** hole at the **top** of that group’s dashed circle
4. From the TTS console: `lua DEBUG.calibrateScatterGroup(1)` (use the group you just dressed).

The function finds `pc_control_token` and `npc_control_token` objects that are actually above the stage control board (not tokens sitting on the palette). If it does not find **exactly three**, it broadcasts an error and stops.

It does not use token type or color to decide which hole is which. The three tokens are classified by geometry: the shortest of the three edges is gold–white, and of those two points the one farther from the remaining token is gold (the remaining token is the top NPC hole). After that:

| Role | Meaning |
| --- | --- |
| Gold | Center of the inner square (first PC hole / world slot 3) |
| Upper-left white | One corner of the inner square; the other three whites are inferred by 90° steps around gold |
| Top NPC | 12-o’clock hole on that group’s outer ring; the remaining NPC holes follow evenly around that circle |

Those three board-local positions (control-board `positionToLocal`) plus every inferred white and NPC hole are written as pasteable Lua to `.dev/.debug/debug_logs/scatter_group_<N>_calibration.lua`, same dump path as `DEBUG.dumpSeatRoleOffsets`. The same inferred holes are also installed as **debug snap points** on CONTROL_BOARD so you can turn on Snap mode and confirm they sit on the printed holes. Scatter play still has no snap points; leaving Scatter (or calibrating nothing) clears them. Do not paste a dump into `D.SCATTER_BOARD` until the snaps look right.

Auto-place uses the pasted dump as the measured anchors for that group: gold as the PC cluster origin, the upper-left white as one corner of the inner square, and the top NPC as the ring radius and 12-o’clock hole. Derived whites and NPC holes are stepped in **world XZ** (then converted back with `positionToLocal`) so they stay on the printed circles. CONTROL_BOARD is scaled **2:1** (X vs Z); rotating in board-local units would squash the ring into an ellipse.

Calibrate each of the six groups the same way. Re-run a group if the art or board transform changes.

---

## Constants

All numeric Scatter parameters are **global constants** on `C.Tables["Scatter"]` in `lib/constants.ttslua` (`shape = C.TableShapes.SCATTER`). They are not per-group and not per-scene. Shared table keys use the same names as other tables (`centerPoint`, `objectPositions`). Scatter-only geometry keys keep their existing names. Initial values below are educated guesses for first in-world testing; they are expected to change. (`C.Scatter` is an alias of this row.)

| Constant | Initial guess | Role |
| --- | --- | --- |
| `centerPoint` | `{0,0,0}` | Scatter playfield origin (same key as other `C.Tables` rows). Floor, plinth, rain emitter, and STAGE_BOARD X/Z move here on enter. |
| `STAGE_BOARD_HOME_XZ` | `{0, 62.0977}` | Workshop home for STAGE_BOARD (it does not follow tables). Restored on leave; Y is left alone. |
| `GROUP_COUNT` | `6` | Number of scatter groups. |
| `BOARD_NPC_HOLE_COUNT` | `12` | NPC holes on each group’s dashed ring on the control board. |
| `FIRST_GROUP_AZIMUTH_DEG` | `270` | World angle of group 1 (−X / far left after the board’s 180° yaw). Remaining groups step clockwise by `GROUP_SPACING_DEG`. |
| `GROUP_SPACING_DEG` | `60` | Angle between adjacent scatter groups. |
| `SCATTER_RADIUS_WORLD` | `300` | Distance from World Origin to each scatter-group origin. |
| `SCATTER_RADIUS_NPC` | `22` | NPC standing radius around the group origin. |
| `SCATTER_RADIUS_PC` | `14` | PC standing radius around `PC_SCATTER_GROUP_ORIGIN`. |
| `PC_SCATTER_POSITION_ANGLE` | `180` | Matches the geometry diagram: PCs on the near side of the NPC circle. |
| `NPC_DEPLOYMENT_ARC` | `70` | Angular width of the NPC placement fan. |
| `PC_DEPLOYMENT_ARC` | `80` | Angular width of the five PC slots; meant to hold five figurines on `SCATTER_RADIUS_PC` without stacking. |
| `NPC_SPACING_MIN` | `10` | Tightest allowed angular gap between adjacent NPCs in a group (~3.8 units of chord at the guessed NPC radius). |
| `NPC_SPACING_MAX` | `22` | Widest allowed angular gap; fewer NPCs cluster near the arc midpoint instead of stretching across the whole fan. |
| `ST_DICE_TRAY_YAW_OFFSET_DEG` | `0` | Extra yaw added to the group World Ray when posing the storyteller dice tray. On/off Y uses homeland `DICE_DRAWER_STORYTELLER_*` poses (−200 off). |
| `objectsToHide` | chairs + Prince signet/curtain | GUIDs to disable and hide from every player layer while Scatter is active. |
| `TOKEN_SCALE` | `{0.5, 1, 0.5}` | Control tokens on scatter group holes; palette parking restores polar `{0.2, 1, 0.2}`. |
| `objectPositions` | lights / floor / plinth / STAGE_BOARD | Same shared table key as wood tables; applied on enter. |

This row has **no** wood-table `guid`, `activePosition`, or chair maps.

Do not add extra “this arrangement looks wrong” guards. If a chosen constant set produces a bizarre layout, correct the constants. The only hard stop is math that cannot run (a zero-length direction, i.e. a true divide-by-zero / `normalize` of a zero vector). In that case broadcast a non-stopping error and skip that pose rather than crashing.

---

## Geometric Terminology & Conventions

For the definitions below:

- **World Origin** is `C.Tables["Scatter"].centerPoint` on the table plane (default `{0, 0}` in X/Z). Height `y` is not part of this 2D origin; figurines use the default PC figurine Y.
- **World Circle** is an imaginary circle centered on the World Origin with radius `SCATTER_RADIUS_WORLD`.
- Each scatter group has a **Scatter Group Origin**, which lies on the World Circle.
- A **World Ray** is a ray beginning at the World Origin and passing through a specified world-space point. Unless otherwise specified, "the World Ray" of a scatter group means the World Ray passing through that group's `SCATTER_GROUP_ORIGIN`.
- Angles follow existing project helpers (`U.rotateAroundPoint` and the circular-table azimuth): **`0°` = +Z**, **`90°` = +X**, **`180°` = −Z**, **`270°` / `−90°` = −X**, and positive angles increase **clockwise** when viewed from above.

Where this document refers to the **far side** of a circle, it means the side farther from the World Origin. The **near side** is the side closer to the World Origin.

Refer to `.dev/Revision of Player Positioning/Scatter Mode Geometry.jpg` for the nested circles, rays, and arcs.

---

## Scatter Groups

A scatter group is a region in the game world defined by the following values and derived geometry.

### 1. `SCATTER_GROUP_ORIGIN`

A 2D point (`x`, `z`) defining the center of the scatter group.

This is distinct from the **World Origin**, which is always `{0, 0}`.

The six `SCATTER_GROUP_ORIGIN` points lie on the World Circle and are spaced evenly around it at `60°` intervals.

The first scatter group sits on the **negative X-axis** (far left), matching the control board’s 180° yaw. In project angles that is **`270°`**. Subsequent groups increase clockwise by `60°`:

- Group 1: `270°` (−X, far left)
- Group 2: `330°`
- Group 3: `30°`
- Group 4: `90°` (+X, far right)
- Group 5: `150°`
- Group 6: `210°`

Every `SCATTER_GROUP_ORIGIN` is exactly `SCATTER_RADIUS_WORLD` units from the World Origin.

---

### 2. `SCATTER_RADIUS_NPC`

A float defining the radius of the **NPC Scatter Circle**, which is centered on `SCATTER_GROUP_ORIGIN`.

NPC figurines belonging to the scatter group are positioned along a configurable arc of this circle.

---

### 3. `PC_SCATTER_POSITION_ANGLE`

An angle defining the position of `PC_SCATTER_GROUP_ORIGIN` around the NPC Scatter Circle.

Its `0°` reference is the **far intersection** of the NPC Scatter Circle with the scatter group's World Ray. This zero is **local to that circle**; it is not world `0°` = +Z.

Therefore:

- At `0°`, `PC_SCATTER_GROUP_ORIGIN` lies at the point on the NPC Scatter Circle farthest from the World Origin.
- Increasing the angle moves `PC_SCATTER_GROUP_ORIGIN` clockwise around the NPC Scatter Circle.
- At `180°`, `PC_SCATTER_GROUP_ORIGIN` lies at the point on the NPC Scatter Circle nearest the World Origin.

Conceptually, if:

- `W` = World Origin
- `G` = `SCATTER_GROUP_ORIGIN`
- `Rnpc` = `SCATTER_RADIUS_NPC`
- `θ` = `PC_SCATTER_POSITION_ANGLE`

then the `0°` reference direction is:

    normalize(G - W)

and the position can be expressed conceptually as:

    PC_SCATTER_GROUP_ORIGIN =
        G + rotateClockwise(
            normalize(G - W) * Rnpc,
            θ
        )

Implementation should call the project’s existing angle helpers with **world** azimuths (`azimuth(G) + θ` in the 0° = +Z convention), not a second polar system.

---

### 4. `SCATTER_RADIUS_PC`

A float defining the radius of the **PC Scatter Circle**, which is centered on `PC_SCATTER_GROUP_ORIGIN`.

PC figurines belonging to the scatter group are positioned along a configurable arc of this circle.

---

### 5. `NPC_DEPLOYMENT_ARC`

The angular span, in degrees, of the portion of the NPC Scatter Circle available for NPC placement.

The **angular midpoint** of this arc is `PC_SCATTER_GROUP_ORIGIN`.

Because `PC_SCATTER_GROUP_ORIGIN` lies on the NPC Scatter Circle, it directly identifies the midpoint of the NPC Deployment Arc.

For example, if:

    NPC_DEPLOYMENT_ARC = 60°

then the available NPC placement arc extends `30°` clockwise and `30°` counterclockwise from `PC_SCATTER_GROUP_ORIGIN` around the NPC Scatter Circle.

Exact packing (one tight row vs a second raised row vs a hard cap) will be decided after seeing figurines in-world. Until then, NPC spacing uses `NPC_SPACING_MIN` and `NPC_SPACING_MAX` as specified under NPC positioning.

---

### 6. `PC_DEPLOYMENT_ARC`

The angular span, in degrees, of the portion of the PC Scatter Circle available for PC placement.

The angular midpoint of this arc is the **far intersection of the PC Scatter Circle with the World Ray through `PC_SCATTER_GROUP_ORIGIN`**.

In other words:

1. Construct a World Ray beginning at the World Origin and passing through `PC_SCATTER_GROUP_ORIGIN`.
2. Find where that ray exits the PC Scatter Circle on the side farther from the World Origin.
3. Use that point as the midpoint of the PC Deployment Arc.

Conceptually, if:

- `W` = World Origin
- `P` = `PC_SCATTER_GROUP_ORIGIN`
- `Rpc` = `SCATTER_RADIUS_PC`

then this midpoint is:

    PC_DEPLOYMENT_ARC_MIDPOINT =
        P + normalize(P - W) * Rpc

If `P` coincides with `W`, that formula cannot run; broadcast a non-stopping error and skip the pose.

For example, if:

    PC_DEPLOYMENT_ARC = 60°

then the available PC placement arc extends `30°` clockwise and `30°` counterclockwise from this midpoint around the PC Scatter Circle.

This arc must be wide enough to hold **five** fixed PC slots. Occupied PCs are **not** reflowed when another PC joins or leaves.

---

## Scatter Group Positioning

The six scatter groups occupy the six fixed world angles listed above (`90° + i × 60°` for `i` in `0–5`, wrapping into `0–360`).

    SCATTER_GROUP_ORIGIN =
        pointOnCircle(
            center = World Origin,
            radius = SCATTER_RADIUS_WORLD,
            angle = 90 + i * 60
        )

`pointOnCircle()` is the existing helper convention (`0°` = +Z, `90°` = +X, clockwise).

---

## Scatter Group Occupant Positioning

The Storyteller does not place individual figurines.

**NPCs** in a group are re-spaced whenever that group’s NPC occupancy changes (add, remove, or transfer).

**PCs** in a group are **not** re-spaced when another PC joins or leaves. Each PC keeps the world slot they were given until they leave that group.

Transferring an occupant updates both groups: the destination assigns a pose by the rules for that occupant type; the source frees that occupant and, for NPCs only, re-spaces whoever remains.

Scatter Mode computes each occupant’s **reference figurine pose** (position on the correct arc, yaw from the orientation rule below). Existing helpers that hang cameras, lights, and other seat objects off a figurine pose should keep doing that. Scatter does **not** reuse Standard Mode’s circular **table-slot** walk (`numSegments` / `angleSegmentOne` / numbered chairs). Those functions answer a different question.

---

### PC Positioning

#### PC Position

Each scatter group has **five** stable world slots on the `PC_DEPLOYMENT_ARC` of the PC Scatter Circle, whether or not they are occupied.

The relevant positioning geometry is:

- **Circle center:** `PC_SCATTER_GROUP_ORIGIN`
- **Circle radius:** `SCATTER_RADIUS_PC`
- **Arc size:** `PC_DEPLOYMENT_ARC`
- **Arc midpoint:** the intersection of the PC Scatter Circle with the World Ray through `PC_SCATTER_GROUP_ORIGIN` that lies **far from World Origin** (on the scatter-group side of `P`, not the World-Origin side). Slot 3 (gold) sits here; the arc faces inward toward `P`.

Slots are numbered `1–5` from the counterclockwise end of the arc to the clockwise end. Slot 3 sits on the midpoint. Adjacent slots are spaced by `PC_DEPLOYMENT_ARC / 4` so the five slots use the full arc including both endpoints.

When a PC **joins** a group, they take the **unoccupied** slot with the smallest angular distance to the midpoint. The first PC therefore always receives slot 3 (on the board, the gold center hole). If two later slots tie, use the lower slot number (the counterclockwise side of the tie). When a PC **leaves**, that slot becomes free; the other PCs in the group **stay put**.

Empty groups, PC-only groups, and putting all five PCs in one group are all allowed.

#### PC Rotation / Orientation

Every PC faces **`PC_SCATTER_GROUP_ORIGIN`**, regardless of which of the five slots they occupy.

For a PC at world-space position `Q`, facing is:

    PC_SCATTER_GROUP_ORIGIN - Q

Cameras and other seat objects whose rotation depends on the figurine use this same facing.

That makes the PC cluster a small inward-facing arc around `P`. Rotating `PC_SCATTER_POSITION_ANGLE` moves that whole cluster around the NPC circle **without** changing how the five PCs sit or look relative to each other. (How that cluster lines up with NPC facing still depends on `PC_SCATTER_POSITION_ANGLE`, because NPCs face the scatter-group origin, not `P`.)

---

### NPC Positioning

NPC occupancy per group is unlimited. How tightly a large crowd can pack, whether a second raised arc is needed, or whether a later cap is worth it, is deferred until the MIN/MAX row is visible in-world.

#### NPC Position

NPCs in a group are placed on the `NPC_DEPLOYMENT_ARC` of the NPC Scatter Circle.

The relevant positioning geometry is:

- **Circle center:** `SCATTER_GROUP_ORIGIN`
- **Circle radius:** `SCATTER_RADIUS_NPC`
- **Arc size:** `NPC_DEPLOYMENT_ARC`
- **Arc midpoint:** `PC_SCATTER_GROUP_ORIGIN`

**Initial spacing rule** (subject to experiment):

- `n = 0`: nothing to place.
- `n = 1`: that NPC occupies the midpoint.
- `n ≥ 2`: unclamped spacing is `NPC_DEPLOYMENT_ARC / (n − 1)` (evenly, including endpoints, centered on the midpoint).
  - If that value is **greater** than `NPC_SPACING_MAX`, use `NPC_SPACING_MAX` (cluster around the midpoint; do not stretch across the whole arc).
  - If that value is **less** than `NPC_SPACING_MIN`, use `NPC_SPACING_MIN` (the line will run past the deployment arc) and **broadcast a non-stopping error**.
  - Otherwise use the unclamped value.

NPC-only groups and empty groups are allowed.

#### NPC Rotation / Orientation

Every NPC faces **outward** — away from `SCATTER_GROUP_ORIGIN` / World Origin (backs toward the PC cluster).

Implementation: compute look-at toward `SCATTER_GROUP_ORIGIN`, then add **180°** yaw so the mesh faces the opposite way.

Associated NPC lights stay locked to their figurine. Because Standard Mode light offsets use world-origin “inward,” Scatter rotates each light’s XZ position **180° around the figurine** after resolve so the NPC + light stay a rigid body when the figurine is flipped.

### Storyteller dice tray

While Scatter is active, each Storyteller dice tray sits on that scatter group’s **World Ray**, at the midpoint between:

- the **NPC deployment-arc midpoint** (`PC_SCATTER_GROUP_ORIGIN`)
- the **PC deployment-arc midpoint** (far intersection of the PC circle with that same ray)

Yaw around Y is the same as that World Ray (`groupAzimuthDeg`, plus `ST_DICE_TRAY_YAW_OFFSET_DEG` if you ever need a mesh correction).

When the Storyteller starts a Storyteller roll, that roll’s tray moves to the scatter group that currently contains the NPC who started it (orbit occupancy, or a PC portraying that NPC). If that NPC is not on the stage, the tray appears at World Origin with yaw `0`.

Scatter still has only three Storyteller trays, and **only one uncleared Storyteller roll per scatter group** (off-stage rolls share the origin bucket):

- Starting a roll in a group that already has one **clears and replaces** that group’s roll immediately.
- Starting a roll in a group with no roll, when all three trays are already used at other groups, **clears the oldest** of those three and reuses that tray.
- Table Mode still refuses a new roll when no tray is free. Scatter does not.

Code: `ScatterLayout.storytellerTrayPose`, `STD.openForSlot` with `scatterGroupIndex`, `STR.initiateNpcRoll`.
