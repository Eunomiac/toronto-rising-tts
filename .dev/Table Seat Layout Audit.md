# Table Seat Layout Stack Audit

**Date:** 2026-07-02
**Scope:** Findings and recommendations only (no implementation).
**Canonical code:** [`lib/rotational-seat-layout.ttslua`](../lib/rotational-seat-layout.ttslua), [`lib/constants.ttslua`](../lib/constants.ttslua) (`C.Tables`, `C.TableSourceObjects`).

---

## 1. Executive summary

The table seat positioning stack is centered on **`R.resolveSeatObjectsFromTable`**, which orchestrates layout generators, object resolution, post-corrections, camera rotation, and lighting/HUD reconciliation boundaries.

**Revised conclusion (2026-07-02, author clarifications):** The target architecture can be much simpler than the initial audit assumed.

| Step | Target behavior |
| --- | --- |
| **Step 1** | Compute hand frame (position + rotation) per entry in `seatToPositionMap` from **`referenceSeatSegment`** + **`referenceHand`** + table geometry only — **no seat identity in config** (Red is historical workshop convention, not a layout input). |
| **Step 2 (PC seats)** | Hand-delta: move hand → rigid-follow all `{seatKey}Object` at that seat. |
| **Step 2 (NPC seats)** | **Reference-segment role copy** (not hand-delta from current pose — inactive NPC props sit at Y≈−200, hidden/scaled). Then **`postCorrections` / `postCorrectionsBySeatRole`** for NPC entries. |

This works under the **workshop invariant:** each seat’s tagged objects are already authored at correct position and orientation **relative to that seat’s own hand** (virtual or physical). Layout only relocates the hand rig as a unit. That invariant matches how `sourceObjects.relative` already moves today via `rigidTransformBetweenCenters` — Step 2 generalizes that pattern to all seat-tagged objects.

**Initial audit caveat (revised):** PC seats can use hand-delta when rigs are stable. **NPC seats cannot** — deactivated slots leave objects under the table (`enforceNPCSeatObjectVisibility`, `hiddenSeatY = -200`), so layout must **re-place from the reference segment by role family**, then run NPC **`postCorrections`**.

**`referenceHand` (authoritative, 2026-07-03):** For every table, at `referenceSeatSegment` (today always Red’s segment): `referenceHand.position` = current `referenceHandPosition`; `referenceHand.rotation` = **`Vector(0, 0, 0)`** (Red’s live hand zone is always zero rotation). Other seats inherit orientation via Step 1 rigid transform from this frame.

**Recommended direction:** Phased migration (§16); PC hand-delta + NPC reference copy + retained NPC postCorrections; manual refresh (§15) for drift repair on demand.

---

## 2. Stack map

### 2.1 Call graph

```
Entry points
  R.SetTableTo(tableKey)           → R.resolveSeatObjectsFromTable(resolvedKey, { force = true })
                                   (legacy: applyReferenceHandPositionDelta — delete in refactor)
  R.SyncTable(tableKey?)           → R.resolveSeatObjectsFromTable
  Global.onLoad (deferred 0.5s)    → R.SyncTable()

R.resolveSeatObjectsFromTable(tableRef, sourceObjects?, options?)
  1. resolveTableRef / fingerprint short-circuit
  2. buildFilteredSeatMap (NPC occupancy + orchestrator context)
  3. applyAllTablesVisualState (activate target table — required for FACING bounds)
  4. computeHandFrames (CIRCULAR | FACING)  → handFrames + seatRigidByKey
  5. applyHandFramesAndFollowTags(handFrames)
  ~~6. applyPostCorrections~~  (removed in target design)
  7. applyTableConfigObjectPositions (C.Tables[*].objectPositions)
  8. enforceNPCSeatObjectVisibility
  9. applyCameraModesForSeats
 10. L.reconcileAllPlayers + NPC spotlights + HO.syncAll (layout boundary)
```

### 2.2 Layer responsibilities

| Layer | Owner | Writes state? | World I/O? |
| --- | --- | --- | --- |
| `C.Tables[*]` | constants | No | No |
| Generators | rotational-seat-layout | `currentTableKey` during generate | No |
| `resolveSeatObjects` | rotational-seat-layout | `virtualHandZoneAnchors` | Yes (moves objects, hand zones) |
| Post-corrections | rotational-seat-layout | No | Yes |
| Reconcilers | lighting, hud_overlays, npcs | Yes (modes/visibility) | Yes (lights, overlays) |

### 2.3 gameState fields touched

| Field | Written by | Persisted? |
| --- | --- | --- |
| `seatLayout.currentTableKey` | `resolveSeatObjectsFromTable`, `SyncTable`, generators | Yes |
| `seatLayout.virtualHandZoneAnchors` | `resolveSeatObjects` | **Gap:** absent from defaults/save whitelist ([State Access Audit P1-4](Sychronizing%20Game%20Functionality/State%20Access%20Audit.md)) |
| `seatLayout.universalCameraAngles` | `applyCameraModesForSeats` | Yes |
| `playerData[*].cameraAngles` | `applyCameraModesForSeats` | Yes |

---

## 3. Phase A — Config & data inventory

### 3.1 `C.Tables` entries (9 concrete + 1 dynamic family)

