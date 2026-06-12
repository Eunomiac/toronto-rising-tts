# Dice System Modifications & Augmentations, Part 2

Several new types of dice and their corresponding dice bags have been added to the game. They follow the naming and tagging conventions of the existing dice and dice bags, namely:

* all dice bags are named `DICEBAG_<DICETYPE>_<COLOR>`
* all dice objects are tagged `d10`, `<Color>Object`, and `<DiceType>Die`
* all dice bags are tagged `<Color>Object` and `<DiceType>Die`

An exception to the above has to be made with the introduction of Storyteller dice, which are dice bags containing dice that are intended to be used by the Storyteller when rolling for NPCs.

* all Storyteller dice bags are named `DICEBAG_<DICETYPE>_STORYTELLER`
* all dice objects are tagged `d10`, `StorytellerObject`, and `<DiceType>Die`
* all dice bags are tagged `StorytellerObject` and `<DiceType>Die`.

All of the new dice bags, including the Storyteller dice bags, require the same object script as the existing dice bags: `objects/dice_bag.ttslua`. (This script will need to be updated to account for the new dice types and the different procedure for handling Storyteller dice clicks, as well as to implement several of the changes outlined below to the current flow of control during a roll.)

## Die Types

### Rouse Dice

Every player now has a `DICEBAG_ROUSE_<COLOR>` dice bag, containing the corresponding `RouseDie`-tagged dice. These dice are specifically used when rolling Rouse Checks, instead of Hunger dice (which is the current behavior).

Results of rolling rouse dice are identical to the current system of using Hunger dice (i.e. 1-5 = hunger roused, 6-10 = hunger unchanged). However, when displaying the dice faces in the various roller HUD panels, the following images should be used:

| Face | Image Reference |
| :--: | :--: |
| 1 | dieFace_rouse_fang |
| 2 | dieFace_rouse_fang |
| 3 | dieFace_rouse_fang |
| 4 | dieFace_rouse_fang |
| 5 | dieFace_rouse_fang |
| 6 | dieFace_rouse_blank |
| 7 | dieFace_rouse_blank |
| 8 | dieFace_rouse_blank |
| 9 | dieFace_rouse_blank |
| 10 | dieFace_rouse_blank |

### Oblivion-Rouse Dice

Players possessing the Oblivion discipline (currently only the Purple player) will have a `DICEBAG_OBLIVROUSE_<COLOR>` bag, containing the corresponding `OblivRouseDie`-tagged dice. These dice are specifically used when rolling Rouse Checks to activate Oblivion powers, instead of Hunger dice (which is the current behavior).

Results of rolling oblivion-rouse dice are identical to the current system of using Hunger dice (i.e. 1 = hunger roused AND stain applied, 2-5 = hunger roused, 6-9 = hunger unchanged, 10 = hunger unchanged BUT stain applied). As above, however, the images to be displayed in the various roller HUD panels should be as follows:

| Face | Image Reference |
| :--: | :--: |
| 1 | dieFace_oblivRouse_fangStain |
| 2 | dieFace_oblivRouse_fang |
| 3 | dieFace_oblivRouse_fang |
| 4 | dieFace_oblivRouse_fang |
| 5 | dieFace_oblivRouse_fang |
| 6 | dieFace_oblivRouse_blank |
| 7 | dieFace_oblivRouse_blank |
| 8 | dieFace_oblivRouse_blank |
| 9 | dieFace_oblivRouse_blank |
| 10 | dieFace_oblivRouse_stain |

### Werewolf Dice

In addition to having Storyteller versions of all player dice bags (i.e. Normal, Hunger, Rouse, and Oblivion-Rouse), the Storyteller also has two dice bags containing dice specific to _Werewolf: the Apocalypse_ — to be used when making rolls for werewolf NPCs. The first die type, "Werewolf Dice", is the "Normal" dice type rolled by werewolves.

Thus, the Storyteller has a `DICEBAG_WEREWOLF_STORYTELLER` bag containing `WerewolfDie` and `StorytellerObject`-tagged dice. How the Werewolf dice system differs from the Vampire system is explained in more detail below, but for now, the images to be displayed for dice in the HUD panels are as follows:

| Face | Image Reference |
| :--: | :--: |
| 1 | dieFace_werewolf_blank |
| 2 | dieFace_werewolf_blank |
| 3 | dieFace_werewolf_blank |
| 4 | dieFace_werewolf_blank |
| 5 | dieFace_werewolf_blank |
| 6 | dieFace_werewolf_scratch |
| 7 | dieFace_werewolf_scratch |
| 8 | dieFace_werewolf_scratch |
| 9 | dieFace_werewolf_scratch |
| 10 | dieFace_werewolf_crit |

