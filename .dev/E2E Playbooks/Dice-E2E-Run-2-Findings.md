# Dice E2E Run 2 — failure review

Source log: [`Dice E2E Run 2.txt`](Dice%20E2E%20Run%202.txt) (author annotated with interaction notes).

Prior pass: [`Dice-E2E-Run-1-Findings.md`](Dice-E2E-Run-1-Findings.md).

---

## Fixes applied after Run 2

| Area | Issue | Change |
|------|--------|--------|
| **Script** | Rouse/Obliv pool double-count on bag spawn (`K1b`, `K3a`/`K3c` panel vs staged mismatch) | `GlobalOnBagDieSpawned`: prefer `stagedCount` → `setPoolKindCount` before `adjustPoolKindCount` |
| **Script** | Rouse/Obliv/Simple Check pool **doubled on ROLL** (tray + panel) | Unified `spawnMissingPoolDiceForColor`; manual vs Blood Surge rouse split on Rouse bag (`manualRouseCount`) |
| **Script** | `rollTest` did not spawn default rouse-family dice | `rollE2eSpawnDefaultPoolIfNeeded` after `openRoll` |
| **H2b** | `rollSetFaces` before rouse die released post–Take Half | `rollE2eWaitForDiceTray` between `takeHalf` and preset |
| **J2** | Strip label `"Rouse"` vs surge strip | Expect `"Blood Surge Rouse"` |
| **K1a** | Hunger bag disabled with no roll (invalid human step) | Automated `rollE2eConfirmBagEnabled(..., false)` + **K1a2** on active STANDARD |
| **K1c** | Expected `preRoll`; Normal bag opens SETUP | Expect `setup` + `batonHolder = storyteller` |
| **K2g-Brown** | Brown has no Oblivion-Rouse bag | Skip step; Purple-only |
| **K2g-Purple** | Rouse bag hidden after Obliv click (not silent second click) | Human: one Obliv click; assert `rouse` bag disabled |
| **L1c** | Player panel missing; human could not Roll | Fully automated spawn + `rollE2eSettlePresetCheck` |
| **O1b** | `liveSlotIndex` after Confirm (not live, drawer still occupied) | `liveSlotIndexAbsent` + `slotNotCleared = 1` |
| **P-C** | Missing tray wait / settle after human spawn | `rollE2eWaitForDiceTray` + `rollE2eSettlePresetCheck` |

New helper: `rollE2eConfirmBagEnabled(color, dieKind, wantEnabled)`.

---

## Confirmed script bugs (still open or re-test)

### Rouse/Obliv spawn vs display (manual repro — fixed, re-test after Save & Play)

**Symptoms (author manual tests):**

1. Panel showed **one extra** rouse/obliv die vs staged tray (e.g. 1 spawned, 2 displayed).
2. Clicking **ROLL** **doubled** pool count in both tray and panel (e.g. 3 → 6).

**Root cause:**

- Init mismatch: bag spawn hook incremented pool via `adjustPoolKindCount` after `initiateRoll` already preset `pool.rouse` / `pool.oblivRouse` — fixed by `stagedCount` sync (Run 2).
- ROLL doubling: dedicated `rouse` / `rouseOblivion` rollTypes used a separate spawn branch that re-spawned the full pool; compound rolls used `spawnMissingPoolDiceForColor` (target − staged). Unified to one player path after fix.

**Re-test:** All four author scenarios (Rouse/Obliv × 1 click / 3 clicks) after Save & Play.

---

### P-F — Tracker hunger 0 with pending Oblivion choice

**Run 2:** `rollConfirm` PASS (`pendingResolution = oblivHungerStain`), `rollConfirmTracker` FAIL — hunger 0 vs 1.

**Expected:** Pending choice must not apply hunger until resolved.

**Re-test:** P-F in isolation after Save & Play.

---

### L1b — Player roll panel absent after ST Open (Run 2 note)

**Run 2:** After L1b Open, author saw no player roll control panel (could not execute L1c human path).

**Mitigation:** L1c is now automated; panel bug may still affect real play — track separately if it reproduces outside E2E.

---

## Run 2 items resolved by fixes above

| Step | Run 2 symptom | Resolution |
|------|----------------|------------|
| **K1b** | `pool.rouse` 2 vs 1 | Spawn hook + author confirmed single die looked correct |
| **K3a/K3b** | Panel 3 / staged 2 | `rollTest` default spawn + pool sync |
| **K3c** | `oblivRouse` 1 vs 2 | Same root cause as K3a |
| **J2** | No strip labeled `"Rouse"` | Wrong label (surge strip name) |
| **H2b** | No rouse die on table | Tray wait after Take Half |

---

## Author notes captured (no code change)

- **Suite O:** Prefer G-style automation; reduce human steps when not testing interactability.
- **K2g ordering:** Steps K2g still appear before K2h/K2i in the playbook (cosmetic; optional reorder later).
- **J2 / rouse UI:** Rouse outcome strips are broadcast-only, not player panel — tests must not assert panel strip text.

---

*TOR-141 (Dice E2E playbooks, living doc)*