| Key | Shape | Segments / sides | Seats in map | `referencePlayerColor` | `referenceHandPosition` (Y always 3.22) | Components |
| --- | --- | --- | --- | --- | --- | --- |
| **Table A** | CIRCULAR | 20, angleSeg 0° | NPC1–4 + 5 PCs | Red | (0, 3.22, **-76.61**) | 4 leaves |
| **Table B0** | CIRCULAR | 5, angleSeg 36° | 5 PCs only | Red | (0, 3.22, -115.54) | — |
| **Table B1** | CIRCULAR | 6, angleSeg 0° | NPC1 + 5 PCs | Red | (0, 3.22, -146.61) | — |
| **Table B2** | CIRCULAR | 7, angleSeg 25.7° | NPC1–2 + 5 PCs | Red | (0, 3.22, -146.61) | — |
| **Table B3** | CIRCULAR | 8, angleSeg 0° | NPC1–3 + 5 PCs | Red | (0, 3.22, -166.61) | — |
| **Table B4** | CIRCULAR | 9, angleSeg 20° | NPC1–4 + 5 PCs | Red | (0, 3.22, -156.61) | — |
| **Table B5** | CIRCULAR | 10, angleSeg 0° | **NPC1–5** + 5 PCs | Red | (0, 3.22, -162) | — |
| **Table C** | FACING | `{side,index}` | NPC1–5 + 5 PCs | Red | (0, 3.22, -135.77) | — |
| **"Table B"** | — | Dynamic family | Resolves to B0–B4 by occupied NPC count | — | — | — |

**Findings:**

- **`referencePlayerColor` is always `"Red"`** across all tables. Red’s map entry defines the reference segment:
  - CIRCULAR: integer segment index (see §4.2).
  - FACING (Table C): `{ side = 180, index = 3 }`.
- **Table A `referenceHandPosition` equals `C.CameraAuthoringReferenceHandPosition`** — Table A is the camera-authoring baseline.
- **Table B5 includes `NPC5`** in `playerToPositionMap`, but **`C.NPCSeats` only lists NPC1–NPC4**. B5 is manually selectable; NPC5 is never auto-selected by the B-family resolver (caps at 4 occupied slots).
- **`C.TableShapes.RECTANGULAR`** is documented in constants but **no table uses it** and **no generator exists** — only `generateFacingCoordinates` handles `{side,index}` maps (FACING is a RECTANGULAR subset with sides 0° and 180° only).

### 3.2 `referenceSeatSegment` schema (confirmed)

**Rule:** `referenceSeatSegment` uses the **same value type** as entries in `seatToPositionMap` for that table. It identifies a **location on the table**, not a player color or seat key.

| Table shape | `seatToPositionMap` value | `referenceSeatSegment` |
| --- | --- | --- |
| CIRCULAR | `number` (1..numSegments) | `number` |
| FACING / RECTANGULAR | `{ side = number, index = number }` | `{ side = number, index = number }` |

**Example values** (today all tables happen to anchor at Red’s segment — that is authoring convenience, not a config requirement):

| Table | `referenceSeatSegment` |
| --- | --- |
| Table A | `11` |
| Table B0 | `3` |
| Table B1 / B2 | `4` |
| Table B3 / B4 | `5` |
| Table B5 | `6` |
| Table C | `{ side = 180, index = 3 }` |

Step 1 derives every seat’s hand frame by rigid transform from `referenceHand` at `referenceSeatSegment` to each seat’s segment entry. **No `referencePlayerColor` field is required in the target model.**

### 3.3 `C.TableSourceObjects` role catalog

| Group | Count | Roles |
| --- | --- | --- |
| **player** | 23 | `CSHEET_*` (11), `CSHEET_DICE_DRAWER*` (3), `CSHEET_PAGE_1..8`, `DICEBAG_HUNGER/NORMAL/ROUSE`, `SIGNAL_CANDLE/FIRE`, `HUNGER_SMOKE`, `SEAT_LIGHT_3`, `FAMULUS_LIGHT_1/2`, `FAMULUS_FIGURINE` |
| **all** | 4 | `SEAT_CHAIR`, `SEAT_FIGURE`, `SEAT_LIGHT_1`, `SEAT_LIGHT_2` |
| **other** | 0 | *(key absent — NPC-only extras would go here)* |
| **relative** | 13 GUIDs | Prince signet/curtain (Red), Tarot deck/drawer/buttons (Pink), `DICEBAG_OBLIVROUSE` (Purple) |

**Per seat type at layout time:**

- **PC seats:** `player` + `all` entries → ~27 role slots (+ hand zone via live TTS hand or injected anchor).
- **NPC seats:** `other` + `all` only → 4 role slots + **virtual hand-zone frame** injected from reference anchor.

### 3.4 Post-correction inventory

| Kind | Count | Purpose |
| --- | --- | --- |
| `postCorrections` (by GUID) | 9 | Chair Y + 180° Y rotation anchored to hand zone / virtual anchor |
| `postCorrectionsBySeatRole` | 7 seats × `SEAT_FIGURE` | Per-seat figurine Y tweak (5 PCs + NPC1–4) |

These exist because **the current pipeline propagates Red template frames to every seat**; chairs need a 180° Y fix and figurines need Y tweaks after that propagation. **Under hand-delta Step 2**, each seat’s objects stay relative to **their own** hand and these corrections should be **removable** once workshop rigs are verified (see §13.3).

### 3.5 Reference field call-site counts

