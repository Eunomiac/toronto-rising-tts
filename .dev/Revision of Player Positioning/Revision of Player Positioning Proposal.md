# Revision of Player Positioning Proposal

## Overview

I'd like to greatly simplify, and increase the flexibility of, the process by which we position player, NPC, and other objects around tables.

### Current Behavior

When a scene picks a table, `R.resolveSeatObjectsFromTable` in `lib/rotational-seat-layout.ttslua` lays out every seat and its satellite objects. It reads that table’s entry in `C.Tables` plus the default `C.TableSourceObjects` list. Empty NPC chairs are left out of the pass: the map is filtered to the five player colors plus whichever NPC slots are currently occupied.

#### How the reference position is defined

Every `C.Tables` entry has a **center** (`centerPoint`) and a **reference hand** (`referenceHand`): an authored world pose for the hand-zone at the reference seat (position plus rotation; rotation is usually zero). It also has `referenceSeatSegment`, which names which clock slot that hand belongs to. The code looks that segment up in `seatToPositionMap` to find the seat key — in every current table that is **Red**.

Before any other seat is moved, the live Red hand zone is snapped to that table’s `referenceHand.position`, and every object tagged `RedObject` is translated by the same delta. That puts the “template” rig on the destination table first.

The **radius** of a circular table is the horizontal distance from `centerPoint` to `referenceHand.position`. The reference seat is then pinned onto its segment ray at that radius (so a slightly off-axis authored hand still lands on the geometric slot). Height (`y`) and facing come from `referenceHand`.

Circular tables also store `numSegments` and `angleSegmentOne` (degrees; `0` is +Z / “12 o’clock”, increasing clockwise when viewed from above). Facing tables (Table C) do not use those fields; their `referenceSeatSegment` is `{ side, index }` instead of a single clock number.

`"Table B"` is not itself a `C.Tables` row. It is a family key that resolves to `Table B0`…`Table B4` from the highest occupied NPC slot. Each variant has its own center, segment count, seat map, and `referenceHand`.

#### How the other seat positions are determined

`seatToPositionMap` assigns every player color and NPC slot a place on that table. Player seats always participate. NPC seats only participate when occupied.

On a **circular** table the place is a segment index `1..numSegments`. The yaw from Red to that seat is the difference between the two segments’ clock angles (`angleSegmentOne + (index - 1) * 360 / numSegments`). The hand is rotated around `centerPoint` by that yaw, then shifted in XZ so it sits on the target segment’s ray at the same radius as Red.

On a **facing** table (Table C) the place is `{ side, index }`. `side` is the outward azimuth of the edge (`0` = +Z, `180` = −Z). Seats on the same side as Red get `0°` extra yaw; seats on the opposite side get `180°`. After that yaw, the seat is slid along X to the center of its slot on the live table’s bounding box. Index `1` is clockwise from the origin along that edge. Facing is copied from Red’s authored facing (straight inward), not aimed at the table center.

That computed pose is the **hand-zone anchor** for the seat:

- **Player seats** have a real TTS hand zone, which is moved to that pose (cards sitting in the zone move with it).
- **NPC seats** have no hand zone. The same pose is stored as a virtual anchor on `gameState.seatLayout.virtualHandZoneAnchors`.

The same yaw-plus-shift is later reused for cameras and for copying satellite objects, so chairs, lights, and cameras stay locked to their hand.

#### How `C.TableSourceObjects` positions are derived

`C.TableSourceObjects` is the default inventory of satellite objects. The live apply path does **not** walk those lists as a spawn catalog. It finds objects already in the save by seat tag (`RedObject`, `BrownObject`, `NPC1Object`, …) and GM Notes role (`SEAT_CHAIR`, `CSHEET_PAGE_1`, …). The lists still describe **which role families belong where**, and they are what the older generator used. `relative` is still consulted directly.

