# Table seat layout — phased implementation plan

**Status:** Ready to implement
**Audit:** [`.dev/Table Seat Layout Audit.md`](../Table%20Seat%20Layout%20Audit.md)
**Date:** 2026-07-03

## Authoritative clarifications (integrated)

1. **`postCorrections` retained for NPC seats** — Inactive NPC slot objects are deactivated, scaled, and moved under the table (`Y ≈ -200`). They cannot use hand-delta from current pose. Automatic layout must **place NPC seats from the reference segment** (role-family copy), then run **`postCorrections` / `postCorrectionsBySeatRole`** for NPC entries.

2. **`referenceHand` at reference segment** — `referenceHand.position` = legacy `referenceHandPosition`. `referenceHand.rotation` = **`Vector(0, 0, 0)`** always (Red hand zone is zero rotation in the workshop). Do not read live hand rotation for the reference frame.

3. **Split Step 2 by seat type**
   - **PC seats:** hand-delta + rigid-follow all `{seatKey}Object` tags (workshop invariant).
   - **NPC seats:** reference-segment role propagation + virtual hand anchor + NPC postCorrections.

4. **`referenceSeatSegment` value type** = `seatToPositionMap` entry type (`number` or `{ side, index }`).

5. **Manual refresh** — `R.refreshSeatRigsFromReferenceSegment` with full skipped-object report (§15.7); not called from `SetTableTo` / `SyncTable`.

6. **NPC5 / RECTANGULAR** — out of scope.

## Safety principles

- **No big-bang swap** — legacy `resolveSeatObjects` stays default until Phase 5.
- **Flag:** `opts.useSimplifiedLayout = true` on `resolveSeatObjectsFromTable` / debug entry points.
- **`npm run build` does not validate poses** — each phase ends with author Save & Play on Phase E matrix (audit §7).
- **Host-only / dice guard** unchanged (**TOR-243**, Tier C).

---

## Phase 0 — Schema (no behavior change)

**Goal:** Add new config fields; derive from legacy; zero runtime change.

### `lib/constants.ttslua` — each `C.Tables[*]` entry

- Add `seatToPositionMap` = copy of `playerToPositionMap`.
- Add `referenceSeatSegment`:
  - CIRCULAR: Red’s integer segment (e.g. Table A → `11`).
  - FACING: Red’s `{ side, index }` (Table C → `{ side = 180, index = 3 }`).
- Add `referenceHand`:
  ```lua
  referenceHand = {
    position = Vector(...),  -- copy from referenceHandPosition
    rotation = Vector(0, 0, 0),
  }
  ```
- Keep `playerToPositionMap`, `referencePlayerColor`, `referenceHandPosition` until Phase 6.

### Helpers in `lib/rotational-seat-layout.ttslua`

- `resolveReferenceSeatKey(tableCfg)` — inverse lookup `seatToPositionMap` for `referenceSeatSegment`.
- `getReferenceHand(tableCfg)` — returns `referenceHand` or synthesizes from legacy fields.

**Verify:** `npm run build`; no Save & Play required.

**Commit:** `feat(tables): add referenceHand, referenceSeatSegment, seatToPositionMap schema`

---

## Phase 1 — Hand-only frame generator (parallel, read-only compare)

**Goal:** `computeHandFrames(tableCfg, filteredMap)` without changing world objects.

### Implement

- New function using `referenceHand` + `referenceSeatSegment` + existing circular/FACING math (extract from `generateRotationalCoordinates` / `generateFacingCoordinates`).
- Reference rotation is **config `{0,0,0}`**, not live Red hand.
- Output: `{ handFrames = { [seatKey] = { position, rotation } }, seatRigidByKey = { ... } }`.

### Debug command (`core/debug.ttslua`)

- `DEBUG.compareHandFrames(tableKey?)` — for each seat, log delta vs current generator’s hand slot in `computed.byColor[seat].byRoleKey` (max position/rotation error).

**Gate to Phase 2:** All tables ≤ small tolerance on position; rotation matches expectation (reference seat = 0,0,0).

**Commit:** `feat(layout): computeHandFrames with referenceHand rotation zero`

---

## Phase 2 — Manual reference rig refresh

**Goal:** Ship repair tool before changing automatic layout.

### Implement `R.refreshSeatRigsFromReferenceSegment(opts?)`

1. Resolve table + `referenceSeatKey` from `referenceSeatSegment`.
2. Index reference `{referenceSeatKey}Object` by GM Notes `roleKey` (`SRI.parseRoleAndSuffix`).
3. `computeHandFrames` for rigid transform per target seat.
4. For each target seat (default: all in filtered map except reference):
   - Move hand (PC: `moveHandZoneAndContainedCards`; NPC: update `virtualHandZoneAnchors`).
   - For each `{seatKey}Object`: if `roleKey` on reference → `placeObjectExact` at transformed reference frame; else append to `skipped`.
5. **Do not** run postCorrections (manual full re-rig only).
6. Print §15.7 report; return `{ ok, movedCount, skippedCount, skipped = { guid, name, nickname, tags, gmNotes, seatKey, roleKey, reason } }`.

### Wire

- `DEBUG.refreshSeatRigsFromReference()` in `core/debug.ttslua`.
- Guards: host, no loose dice.

**Gate:** Author runs refresh on Table A; `skippedCount` acceptable; visible rigs match expectation.

