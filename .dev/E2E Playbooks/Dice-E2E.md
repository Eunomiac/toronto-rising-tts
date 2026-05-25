# Dice — manual E2E playbook

**TOR-141** · Author: table **Host** (solo OK) · Est. time: **~30 min smoke** (Suites 0, A–E) · **~90 min full** (all suites).

Ground truth: [`core/roll_controller.ttslua`](../../core/roll_controller.ttslua), [`core/dice.ttslua`](../../core/dice.ttslua), [`lib/dice_kinds.ttslua`](../../lib/dice_kinds.ttslua), [`lib/rouse_outcomes.ttslua`](../../lib/rouse_outcomes.ttslua), [`.dev/Dice System/Dice System Outline.md`](../Dice%20System/Dice%20System%20Outline.md), [`.dev/Dice System/Dice System Modifications & Augmentations Pt. 2.md`](../Dice%20System/Dice%20System%20Modifications%20%26%20Augmentations%20Pt.%202.md).

**Not implemented:** `DEBUG.testRollFlow_*` — use this playbook + `rollTest` / bags / UI.

---

## Solo Host (one client)

You do **not** need a second player connected. `rollTest(color, …)` arms state for any PC color in `C.PlayerData` / `playerData` even when nobody is seated there.

| Goal | Solo approach |
| --- | --- |
| Arm roll / read `rollState` | Console — stay at **Black** (recommended) |
| Click dice bags + panel buttons | **View →** target color while at Black, **or** sit that color briefly |
| Skip physics, finish FSM | `rollConfirm("Brown")` only works in **POST_ROLL** (after settle/recalc) |
| Storyteller (Black) roll | Seat **Black**; `rollStTest()` / ST dashboard |
| Oblivion rouse (Suite D / P) | **Purple** only — **View → Purple** |

## Prerequisites

- Table **Host** (you).
- **Save & Play** so bundled Lua matches repo.
- Character data for test colors: **Brown** (suites A–C, F, G–N), **Purple** (D, P), **Black** (E, O).
- No active roll on any seat (Step 0).
- Optional: note starting **hunger** / **willpower** for Brown before Suites I, N (for consequence checks).

## Inspection cheat sheet

```lua
rollCancelAll()
rollState("Brown")                    -- full active record + queue
print(GlobalGetRollPhase({ color = "Brown" }))
DEBUG.dumpRollPolicy("Brown")
DEBUG.dumpConditions("Brown")
rollStSlots()                         -- ST drawer slots
```

**Baton holders** (`active.batonHolder`): `storyteller` → ST acts; `player` → PC acts; `auto` → physics/settle.

**Permanent automation** (`gameState.stRollSettings`): `autoHunger`, `autoWp`, `autoApplyRouseOutcomes`, `autoRemorse` — toggles in ST **Roll options** modal (`rollOpts_perm_*`).

**Per-roll options** (`active.rollOptions`): `takeHalf`, `wpReroll`, `bestialNull`, `crits`, `canRerollHunger`, `numberOfRerolls`, `numberOfDiceRerolled` — ST modal per roll (`rollDash_opts_<Color>`) or:

```lua
RC.setRollOptions("Brown", { bestialNull = true })
```

---

## Step 0 — Cleanup

```lua
rollCancelAll()
```

**Pass if:** No stuck roll UI; `rollState` shows no active roll for Brown/Purple/Black.

---

## Smoke path (Suites A–E)

Quick regression after roll-pipeline edits. Full coverage is in Suites G–P below.

### Suite A — Standard roll (PRE_ROLL → roll → confirm)