**`player`** — roles that exist only at the five player seats: character-sheet stack, dice bags, signal candle/fire, hunger smoke, player-only lights, compulsion deck, and so on. They are copied from Red’s live pose onto Brown / Orange / Pink / Purple using the same yaw-plus-shift as that seat’s hand. They are not copied onto NPC seats (those seats simply do not have matching tagged objects). Two roles keep their **own Y** instead of Red’s Y, because Y is used as on/off state: character-sheet pages and the signal fire.

**`all`** — roles that exist at every occupied seat, player and NPC: throne (`SEAT_CHAIR`), figurine (`SEAT_FIGURE`), the two seat lights, and the dice-drawer on/off anchors. Same copy-from-Red math. NPC chairs and lights therefore inherit Red’s relative offset to the hand, then get the tweaks below.

The API also allows an **`other`** list (NPC-only roles). The default `C.TableSourceObjects` does not use it; NPC-only pieces live under `all` and are simply absent as tagged objects at player seats, or vice versa.

**`relative`** — one-off objects that **follow their own seat’s hand**, rather than being copied as a Red role family. Examples: Prince signet/curtain on Red, Pink tarot deck and drawer, per-color selected compulsion cards, companion tokens, Purple’s oblivrouse bag. When that seat’s hand moves, each listed object tagged for that seat is rigid-followed (same translation and yaw as the hand). These GUIDs are skipped during the copy-from-Red pass so they are not overwritten by Red’s template pose.

Placement order for a table switch:

1. Snap Red’s hand (and `RedObject` rig) to this table’s `referenceHand`.
2. Compute every occupied seat’s hand-zone anchor from the segment map.
3. Move Red’s hand to that computed pose; every non-`relative` `RedObject` rigid-follows the hand.
4. For each other player seat: move the hand zone, copy each role from Red, then rigid-follow that seat’s `relative` objects.
5. For each occupied NPC seat: store the virtual hand, then copy matching roles from Red.
6. Apply **`postCorrections`**.
7. Apply per-table `C.Tables[*].objectPositions` (main lights and Storyteller dice drawers — not seat satellites).

**`postCorrections`** are per-GUID patches after the copy. They can set absolute **Y**, add a **rotation** on top of the hand-zone facing (`anchor` = a player hand-zone GUID, or `anchorSeatKey` for a player or NPC virtual hand), and optionally patch **scale**. Today they exist mainly for thrones: Brown / Orange / Pink / NPC chairs get `rotationDelta` yaw `180°` plus a Y drop; Purple’s chair is Y-only.

On the production path, player-seat post-corrections are skipped **except** for those PC thrones. NPC throne rows still always run.

**`postCorrectionsBySeatRole`** is the same idea keyed by seat + role instead of GUID (used for `SEAT_FIGURE` Y on Brown, Purple, and NPC1–4). On the production path, player-seat rows here are skipped; NPC figurine Y still applies.

### New Behavior

The redesign splits two things the current system glues together:

1. **Geometry** — where numbered table slots exist in the world (still authored per table in `C.Tables`).
2. **Occupancy** — which character rig (Red, Orange, NPC1, …) sits in which numbered slot (stored in game state / the scene library, not hardcoded on the table).

Layout then always does the same three steps: decide who is in play, put each of them in a numbered slot, move that slot’s **figurine** (or a virtual figurine pose), then hang every other object off that figurine.

#### Occupied vs unoccupied

An **occupant** is still a rig identity: one of the five player colors, or `NPC1`…`NPC4`. That identity stays on the objects (`RedObject`, `SEAT_CHAIR_RED`, and so on). What changes is that an occupant is no longer welded to a particular place on a particular table.

- **Player colors in session** — have a full satellite pile (sheet, bags, candle, …) and occupy whichever numbered slot the scene assigns. Lighting / `isPresent` still means “narratively at the table” (a dark occupied seat is still in a slot).
- **Player colors absent from session** — a player who could not make the session occupies **no slot**. Their pile is not laid out around the table (stashed like an unused NPC pile). The remaining players and NPCs may use any slots, including 1–4. This is distinct from `isPresent = false` on a seat that is still assigned.
- **NPC occupants** — only those with a character assigned (`occupiedNPCSlots` / scene `seatSlots`) take a numbered slot. Empty NPC identities are omitted, same idea as today.
- **Inactive / staged NPCs** — may keep their assigned slot (homeland) without a live figurine on the table, same as today’s stage-board retain-seat behavior. The layout still computes where that figurine *would* stand, and parks or hides the rest of the pile as it does now.

