# NPC Reconciler Procedure

This document defines the **control flow** for reconciling NPC figurines in two locations: **NPC areas** in front of the table, and **NPC seats** around the table. It describes intended outcomes (where each NPC should end up, and what state should record), not the low-level mechanism for hiding objects or applying light modes — those may continue to use existing helpers as long as the outcomes match.

Related: [`Reconciler Contract.md`](../Sychronizing%20Game%20Functionality/Reconciler%20Contract.md), [`NPC Object Overview.md`](NPC%20Object%20Overview.md), [`Scene Constructor Overview.md`](../Scene%20Constructor/Scene%20Constructor%20Overview.md).

---

## State authority

Authoring and runtime fields below are **inputs** to reconcile. Fields on `npcs.instances` (`areaKey`, `slotIndex`, `seatedSeatKey`) are **derived** — updated by reconcile, not used to skip steps when they disagree with authoring.

| Source | Field(s) | Role |
| --- | --- | --- |
| Scene / library | `sessionScene.npcWorld.byArea` | Who should appear in which **stage area** and slot |
| Scene / library | `sessionScene.seatSlots[NPCn]` | Seat assignment intent (`characterKey`, `slotEmpty`, `isPresent`) |
| Validated merge | `seatLayout.occupiedNPCSlots` | Runtime map of `NPC1`–`NPC4` → character key or `false`; updated from `seatSlots` in `normalizeLiveSessionSceneSeatSlots` |
| Table config | `seatLayout.currentTableKey`, `C.Tables[*].playerToPositionMap` | Which NPC slots exist at the active table |
| Scene | `sessionScene.seatPresent`, `seatSlots[*].isPresent` | Narrative **presence** (visible/active vs assigned-but-absent) |
| Engine pool | `npcs.instances` | Spawn records (figurine/light GUIDs); placement fields are outputs |

**Precedence (when sources conflict):**

1. **`byArea` trumps table seating** for the same character. An NPC listed in `byArea` must not be physically seated after reconcile completes (Step Three skips them; Step Five places them).
2. **Seat assignment in state** may outlive the physical seat when the table has no slot for that seat key (Step Two, case 3) — assignment is retained, world is not seated.
3. **Narrative absence** (`isPresent` / `seatPresent`) does **not** unassign a seat; it only affects Step Four visibility/lights.

---

## Step Zero: Resolve placement intent

Before any world mutations, build a **resolved intent** for each spawned NPC and each NPC seat slot.

### Inputs

Read the current authoring snapshot:

- `sessionScene.npcWorld.byArea` (sparse area → slot → `{ characterKey, npcLightMode? }`)
- `sessionScene.seatSlots` for `NPC1`–`NPC4`
- `seatLayout.occupiedNPCSlots` (after state validation)
- Active table: `seatLayout.currentTableKey` → `C.Tables[key].playerToPositionMap`
- Presence: `sessionScene.seatPresent` and/or `seatSlots[seatKey].isPresent`

### Per-NPC resolved location

For each character key that appears anywhere in the above (or that currently has an instance record), assign exactly one **placement target** for this reconcile pass:

| Priority | Condition | Target |
| --- | --- | --- |
| 1 | Character appears in `byArea` | **Area** — area key + slot index from `byArea` |
| 2 | Else, seat slot names character and table includes that seat key | **Seat** — `NPCn` |
| 3 | Else | **Preload** — off-table pool |

Characters with target **Area** are **area-bound**: Steps Three must not seat them. Characters with target **Seat** are **seat-bound**: Step Five must not place them in a stage area (unless a later scene edit removes them from `byArea`).

### Per-seat resolved flags

For each `NPC1`–`NPC4`:

| Flag | Meaning |
| --- | --- |
| `assigned` | `occupiedNPCSlots[NPCn]` is a non-empty character key |
| `tableHasSlot` | Active table's `playerToPositionMap` includes `NPCn` |
| `present` | Narrative presence for this seat is not explicitly false |
| `physicalSeatAllowed` | `assigned` and `tableHasSlot` and assigned character is **not** area-bound |

### Outputs

The rest of this procedure consumes only **resolved intent**, not raw competing sources. If implementation reads `npcs.instances[].seatedSeatKey` or `areaKey` to decide whether to skip work, that is a bug relative to this contract.

---

## Procedure overview

Steps run in this order:

| Step | Purpose |
| --- | --- |
| **Zero** | Resolve intent (above) |
| **One** | Remove NPCs that should not remain in stage areas |
| **Two** | Remove NPCs that should not remain physically at the table |
| **Three** | Seat NPCs that are seat-bound |
| **Layout commit A** | One table layout pass (`playerToPositionMap` rotation + `postCorrections`) |
| **Four** | Apply narrative presence (visibility / seat lights) on **assigned** seats |
| **Five** | Place area-bound NPCs into stage areas |

**Layout commits:** Rotational seating is table-wide. Do not treat Step Three as N independent moves. After Step Three finishes all tag/instance updates for seat-bound NPCs, run **one** layout sync for the active table, then apply `C.TableSourceObjects.postCorrections` / `postCorrectionsBySeatRole`. Step Five moves figurines out of seats/preload into areas; if any seat-bound NPC was incorrectly left at the table, do not run a second full layout unless Step Three runs again.

**Presence (Step Four)** runs after **Layout commit A** so seated pose exists before deactivation. It does not change assignment.

---

## Step One: Remove absent NPCs from NPC areas

Compare resolved intent to NPCs currently in **stage areas** (not preload). Return to preload (normal procedures) any NPC who:

1. Has no area row in resolved intent (target is **Seat** or **Preload**), or
2. Was in an area slot that resolved intent assigns to a **different** character.

Do not remove NPCs from preload here; preload is the hub between steps.

---

## Step Two: Remove absent NPCs from table seats

Compare resolved intent to NPCs **physically at the table** (tagged `NPC<#>Object`, chair/lights active). Return figurine to preload and hide seat props (normal procedures) when:

### Cases 1–2 — Unassign (physical **and** state)

1. **Unoccupied seat** — resolved intent has no assignment for that slot (`assigned` false).
2. **Different occupant** — resolved intent assigns a different character to that slot.

Also clear seat assignment in state (`occupiedNPCSlots[NPCn] = false` and matching `seatSlots` row if authoritative for this reconcile).

### Case 3 — Physical off, assignment retained

The active table's `playerToPositionMap` does **not** include this seat key (e.g. Table B1 only has `NPC1`), but resolved intent still assigns a character to `NPC2`.

- **Physical:** Remove from table (same hide/preload/untag process as below).
- **State:** **Keep** assignment in `occupiedNPCSlots` / `seatSlots` so a later switch to a larger table can run Step Three without re-authoring.

Do **not** use the case 1–2 state clear for case 3.

### Narrative absence — do not unseat

If the seat is assigned and `present` is false, **do not** run Step Two for that slot. Assignment stands; Step Four deactivates presentation.

### Removing NPCs from table seats (physical process)

For any Step Two removal (cases 1–3):

1. Hide all objects tagged `NPC<#>Object` for that slot:
   - `G.GUIDS.SEAT_CHAIR_NPC<#>` — normal hide procedures
   - `G.GUIDS.SEAT_LIGHT_1_NPC<#>` and `G.GUIDS.SEAT_LIGHT_2_NPC<#>` — normal hide procedures
   - Figurine — return to preload (normal procedures)
2. Remove `NPC<#>Object` from the figurine; restore `npc_figurine`
3. Deactivate table `components` (`C.Tables`) whose `usedBy` matches that slot (when slot is not physically used)

---

## Step Three: Move NPCs into newly occupied table seats

For each seat where `physicalSeatAllowed` is true, ensure the assigned character is physically seated. Skip seats that are unchanged **and verified** (see below).

Skip entirely any character whose resolved target is **Area** (Step Zero).

### When a seat is "unchanged" (may skip Step Three body)

Skip only if **all** of the following hold:

- Resolved assignment for this seat is the same character as last successful reconcile (or same as current `occupiedNPCSlots`)
- Figurine has `NPC<#>Object` tag (not merely `npc_figurine`)
- Instance record `seatedSeatKey` matches this seat
- Figurine is not in a stage area or preload pool (i.e. it is seat-placed)
- Layout commit A has already run for the current table key since the last seat assignment change

If any check fails, treat the seat as **needs placement** even when assignment did not change.

### Placement process (per seat that needs placement)