#### Step A1 — Arm roll

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E Standard")
print(GlobalGetRollPhase({ color = "Brown" }))
```

**Pass if:** `PRE_ROLL`, difficulty 3. **View → Brown** for panel.

#### Step A2 — Build pool (bags)

**Human:** Left-click **normal** / **hunger** bags until pool ≈ 5 dice. Right-click a bag removes last die of that kind (see Suite K).

```lua
rollState("Brown")
```

**Pass if:** `active.pool` counts match staged dice; panel pool dots update.

#### Step A3 — Roll and confirm

**Human:** **Roll** → wait for settle → **Confirm** (ST proxy on dashboard if needed).

**Pass if:** `active.result` populated; `resultClass` + `successes` sensible; roll clears or queues next.

```lua
rollState("Brown")
```

**Stop if:** Stuck in `ROLLING` — recalc or cancel.

---

### Suite B — Cancel and reset

```lua
rollTest("Brown", 2)
rollCancel("Brown")
rollCancelAll()
```

**Pass if:** No active roll after each step.

---

### Suite C — Dedicated rouse check

```lua
rollTest("Brown", 1, C.RollType.ROUSE, "E2E Rouse")
```

**Human:** Roll the spawned **rouse** die (auto-spawned). Rouse-family rolls **auto-broadcast** on settle (no ST confirm) when no WP pending.

**Pass if:** Roll completes; on fail ≤5, hunger +1 if `autoApplyRouseOutcomes` on (`rollState` / tracker).

```lua
rollState("Brown")
rollCancel("Brown")
```

---

### Suite D — Oblivion rouse dedicated (Purple)

**Seat:** **Purple** only (`DICEBAG_OBLIVROUSE_PURPLE`).

```lua
rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E Oblivion Rouse")
```

**Human:** **View → Purple**; roll Oblivion rouse die(s). Multi-die corners → **Suite P**.

**Pass if:** Dedicated oblivion path completes (auto-broadcast or pending choice resolved).

```lua
rollState("Purple")
rollCancel("Purple")
```

---

### Suite E — Storyteller NPC roll (standard)

**Human:** Seat **Black**.

```lua
rollStTest("E2E ST", C.RollType.STANDARD)
rollStSlots()
```

**Pass if:** `liveSlotIndex` set; ST dashboard shows roll; drawer opens on first die spawn. ST bags spawn into drawer arc.

```lua
rollCancel("Black")
```

---

### Suite F — Conditions roll policy (optional)

Requires an **active condition** on Brown with a `roll` channel in the registry (today often empty — use Bestial Null via options in Suite M if no condition).

```lua
rollTest("Brown", 2)
DEBUG.dumpRollPolicy("Brown")
rollCancel("Brown")
```

**Pass if:** `active.rollPolicy` reflects merged condition policy at initiate (not raw `playerData.conditions` in FSM).

---

## Suite G — Result calculation accuracy

Physical dice are the source of truth. After **Roll** + settle, compare `active.result` in `rollState` to the table below. Set difficulty on panel or via `rollTest` before rolling.

**Setup:** `rollTest("Brown", <diff>, C.RollType.STANDARD, "E2E Classify")` → build pool with bag clicks to match **Normals** / **Hunger** → roll once.

| # | Diff | Normals | Hunger | Options | Expected `resultClass` (typical) |
| --- | --- | --- | --- | --- | --- |
| G1 | 2 | 7, 3 | — | default | `win` (2 successes) |
| G2 | 3 | 10, 10 | — | default | `criticalWin` or `messyCritical` if hunger 10 in pool |
| G3 | 2 | 4, 4 | 10, 1 | default | `bestialFailure` or `totalBestialFailure` (hunger 1, no success) |
| G4 | 2 | 6 | 10 | default | `messyCritical` (success + hunger 10) |
| G5 | 4 | 8, 7, 6 | — | `crits` off (ST modal) | `win` — no pair bonus from 10s |
| G6 | 2 | 7, 3 | 1 | `bestialNull` on (Suite M) | `win` — hunger 1 cancels one normal success |

**Pass if:** `successes`, `margin`, and `resultClass` match V5 rules in [`core/dice.ttslua`](../../core/dice.ttslua) `Dice.classifyRoll`.

**Stop if:** Classification wrong with known faces — bug in `classifyRoll` or face read from table.

```lua
rollCancel("Brown")
```

---

## Suite H — Take Half

### H1 — Simple Take Half (no rouse in pool)

```lua
rollTest("Brown", 4, C.RollType.STANDARD, "E2E Take Half")
```

**Human:** Add **4** normal+hunger dice only (no rouse/obliv). Click **Take Half**.

**Pass if:**

- `active.tookHalf == true`
- `active.result.resultClass` is `win` or `failure` only (never messy/bestial)
- Successes = `floor(pool/2)` (e.g. 4 dice → 2 successes)
- **Spend WP** disabled / unavailable
- Non-rouse staged dice destroyed; baton → **storyteller** for confirm

### H2 — Take Half + rouse dice still in pool

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E Take Half Rouse")
```

**Human:** Add 4 normal/hunger **and** 1+ **rouse** (left-click rouse bag). **Take Half**.

**Pass if:**

- Phase → `ROLLING`, `takeHalfAwaitingRouse == true`
- Non-rouse dice removed; rouse dice remain to throw
- After rouse settle: POST_ROLL merges main Take Half result + `rouseOutcomeStrips`

```lua
rollState("Brown")
rollCancel("Brown")
```

---

## Suite I — Spend Willpower

Requires Brown with **willpower ≥ 1** (superficial).

```lua
rollTest("Brown", 3, C.RollType.STANDARD, "E2E WP")
```

**Human:** Build pool ≥ 3 dice, **Roll**, let settle to **POST_ROLL** with a **failure** (or marginal result worth rerolling). Click **Spend WP** (not Take Half).