“Unoccupied” means **this numbered slot has nobody in it**. Slot 1 can be empty. Red can sit in slot 6. An absent player is not an unoccupied slot — they are not in the slot map at all.

#### Numbered table slots (geometry vs who sits there)

Each table (and Scatter — see below) exposes numbered **slots** `1..N`. Slot **1 is always the reference slot**. `C.Tables` stores:

- `centerPoint` (the origin the slots rotate around)
- `referenceFigurine` — authored world pose of a figurine standing in slot 1 (replaces `referenceHand`)
- `referenceSeatSegment` — always the geometric index of slot 1 (no longer “whichever segment Red happens to use”)
- circular tables: `numSegments` and `angleSegmentOne`, as today
- facing tables: two independent left/right fans (slots 1–5 on the near side, 6–10 on the far side)

Slots **2, 3, 4, …** are not listed per color. On a **circular** table they are generated from slot 1 by walking **right, left, right, left** along the rim:

| Slot | Place relative to slot 1 |
| --- | --- |
| 1 | Reference figurine |
| 2 | Immediately to the **right** of 1 |
| 3 | Immediately to the **left** of 1 |
| 4 | Immediately to the right of 2 |
| 5 | Immediately to the left of 3 |
| … | Keep alternating, nearer neighbor on the favored side first |

**Right / left** are from the **figurine’s** point of view, standing in that slot and facing the origin. At every current table that matches today’s seating: **Orange is on Red’s right, Pink is on Red’s left.** The default map (`Red=1`, `Orange=2`, `Pink=3`) therefore does **not** swap colors. (The earlier draft had this backwards.)

On a **facing** table, slots **1–5** use that same fan on the near side (slot 1 center). Slots **6–10** are a second fan on the opposite side: slot 6 is the center seat across from slot 1, slot 7 to 6’s right, slot 8 to 6’s left, and so on. Slot 6 is the facing counterpart of slot 1, not “the next seat after 5 along one spiral.”

There are **no player-only or NPC-only slots** in the geometry. NPC2 can sit in slot 1; Red can sit in slot 7. The old `seatToPositionMap` (`Red = 11`, `NPC1 = 8`, …) goes away as occupancy data.

**Who occupies which slot** lives in state, authored by the scene library (and overridable live). Default:

```text
Red=1, Orange=2, Pink=3, Brown=4, Purple=5,
NPC1=6, NPC2=7, NPC3=8, NPC4=9
```

That is occupant → slot. Field names, validation, Table B mapping, and the absent toggle are in **Phase 1 contract** below.

**Table structure** (which Table B variant is active; which Table A leaves are extended) follows the **highest occupied slot number**, not NPC identity and not “how many people are sitting.” If slot 9 is occupied, use the table that *has* a slot 9, even if slots 1–8 are empty; extend every Table A leaf up through slot 9 so the wood has no holes. Empty slots do not get an occupant pile (no empty Red chair sitting in a hole), but the table geometry still includes them.

Physical tables **do not re-space** when someone leaves a slot. Table A stays a packed forward arc whose spacing is the table’s segment size. Table B stays a full ring whose segment count is the highest slot. Only Scatter (later) re-spaces around whoever is actually present.

#### Figurine as the shared anchor

Every occupant has a figurine (`SEAT_FIGURE` for PCs; the pooled cutout for seated NPCs). Hand zones do **not**. Using the figurine as the layout origin means player and NPC seats share one code path.

On apply:

