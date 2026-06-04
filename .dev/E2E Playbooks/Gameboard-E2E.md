# Gameboard & Stage — manual E2E playbook

**TOR-141** (living E2E playbooks) · **TOR-169** (Storyteller NPC gameboard) · Author: table **Host** (solo OK) · Est. **~20–30 min smoke** · **~45–60 min full**.

Ground truth: [`core/npc_gameboard.ttslua`](../../core/npc_gameboard.ttslua), [`core/npcs.ttslua`](../../core/npcs.ttslua), [NPC Reconciler Procedure](../NPC%20Object%20Spawning%20%26%20Spotlighting/NPC%20Reconciler%20Procedure.md), [Storyteller Gameboard Control](../NPC%20Object%20Spawning%20%26%20Spotlighting/Storyteller%20Gameboard%20Control.md).

Harness: [`lib/e2e_gameboard.ttslua`](../../lib/e2e_gameboard.ttslua) (loaded via [`core/debug.ttslua`](../../core/debug.ttslua) only).

---

## Solo Host

Same as [Dice-E2E](Dice-E2E.md): one client, **Black** recommended for Storyteller Scenes panel (`visibility="Host"`). **Save & Play** before any macro.

---

## Prereq constants (record once per campaign; edit harness + this doc together)

| Constant | Default | Used for |
| --- | --- | --- |
| `GB_E2E_SCENE_ROW` | `scenes_lib_slot_03` | Scene Apply gate — library row with **non-empty** `sessionScene.npcWorld.placements` (≥1 character) |
| `GB_E2E_NPC_A` | `myleneHamelin` | Primary token / figurine |
| `GB_E2E_NPC_B` | `adrianVarga` | Second placement / seat conflict |
| `GB_E2E_TABLE_KEY` | `Table A` | NPC1 seat tests |
| `GB_E2E_UV_A` | `u=0.18, v=0.72` | Stable on-board snap |
| `GB_E2E_UV_B` | `u=0.42, v=0.55` | Move / layoutLock tests |

**Session prereqs (once per Save & Play):**

1. Host, seat **Black**.
2. **Save & Play** (bundled Lua).
3. Workshop: `STAGE_BOARD`, `CONTROL_BOARD`, `CONTROL_BOARD_PALETTE`, `npc_control_token` set — `lua DEBUG.spawnNpcControlBoardTokens()` if missing.
4. `lua gbE2ePrereqCheck()` → **`[gbConfirm] PASS`**.

---

## Macro helpers (console)

| Macro | Purpose |
| --- | --- |
| `gbE2ePrereqCheck()` | Hard stop before suites |
| `gbE2eReset()` | Empty `placements`, fixture NPCs in preload |
| `gbE2eRunSmoke()` | Automated S0–S7 + **HUMAN GATE** scene Apply |
| `gbE2eContinue()` | After human gate (`scene_apply` or `reload`) |
| `gbE2eRunFull()` | Deep F/G/H suites (+ optional reload gate) |
| `gbE2eRunDeferred()` | **Expected FAIL** until TOR-173/174/dedupe (D172 + D175 pass when shipped) |
| `gbConfirm(label, { … })` | Single-step assert |

Every macro ends with **`[gbConfirm] PASS`** or **`[gbConfirm] FAIL`** + line list.

**Inspection (between macros):**

- `lua DEBUG.dumpNpcPlacements()`
- `lua DEBUG.logNpcPlacementIntentToFile()`
- `lua DEBUG.exportNpcSeatFigurinesToFile()`

**Stop rule:** Any unexpected **FAIL** in smoke or full → do not run later macros until fixed.

---

## Step 0 — Prereq

```lua
lua gbE2ePrereqCheck()
```

**Pass if:** `[gbConfirm] PASS — gbE2ePrereqCheck`
**Stop if:** FAIL (missing board, tokens, scene row, or fixture NPCs).

---

## Smoke — `gbE2eRunSmoke()`

```lua
lua gbE2eRunSmoke()
```