| Symbol | `.ttslua` | `.dev` / other | Primary files |
| --- | --- | --- | --- |
| `playerToPositionMap` | ~40 | ~50 | `rotational-seat-layout` (31), `constants` (16), `lighting` (2), `npcs`, `objects`, `debug` |
| `referencePlayerColor` | ~88 | ~8 | `rotational-seat-layout` (80), `constants` (8) |
| `referenceHandPosition` | ~18 | ~1 | `constants` (10), `rotational-seat-layout` (8) |

Rename to `seatToPositionMap`, `referenceSeatSegment`, `referenceHand` touches **~150 references** (code + docs + stale JSON backups in `.dev/Problems/`).

---

## 4. Phase B — Step 1 hand-frame math trace

### 4.1 CIRCULAR algorithm (shared by Table A, B*)

For each seat `k` with segment `seg_k`:

1. `thetaRef` = azimuth of reference anchor (from Red template hand zone or anchor slot).
2. `thetaK` = `angleSegmentOne + (seg_k - 1) * (360 / numSegments)`.
3. `deltaDeg` = `shortestSignedDelta(thetaRef, thetaK)`.
4. `shift` = radial reposition to `centerPoint + radius * (sin(thetaK), cos(thetaK))` minus yaw-rotated anchor.
5. Hand frame for seat `k` = `frameAfterRigidYawAboutCenter(centerPoint, referenceAnchorFrame, deltaDeg)` + `shift`.

**Nominal azimuth check (reference segment = Red):**

| Table | Red segment | Nominal azimuth | `referenceHandPosition` XZ vs center |
| --- | --- | --- | --- |
| A | 11 | 180° | dist 126.61 from (0,0,50) → (0, -76.61) ✓ |
| B0 | 3 | 180° (36+144) | dist 65.54 from (0,0,-50) → (0, -115.54) ✓ |
| B2 | 4 | 180° (25.7+3×51.43) | same Z as B1/B2 config |
| C (N/A) | — | — | — |

**Finding:** `referenceHandPosition` XZ is **consistent with** placing the reference hand on the nominal segment at the inferred table radius. Y=3.22 is **constant** across all tables (hand zone height). **Rotation is not in config** — it comes from the live Red hand zone at runtime (`ensureReferenceHandZoneAnchorSlot` → `U.getHandZone("Red")`).

### 4.2 FACING algorithm (Table C)

For seat `{ side, index }`:

1. `deltaDeg` = `shortestSignedDelta(referenceSide, seatSide)` → 0° or 180° only.
2. X = segment center from **live** `getBounds()` on active table (`facingSegmentCenterX`).
3. Y/Z from yaw-rotated reference anchor; X shift = `targetX - rotatedAnchor.x`.
4. Row Z for minimap helper `facingSeatWorldXZ` uses `HorizontalDistance(centerPoint, referenceHandPosition)` × cos(side) — **position-only**, no rotation.

**Finding:** `referenceHand.rotation` is **required** in the proposed model for Table C NPC-side virtual anchors and for any consumer that today inherits orientation from the Red template rig. FACING explicitly avoids look-at-center rotation (seats face perpendicular to edge).

### 4.3 Step 1 feasibility verdict

| Shape | Hand frames computable without Red templates? | Notes |
| --- | --- | --- |
| CIRCULAR | **Yes** | `referenceHand` + `referenceSeatSegment` + `centerPoint` / `numSegments` / `angleSegmentOne` |
| FACING | **Yes** | Same + live `getBounds()` for X; `referenceHand.rotation` in config |
| RECTANGULAR | **N/A** | No table; would share FACING-style path if added later |

### 4.4 Live hand zone comparison (code-level)

PC hand zone GUIDs: `G.GUIDS.HAND_RED` etc. (`lib/guids.ttslua`). At layout time:

- Reference PC seat: `moveHandZoneAndContainedCards(hz, pos, rot)` to computed frame.
- Other PC seats: same, with before/after captured for relative followers.
- NPC seats: no physical hand zone; `virtualHandZoneAnchors[seatKey] = { position, rotation }`.

**Author Save & Play verification recommended:** Export hand zone position/rotation at Table A vs computed `byColor.Red` hand slot after `SyncTable({ force = true })` and confirm ≤3° anchor error (generator enforces `MAX_SEGMENT_ANGLE_ERROR_DEG = 3` against template inference today).

---

## 5. Phase C — Resolver & Step 2 assessment

### 5.1 `resolveSeatObjects` flow

```
1. Build templateGuidSet from sourceObjects (Red-suffixed workshop objects)
2. Reference seat pass:
   - Move each reference template object to computed frame
   - Move Red hand zone + cards; write virtualHandZoneAnchors[Red]
3. For each other seat in computed.byColor:
   - Collect tagged {seatKey}Object objects
   - Index by ROLE from GM Notes (not tag alone)
   - For each template slot: move matching object OR skip if missing
   - Hand zone branch: move live HZ (PC) or virtual anchor only (NPC)
4. Relative objects: rigidTransformBetweenCenters(handBefore, handAfter, objFrame)
5. Export GUID maps (optional file write)
```

### 5.2 Identity contract (`lib/seat-role-identity.ttslua`)

- Workshop objects: **GM Notes only** — pattern `ROLE_UPPERSEAT` (e.g. `SEAT_LIGHT_1_RED`).
- After move to non-reference seat: tag `{SeatKey}Object` + GM Notes updated to `ROLE_<TARGETSEAT>`.
- Hand zones: **no tags**; detected by TTS type or `HAND_ZONE*` role key.
- Template lookup: `resolveObjectRefWithRoleSupport(ref, referencePlayerColor)` appends `_RED` suffix to bare role names.