**Pass if:**

- Phase returns to `ROLLING`
- Up to **3** dice selectable for reroll (default `numberOfDiceRerolled`); hunger locked unless **Can reroll Hunger** on
- After reroll wave: POST_ROLL again; `willpower.spent == true`
- If `autoWp` on: +1 superficial WP damage applied on spend

**I2 — Rouse dice not WP-rerollable:** In POST_ROLL, confirm rouse/obliv dice cannot be selected for WP reroll.

```lua
rollCancel("Brown")
```

---

## Suite J — Compound roll (rouse in standard pool)

Standard roll with **rouse** and/or **oblivRouse** added during PRE_ROLL resolves **main pool** + **rouse strips** on one confirm.

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E Compound")
```

**Human:**

1. Add normal/hunger dice; add **1 rouse** (left-click rouse bag).
2. **Roll** all dice; wait for settle.
3. Inspect panel / broadcast: main V5 result **and** rouse strip (e.g. “Rouse Check” hunger on fail).
4. **Confirm** once.

**Pass if:** `active.rouseOutcomeStrips` has entries; hunger/stain applied on confirm when `autoApplyRouseOutcomes` on.

**J2 — Blood surge + compound:** Run Suite N first in same roll (surge adds rouse + normals), then complete roll — strip includes **Blood Surge Rouse**.

```lua
rollState("Brown")
rollCancel("Brown")
```

---

## Suite K — Dice bag clicks (left vs right)

Use **View → Brown** (or sit Brown). `rollTest("Brown", 2)` unless noted.

### K1 — No active roll (left click starts roll)

| Bag | Left click | Pass |
| --- | --- | --- |
| Hunger | Starts **STANDARD** roll, PRE_ROLL | Roll panel opens |
| Rouse | Starts **ROUSE** + 1 rouse die | Auto pool |
| Normal | Starts **STANDARD** | PRE_ROLL |

### K2 — PRE_ROLL on STANDARD

| Bag | Left | Right |
| --- | --- | --- |
| Normal | Spawns normal (or **hunger** if `autoHunger` redirects) | Removes last normal/hunger |
| Hunger (surge off) | **Blood Surge** (Suite N) — no hunger die | — |
| Hunger (surge on) | Spawns hunger | Removes last hunger |
| Rouse | Spawns rouse | Removes last rouse; if surge active, **deactivates surge** instead of removing rouse die |
| Obliv-Rouse | N/A at Brown | — |

### K3 — PRE_ROLL on dedicated ROUSE

| Bag | Left | Right |
| --- | --- | --- |
| Normal / Hunger | **Resets** rouse check to 1 die | — |
| Rouse / Obliv | Adds die to check | Removes last rouse/obliv |

### K4 — Empty pool right-click

**Human:** Remove all dice with right-click until pool empty.

**Pass if:** Roll **cancels**; bag dice destroyed.

```lua
rollCancel("Brown")
```

---

## Suite L — Baton passing and automation toggles

### L1 — PC standard baton chain

```lua
rollCancel("Brown")
RC.initiateRoll("Brown", { rollType = C.RollType.STANDARD, label = "E2E Baton" })
rollState("Brown")
```

**Pass if:** `phase == setup`, `batonHolder == storyteller`.

**Human (ST):** Set difficulty on ST dashboard for Brown → **Open roll** (or console):

```lua
RC.openRoll("Brown")
print(GlobalGetRollPhase({ color = "Brown" }))
```

**Pass if:** `preRoll`, `batonHolder == player`.

**Human:** **Roll** → **Pass if:** `rolling` / `auto`, then `postRoll` (player or storyteller depending on WP).

### L2 — Permanent toggles (`stRollSettings`)

**Human:** ST toolbar → roll options → **permanent** toggles. Or console:

```lua
S.setStateVal("stRollSettings", "autoHunger", false)
S.setStateVal("stRollSettings", "autoWp", false)
```

| Toggle | Off behavior to verify |
| --- | --- |
| `autoHunger` | Normal bag spawns **normal** even when hunger &lt; cap |
| `autoWp` | WP spend does not auto-apply superficial damage |
| `autoApplyRouseOutcomes` | Confirm does not auto-apply rouse hunger/stain |

Restore defaults after test.

```lua
rollCancel("Brown")
```

---

## Suite M — Bestial Null and roll options

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E Bestial Null")
RC.setRollOptions("Brown", { bestialNull = true })
```

**Human:** Pool: normals **7, 3** + hunger **1** (would be 2 successes without null). Roll.

**Pass if:** Only **one** normal success counts (hunger 1 cancels highest normal success first) → likely **failure** at diff 2.

**Human:** ST modal — toggle **Crits** off, repeat G5-style pool.

