# Dice E2E Run 1 — failure review

Source log: [`Dice E2E Run 1.txt`](Dice%20E2E%20Run%201.txt) (Suite J step 14/54 onward).

**Test/playbook fixes applied in the same pass:** J2 face map + success math, M1 result class, O2a margin, `e2ePoolStagedMismatchLines` rouse-bag staging (K2h).

This document lists failures that look like **game script behavior** (or human execution), not test configuration. Do **not** treat these as fixed until re-run after Save & Play.

---

## Suspected script bugs

### K1b — Rouse bag without active roll double-counts pool (`pool.rouse` 2 vs 1)

**Log:** `active.pool.rouse: got 2, want 1` after a single left-click on the Rouse bag with no active roll.

**Likely cause:** `GlobalDiceBagClick` (no active roll, Rouse bag) calls `RC.initiateRoll` with `pool.rouse = 1`, then `GlobalSpawnDefaultPoolDiceForActive` → `GlobalOnBagDieSpawned` increments `pool.rouse` again.

**Files:** `core/global_script.ttslua` (`GlobalDiceBagClick`, `GlobalOnBagDieSpawned`), `core/roll_controller.ttslua` (`initiateRoll` ROUSE pool).

**Re-test:** K1b only; one rouse click with empty table should yield `rollType=rouse`, `pool.rouse=1`, one staged die.

---

### P-F — Tracker hunger dropped to 0 with `pendingResolution = oblivHungerStain`

**Log:** `rollConfirm` PASS (postRoll, pending obliv choice) but `rollConfirmTracker` FAIL — `hunger: got 0, want 1`.

**Expected:** With pending Oblivion hunger/stain choice unresolved, tracker hunger should stay at the pre-roll value (1).

**Setup:** Standard compound roll, faces `normal={7,7}`, `oblivRouse={3,10}`.

**Files to inspect:** Oblivion compound resolution path in `core/roll_controller.ttslua`, `lib/rouse_outcomes.ttslua`, tracker mutation on `recalculate` / confirm.

**Note:** Run 1 may have been polluted by P-B/P-C cascades; re-run P-F in isolation after a clean Purple reset.

---

### K2g-Brown — Silent fail may not leave manual rouse in pool (`pool.rouse` 0 vs 1)

**Log:** After “Rouse bag 1×, then Oblivion-Rouse bag 1×”, `pool.rouse: got 0, want 1`.

**Expected (per playbook):** Manual rouse added; Oblivion click is a no-op; pool stays `rouse=1`, `oblivRouse=0`.

**If human order was correct:** Possible bug in mutual-exclusion or spawn routing when Oblivion is blocked after Rouse.

**Re-test:** K2g-Brown alone; confirm console does not show an error and pool counts match.

---

## Likely human / cascade (re-run before filing script bugs)

| Step | Failure | Notes |
|------|---------|--------|
| **K2f** | `expected active roll, got nil` | Same confirm shape as **N3**, which **passed** on Run 1. Likely missed click order (e.g. right-click Normal instead of Hunger) or transient state. |
| **K3a** | `pool.rouse: got 2, want 3` | Math: dedicated ROUSE starts at 1 + **2** rouse clicks = 3. Got 2 ⇒ one rouse click short or promotion timing. |
| **K3c** | `pool.oblivRouse: got 1, want 2` | Starts at 1 + **1** obliv click = 2. Got 1 ⇒ obliv click missing. |
| **K1c** | `phase: got setup, want preRoll` | Normal bag without `openRoll` leaves SETUP; human must ST-open or use rollTest path. |
| **L1c** | `phase: got preRoll, want postRoll` | Human did not Roll/settle after Open. |
| **O1b** | `liveSlotIndex: got nil, want 1` | ST slot roll not completed (drawer dice / difficulty / Roll / Confirm). |
| **P-B** | `0/2` obliv faces, tracker hunger | No obliv dice on table (0 staged). Human did not spawn 2 obliv dice before auto settle. |
| **P-C** | `roll phase is preRoll`, `active nil` | Cascade from P-B; roll never entered rolling/postRoll. |

---

## J2 cascade (addressed by test fix)

Run 1 J2 failed because settle preset used `rouse = {4}` while surge only adds **`bloodSurgeRouse`** (no manual `rouse` die). That left the roll stuck in ROLLING and may have contributed to early Suite K noise. Playbook now uses `bloodSurgeRouse = {4}` and `normal = {7, 7}` for a diff-2 win on the vampire pool.

---

## Optional follow-ups (not changed in Run 1 review)

- **O2a / P-F automation blocks:** Log shows `[RC] startRolling: … phase: postRoll` when the human already rolled — harmless if `rollSetFaces` + `rollConfirm` still pass; could guard with phase check in a shared helper later.
- **`M.setCamera: Invalid player object`:** Host-seat / camera data during K/L steps; unrelated to dice logic.

---

*TOR-141 (Dice E2E playbooks, living doc)*