1. Compute each **occupied slot’s figurine pose** from `centerPoint` + `referenceFigurine` + that slot’s left/right offset (circular yaw-and-radius, or Scatter equal spacing, or a facing-table slot coordinate).
2. If the occupant has a live figurine, move it there. If they do not (inactive NPC, figurine on stage), store that pose as a **virtual figurine** — the NPC analogue of today’s virtual hand zone.
3. Place every other object for that occupant using **XZ and yaw relative to the figurine**, and that role’s **default absolute Y**. If the object is currently deactivated (hidden page, unlit fire, unused smoke, …), keep the **deactivation override** `y = -200` instead of snapping it back to the default.

Player **hand zones still exist** and still carry cards. They simply become another satellite: “this far in front of the figurine, this yaw relative to it,” not the thing everything else is copied from. Cameras, seat lights, sheets, bags, and thrones use the same rule.

Stored **Y is the default location** (where the object sits when it is in use). Sending an object to `y = -200` is a **deactivation override**, not a second layout pose. Layout applies default Y for active objects and must not copy another occupant’s override. Hidden sheet pages and an unlit signal fire are the usual cases; hunger smoke already uses the same override.

#### Satellite offsets should be data, not a live copy

The current system copies live Red objects, then patches chairs with `postCorrections`. That is why slot 1 “must” be a player with a complete pile, and why Brown’s throne Y leaks into a special-case table.

The new rule: **one authored offset table** per role, shared by every occupant that has that role:

- **XZ and yaw** — local to the figurine (so they travel correctly when the figurine turns around the table).
- **Y** — **absolute world height**, the **default location** for that role (table-height, not “this many units above this cutout”). `y = -200` is never stored as the default; it is only the live **deactivation override**.

- Shared roles (chair, seat lights, dice-drawer anchors) — one offset, used at every occupied slot.
- Player-only roles (sheet stack, hunger bags, signal candle, …) — same offsets, applied only to player occupants.
- One-off followers (Pink tarot, Prince signet, selected compulsion cards, companion tokens) — still listed per occupant, but they **follow that occupant’s figurine**, not a hand zone.

Because the offsets live in data, **slot 1 does not need to be occupied**, and the occupant in slot 1 does not need to be a player. We do not copy from a live occupant.

Authoring aid: `DEBUG.dumpSeatRoleOffsets(color)` reads that color’s live figurine, then writes every `{color}Object`-tagged object in pasteable form: **local XZ and rotation** relative to the figurine, plus the object’s **current absolute Y**. Run it on **any** player color (and later NPC occupants if needed). Red is the usual source for **shared** and **player** roles; Pink, Purple, Brown, etc. are for **`extraByOccupant`** pieces that only exist at that seat (tarot, companion tokens, Oblivion-Rouse bag, Prince signet, …). Capture a seat that already looks correct (after today’s post-corrections). Deactivated objects will dump `y = -200`; those rows are edited by hand to the default (in-use) height. The dump does not special-case or omit them.

`postCorrections` / `postCorrectionsBySeatRole` should shrink to nothing, or to a tiny authored exception list, once chair and figurine offsets are correct relative to `referenceFigurine`. If a throne mesh is authored 180° off, fix that mesh or put 180° in that role’s offset — do not keep per-GUID patches.

Per-table `objectPositions` (main lights, Storyteller dice drawers) stay outside this system: they are not seat satellites.

#### Object identity — what to prune

We should drop duplication, not the ability to find objects.

| Mechanism | Keep? | Why |
| --- | --- | --- |
| `G.GUIDS` for unique workshop pieces (Red chair, Brown hand zone, …) | **Yes** | Stable, already the source of truth for those objects. |
| `{seatKey}Object` tags | **Yes, for now** | Cheap “everything belonging to this occupant” queries (layout, hide empty NPC piles, lighting). Pooled NPC figurines change assignment at runtime; they are not a single GUID forever. |
| GM Notes `ROLE_SUFFIX` | **Probably yes, but only as role identity** | Needed for pooled / duplicated pieces that share a role (`SEAT_FIGURE`, page 3) without a dedicated GUID. The **suffix** is redundant if the tag already names the occupant — role prefix is the useful part. |
| Walking `C.TableSourceObjects.player` / `all` as a spawn list | **No** | Already unused by the live apply path. Replace with the offset tables above plus “player-only vs shared” flags. |
| Copy-from-Red + `relative` GUID skip list | **No** | Followers are just occupant-scoped offsets. |
| Name / Nickname as role identity | **No** | Already abandoned; do not bring it back. |