### 5.3 Red / template hard-coding inventory

| Location | Hard-code | Replacement under proposed model |
| --- | --- | --- |
| `applyReferenceHandPositionDelta` | `RedObject` tag, `referencePlayerColor \|\| "Red"` | Eliminate — `referenceHand` is absolute per table |
| `resolveReferenceSeatAnchor` | Requires Red template objects in world | `referenceHand` + exported role RelFrames |
| `resolveSeatTemplateSlots` | Suffix must match `referencePlayerColor` | Role catalog with seat-agnostic suffix or RelFrame table |
| `enforceNPCSeatObjectVisibility` | `referenceColor` for template GUID set | Template GUID set without color suffix |
| `applyCameraModesForSeats` | `computed.referencePlayerColor` for rigid reference | `referenceSeatKey` derived from segment |
| `C.RedCameraAngles` | Authored at Red / Table A hand | Rename conceptually; offset from `referenceHand` |

### 5.4 Step 2 critical verdict (revised 2026-07-03)

**Split by seat type:**

| Seat type | Step 2 strategy | Why |
| --- | --- | --- |
| **PC** | Hand-delta + rigid-follow all `{seatKey}Object` | Objects stay at correct offset from own hand during normal play |
| **NPC** | Reference-segment role copy + **`postCorrections`** | Inactive slots park objects at Y≈−200, hidden/scaled — hand-delta from current pose is wrong |

**PC:** `rigidTransformBetweenCenters(handBefore, handAfter, objFrame)` per `{seatKey}Object` (same as today’s `relative` path).

**NPC:** `propagateSeatRolesFromReference` → `applyPostCorrections` (NPC GUID + `postCorrectionsBySeatRole`).

**Manual refresh (§15):** Reference copy for **all** seats when author triggers repair.

### 5.5 Step 2 target model (confirmed)

```
Step 1: handFrame[seatKey] from referenceHand { pos=referenceHandPosition, rot=0,0,0 } + referenceSeatSegment + seatToPositionMap

Step 2 PC:
  move hand → rigid-follow {seatKey}Object tags

Step 2 NPC:
  move virtual hand → reference role copy from referenceSeatKey → postCorrections (NPC only)
```

---

## 6. Phase D — Downstream consumers

| Consumer | File | Field / API used | Rename impact |
| --- | --- | --- | --- |
| Layout sync fingerprint | `rotational-seat-layout` | filtered `playerToPositionMap` | `seatToPositionMap` |
| NPC `tableHasSlot` | `core/npcs.ttslua` | `playerToPositionMap[seatKey]` | rename |
| PC/NPC seat presence | `core/lighting.ttslua`, `core/objects.ttslua` | map membership | rename |
| Scene apply | `core/scenes.ttslua` | `RSL.SetTableTo` | none |
| ST scenes panel | `core/storyteller_scenes_panel.ttslua` | `SetTableTo`, `C.Tables` keys | none |
| Control board table toggle | `core/npc_gameboard.ttslua` | `SetTableTo`, `C.Tables` | none |
| Load recovery | `core/global_script.ttslua` | deferred `R.SyncTable()` | none |
| Seat layout center for poses | `lib/object_positions.ttslua` | `currentTableKey` → `centerPoint` | none |
| Minimap markers | `R.facingSeatWorldXZ` | `referenceHandPosition`, map | `referenceHand.position` |
| Camera presets | `C.RedCameraAngles`, `applyCameraModesForSeats` | `referenceHandPosition` offset | `referenceHand.position`; consider rotation |
| NPC gameboard data | `lib/npc_gameboard_data.ttslua` | enumerates `C.Tables` | none |
| Debug migration | `core/debug.ttslua` | `migrateRoleIdentityToGmNotes` | none |
| Type stubs | `types/tts_api.lua` | stray `playerToPositionMap` on `HandsAPI` | cleanup |

**Multiplayer:** Layout mutations are Tier C / host-only. Entry points are host-guarded via global/scene paths. No join-client layout mutation found — consistent with P1–P10. Solo Host does not validate fan-out (**TOR-144** gap unchanged).

---

## 7. Phase E — Transition scenario matrix

Manual verification playbook for author Save & Play. Expected behaviors derived from code.

| # | Scenario | Expected behavior | Code anchor | Risk if broken |
| --- | --- | --- | --- | --- |
| 1 | **Table A → Table B1** | NPC2–4 objects hidden + Y=-200 if occupied; B1 layout runs for NPC1+PCs only | `enforceNPCSeatObjectVisibility`, `buildFilteredSeatMap` | Orphan NPC props visible |
| 2 | **Table B1 → Table B3** | Previously hidden NPC2–3 objects shown if occupied; layout adds slots | same | NPCs missing at seat |
| 3 | **Table A → Table C** | Shape dispatch → `generateFacingCoordinates`; bounds-based X | `resolveSeatObjectsFromTable` L3120 | Wrong seat line / orientation |
| 4 | **Same table `force=true`** | Full resolve despite fingerprint | `SetTableTo` same-key branch | Drift not corrected |
| 5 | **Same table no force** | Fingerprint skip → nil return, log skip | `computeLayoutSyncFingerprint` | Stale layout persists |
| 6 | **Load saved `currentTableKey`** | Deferred `SyncTable` at 0.5s | `global_script` onLoad | Misaligned seats on join |
| 7 | **Load + virtual anchors** | Rebuilt on sync; not persisted today | `virtualHandZoneAnchors` | NPC postCorrections wrong until sync |
| 8 | **Loose dice on table** | `SetTableTo` blocked, GM alert | `alertAndBlockIfDiceOnTable` | Layout crash (**TOR-243**) |
| 9 | **"Table B" family key** | Resolves to B{n} by occupied NPC count | `resolveTableKey` | Wrong table geometry |
| 10 | **Table B5 manual select** | 10 segments, NPC5 in map but not in `C.NPCSeats` | config only | NPC5 never in occupancy filter |