**Pass if:** `[gbConfirm] PASS — gbE2eRunSmoke (automated)` then follow the printed **HUMAN GATE**.

| Block | Proves | Fail if |
| --- | --- | --- |
| S0 | `gbE2eReset` baseline | Placements nonempty; fixture not in preload |
| S1 | Polar snaps on CONTROL_BOARD | Snap count below threshold |
| S2 | Token at `GB_E2E_UV_A` | Token missing / wrong tag |
| S3 | `GlobalGameboardApply()` | State u/v/yaw drift |
| S4 | `Sync.npcs({ force = true })` | Figurine not at stage UV; duplicate figurines |
| S5 | Token mirror on board | Token only on palette |
| S6 | `GlobalGameboardClear()` | Placements or stage intent remain |
| S7 | Z flip → `npcLightMode` OFF vs STANDARD | Mode not derived from flip |

### HUMAN GATE — scene Apply (mandatory)

When smoke automated passes, the macro prints:

1. Open Storyteller **Scenes** panel.
2. Apply library row **`GB_E2E_SCENE_ROW`** (exact button id).
3. Wait **12 seconds** (blindfold + settle — same as [Scenes-E2E](Scenes-E2E.md)).
4. `lua gbE2eContinue()`

**Pass if:** `[gbConfirm] PASS — gbE2eContinue:scene_apply`

| Check | Fail if |
| --- | --- |
| Live `placements` match library row keys | No overlapping keys |
| Figurines on stage at row u/v | Missing figurine |
| Tokens mirrored on CONTROL_BOARD | Token not on board |
| Intent **stage** per placement key | Intent seat/preload |
| TOR-177: unoccupied `NPCn` → 0 `SEAT_FIGURE` duplicates | `probeDuplicateSeatFigure > 0` |

---

## Full — `gbE2eRunFull()`

Run after smoke + scene gate **PASS** in the same session (or accept full’s internal smoke prereq only).

```lua
lua gbE2eRunFull()
```

| ID | Proves | Fail if |
| --- | --- | --- |
| F1 | Placement + `seatSlots.NPC1` → intent **stage** | Figurine at NPC1 seat |
| F2 | Seat only → intent **seat** | Figurine at stage UV |
| F3 | NPC2 on **Table B1** (no NPC2 slot) | Intent not preload; slot map wrong |
| F4 | `isPresent=false` hides NPC1 chair | Chair visible to PCs |
| G1 | Reconcile pulls token from palette (TOR-170) | Token stays on palette |
| G2 | `syncTokensToPalette` skips on-stage keys | On-stage token parked |
| H1 | `layoutLock` blocks token UV overwrite | Token moved on reconcile |
| H2 | `layoutLock` still updates seat markers | All markers stashed |

### HUMAN GATE — reload (optional)

If full automated passes:

1. Save, **Save & Play** reload.
2. `lua gbE2ePrereqCheck()`
3. `lua gbE2eContinue()` → **`gbE2eContinue:reload`**

**Pass if:** Placements from pre-reload snapshot still present.

---

## Deferred — `gbE2eRunDeferred()`

```lua
lua gbE2eRunDeferred()
```

**Interpret:** Macro prints **FAIL** on named lines — that is **correct** until the linked issue ships.

| ID | Linear | Fails today because |
| --- | --- | --- |
| D172 | TOR-172 | Palette-drop `defaultLightMode` handler + ring-1 STANDARD in data |
| D173 | TOR-173 | No stage placement lerp |
| D175 | TOR-175 | *(shipped — `assertD175AnchorSpreadOrdering` in smoke)* |
| D174 | TOR-174 | No NPC token on ST dice bag roll+return |
| D177b | TOR-177 follow-up | Duplicate `SEAT_FIGURE_NPC1` remain after reconcile |

When a feature lands, move its probe from deferred into `gbE2eRunFull` and expect **PASS**.

---

## Related

- [Scenes-E2E](Scenes-E2E.md) — scene library apply timing; use a row with rich `npcWorld.placements` for `GB_E2E_SCENE_ROW`.
- [TESTING.md](../TESTING.md) — console index.