### Rage Dice

This Storyteller-only dice bag is the partner to Werewolf Dice -- basically, this is _Werewolf: the Apocalypse_'s answer to Vampire's "Hunger Dice", and they work similarly (replacing a number of dice in dice pools equal to the werewolf's Rage score). Details on how Werewolf and Rage dice are resolved after being rolled are explained in more detail below, but for now, the images to be displayed for rage dice in the HUD panels are as follows:

| Face | Image Reference |
| :--: | :--: |
| 1 | dieFace_rage_jaws |
| 2 | dieFace_rage_jaws |
| 3 | dieFace_rage_blank |
| 4 | dieFace_rage_blank |
| 5 | dieFace_rage_blank |
| 6 | dieFace_rage_scratch |
| 7 | dieFace_rage_scratch |
| 8 | dieFace_rage_scratch |
| 9 | dieFace_rage_scratch |
| 10 | dieFace_rage_crit |

## Dice System Modifications - Player Rolls

### Current Behavior

| Action | Triggered Event |
| :--: | :-- |
| Player Clicks `DICEBAG_NORMAL` with no active roll | A player-initiated standard roll is triggered and sent to the Storyteller for approval to open the roll. |
| Player Clicks `DICEBAG_NORMAL` while assembling a dice pool for a standard roll | One die is added to the dice pool. Depending on the player's Hunger level, the die type added may be a Hunger die or a Normal die. |
| Player Clicks `DICEBAG_NORMAL` while assembling a dice pool for a Rouse Check | A Normal die is added to the dice pool. |
| Player Clicks `DICEBAG_HUNGER` with no active roll | A player-initiated Rouse Check is triggered and sent to the Storyteller for approval to open the roll. |
| Player Clicks `DICEBAG_HUNGER` while assembling a dice pool for a standard roll or a Rouse Check | A Hunger die is added to the pool, regardless of the player's Hunger rating. |

### New Behavior

Under the new system, the addition of a third dice bag (`DICEBAG_ROUSE`) allows for additions and changes to the above process to streamline the rolling process (changes to the current system are tagged with a ⭐):

| Action | Triggered Event |
| :--: | :-- |
| Player Clicks `DICEBAG_NORMAL` with no active roll | A player-initiated standard roll is triggered and sent to the Storyteller for approval to open the roll. _(No change)_ |
| Player Clicks `DICEBAG_NORMAL` while assembling a dice pool for a standard roll | One die is added to the dice pool. Depending on the player's Hunger level, the die type added may be a Hunger die or a Normal die. _(No change)_ |
| Player Clicks `DICEBAG_NORMAL` while assembling a dice pool for a dedicated Rouse or Oblivion-Rouse Check | ⭐ Promotes the roll to **STANDARD** (compound roll), then adds one Normal/Hunger die (Auto-Hunger). Existing rouse-family dice stay in the pool. ST difficulty is optional (implicit 1 at resolve when unset). |
| Player Clicks `DICEBAG_HUNGER` with no active roll | **No-op** (Hunger bag is disabled until a standard roll is opened to PRE_ROLL). |
| Player **left-clicks** `DICEBAG_HUNGER` while assembling a dice pool for a **standard** roll | ⭐ If Blood Surge is **off**, trigger Blood Surge (below). If surge is **on**, add one **Blood Surge rouse** die (`pool.bloodSurgeRouse`). |
| Player **right-clicks** `DICEBAG_NORMAL` during `PRE_ROLL` on a standard or compound roll | Remove one main-pool die (**Normal first**, else Hunger); cancel the roll if the pool total becomes zero. |
| Player **right-clicks** `DICEBAG_HUNGER` during a standard roll while Blood Surge is **active** | Remove **one** Blood Surge rouse die; when none remain, full Blood Surge undo (surge normal/hunger + `bloodSurgeActive`). While surge is **off**, **no-op**. |
| Player **right-clicks** `DICEBAG_ROUSE` / `DICEBAG_OBLIVROUSE` during `PRE_ROLL` | Remove one die of that kind **only if** the pool count for that kind is greater than zero; cancel if the pool becomes empty. |
| Player **left-clicks** `DICEBAG_ROUSE` while the pool already has Oblivion-Rouse dice (or vice versa) | **Silent fail** — bag click does nothing. |
| Player Clicks `DICEBAG_HUNGER` while assembling a dice pool for a dedicated Rouse or Oblivion-Rouse Check | **No-op** (Hunger bag does not add dice or reset the check). |
| Player Clicks `DICEBAG_ROUSE` or `DICEBAG_OBLIVROUSE` with no active roll | A player-initiated Rouse Check or Oblivion Rouse Check is triggered, confirmed, and automatically opened -- no waiting for the Storyteller to approve or open Rouse Checks |
| Player Clicks `DICEBAG_ROUSE` or `DICEBAG_OBLIVROUSE` while assembling a dice pool for a standard roll or a Rouse Check | A Rouse Die or Oblivion-Rouse Die is added to the dice pool. (The effect of Rouse Dice in standard dice pools is explained below.) |

#### Pool composition (standard rolls)

Every standard roll assembles **at most four logical groups**:

| Group | Pool keys | Notes |
| --- | --- | --- |
| **Main roll** | `normal` + `hunger` | One success test after any rouse steps |
| **Blood Surge rouse check** | `bloodSurgeRouse` | Tagged rouse dice (`script_state` / GM Notes); separate outcome strip from manual rouse |
| **Manual rouse check** | `rouse` | Rouse bag adds only; extra clicks add to the **same** manual check |
| **Oblivion-Rouse check** | `oblivRouse` | At most **one** oblivion-rouse check per roll |

**Manual rouse vs Oblivion-Rouse are mutually exclusive** (`pool.rouse` blocks Obliv bag; `pool.oblivRouse` blocks manual Rouse bag). **`bloodSurgeRouse` does not block Obliv** and does not disable the Obliv bag. **Blood Surge does not block on either manual kind** — Hunger bag activation is independent; `pool.rouse`, `pool.bloodSurgeRouse`, and `pool.oblivRouse` may all be present on one compound standard roll.

Blood Surge rouse dice are **tagged** (`DK.SCRIPT_STATE_BLOOD_SURGE_ROUSE`, GM Notes `|bloodSurge` suffix) and resolve on a separate **Blood Surge Rouse** strip before the manual **Rouse** strip.

#### Blood Surges

When a "Blood Surge" is triggered (Hunger bag left-click while surge is off on a standard roll):

1. Add **one** Blood Surge rouse die (`pool.bloodSurgeRouse`).
2. Add a number of Standard or Hunger dice (per hunger rules) equal to the player's Blood Surge rating (`bloodPotencyDerived().bloodSurge`, with `bloodSurgeDiceMultiplier` from roll policy). Surge-spawned normal/hunger dice are tracked for undo only (`script_state` `bloodSurgePool`).

**Additional surge rouse:** Hunger bag **left-click** while `bloodSurgeActive` adds another tagged rouse die.

**Undo Blood Surge rouse:** Hunger bag **right-click** while `bloodSurgeActive` removes **one** Blood Surge rouse die. When `bloodSurgeRouse` reaches zero, full undo runs: all surge-spawned normal/hunger dice removed, `bloodSurgeActive` cleared — **manual** `pool.rouse` dice are preserved. Hunger bag **right-click** while surge is **off** is a **no-op**.

**Bag visibility:** Hunger bag (Blood Surge UI) hidden (`y = -200`) by default; raised to rest Y during **standard** rolls in **PRE_ROLL** and **ROLLING** so the player can toggle Blood Surge and staged hunger dice are not left on a hidden bag. Hidden again at **POST_ROLL** and when the roll ends. Programmatic hunger spawns do **not** require raising it. **Staging arc:** all player dice stage on concentric rings centered on the **Normal bag** (Y-axis rotation only — `positionToWorld` for arc XZ; fixed world **Y = 8** for hover height because the bag pivot sits near table level, not sheet height) — Hunger (innermost), Normal, Rouse/Obliv-Rouse (shared ring), Blood Surge rouse (outermost). Arc **angles** are computed **per ring** (per radius), not from the bag’s total `spawnedDice` count — so a Blood Surge rouse die on the outer ring does not leave a gap in the manual rouse ring. Bags stay **locked** always (script moves them and `takeObject` works while locked). Rest Y for bags that load hidden is inferred from the seat’s Normal bag. Rouse and Obliv bags disable each other when the opposite manual kind is in the pool (`bloodSurgeRouse` does not disable Obliv).

#### Rouse/Oblivion-Rouse Dice in Standard Pools

After the main pool is rolled, resolve rouse-family dice in order:

1. Are there any Oblivion-Rouse Dice in the pool? If so, perform the following flow of checks:
  (A) **Did ALL Oblivion-Rouse dice roll the same number?** If NO, proceed to check (B). If YES, resolve the Oblivion Rouse check according to that number:
     `1` = +1 Hunger AND Confer a Stain
     `2-5` = +1 Hunger
     `6-9` = No Changes
     `10` = Confer a Stain
  (B) **Did ANY Oblivion-Rouse die roll a 6, 7, 8, or 9?** If YES, resolve the Oblivion Rouse check as succeeding, with no changes to Hunger or Stains. If NO, proceed to check (C).
  (C) **Did ANY Oblivion-Rouse die roll a 2, 3, 4, or 5?** If YES, proceed to check (D). If NO, then the dice pool contains at least one `10` -- resolve the Oblivion Rouse check according to that number (i.e. Confer a Stain, Hunger remains unchanged).
    (D) **Did ANY Oblivion-Rouse die roll a 10?** If YES, replace the Confirm button with two variations: "Confirm - Hunger" and "Confirm - Stain". If the player clicks "Confirm - Hunger", their Hunger increases by 1 (but they gain no Stain). If the player clicks "Confirm - Stain", they gain a Stain (but their Hunger remains unchanged). If NO, resolve the Oblivion Rouse check as a 2-5 result (i.e. +1 Hunger, no Stains conferred).
2. Are there any Rouse Dice in the pool? If so:
  - **Did ALL Rouse dice roll a 5 or lower?** If so, the player's Hunger is automatically increased by one once the result of the roll is Confirmed (in addition to any other Hunger increases from Oblivion-Rouse above).
3. If this roll was a Rouse Check, all dice have been processed by now and the result can be displayed and confirmed. Otherwise, after processing all Rouse and Oblivion-Rouse dice, continue to process the other dice in the pool as normal (assuming a standard roll).

All automatic changes to stats (i.e. Hunger or Stains) described above stack, and they should only be applied to the character once the roll result has been Confirmed (i.e. at the same time as the results are broadcast).

The broadcast results should include the results and dice faces for each of the above steps, separated from each other as if the rolls were performed in sequence rather than simultaneously.

Rouse Dice and Oblivion Rouse dice cannot be rerolled by spending Willpower, and should be locked during a Willpower reroll sequence.

## Dice System Modifications - Storyteller Rolls

In general, the same rules described above for player rolls apply to Storyteller rolls, with a few key differences:

### Initiating a Storyteller Roll

A Storyteller roll can be triggered from the NPC panel (by clicking the "R" button next to an NPC), or in the same way a player initiates a roll -- by clicking on one of the Storyteller dice bags.

* **Initiation via NPC Panel:** The roll should be tagged with the name of the NPC, both for displaying the results and to distinguish this roll from any simultaneous rolls the Storyteller might initiate for other NPCs.
* **Initiation via Clicking Dice Bag:** A popup modal containing an input box should be presented to the Storyteller, where the name of the character making the roll should be entered. As above, this name should be used to distinguish this roll from any other parallel rolls the Storyteller might initiate.

In both cases, if a second roll is initiated with the same name as a roll that has yet to be cleared from the table, a parenthetical index number should be appended to the end.  (E.g. if I initiate a roll by "Evangeline Dupont", that should be the roll's name. If I then initiate a second roll by "Evangeline Dupont", that roll should be named "Evangeline Dupont (2)")

Importantly, the Storyteller can only ever have one "live" roll active at a time. A "live" roll is defined as a roll that has not been confirmed and its results broadcast. Unlike player rolls, Storyteller rolls should not automatically be cleared off the table after a delay once the result is broadcast: The Storyteller must clear the roll by cancelling it in the Storyteller panel (this means that, unlike for player rolls, Storyteller rolls must remain in the Storyteller panel even after they have completed, so the Storyteller can remove them when appropriate.)

Up to three Storyteller rolls can exist at the same time. If the Storyteller attempts to initiate a fourth roll without cancelling one of the previous three, the attempt should be denied with a message telling the Storyteller they need to make space for the new roll by clearing one of the three existing NPC rolls.

### Adding Dice to Storyteller Rolls

There are three dice drawer objects, one for each of the three simultaneous Storyteller rolls allowed, and each dice drawer has a corresponding dice drawer light. When a Storyteller initiates a Storyteller roll, it should be assigned to the next available slot (i.e. Dice Drawer 1, 2 or 3), and it becomes the "live" roll (recall: the Storyteller cannot initiate a new roll if a "live" roll already exists, so there will only ever be one "live" roll).

The first time the Storyteller adds a die to the "live" roll, its dice drawer and dice drawer light should be activated. GUIDs for the dice drawers and lights are provided in `G.GUIDS`, the active and inactive positions for each dice drawer are given in `C.ObjectPositions`, and the "OFF" (inactive) and "STANDARD" (active) modes for each drawer light are given in `L.LIGHTMODES`.

Importantly, unlike with player dice bags, the Storyteller dice bags are not located near the dice drawer. When spawning dice into a Storyteller roll, the arc center is `STD.arcCenterForSlot`: drawer X, Y = `5`, Z = drawer Z **+ 6** (world-space offset along +Z from the drawer center).

### Rolling Storyteller Rolls

Unlike with player rolls, when the Storyteller clicks "Roll", the dice should be randomized automatically -- no waiting for the Storyteller to manually roll the dice.

## Dice System Modifications - Werewolf Rolls

A "Werewolf Roll" is a roll that contains some combination of Werewolf Dice and/or Rage Dice. Only the Storyteller can initiate Werewolf Rolls, and they count as Storyteller rolls, so the mechanics described in the preceding section apply to these rolls as well.

The Storyteller has full control of the number of Werewolf Dice and Rage Dice present in the pool: They spawn in whichever quantity of each they desire by clicking the respective Storyteller dice bag during dice assembly.

Werewolf and Rage dice cannot be combined with any other dice type, and vice versa: Attempting to add a different dice type to a Werewolf Roll, or attempting to add Werewolf or Rage dice to a non-Werewolf roll, should be denied with an alert to the Storyteller.

### Resolving Werewolf Rolls

The primary difference regarding Werewolf Rolls is how the dice results are determined: _Werewolf: the Apocalypse_ uses a different system than _Vampire: the Masquerade_.

The following mechanics remain the same:

* **+2 Successes for Paired 10s:** Pairs of 10s, whether Werewolf Dice, Rage Dice, or both of them combined, count as successes on their own, and then add an additional two successes on top, just as with Normal and Hunger dice for Vampire rolls.
* **Willpower Rerolls:** Willpower can be spent to reroll up to three dice.
* **Take Half:** Werewolf rolls can also Take Half, as with Vampire rolls.

#### The Differences

* **No Messy Criticals:** Dice type is irrelevant when processing pairs of tens: Whether Werewolf or Rage dice, pairs of 10s are always clean Criticals.
* **No Bestial Failures:** Rolling a 1 on a Rage Die and failing the roll does not result in a Bestial Failure.
* **Willpower Rerolls CAN Reroll Rage Dice:** With the exception of Rage Dice resulting in a 1 or a 2 (see "Brutal Outcomes", below), Rage Dice CAN be rerolled with Willpower. During a Willpower reroll, only Rage Dice showing a 1 or 2 should be locked (unlike with Hunger Dice, where all Hunger Dice are locked for rerolls).
* **Brutal Outcomes:** Regardless of the number of successes rolled, if _two or more_ Rage Dice roll a 1 or a 2, the result of the roll is converted into a **Brutal Outcome**, as described below.

##### Brutal Outcomes

When a Werewolf roll results in a Brutal Outcome, the "Confirm" button should be replaced with two different buttons: "Confirm Fail" and "Confirm Violence".

If "Confirm Fail" is clicked, the result should be converted as follows:

| Calculated Result | Final Result | Broadcast Result |
| :--: | :--: | :--: |
| Total Failure | (unchanged) | "Total Brutal Failure" |
| Failure | (unchanged) | "Brutal Failure" |
| Win | Failure, margin -1 | "Brutal Failure" |
| Critical Win | Failure, margin -1 | "Brutal Failure" |

If "Confirm Violence" is clicked, **four additional successes** should be added to the roll, and the result recalculated accordingly. The broadcast result should be named as follows:

| Recalculated Result | Broadcast Result |
| :--: | :--: |
| Total Failure | "Total Brutal Failure" |
| Failure | "Brutal Failure" |
| Win | "Brutal Win" |
| Critical Win | "Brutal Critical" |

---

## Implementation notes (May 2026)

Code paths: `lib/dice_kinds.ttslua`, `lib/rouse_outcomes.ttslua`, `core/roll_controller.ttslua`, `core/storyteller_rolls.ttslua`, `lib/st_dice_drawer.ttslua`, `objects/dice_bag.ttslua`, `core/global_script.ttslua`, `core/roll_ui.ttslua`, `ui/shared/roll_panels.xml`.

- **ST rolls** use seat `Black` + `gameState.storytellerRolls` (three drawer slots). Resolved dice are **not** auto-destroyed; clear via dashboard slot **CLEAR** (`STR.cancelSlot`).
- **ST dashboard ROLL** unlocks tray dice, then calls `Object.randomize()` per die (physical tumble, same as R key), staggered ~0.1s — not a silent face assignment.
- **ST roll control panel** (`rollPanel_Black`, `Black|Host`): same controls as player panels (pool, ROLL, **TAKE HALF**, WP, RECALCULATE, CONFIRM, Obliv/Brutal) alongside the sidebar dashboard. Take Half uses the same rules as player rolls (PRE_ROLL, difficulty set, roll type allowed, roll option enabled).
- **ST slot CLEAR** (`rollDash_stCancel_1..3` → `HUD_rollCancel`): must be handled before `colorFromRollElementId` (slot ids have no `_<Color>` suffix).
- **Dice bag right-click** (`objects/dice_bag.ttslua` `click_roll` `alt_click`): routes to `GlobalDiceBagRightClick` / `STR.onDiceBagRightClick` — remove last staged die; empty pool cancels roll.
- **Brutal Outcome confirm** (`RC.confirmBrutalChoice` → `RC.confirmRoll`): `confirmRoll` must **not** call `recalculate` after a brutal choice; result carries `brutalNarrative` for broadcast (e.g. "Brutal Win") and adjusted successes/margin.
- **Frenzy queue** (`maybeQueueFrenzyOnHungerCap`): after rouse hunger increases, queue Frenzy only when hunger was **already at** `C.MAX_HUNGER` before the bump (would exceed cap; not on first transition to max).
- **ST bag → name modal** when no live roll; **NPC panel R** → `STR.initiateNpcRoll`.
- **First die in pool (any kind):** `GlobalOnBagDieSpawned` opens the player `DiceDrawer` or ST slot drawer when pool total goes from 0 → >0 in `PRE_ROLL`/`ROLLING` (covers Auto-Hunger hunger-bag spawns, not only normal-bag leave-container). `onObjectLeaveContainer` still opens as a backup on bag takeObject.
- **ST-initiated Rouse/Obliv (PCS panel or NPC roll):** after `RC.initiateRoll`, call `GlobalSpawnDefaultPoolDiceForActive` so the default staged die spawns and the drawer opens on first pool die.
- **Single rouse check:** `RC._buildRouseStripsForActive` emits one **Rouse** strip (all `pool.rouse` dice) and one **Oblivion Rouse** strip when applicable — no separate Blood Surge rouse strip.
- **Rouse/Obliv exclusivity:** `DK.rouseKindBlockedByPool` + `GlobalRollSpawnDieRequest` return `nil` (silent bag fail).
- **Blood Surge activation:** `RC.activateBloodSurge` uses `EffectiveStats.forSeat` → `bloodPotencyDerived().bloodSurge` and fresh `ctx.rollPolicy()` for `bloodSurgeDiceMultiplier`. **No pool rouse-family count blocks surge** (`pool.rouse`, `pool.bloodSurgeRouse`, and `pool.oblivRouse` may coexist). Bag visibility only: when `pool.oblivRouse > 0`, the manual Rouse bag is hidden; when `pool.rouse > 0`, the Obliv bag is hidden — Hunger bag stays enabled for surge. Surge rouse dice use `pool.bloodSurgeRouse`, not `pool.rouse` (manual and surge rouse share the physical Rouse bag with separate pool keys).
- **Blood Surge undo:** Hunger bag right-click → `RC.deactivateBloodSurge` → `GlobalDestroyBloodSurgeDice` (all rouse for roll + surge normal/hunger with `bloodSurgePool` script_state).
- **Take Half + Rouse:** if the pool has Rouse/Oblivion-Rouse dice, Take Half applies only to normal+hunger (`DK.nonRouseVampirePoolTotal`), destroys those dice, releases Rouse dice to roll (`takeHalfAwaitingRouse`), then `onDieSettledSignal` debounce → `recalculate` merges strips when all expected rouse dice are on-table with readable faces (locks them on merge) before POST_ROLL.
- **Console helpers:** `rollTest`, `rollStTest`, `rollStSlots` (see `.dev/testbed/TEST BED.ttslua` region 11).
- **Plan / checklist:** `.dev/plans/dice-system-pt2-implementation.md`.