---

## 8. Rename impact matrix

| Current | Proposed | Migration notes |
| --- | --- | --- |
| `playerToPositionMap` | `seatToPositionMap` | Mechanical rename; semantics unchanged |
| `referencePlayerColor` | **`referenceSeatSegment` only** | **Removed from config.** Segment location is authoritative; no seat identity required. PC hand lookup remains `U.getHandZone(seatKey)` when applying Step 2 per seat. |
| `referenceHandPosition` | `referenceHand.position` | Split existing Vector |
| *(missing)* | `referenceHand.rotation` | **New required field** — export from Table A Red hand zone as baseline; per-table values for other tables |
| `C.CameraAuthoringReferenceHandPosition` | align with Table A `referenceHand.position` | Already equal today |
| `computed.referencePlayerColor` | `computed.referenceSeatKey` or segment | Internal API |

---

## 9. Residual dependencies after simplification (revised)

| Dependency | Can remove? | Notes |
| --- | --- | --- |
| `referencePlayerColor` in `C.Tables` | **Yes** | Replaced by `referenceSeatSegment` |
| Red workshop templates as geometry source | **Yes** | `referenceHand` is the only anchor |
| `postCorrections` / `postCorrectionsBySeatRole` | **Yes — NPC seats** | Required after reference-segment placement; NPC props are hidden/scaled/under-table when inactive |
| `postCorrections` (PC chair GUID rows) | **Re-evaluate** | May drop if PC hand-delta + workshop rig is sufficient; verify Save & Play |
| `C.TableSourceObjects` `player`/`all`/`other`/`relative` | **Yes** for layout | Keep `cameraModes` only (or move to `C.Tables`) |
| GM Notes `ROLE_<SEAT>` for **automatic layout** | **No** | Not used in Step 2 hand-delta |
| GM Notes **role family** (`roleKey` prefix) | **Yes** | **Manual reference rig refresh** only (§15) |
| `{seatKey}Object` tags | **No** | Step 2 selection + NPC visibility |
| Live `getBounds()` for FACING | **No** | Table width drives X segmentation |
| Hand zone + card lock path | **No** | TTS engine constraint |
| Dice-on-table layout block | **No** | **TOR-243** — tags alone do not distinguish roll dice |

**Out of scope / accepted gaps:** `NPC5` on Table B5; `RECTANGULAR` generator (no table uses it; FACING covers Table C).

---

## 10. Recommended refactor path (revised — simplification-first)

1. **Schema** — `seatToPositionMap`, `referenceSeatSegment` (same value type as map entries), `referenceHand: { position, rotation }`; drop `referencePlayerColor`, `referenceHandPosition`.
2. **Hand-only generator** — `computeHandFrames(tableCfg, filteredMap)` → `{ [seatKey] = { position, rotation } }` + `seatRigidByKey` for cameras. No template reads, no segment inference from live objects.
3. **Slim resolver** — `applyHandFramesAndFollowTags(handFrames)`:
   - per seat: capture hand before → move hand → rigid-follow all `{seatKey}Object` (exclude hand zone object, exclude known non-rig types if any).
4. **Manual reference rig refresh** — Extract role-propagation logic into `R.refreshSeatRigsFromReferenceSegment(opts)` (§15); wire to debug/ST command; **not** called from `SetTableTo` / `SyncTable`.
5. **Delete** from automatic path — See §14 code removal inventory (role propagation moves to §15, not deleted entirely).
6. **Verify** — Phase E playbook; confirm chairs/figurines without `postCorrections` on automatic layout; verify manual refresh restores drifted rigs.
7. **Docs** — Rewrite `.dev/Rotational Coordinate Generator.md` around two-step hand model + manual refresh.

**Linear alignment:**

- **TOR-66 (rotational seat layout engine)** — parent shipped feature; this refactor is an improvement epic.
- **TOR-267 (FACING table layout)** — Table C path must remain correct; `referenceSeatSegment = {180,3}` validated.
- **TOR-247 (dynamic PC seat indices)** — if implemented, mutates `seatToPositionMap` at runtime before layout; segment-based reference still works if reference seat key stays fixed.

---

## 11. Open questions for author (updated)

1. **`referenceHand.rotation` per table** — Export from live Red hand at each table’s reference segment, or derive rotation purely from segment geometry (FACING: reference rotation + side delta)?
2. **Workshop invariant enforcement** — Automatic layout never corrects drift; **manual reference rig refresh** (§15) resets positions from reference segment by role family match.
3. **`virtualHandZoneAnchors` on load** — Recompute on every `SyncTable` (simplest) or persist in gameState?
4. **Non-rig tagged objects** — Besides loose dice (layout blocked today), are any `{seatKey}Object` tags used on objects that should **not** follow the hand delta?

**Closed (author 2026-07-02):**