Recommendation: **GUID when the object is unique and registered; tag + role when it is pooled or one of a family.** Do not require all three of GUID, tag, and GM Notes to agree on every piece.

#### Phase 1 contract (concrete names and rules)

Scatter, orbit, and join are **not** in this phase. Phase 1 is: capture offsets from the **current** layout, then switch occupancy + figurine-anchor layout on real tables.

**`C.Tables` (geometry only)**

| Field | Role |
| --- | --- |
| `centerPoint` | Unchanged. |
| `shape` | `circular` or `facing`. |
| `referenceFigurine` | `{ position, rotation }` of a figurine standing in **slot 1**. Replaces `referenceHand`. |
| `referenceSeatSegment` | Geometric index of slot 1 only (circular: integer; facing: `{ side, index }` of the near-side center). |
| `numSegments` / `angleSegmentOne` | Circular only, as today. |
| `slotCapacity` | Highest valid `tableSlot` for this table (Table A: `9`; Table B family: `9`; Table C: `10`). |
| `components[].usedBySlot` | Integer. That leaf is **on** when `highestOccupiedTableSlot >= usedBySlot` (and still respects `alsoEnable`). Replaces `usedBy = "NPC1"`. |

`seatToPositionMap` is removed. Occupancy is not stored on the table.

**Table B family:** intent key `"Table B"` resolves from `highestOccupiedTableSlot` (in-session occupants only; absent players and empty NPC identities do not count):

| Highest occupied slot | Seat count used | Concrete key |
| --- | --- | --- |
| none, or 1–5 | 5 (minimum clamp) | `Table B0` |
| 6 | 6 | `Table B1` |
| 7 | 7 | `Table B2` |
| 8 | 8 | `Table B3` |
| 9 | 9 | `Table B4` |

Slot `10` is not valid on Table B (`slotCapacity` 9). `Table B5` is unused in phase 1. Asking for a slot the active table does not have is an error (below).

**`C.SeatRoleOffsets` (satellite defaults)**

```lua
C.SeatRoleOffsets = {
  shared = { -- chair, figurine, seat lights, dice-drawer anchors
    SEAT_CHAIR = { localXZ = { x = 0, z = 0 }, localRotation = { x = 0, y = 0, z = 0 }, defaultY = 0 },
  },
  player = { -- sheet stack, bags, candle, fire, smoke, … — player occupants only
    CSHEET_BASE = { … },
  },
  extraByOccupant = { -- one-offs (Pink tarot, Prince signet, …)
    Pink = { TAROT_DECK = { … } },
    Red = { PRINCE_SIGNET = { … } },
  },
}
```

- `localXZ` / `localRotation` — in the **figurine’s** local space (dump via `positionToLocal` / rotation delta).
- `defaultY` — absolute world Y when the object is in use. Never store `-200` here.
- Optional `scale` only if a role actually needs it.

Cameras are **not** in this table. Existing `C.ReferenceCameraAngles` / `cameraModes.bySeat` keep their mode keys; they are applied with the same slot yaw-and-shift around `centerPoint` as the figurine (authored as if slot 1 is the figurine, not the hand).

**`sessionScene.seatSlots` (occupancy)**

Canonical occupant → slot. Do not add a second map.

PC row:

```lua
Red = {
  characterKey = "lordLucien",
  tableSlot = 1,              -- 1..slotCapacity; required unless absentFromSession
  absentFromSession = false,  -- new; default false
  isPresent = true,           -- unchanged: dark-but-still-seated
}
```

NPC row: `tableSlot` required when the slot has a `characterKey`; omit / ignore when `slotEmpty`. No `absentFromSession`.