```lua
rollCancel("Brown")
```

---

## Suite N — Blood Surge (hunger bag)

```lua
rollTest("Brown", 2, C.RollType.STANDARD, "E2E Surge")
```

**Human:** **Left-click Hunger bag** once (surge not yet active).

**Pass if:**

- `active.meta.bloodSurgeActive == true`
- `pool.rouse` incremented; **1 rouse** + **N normal** dice spawn (N = Blood Potency surge count from character)
- Rouse die tagged `bloodSurge` in GM notes / script state

**Human:** Left-click Hunger again → spawns **hunger** die (not second surge).

**Human:** **Right-click Rouse bag** → deactivates surge; surge dice destroyed.

```lua
rollState("Brown")
rollCancel("Brown")
```

---

## Suite O — Storyteller slots, Werewolf, Rage, brutal outcome

### O1 — One live ST roll; slot metadata

```lua
rollCancel("Black")
rollStTest("NPC One", C.RollType.STANDARD)
rollStSlots()
```

**Pass if:** One `liveSlotIndex`; second `rollStTest` **blocked** until first resolved/cancelled.

**Human:** Complete roll → confirm → slot row remains until **CLEAR** on dashboard.

```lua
rollStSlots()
rollCancel("Black")
```

### O2 — Werewolf + Rage roll

```lua
rollStTest("Garou", C.RollType.WEREWOLF)
```

**Human:** At Black, use ST **werewolf** / **rage** bags only (no vampire dice). Build pool, set difficulty, roll.

**Pass if:** `Dice.classifyWerewolfRoll` path — no messy/bestial classes.

### O3 — Brutal outcome (≥2 rage showing 1 or 2)

**Human:** Pool with **≥2 rage dice** both landing **1 or 2**.

**Pass if:** `pendingResolution == brutalFailViolence`; panel offers **Fail** vs **Violence (+4 successes)**; confirm blocked until choice.

```lua
rollCancel("Black")
```

---

## Suite P — Oblivion-Rouse multi-die corners (Purple)

**Seat:** **Purple** · **View → Purple**

For each case: `rollTest("Purple", 1, C.RollType.ROUSE_OBLIVION, "E2E Obliv <case>")` → add dice with left-click Obliv bag → roll → check `rollState` / panel.

| Case | Dice faces (examples) | Expected |
| --- | --- | --- |
| P-A | All **6** | Success, no hunger/stain |
| P-B | All **3** | Hunger +1 |
| P-C | **3** and **10** (mixed, no 6–9) | **Pending choice** Hunger vs Stain |
| P-D | **1** and **10** (not all same) | Stained (+1 stain) |
| P-E | **3**, **7** (any 6–9) | Success despite low faces |

**Pass if:** Matches [`lib/rouse_outcomes.ttslua`](../../lib/rouse_outcomes.ttslua) `resolveOblivRouseDice`.

**P-F — Compound on STANDARD (optional):** `rollTest("Purple", 2, C.RollType.STANDARD)` → add oblivRouse to pool with main dice → obliv strip + pending choice on same confirm path.

```lua
rollCancel("Purple")
```

---

## Sign-off

| Suite | Pass | Notes |
| --- | --- | --- |
| 0 Cleanup | ☐ | |
| A Standard smoke | ☐ | |
| B Cancel | ☐ | |
| C Rouse dedicated | ☐ | |
| D Oblivion dedicated (Purple) | ☐ | |
| E ST standard | ☐ | |
| F Conditions policy | ☐ | optional |
| G Classification | ☐ | G1–G6 |
| H Take Half | ☐ | H1–H2 |
| I Spend WP | ☐ | |
| J Compound rouse | ☐ | |
| K Bag clicks | ☐ | |
| L Baton + auto toggles | ☐ | |
| M Bestial Null | ☐ | |
| N Blood Surge | ☐ | |
| O ST / Werewolf / Brutal | ☐ | |
| P Oblivion multi-die | ☐ | Purple |

---

## Appendix — Oblivion procedure (A–D)

From Pt. 2 / `RO.resolveOblivRouseDice`:

1. **All same face** — single-face table (1 → hunger+stain, 2–5 → hunger, 6–9 → pass, 10 → stain).
2. **Any 6–9** — success.
3. **Any 2–5 without 6–9** — hunger +1; if also **10** → player chooses hunger **or** stain.
4. **Only 1s and/or 10s** (not all identical) — stained.

---

## Related

- [TESTING.md](../TESTING.md) — console helper index
- [Conditions System Guide](../PC%20Data%20&%20Tracking/Conditions%20System%20Guide.md) — roll policy §6
- [Custom Roll Mechanics](../Dice%20System/Custom%20Roll%20Mechanics.md) — three option buckets