1. Confirm `tableHasSlot` for this seat. If false, stop (case 3 should have run in Step Two; do not seat).
2. Ensure figurine is in **preload** (retreat from area if needed — normal procedures).
3. Remove `npc_figurine`; add `NPC<#>Object`.
4. Include figurine, `G.GUIDS.SEAT_CHAIR_NPC<#>`, `G.GUIDS.SEAT_LIGHT_1_NPC<#>`, and `G.GUIDS.SEAT_LIGHT_2_NPC<#>` in the next **Layout commit A** — rotational layout from Red reference objects per active table `playerToPositionMap`, then applicable `postCorrections` in `C.TableSourceObjects`.
5. Show chair and figurine to all players (normal visibility procedures); scale as postCorrections require.
6. Hide paired **area** spotlight while seated (normal procedures); workshop seat lights follow lighting mode after Step Four.

After all seats for this pass are prepared, run **Layout commit A** once.

---

## Step Four: Activate/deactivate occupied seats by narrative presence

Runs after **Layout commit A**. Applies only to seats where `assigned` is true (PC and NPC). Does **not** change assignment or preload/area placement.

Seat slots can be **assigned but inactive** when `present` is false.

### Deactivate (assigned, not present)

**PC slot:**

1. Objects tagged `<Color>Object` listed in `C.HiddenObjects` — invisible to all player colors
2. Seat lights 1 and 2 off (not 3)

**NPC slot:**

1. Figurine and chair invisible to all player colors
2. Seat lights 1 and 2 off

### Activate (assigned, present)

Reverse the above: PC hidden-object visibility per `C.HiddenObjects`; NPC figurine and chair visible to all; seat lights 1 and 2 per lighting mode.

*Implementation note:* PC and NPC paths may use different existing helpers (`O.reconcilePcSeatHiddenObjectsFromState` / `O.applyPcSeatHiddenObjectPresence` for `C.HiddenObjects`, `L.reconcileForPlayer`, NPC tag visibility in `core/npcs.ttslua`, etc.) as long as the outcomes above are met. `NPCS.reconcileAllFromState` Step Four applies PC hidden-object visibility and NPC figurine/chair invisibility and seat lights after layout commit A.

---

## Step Five: Populate NPC areas

Align stage areas with resolved intent: for each character whose target is **Area**, move figurine + paired area spotlight into the assigned area slot (normal area placement procedures).

### Area-bound characters who were seated or tagged for a seat

When Step Zero marks a character **area-bound** but they still have seat tags or a prior seat assignment:

1. Clear `NPC<#>Object`; restore `npc_figurine`
2. Reverse seat `postCorrections` on the figurine (next layout pass or explicit undo — outcome: figurine not seat-scaled)
3. Move figurine and area light from preload into the assigned area slot
4. **Deactivate** the seat slot visually per Step Four if assignment remains in state for restore, or clear assignment if scene intent cleared the seat (cases 1–2)

Area placement runs **after** Step Three and Layout commit A so seat-bound and area-bound targets are not applied in the same pass for the same character.

---

## Orchestration (implementation target)

A single entry point (e.g. `NPCS.reconcileAllFromState`) should run Steps Zero → Five in order, delegating to existing helpers (`moveNpcToArea`, `assignNpcToSeat`, `clearNpcSeat`, `RSL.SyncTable`, `L.reconcileAllPlayers`, …).

### Implementation status

`Sync.full` calls **`NPCS.reconcileAllFromState`** once after seat presentation. The orchestrator runs Steps Zero → Five in order; legacy `reconcileSessionSceneNpcWorldFromState` and `reconcileOccupiedNpcSeatsFromState` forward to the same entry point. Unified fingerprint: `lastNpcReconcileFingerprint` (byArea + occupied seats + table key + NPC presence).

---

## Quick reference: precedence examples

| Scene data | Resolved target | After reconcile |
| --- | --- | --- |
| `byArea` nearLeft slot 1 = A; `seatSlots.NPC1` = A | Area | A in nearLeft; not at table |
| `seatSlots.NPC1` = A; no `byArea` for A | Seat | A at NPC1 if table has slot |
| `seatSlots.NPC2` = B; table B1 (NPC1 only) | Seat intent retained, `physicalSeatAllowed` false | B in preload; `occupiedNPCSlots.NPC2` still B |
| `seatSlots.NPC1` = A, `isPresent` false | Seat + inactive | A seated pose from Step Three; Step Four hides |
| `seatSlots.NPC1` empty | Preload | No figurine at NPC1; state false |