- Reference config is **segment-only**, not seat identity (#1).
- Tag-only hand-delta Step 2 is **correct** under workshop invariant (#2).
- **`postCorrections` should be droppable** on automatic layout (#3).
- **Manual reference rig refresh** retained for drift recovery (§15).
- **`referenceSeatSegment` type = `seatToPositionMap` entry type** (#4).
- **NPC5 / RECTANGULAR** — accepted gaps (#5).

---

## 12. Audit success criteria checklist

- [x] Every seat object category has a documented pipeline owner (§2, §5).
- [x] Proposed schema validated against all 9 table configs + B family (§3.2, §4).
- [x] Step 2 verdict **revised:** tag-only hand-delta is sufficient under workshop invariant (§5.4, §13).
- [x] Red/template hard-coding inventory with replacements (§5.3, §14).
- [x] Findings doc under `.dev/` (this file).

**Not in scope:** Implementation, Save & Play numeric verification (noted as author follow-up in §4.4, §7).

---

## 13. Author clarifications — point-by-point assessment

### 13.1 Reference data is segment-based, not seat identity

**Correct.** In the target model, each table entry needs:

- `referenceSeatSegment` — where on the table the authored `referenceHand` frame applies
- `referenceHand` — position + rotation at that segment
- `seatToPositionMap` — where each seat key sits on the table

Step 1 computes any seat’s hand frame as a **rigid transform from reference segment → target segment** in table space. The fact that workshop objects at the reference segment are tagged `RedObject` is irrelevant to config.

**Remove:** `referencePlayerColor`, template suffix validation, `applyReferenceHandPositionDelta`, segment inference from live Red template azimuth (`MAX_SEGMENT_ANGLE_ERROR_DEG` check against Red placement).

### 13.2 Tag-only rigid follow is sufficient

**Correct, with the workshop invariant.** The codebase already implements this math for `sourceObjects.relative`. Extending it to all `{seatKey}Object` tags is architecturally sound.

The initial audit rejected tag-only follow because it analyzed the **current** Red-template absolute placement path, where per-role frames differ after propagation and `postCorrections` repair chairs. That entire path becomes **unnecessary** if each seat’s objects only ever move with **their own** hand.

**Remaining guardrails (not role catalogs):**

- Block layout when loose dice on table (**TOR-243**), or maintain a small exclusion set for non-rig tagged objects.
- Hand zones cannot be selected by `{seatKey}Object` tag — handle via `U.getHandZone(seatKey)` / virtual anchor separately.

**Does not fix (automatic layout):** Objects manually moved away from their hand without updating the rig — hand-delta preserves the error. Use **§15 manual reference rig refresh** to re-copy positions from the reference segment.

### 13.3 `postCorrections` — retained for NPC seats (revised 2026-07-03)

**Required for NPC seats.** Inactive NPC slot objects are hidden, scaled down, and parked at `Y ≈ -200` (`enforceNPCSeatObjectVisibility`). Hand-delta from **current** pose is invalid when a slot activates — layout must **place from the reference segment** (role-family copy), then apply NPC `postCorrections` / `postCorrectionsBySeatRole` (chairs, `SEAT_FIGURE` Y, etc.).

PC seat `postCorrections` may be phased out after Save & Play confirms hand-delta + workshop rigs are sufficient.

### 13.4 `referenceSeatSegment` value type = `seatToPositionMap` entry type

**Correct.** Confirmed: one polymorphic “segment descriptor” per table shape; reference segment uses the same shape as map values. FACING/RECTANGULAR use `{ side, index }`; CIRCULAR uses integer segment index.

### 13.6 `referenceHand.rotation` is always zero (2026-07-03)

At the reference segment (workshop: Red hand zone), rotation is always **`{0, 0, 0}`**. Config rule:

```lua
referenceHand = {
  position = Vector(...),  -- same values as legacy referenceHandPosition
  rotation = Vector(0, 0, 0),
}
```

Step 1 computes other seats’ hand rotations via rigid transform from this frame — not from live `getHandZone("Red").getRotation()`.

---

## 15. Manual reference rig refresh (retained capability)

**Author requirement (2026-07-02):** Keep a **manually triggered** operation that resets tagged seat object positions by copying the reference segment’s rig onto every other seat in the active table layout — matched by **GM Notes role family** (the `roleKey` prefix before `_SUFFIX`, e.g. `SEAT_CHAIR` from `SEAT_CHAIR_RED`).

This is the old template-propagation behavior, but **opt-in only** — not part of `SetTableTo`, `SyncTable`, or scene apply.

### 15.1 Purpose

| Automatic layout (Step 1 + 2) | Manual refresh |
| --- | --- |
| Moves each seat rig as a unit (hand-delta) | Re-derives each object’s world pose from reference segment |
| Fast, preserves per-seat workshop offsets | Repairs drift, missing roles, or bad relative offsets |
| No GM Notes role matching | Matches by **role family** across seats |

Answers open question §11.2: drift is corrected on demand, not on every table switch.

### 15.2 Reference segment → reference seat key

At runtime (no hard-coded Red):

1. Read active `C.Tables[currentTableKey]` and `referenceSeatSegment`.
2. **Inverse lookup:** find `referenceSeatKey` such that `seatToPositionMap[referenceSeatKey] == referenceSeatSegment` (integer or `{side,index}` equality).
3. If ambiguous (two keys share a segment — should not happen), error or require explicit opt.

Objects at the reference segment are those tagged `{referenceSeatKey}Object` plus the reference PC hand zone if applicable.

### 15.3 Algorithm (proposed API)

```
R.refreshSeatRigsFromReferenceSegment(opts?)
  opts: { tableKey?, seatKeys?, dryRun?, skipHandZones? }

  1. Resolve table + filtered seatToPositionMap (same filter as layout)
  2. Resolve referenceSeatKey from referenceSeatSegment
  3. Index reference seat objects by roleKey:
       for each obj with tag referenceSeatKey.."Object" (and hand zone if PC):
         roleKey, _ = SRI.parseRoleAndSuffix(GM Notes)  -- family name
         referenceFramesByRole[roleKey] = { position, rotation }
  4. Compute handFrames for all seats (Step 1 math)
  5. Build reference role frames relative to reference hand (or use absolute + rigid per seat)
  6. For each target seatKey (default: all in filtered map except reference):
       delta = rigid transform reference hand → target hand (same as layout)
       for each obj with tag seatKey.."Object":
         roleKey from GM Notes
         if referenceFramesByRole[roleKey] exists:
           placeObject at rigidTransform(referenceFrame[roleKey], delta)
         else:
           append to skippedUnmatched (see §15.7)
  7. Move PC hand zones to handFrames[seatKey] (default: yes — hands + tags stay consistent)
  8. Do NOT run postCorrections unless author re-adds them here explicitly
  9. Print skipped report (§15.7); return summary table
```

**Matching rule:** Compare **role family only** (`SEAT_LIGHT_1`, `CSHEET_PAGE_3`, …). Seat suffix in GM Notes (`_RED`, `_ORANGE`, `_NPC1`) identifies which seat owns the object but is **not** the match key across seats.

**NPC seats:** Reference role catalog for NPC-only roles comes from whatever objects exist at the reference segment seat (typically PC reference seat won’t have NPC-only roles — for NPC seats, either skip unmatched roles or use a reference seat that includes those roles in the map). *Recommendation:* reference segment should remain a **PC seat** at the reference segment (today Red) so the PC role set is complete; NPC seats receive the subset of roles that exist on both reference and target (`SEAT_CHAIR`, `SEAT_LIGHT_*`, …).

### 15.4 Trigger surface

| Surface | Suggestion |
| --- | --- |
| `core/debug.ttslua` | `DEBUG.refreshSeatRigsFromReference()` console command |
| Optional | Storyteller-only XmlUI button (host-guarded, Tier C) |
| **Not** | `resolveSeatObjectsFromTable`, `SetTableTo`, load hook |

Same guards as layout: **block if loose dice on table** (**TOR-243**); host-only for world mutation.

### 15.5 Relationship to code removal (§14)

Do **not** delete role-propagation helpers wholesale — **relocate** into the manual refresh module:

- Keep: `SRI.parseRoleAndSuffix`, `placeObjectExact`, `U.frameAfterRigidYawAboutCenter`, per-seat rigid `{ deltaDeg, shift }` from Step 1.
- Remove from automatic path: role slot loops in `resolveSeatObjects`, `applyPostCorrections`, `C.TableSourceObjects` role lists.
- Optional delete after extraction: `applySeatObjectIdentity` on refresh (refresh should **not** rewrite tags/GM Notes suffixes — only position/rotation).

### 15.6 What manual refresh does not do

- Does not change `{seatKey}Object` tags or GM Notes seat suffixes (objects stay at their assigned seat).
- Does not replace automatic table switch (run separately when workshop drift is suspected).
- Does not clone missing objects — only moves existing tagged objects with a matching role family on the reference seat.

### 15.7 Return value and unmatched-object report (required)

The function **must** print a clear, human-readable report of every tagged seat object that was **not moved** because it could not be paired with a reference-segment object. This is the primary feedback surface for workshop debugging.

**Objects included in `skippedUnmatched`:**

| Case | `reason` field |
| --- | --- |
| GM Notes missing or not matching `ROLE_COLOR` pattern | `"no_role_identity"` |
| Valid GM Notes but `roleKey` not present on reference seat | `"no_reference_role"` |
| Duplicate `roleKey` on target seat (ambiguous — skip all but first or error; document choice) | `"duplicate_role_at_seat"` |
| Object excluded by opts (e.g. dry-run, seat filter) | `"excluded_by_opts"` |

**Per skipped entry, capture and print:**

| Field | Source |
| --- | --- |
| `guid` | `obj.getGUID()` |
| `name` | `obj.getName()` |
| `nickname` | `obj.getNickname()` if available |
| `tags` | `obj.getTags()` — comma-joined in print |
| `gmNotes` | `obj.getGMNotes()` |
| `seatKey` | derived from `{seatKey}Object` tag |
| `roleKey` | parsed family if available, else `nil` |
| `reason` | see table above |

**Console print format (example):**

```
[refreshSeatRigsFromReference] referenceSeatKey=Red table=Table A
  moved: 142
  skipped (unmatched): 3
--- skipped (left unmoved) ---
  [1] guid=f10182 name= seatKey=Orange reason=no_reference_role roleKey=FAMULUS_FIGURINE
      nickname= tags=OrangeObject gmNotes=FAMULUS_FIGURINE_ORANGE
  [2] guid=abc123 name= seatKey=NPC2 reason=no_role_identity roleKey=(none)
      nickname= tags=NPC2Object gmNotes=
```

**Return table (Lua):**

```lua
{
  ok = true,
  tableKey = "Table A",
  referenceSeatKey = "Red",
  movedCount = 142,
  skippedCount = 3,
  skipped = {
    {
      guid = "f10182",
      name = "...",
      nickname = "...",
      tags = { "OrangeObject", ... },
      gmNotes = "FAMULUS_FIGURINE_ORANGE",
      seatKey = "Orange",
      roleKey = "FAMULUS_FIGURINE",
      reason = "no_reference_role",
    },
    -- ...
  },
}
```

When `skippedCount == 0`, still print a one-line success summary (`moved: N, skipped: 0`). When blocked (dice on table, not host, etc.), return `{ ok = false, error = "..." }` without a skipped list.

**Implementation note:** Use the same object-metadata helpers as other debug exports in `core/debug.ttslua` where possible; keep print lines under ~120 chars with continuation for long tag lists.

---

## 14. Code removal inventory (simplification target)

Functions and data in [`lib/rotational-seat-layout.ttslua`](../lib/rotational-seat-layout.ttslua) and [`lib/constants.ttslua`](../lib/constants.ttslua) that become **candidates for deletion** under the hand-delta model (not an implementation commit — audit guidance):

| Area | Remove or gut | Reason |
| --- | --- | --- |
| `applyReferenceHandPositionDelta` | **Delete** | RedObject pre-nudge; replaced by absolute `referenceHand` per table |
| `buildPlacedSeatSlots` | **Extract to §15** | Remove from automatic layout; keep logic for manual reference rig refresh |
| `resolveReferenceSeatAnchor` | **Extract to §15** | Read live objects at reference **segment** seat, not hard-coded Red |
| Role-indexing by GM Notes `roleKey` | **Extract to §15** | `SRI.parseRoleAndSuffix` → match family, ignore seat suffix |
| `resolveSeatTemplateSlots` | **Delete** (or §15 only) | Manual refresh scans live tagged objects; no fixed role catalog required |
| `ensureReferenceHandZoneAnchorSlot` | **Delete** | Automatic path uses `referenceHand` config; §15 uses live reference hand |
| `resolveObjectRefWithRoleSupport` (layout use) | **Delete** | Red suffix object lookup for templates |
| `generateRotationalCoordinates` template validation | **Replace** | Hand-only generator; no infer-segment-from-template |
| `generateFacingCoordinates` template path | **Replace** | Same |
| `computed.byColor[*].slots` per role | **Replace** | `computed.handFrames[seatKey]` only |
| `applyPostCorrections` | **Delete** | §13.3 |
| `C.TableSourceObjects.postCorrections*` | **Delete** | §13.3 |
| `C.TableSourceObjects.player/all/other/relative` | **Delete** (layout) | Tag-only Step 2 |
| `applySeatObjectIdentity` on layout | **Delete** | No cross-seat tag/GM Notes rewrite on table switch |
| `templateGuidSet` in resolver / NPC visibility | **Simplify** | No template-vs-moved distinction for geometry |
| Frame/GUID debug export in resolver | **Optional delete** | `WRITE_RESULTS_TO_FILE` already false |
| `MAX_SEGMENT_ANGLE_ERROR_DEG` template check | **Delete** | Segment from config, not live inference |

**Keep (trimmed):**

| Area | Keep |
| --- | --- |
| `resolveSeatObjectsFromTable` orchestration | Table activate, filter map, fingerprint, reconciler boundary |
| `buildFilteredSeatMap`, `computeLayoutSyncFingerprint` | Occupancy + skip logic |
| `applyAllTablesVisualState`, table components | Table object activate/deactivate |
| `moveHandZoneAndContainedCards` | PC hand + cards |
| `rigidTransformBetweenCenters` | Core of Step 2b |
| `applyCameraModesForSeats` + `seatRigidByKey` | Camera still derived from Step 1 rigid transform |
| `enforceNPCSeatObjectVisibility` | Slot membership hide/show |
| `alertAndBlockIfDiceOnTable` | **TOR-243** |
| `facingSeatWorldXZ` | Minimap markers (update to `referenceHand.position`) |
| **`R.refreshSeatRigsFromReferenceSegment`** (new) | Manual role-family re-rig (§15) |

**Estimated impact:** Automatic layout: hand-frame generator + PC tag-follow + **shared reference-role propagator** (NPC automatic + manual refresh). NPC `postCorrections` path unchanged. Legacy Red-template `resolveSeatObjects` removed only after phased verification (§16).

---

## 16. Phased implementation plan

See [`.dev/plans/table-seat-layout-hand-delta-phased.md`](plans/table-seat-layout-hand-delta-phased.md) for the executable phase checklist. Summary:

| Phase | Deliverable | Automatic path still legacy? |
| --- | --- | --- |
| **0** | Schema: `referenceHand`, `referenceSeatSegment`, `seatToPositionMap` (+ legacy aliases) | Yes |
| **1** | `computeHandFrames` + debug frame comparison vs current generator | Yes |
| **2** | `refreshSeatRigsFromReferenceSegment` + skipped-object report (§15.7) | Yes |
| **3** | NPC automatic path: reference role copy + `postCorrections`; flag `useSimplifiedLayout` | Yes (debug: `syncTableSimplified`) |
| **4** | PC automatic path: hand-delta + tag follow behind same flag | Partial |
| **5** | Default flag on; Save & Play matrix; remove legacy PC template propagation | No |
| **6** | Rename/remove legacy config fields; doc sync | No |