`gameState.seatLayout.virtualFigurineAnchors[occupantKey]` replaces `virtualHandZoneAnchors` (same idea: pose when there is no live figurine). `occupiedNPCSlots` stays the character assignment on NPC1–NPC4 identities.

**Validation (fail loud, name the occupant and the bad value)**

- Two in-session occupants with the same `tableSlot` → error (including two tokens stacked on one control-board seat that both resolve to one slot).
- `tableSlot` < 1 or > that table’s `slotCapacity` → error.
- In-session occupant missing `tableSlot` → error.
- `absentFromSession == true` together with a `tableSlot` → error.
- Import JSON or choosing a library scene that does not match this shape → error / alert, do not apply. The message must say **which occupant and which field**.

The control board should only offer slots that exist on the current table, so the invalid-slot case is belt-and-suspenders. Duplicate assignment is the one that can still happen by accident.

**Absent-from-session (in phase 1)**

Cheap enough to include: it is the same hide/park path as an unused NPC pile, plus one flag.

- **Data:** `absentFromSession` on the PC `seatSlots` row. That color occupies **no** `tableSlot` and is ignored for `highestOccupiedTableSlot`.
- **In-game:** a toggle on the Storyteller **PCs panel** (same row as Defer Auto-Seat / Connect), one per color. On → stash that color’s pile (objects + hand zone), drop `tableSlot`, relayout everyone else. Off → assign the **lowest-numbered free** `tableSlot` on the current table, unstash, relayout. If no slot is free, error and leave them absent.
- Distinct from `isPresent == false` (still in a slot, lights off).

**Live `tableSlot` edits (phase 1)**

Chair occupancy is edited on the **stage control board**: move a PC or NPC token onto a numbered chair snap, then **Apply**. The PCs and Scenes panels do not have slot number fields. The PCs panel **Absent** toggle remains (parks the pile and the control-board token). Duplicate tokens on one snap fail loud.

Occupant identity (Red, NPC1) does not change when the token moves to a different chair.

#### Delivery phases

**Phase 0 — capture (old layout still running).** `DEBUG.dumpSeatRoleOffsets(color)` is available. Pass any player color (`"Red"`, `"Pink"`, `"Purple"`, …) or NPC seat (`"NPC1"`). From the TTS console after Save & Play: `lua DEBUG.dumpSeatRoleOffsets("Red")`. It writes pasteable Lua to `.dev/.debug/debug_logs/seat_role_offsets_<COLOR>.lua` (same bridge as other DEBUG dumps): every `{color}Object` as `localXZ`, `localRotation`, and current absolute Y, plus the live figurine pose as a `referenceFigurine` candidate. Player-color dumps also include the hand zone as `HAND_ZONE` even if it is not tagged.

Typical capture:

- **Red** (or any complete player pile) → fill `C.SeatRoleOffsets.shared` and `.player`, and that table’s `referenceFigurine`.
- **Pink** → tarot deck / drawer / button extras into `extraByOccupant.Pink`.
- **Purple** → companion tokens and Oblivion-Rouse bag into `extraByOccupant.Purple`.
- **Red** (or Brown) again if needed for Prince signet / other one-offs.
- Any other color that has unique tagged objects.

Hidden objects will show `defaultY = -200`; those rows are edited by hand to the real default height. **Do not change `resolveSeatObjectsFromTable` in this phase.** Author `C.SeatRoleOffsets` and each table’s `referenceFigurine` / `slotCapacity` / `usedBySlot` from these dumps before Phase 1 ships.

**Phase 1 — new mover.** Switch layout to numbered slots + figurine offsets + occupancy in `seatSlots`; Table B mapping and leaf rule above; validation errors; absent toggle; cameras follow the new slot rigid transform. No Scatter.

#### What this unlocks

**Any occupant in any slot.** Scene data can put NPC1 in slot 1 and Red in slot 4. Slot 1’s figurine pose still comes from `referenceFigurine` even if nobody is standing there. Everyone else’s figurine is rotated from that authored pose; everyone’s satellites hang off their own figurine using the shared offset table.