**Commit:** `feat(layout): manual refreshSeatRigsFromReferenceSegment + skip report`

---

## Phase 3 — Simplified automatic path: NPC branch

**Status:** Implemented (2026-07-05). Opt-in via `opts.useSimplifiedLayout = true` or `DEBUG.syncTableSimplified(tableKey)`.

**Goal:** Behind `useSimplifiedLayout`, NPC seats use reference copy + postCorrections.

### Implement `applySimplifiedSeatLayout(tableCfg, filteredMap, opts)`

For each **NPC** seat in filtered map:

1. `handFrames` from Phase 1.
2. **Reference role propagation** — same core as Phase 2 (extract shared `propagateSeatRolesFromReference(referenceSeatKey, targetSeatKey, handFrames)`).
3. `enforceNPCSeatObjectVisibility` (unchanged).
4. **`applyPostCorrections`** — **NPC rows only** initially:
   - `postCorrections` entries with `anchorSeatKey` matching `C.NPCSeats`.
   - `postCorrectionsBySeatRole` for `NPC1`..`NPC4`.
5. PC seats: **still use legacy** `resolveSeatObjects` for this phase.

### Wire

- `resolveSeatObjectsFromTable(..., { useSimplifiedLayout = true })` — NPC simplified, PC legacy.
- Debug: `DEBUG.syncTableSimplified(tableKey?)`.

**Gate (Save & Play):**

- Table A → B1 → B3: NPC props show/hide correctly; chairs/figurines/lights at seat after postCorrections.
- Inactive NPC at Y=-200 before switch; active NPC correct after switch.

**Commit:** `feat(layout): simplified NPC path with reference copy + postCorrections`

---

## Phase 4 — Simplified automatic path: PC branch

**Goal:** PC seats use hand-delta + tag follow.

### Implement for **PC** seats in `applySimplifiedSeatLayout`

1. Move PC hand to `handFrames[seatKey]`.
2. `rigidTransformBetweenCenters(handBefore, handAfter, objFrame)` for every `{seatKey}Object` (exclude hand zone, exclude dice if any slip through — layout still blocked by TOR-243).
3. **PC `postCorrections`:** off by default; optional flag `applyPcPostCorrections` if chairs regress.

### Wire

- `useSimplifiedLayout = true` runs full simplified path (NPC + PC).
- `DEBUG.compareLayoutPaths(tableKey?)` — optional: run legacy vs simplified, log hand-frame-only deltas (PC positions may differ until workshop verified).

**Gate (Save & Play):**

- All PC seats on Table A, B2, Table C after switch.
- Cameras (`applyCameraModesForSeats` from `seatRigidByKey`) still correct.

**Commit:** `feat(layout): simplified PC hand-delta tag follow`

---

## Phase 5 — Default on, remove legacy propagation

**Goal:** `useSimplifiedLayout` default `true`; delete Red-template placement from automatic path.

### Remove (automatic path only)

- `buildPlacedSeatSlots` / `resolveReferenceSeatAnchor` from `resolveSeatObjects` hot path.
- `applyReferenceHandPositionDelta`.
- `C.TableSourceObjects` `player`/`all`/`other`/`relative` for layout (keep `cameraModes`).
- PC `postCorrections` if Save & Play clean.

### Keep

- `applyPostCorrections` for **NPC**.
- `propagateSeatRolesFromReference` (shared: NPC auto + manual refresh).
- `enforceNPCSeatObjectVisibility`, fingerprint, dice guard, cameras.

**Gate:** Full Phase E matrix on default path.

**Commit:** `refactor(layout): default simplified layout; remove legacy template propagation`

---

## Phase 6 — Config cleanup and docs

- Remove `referencePlayerColor`, `referenceHandPosition`, `playerToPositionMap` from `C.Tables` (grep + docs).
- Rename `C.RedCameraAngles` → `C.ReferenceCameraAngles` (optional, same offsets from `referenceHand.position`).
- Update `.dev/Rotational Coordinate Generator.md`, Reconciler Contract, Event Listener Policy if handlers added.
- `types/tts_api.lua` cleanup.

**Commit:** `chore(tables): remove legacy seat layout config fields; doc sync`

---

## Shared extraction (Phase 2–3)

```
propagateSeatRolesFromReference(referenceSeatKey, targetSeatKey, handFrames, opts)
  → { moved, skipped }  -- skipped feeds §15.7 report
```

Used by:

- `refreshSeatRigsFromReferenceSegment` (all seats, manual)
- `applySimplifiedSeatLayout` (NPC seats only, automatic)

---

## Regression matrix (author Save & Play)

| # | Scenario | Pass criteria |
| --- | --- | --- |
| 1 | Table A → B1 | NPC2–4 hidden; NPC1+PCs positioned |
| 2 | B1 → B3 | New NPC slots visible + positioned + postCorrections |
| 3 | A → C (FACING) | All seats; hand rotation sane |
| 4 | Load + deferred SyncTable | Seats match `currentTableKey` |
| 5 | Manual refresh after deliberate drift | Skipped report empty or actionable; rigs restored |
| 6 | Loose dice | Layout blocked |
| 7 | `refreshSeatRigsFromReference` | Skipped list prints GUID/name/tags/GM Notes |

---

## Linear

Create or attach epic under **Synchronization & State** / **TOR-66 (rotational seat layout engine)**. Sub-tasks per phase 0–6. Note **solo verified** until **TOR-144**.