**Scatter formation** (phase 2 — after free slot assignment on real tables works). Scatter is a table-shaped layout with no physical table:

- An origin (`centerPoint`) and a `referenceFigurine` pose (radius = distance origin → figurine; facing = toward the origin).
- Occupied slots equally spaced around that circle (`360° / occupiedCount`), still numbered 1, 2, 3… by the same right/left rule around slot 1’s bearing.
- Figurines (and therefore people) face the origin.
- Furniture that means “sitting at a table” is hidden — at least thrones; likely also table leaves / the table model itself. Sheets, bags, candles, and lights still follow the figurine unless we explicitly hide them too.
- Scene `tableKey` would be a Scatter key (or a formation flag on the scene) instead of `Table A` / `Table B`.

**Conversation clusters** (built on Scatter, or on a table slot):

- A **stage NPC** can be assigned to the **orbit** of an occupant. On Apply they leave the usual stage/area pose, stand on an arc in front of that occupant, and face them (people who walked up to talk).
- A **PC or seated NPC** can **join** another occupant: they stand beside the host, facing the same way, looking at that same arc (two PCs sharing one conversation).

Orbit and join are occupancy **modes** on top of slot assignment (host occupant + index on the arc), not extra table slots. They need scene / control-board fields; they are the reason the anchor must be a figurine rather than a hidden hand zone.

### Decisions (from review)

These answers are folded into New Behavior above. Original notes kept for the record.

1. **Left/right matches today’s colors.** From the figurine facing the origin, Orange is on Red’s right and Pink is on Red’s left. Slot 2 = right of 1 keeps the current color order. The first draft of this concern had the sides swapped.
- **👤 USER RESPONSE** Incorrect. Currently, in all table configurations, **Pink is on Red's _left_ and Orange is on Red's _right_** at the current tables. The new proposed method should not change that.

2. **Table A vs Table B spacing.** “Next slot to the right” on Table B (5–9 equal segments around the rim) is a full-circle neighbor. On Table A (`numSegments = 20`) the same rule **packs** people into adjacent 18° segments on one arc — which is actually how A already works. That is fine if A stays a packed arc and B stays a full ring. It is *not* the same rule as Scatter’s “equal spacing of whoever is occupied.” Scatter must re-space when occupancy changes; a physical table should **not** slide remaining people around the rim every time an NPC stands up (chairs are real). Occupied-but-empty chairs on a physical table vs compacting only in Scatter needs a firm rule.
- **👤 USER RESPONSE** Correct. Scatter is the only formation that re-spaces when occupancy changes; Table A is meant to pack everyone into a tight forward-facing arc.

3. **Table C (facing) and rectangular tables.** Left/right of slot 1 does not, by itself, put anyone on the **opposite** side of a facing table. Today PCs are on one edge and NPCs on the other. Options: (a) Table C keeps an authored slot map (slots 1–5 this side, 6–10 that side) and only circular/Scatter use the alternating rule; (b) we retire facing tables; (c) we define a second reference (slot “across”). This should be explicit or Scatter/C will be implemented as an afterthought and break.
- **👤 USER RESPONSE** "FACING" will indeed require some different handling. I think the current method ("slots 1-5 are this side, 6-10 are the other side") should work fine, with the 6-10 slots being positioned in the same way as the 1-5 slots are (i.e. with 6 in the center, 7 to its immediate right, 8 to its immediate left, and so on.)

4. **Do not copy satellites from a live occupant.** The “fallback to the next seated player” idea will reintroduce `postCorrections`, Y-as-state bugs, and unique-prop contamination (whoever we copy from has tarot, signet, a 180° throne, pages hidden, …). Authored offsets from `referenceFigurine` make empty slot 1 cheap. This is the load-bearing design choice; the rest of the simplification depends on it.
- **👤 USER RESPONSE** I very much agree: We should define object locations in terms of relative positions from the figurine. We should also implement a DEBUG function that will return these offsets by looking at a player color passed to the function, e.g. `DEBUG.printOffsetsToFile("Red")` would look at the location of Red's figurine, then print the relative positions and rotations of all `RedObject`-tagged objects in the game world to file in a format that can be easily copied into the table data.

5. **Table B family and `usedBy` leaves.** Growing B0→B4 from “highest NPC identity” breaks once NPC4 can sit in slot 2 and NPC1 in slot 9. Size must be “slots in use.” Table A leaves that say `usedBy = "NPC1"` likewise need to attach to **geometric slots** (the wing chairs), not to the NPC1 identity.
- **👤 USER RESPONSE** In both cases, _the highest occupied slot_ should determine the structure of the table. If slot 9 is occupied, then the variant of Table B that _has_ a slot 9 should be used, even if every other slot at the table is unoccupied. Likewise, for Table A, if slot 9 is occupied, the table leaf components for ALL slots before slot 9 should be activated (otherwise there will be strange gaps in the table)

6. **Five player piles always exist.** If Red is in slot 6 and slots 1–5 are NPCs, Red’s sheet and bags still have to go *somewhere*. Occupant identity is not optional for PCs. Lighting `seatPresent`, control-board minimap markers, and camera modes (`facingRed`, not `facingSlot1`) should stay keyed by occupant, with the slot only supplying the pose.
- **👤 USER RESPONSE** There is one exception to this:  I would like the ability to toggle a player as "absent from session" (i.e. if a player couldn't make it that week). In such a case, their color need not occupy a table slot at all. For example, if the Red player is absent one week, the other players may occupy slots 1-4 (or any other slots, really), with NPCs likewise assigned to any available slots, with the absent Red player not occupying any slot at any table.

7. **GUIDs are not enough.** Unique chairs and hand zones can be GUID-only. Pooled NPC figurines, extra compulsion cards, and anything that is cloned or retagged cannot. Dropping tags “because G.GUIDS exists” will break NPC seating. Prune the **copy-from-Red inventory lists**, not the occupant tag.
- **👤 USER RESPONSE** Agreed.

8. **Scatter and clusters are a second product.** Hiding thrones, suppressing the table model, look-at facing (today’s facing tables deliberately *avoid* look-at), re-spacing on occupancy change, orbit arcs, and join-beside are all new. They are the payoff of the figurine-anchor work, but they should ride **after** “numbered slots + figurine offsets + occupancy in state” is stable. Control-board Apply, NPC reconciler, and scene `tableKey` all have to learn Scatter and orbit; that is not a small add-on.
- **👤 USER RESPONSE** Agreed. Let's get the refactor and the ability to position players freely around tables working first, then we can introduce the SCATTER formation.

9. **Hand zones and cards.** Moving the anchor to the figurine does not remove TTS hand-zone ownership, card-follow-on-move, or the fact that NPC seats still have no physical zone. Virtual anchors remain; they just describe a figurine (and a derived hand offset) instead of a fake hand.
- **👤 USER RESPONSE** Agreed.

10. **No library backwards compatibility.** Import JSON that lacks the new fields errors. Choosing a stale scene alerts and does not apply, so the row can be deleted and replaced. The Google Sheet importer will be updated to emit the new shape.
- **👤 USER RESPONSE** No need for backwards compatibility: I can easily clear old scenes from the library, and change how the Google Sheet generates the import data for newly-defined scenes.  Importing should throw an error if the import JSON doesn't match the new format, and selecting a scene should handle an error with an alert message that prevents actually switching to that scene, allowing me to delete the scene and replace it with an updated one.

### Remaining follow-ups

Resolved and folded into **Phase 1 contract**:

- Table B clamped at five seats (`B0`); `highestOccupiedTableSlot` 6–9 → `B1`–`B4`.
- Empty geometric slots: leaves on, no spare throne.
- Absent-from-session: stash like unused NPC piles; PCs-panel toggle in phase 1; distinct from `isPresent`.
- Live save / import: loud error naming occupant and field.
- Offset dump: Phase 0; run per color as needed; local XZ/rotation + absolute Y; `-200` edited by hand to `defaultY`; extras land in `extraByOccupant`.
