# Dice System — Full Design Plan

> **Status:** Implementation-ready design. This document fully replaces the preliminary outline.
> **Scope:** All layers — VTM5E mechanics, Lua architecture, state model, control flow, UI panels, physical dice integration, and phased implementation roadmap.

---

## 1. VTM5E Dice Mechanics Reference

This section is the canonical rules reference for the system. Every design decision in later sections traces back to one of these rules.

### 1.1 The Dice Pool

- A roll uses a pool of **d10s** equal to an Attribute + Skill (or other combination).
- A number of dice equal to the character's current **Hunger** level are **Hunger Dice** (distinguished physically; typically red); the remainder are **Normal Dice**.
- If a character's Hunger exceeds the pool size, the entire pool is Hunger Dice.

### 1.2 Counting Successes

- Any die showing **6 or higher** = 1 success.
- **Critical Success** pairs: every pair of 10s in the pool (across both Normal and Hunger dice) grants **+2 bonus successes** on top of the 2 from the dice themselves. Each die showing 10 counts as a success AND contributes to pair formation. Three 10s = 1 pair (+2 bonus) + 1 unpaired 10 (+1 success) = 5 successes from 3 dice. Formula:
  - `pairs = floor(count_of_tens / 2)`
  - `base_successes = count of all dice >= 6`
  - `total_successes = base_successes + (pairs * 2)`

### 1.3 Result Classification (7 Classes)

The result class is determined by the combination of total successes, difficulty, and the specific faces shown on Hunger dice. Priority order for classification: Messy Critical > Critical Win > Win > Bestial Failure > Failure > Total Failure (> Total Bestial Failure as a sub-class of Bestial Failure).

| Result Class | Successes vs. Difficulty | Critical Pair? | Hunger Die Shows 10? | Hunger Die Shows 1? |
|---|---|---|---|---|
| **Messy Critical** | `>= difficulty` | Yes | Yes (at least one) | — |
| **Critical Win** | `>= difficulty` | Yes | No | — |
| **Win** | `>= difficulty` | No | — | — |
| **Failure** | `< difficulty` (> 0) | — | — | No |
| **Bestial Failure** | `< difficulty` | — | — | Yes (at least one) |
| **Total Failure** | 0 | — | — | No |
| **Total Bestial Failure** | 0 | — | — | Yes (at least one) |

**Difficulty** is required to classify a result. Until difficulty is set, dice values are recorded but classification is deferred (see §4.3 for how this enables opposed-roll patterns without special-casing).

### 1.4 Rouse Checks

A Rouse Check is a single-die roll with no Hunger dice. Roll 1 Normal d10:
- **Success (6–10):** No consequence.
- **Failure (1–5):** Hunger increases by 1. If Hunger was already 5, the character must attempt a **Frenzy roll** (Composure + Resolve vs. difficulty set by ST, typically 2–4).

**Oblivion Rouse Check** (when risking Stains for an Oblivion power): Same as above, but on failure, the character also gains **1 Stain** in addition to the Hunger increase.

Multiple Rouse Checks (e.g., healing 3 Aggravated Health) are queued and resolved sequentially; each result is applied immediately before the next die is rolled.

### 1.5 Remorse Rolls

Used at end-of-session to resolve accumulated Stains.
- Pool = number of **empty** (unstained, unscarred) Humanity boxes = `10 - current_humanity - stains`. Minimum 1 die even if pool would be 0.
- **No Hunger dice.** No critical pairs apply (pairs of 10s are still counted as successes, but have no narrative significance).
- **Any success:** Humanity is preserved; all Stains clear.
- **All failures:** Humanity permanently decreases by 1; all Stains clear.
- Available only when `currentPhase == "end"`.

### 1.6 Willpower Rerolls

Once per roll (during `POST_ROLL` phase, before result is confirmed):
- Player suffers **1 Superficial Willpower damage**.
- Player may choose up to **3 dice** from their pool to reroll (physically pick up and throw).
- The system records that a reroll occurred; second die readings replace only the rerolled dice.
- Willpower rerolls are **not** available for Rouse Checks or Remorse rolls.
- Custom chronicle rules may expand or restrict this (tracked in `rollData.active.willpower`).

### 1.7 "Take Half" (Automatic Success)

- Before rolling (in `PRE_ROLL` phase), a player may opt to take automatic successes equal to **half the pool size** (rounded down) instead of rolling.
- Only available when a difficulty has been set by the Storyteller.
- Not available for Rouse Checks, Remorse rolls, Frenzy rolls, or Humanity rolls.
- Result class when taking half: **Win** (never Critical Win or Messy Critical since no dice are rolled).

### 1.8 Extended Rolls *(Phase 3)*

A series of rolls toward a cumulative success target:
- Defined by `targetSuccesses` (total needed) and `maxRolls` (maximum attempts).
- Each individual roll produces a sub-result; successes accumulate.
- A Bestial Failure or Total Bestial Failure on any sub-roll may have catastrophic consequences (per ST ruling).
- When `accumulatedSuccesses >= targetSuccesses`, the extended roll is resolved as a success.
- If `maxRolls` is exhausted before the target is reached, the extended roll fails.

### 1.9 Teamwork Rolls *(Phase 3)*

Multiple characters contribute to a single roll:
- One character is the **primary actor**; others are **contributors**.
- Each contributor rolls their own relevant pool. For every contributor who achieves at least **1 success**, their total successes are added to the primary actor's pool (as bonus dice or successes, per ST ruling).
- The primary actor then rolls their own pool with the accumulated bonus.
- A Bestial Failure or Total Bestial Failure by the primary actor overrides any contributor successes.

### 1.10 Opposed Rolls *(Phase 3 / Enabled by Difficulty Decoupling)*

Two characters roll against each other:
- Both parties roll their relevant pools independently.
- The party with more total successes wins. Ties typically go to the attacker or active party (ST ruling).
- **Implementation:** The Storyteller sets the difficulty for one roll equal to the result of the opposing roll (post-hoc difficulty assignment; see §4.3). This requires no dedicated code path.

---

## 2. Architecture Overview

### 2.1 Module Structure

Three new Lua modules are introduced, following the project's standard pattern:

```
core/dice.ttslua           -- Pure VTM5E math engine (no TTS dependencies)
core/roll_controller.ttslua -- Baton-passing state machine and flow control
core/roll_ui.ttslua        -- Translates roll state into TTS XML UI updates
```

Supporting changes:
- `lib/constants.ttslua` — new enumerations (RollType, RollPhase, BatonHolder, ResultClass)
- `core/state.ttslua` — `rollData` default in `getDefaultPlayerHUD()`
- `lib/guids.ttslua` — dice bag GUIDs + helper functions
- `core/global_script.ttslua` — `onObjectRandomize` hook + module requires
- `ui/shared/roll_panels.xml` — new XML panels (new file, included from `ui/Global.xml`)
- `ui/storyteller/panel_storyteller_toolbar.xml` — ST Roll Dashboard section

### 2.2 Dependency Graph

```
core/global_script
    ├── core/roll_controller   (requires core/dice, core/state, lib/constants, lib/guids)
    ├── core/roll_ui           (requires core/roll_controller, lib/constants)
    └── onObjectRandomize hook → core/roll_controller.onDieRandomized()
```

`core/dice` has **zero** TTS dependencies and can be unit-tested in isolation via the TTS console or external test harness.

### 2.3 Obsolete Code

The following are retired by this system. Their physical dice bag objects in TTS are preserved as props but their Lua scripts are no longer called:
- `lib/dice-roller.ttslua` — replaced by `core/dice.ttslua` + `core/roll_controller.ttslua`
- MrStump click-roller logic in bundled `DICE_NORMAL_*` and `DICE_HUNGER_*` object scripts
- `ui/shared/hud_shared.xml` `diceResultsPanel` — replaced by the richer panels in `ui/shared/roll_panels.xml`

---

## 3. Constants Additions (`lib/constants.ttslua`)

Add the following blocks after the existing `C.DICE_SUCCESS_THRESHOLD` / `C.DICE_CRITICAL_SUCCESS_VALUE` lines:

```lua
-- ============================================================================
-- DICE SYSTEM ENUMERATIONS
-- ============================================================================

--- Roll types. Determines pool construction rules and available options.
-- STANDARD / DISCIPLINE: Normal pool with Hunger dice.
-- ROUSE / ROUSE_OBLIVION: Single Normal die, no Hunger dice.
-- REMORSE: No Hunger dice; pool = empty Humanity boxes (min 1).
-- WILLPOWER_ROLL / HUMANITY_ROLL / FRENZY: Normal pool, no Hunger dice.
C.RollType = {
    STANDARD        = "standard",
    DISCIPLINE      = "discipline",
    ROUSE           = "rouse",
    ROUSE_OBLIVION  = "rouseOblivion",
    REMORSE         = "remorse",
    WILLPOWER_ROLL  = "willpowerRoll",
    HUMANITY_ROLL   = "humanityRoll",
    FRENZY          = "frenzy",
}

--- Roll phases. Each roll progresses through these states in order.
-- SETUP:     Roll initiated; ST is being asked to set parameters.
-- PRE_ROLL:  Parameters confirmed; player may Take Half or proceed to roll.
-- ROLLING:   Dice out; system is waiting for all dice to settle.
-- POST_ROLL: Dice read; Willpower reroll is available; waiting for confirmation.
-- RESOLVED:  Final result calculated and broadcast to all players.
C.RollPhase = {
    SETUP       = "setup",
    PRE_ROLL    = "preRoll",
    ROLLING     = "rolling",
    POST_ROLL   = "postRoll",
    RESOLVED    = "resolved",
}

--- Who currently holds the "baton" (i.e. whose action is required to advance the roll).
C.BatonHolder = {
    PLAYER      = "player",
    STORYTELLER = "storyteller",
    AUTO        = "auto",   -- System advances automatically (no human input required)
}

--- Result classification for a completed roll.
-- See §1.3 of Dice System Outline for classification rules.
C.ResultClass = {
    MESSY_CRITICAL          = "messyCritical",
    CRITICAL_WIN            = "criticalWin",
    WIN                     = "win",
    FAILURE                 = "failure",
    BESTIAL_FAILURE         = "bestialFailure",
    TOTAL_FAILURE           = "totalFailure",
    TOTAL_BESTIAL_FAILURE   = "totalBestialFailure",
}

--- Human-readable labels for result classes (used in chat broadcast and UI).
C.ResultClassLabel = {
    messyCritical           = "MESSY CRITICAL",
    criticalWin             = "CRITICAL WIN",
    win                     = "SUCCESS",
    failure                 = "FAILURE",
    bestialFailure          = "BESTIAL FAILURE",
    totalFailure            = "TOTAL FAILURE",
    totalBestialFailure     = "TOTAL BESTIAL FAILURE",
}

--- Roll types that do not use Hunger dice.
C.RollTypesWithoutHunger = {
    [C.RollType.ROUSE]          = true,
    [C.RollType.ROUSE_OBLIVION] = true,
    [C.RollType.REMORSE]        = true,
    [C.RollType.WILLPOWER_ROLL] = true,
    [C.RollType.HUMANITY_ROLL]  = true,
    [C.RollType.FRENZY]         = true,
}

--- Roll types for which Take Half is not available.
C.RollTypesNoTakeHalf = {
    [C.RollType.ROUSE]          = true,
    [C.RollType.ROUSE_OBLIVION] = true,
    [C.RollType.REMORSE]        = true,
    [C.RollType.FRENZY]         = true,
    [C.RollType.HUMANITY_ROLL]  = true,
}

--- Roll types for which Willpower reroll is not available.
C.RollTypesNoWillpower = {
    [C.RollType.ROUSE]          = true,
    [C.RollType.ROUSE_OBLIVION] = true,
    [C.RollType.REMORSE]        = true,
}

--- Debounce window (seconds) to wait after the last die randomizes before reading values.
C.DICE_SETTLE_DEBOUNCE_SECONDS = 3

--- Display label strings for roll types (for UI panels and chat).
C.RollTypeLabel = {
    standard        = "Standard Roll",
    discipline      = "Discipline Roll",
    rouse           = "Rouse Check",
    rouseOblivion   = "Rouse Check (Oblivion)",
    remorse         = "Remorse Roll",
    willpowerRoll   = "Willpower Roll",
    humanityRoll    = "Humanity Roll",
    frenzy          = "Frenzy Roll",
}
```

---

## 4. State Model (`core/state.ttslua`)

### 4.1 `playerData.rollData` Shape

Add to `getDefaultPlayerHUD()` (appended to the returned table):

```lua
rollData = {
    -- The currently active roll for this player. nil when no roll is in progress.
    active = nil,
    -- Sequential queue of roll configs (e.g., 3 Rouse Checks for aggravated healing).
    -- Each entry is a RollConfig table (same shape as the fields used to call initiateRoll).
    queue = {},
    -- Rolling history: last N resolved roll results (for display/debug).
    history = {},
}
```

### 4.2 `active` Roll Record Shape

The `active` field is `nil` or a table with this shape:

```lua
active = {
    -- Unique identifier for this roll (timestamp string).
    id = string,

    -- Roll type (C.RollType value).
    rollType = string,

    -- Current phase (C.RollPhase value).
    phase = string,

    -- Who holds the baton (C.BatonHolder value).
    batonHolder = string,

    -- Optional human-readable label set by ST or player (e.g. "Stealth vs Security Guard").
    label = string | nil,

    -- Dice pool composition as set when the roll was initiated.
    -- For Rouse: normal=1, hunger=0.
    -- For Remorse: normal = max(1, emptyHumanityBoxes), hunger=0.
    pool = {
        normal = number,    -- Number of normal dice
        hunger = number,    -- Number of hunger dice (0 for no-hunger roll types)
    },

    -- Difficulty. nil until ST sets it. Classification deferred until set.
    difficulty = number | nil,

    -- Whether the player chose Take Half instead of rolling.
    tookHalf = boolean,

    -- Dice values as read from physical objects after rolling.
    -- nil until dice settle (ROLLING → POST_ROLL transition).
    dice = {
        normal = {number},  -- Array of face values for normal dice
        hunger = {number},  -- Array of face values for hunger dice
    } | nil,

    -- Computed result. nil until dice values are available AND difficulty is set.
    result = {
        successes     = number,
        pairs         = number,
        bonusSuccesses = number,
        resultClass   = string,     -- C.ResultClass value
        margin        = number,     -- successes - difficulty (can be negative)
        hasTens       = boolean,    -- any die (normal or hunger) shows 10
        hungerTens    = boolean,    -- any hunger die shows 10
        hungerOnes    = boolean,    -- any hunger die shows 1
    } | nil,

    -- Willpower reroll slot. One reroll permitted per roll (subject to roll type restrictions).
    willpower = {
        available = boolean,    -- Whether a Willpower reroll is still permitted
        spent     = boolean,    -- Whether Willpower was spent this roll
        -- Indices (1-based) into dice.normal/hunger arrays for rerolled dice.
        -- nil until a reroll is committed.
        rerolledNormal = {number} | nil,
        rerolledHunger = {number} | nil,
    },

    -- Extended roll sub-record. nil unless this is an extended roll (Phase 3).
    extended = {
        targetSuccesses      = number,
        maxRolls             = number,
        rollCount            = number,
        accumulatedSuccesses = number,
        subResults           = {result...},
    } | nil,

    -- Teamwork sub-record. nil unless this is a teamwork roll (Phase 3).
    teamwork = {
        primaryColor       = string,
        contributorColors  = {string},
        contributorResults = { [color] = result },
    } | nil,

    -- Opposed sub-record. nil unless this is an opposed roll (Phase 3 / post-hoc difficulty).
    -- The ST sets active.difficulty = opponentSuccesses after the opponent's roll resolves.
    opposed = {
        opponentColor     = string | nil,
        opponentSuccesses = number | nil,
    } | nil,
}
```

### 4.3 Key Design Principle: Difficulty Decoupling

`active.difficulty` is **not** required when a roll is initiated. This is deliberate:

- **Pre-roll difficulty:** ST sets `difficulty` during `SETUP` or `PRE_ROLL`; player rolls knowing the target.
- **Post-roll difficulty:** ST sets `difficulty` after dice settle, during `POST_ROLL`. This naturally handles:
  - **Opposed rolls:** ST sets `difficulty = opponent's successes` after both parties have rolled.
  - **Hidden difficulty:** ST reveals the difficulty after seeing the outcome (narrative pacing).
  - **Mistake correction:** ST can revise `difficulty` before confirming.
- The result is only classified (`active.result`) when BOTH `active.dice` AND `active.difficulty` are non-nil.
- `roll_controller.tryClassifyResult(color)` is called any time either field changes; it no-ops if either is still nil.

---

## 5. GUID Additions (`lib/guids.ttslua`)

Add the following to `G.GUIDS` (sourced from `.dev/tts-color-object-tags-by-seat.md`):

```lua
-- Dice bags (one per seat color; each bag spawns d10 objects when rolled)
DICE_HUNGER_BROWN   = "e3d48a",
DICE_HUNGER_ORANGE  = "846db1",
DICE_HUNGER_RED     = "6d1c15",
DICE_HUNGER_PINK    = "90f17d",
DICE_HUNGER_PURPLE  = "496dd5",

DICE_NORMAL_BROWN   = "b5b3bd",
DICE_NORMAL_ORANGE  = "a0766e",
DICE_NORMAL_RED     = "a3ae6c",
DICE_NORMAL_PINK    = "4637da",
DICE_NORMAL_PURPLE  = "03cb81",
```

Add the following helper functions:

```lua
--- Gets the GUID for a player's Normal dice bag.
-- @param color string Player color (Brown/Orange/Red/Pink/Purple)
-- @return string|nil
function G.GetDiceNormalGUID(color)
    if color == nil then return nil end
    return G.GUIDS["DICE_NORMAL_" .. string.upper(color)]
end

--- Gets the GUID for a player's Hunger dice bag.
-- @param color string Player color (Brown/Orange/Red/Pink/Purple)
-- @return string|nil
function G.GetDiceHungerGUID(color)
    if color == nil then return nil end
    return G.GUIDS["DICE_HUNGER_" .. string.upper(color)]
end

--- Returns the player color and die type ("normal"|"hunger") for a given object GUID,
--- or nil if the object is not a recognized dice bag.
-- @param guid string Object GUID
-- @return string|nil color, string|nil dieType
function G.GetDiceOwner(guid)
    if guid == nil then return nil, nil end
    for _, color in ipairs({"Brown", "Orange", "Red", "Pink", "Purple"}) do
        if G.GUIDS["DICE_NORMAL_" .. string.upper(color)] == guid then
            return color, "normal"
        end
        if G.GUIDS["DICE_HUNGER_" .. string.upper(color)] == guid then
            return color, "hunger"
        end
    end
    return nil, nil
end
```

---

## 6. Module: `core/dice.ttslua`

Pure math engine. No `require` for TTS modules; only `lib.constants` and `lib.util`.

### 6.1 Exported Functions

```lua
--- Count the number of pairs of 10s in a set of dice values.
-- @param values table Array of die face values
-- @return number
function Dice.countPairs(values) end

--- Count base successes (dice >= C.DICE_SUCCESS_THRESHOLD) in a set of values.
-- @param values table Array of die face values
-- @return number
function Dice.countBasicSuccesses(values) end

--- Check if any value in the array equals the target.
-- @param values table Array of die face values
-- @param target number
-- @return boolean
function Dice.anyEquals(values, target) end

--- Compute total successes for a pool (normal + hunger dice combined).
-- Accounts for critical pair bonuses.
-- @param normalDice table Array of normal die values
-- @param hungerDice table Array of hunger die values
-- @return number totalSuccesses, number pairs, number bonusSuccesses
function Dice.computeSuccesses(normalDice, hungerDice) end

--- Classify a completed roll result.
-- Returns nil if difficulty is nil (classification deferred).
-- @param normalDice table Array of normal die values
-- @param hungerDice table Array of hunger die values (empty table for no-hunger rolls)
-- @param difficulty number|nil
-- @return table|nil  { successes, pairs, bonusSuccesses, resultClass, margin,
--                      hasTens, hungerTens, hungerOnes }
function Dice.classifyRoll(normalDice, hungerDice, difficulty) end

--- Calculate the Remorse roll pool size for a character.
-- Pool = max(1, 10 - currentHumanity - stains)
-- @param currentHumanity number
-- @param stains number
-- @return number
function Dice.remorsePool(currentHumanity, stains) end

--- Calculate the Take Half value for a pool.
-- @param poolSize number  Total dice in pool (normal + hunger)
-- @return number  Floor of poolSize / 2
function Dice.takeHalf(poolSize) end

--- Format a set of dice values as a display string.
-- Normal dice values are shown plainly; hunger dice values are shown in brackets.
-- Example: "3 7 [10] 4 [1]"
-- @param normalDice table
-- @param hungerDice table
-- @return string
function Dice.formatDiceDisplay(normalDice, hungerDice) end
```

### 6.2 Classification Algorithm (Pseudocode)

```
function classifyRoll(normalDice, hungerDice, difficulty):
    if difficulty == nil: return nil

    totalNormal = concat(normalDice, hungerDice)
    pairs = floor(count_of(totalNormal, equals 10) / 2)
    base  = count_of(totalNormal, >= 6)
    total = base + pairs * 2

    hasTens     = any(totalNormal, == 10)
    hungerTens  = any(hungerDice,  == 10)
    hungerOnes  = any(hungerDice,  == 1)
    margin      = total - difficulty

    if total >= difficulty:
        if pairs > 0 and hungerTens:  return MESSY_CRITICAL
        if pairs > 0:                 return CRITICAL_WIN
        return WIN
    else:
        if total == 0 and hungerOnes: return TOTAL_BESTIAL_FAILURE
        if hungerOnes:                return BESTIAL_FAILURE
        if total == 0:                return TOTAL_FAILURE
        return FAILURE
```

---

## 7. Module: `core/roll_controller.ttslua`

The baton-passing state machine. Requires: `core.dice`, `core.state`, `lib.constants`, `lib.guids`, `lib.util`.

### 7.1 Public API

```lua
--- Initiate a new roll for a player. Sets phase = SETUP, baton = STORYTELLER.
-- @param color string Player seat color
-- @param config table { rollType, label?, pool?, difficulty? }
--   pool is optional; defaults are:
--     ROUSE/ROUSE_OBLIVION: { normal=1, hunger=0 }
--     REMORSE: { normal=Dice.remorsePool(...), hunger=0 }
--     Others: { normal=0, hunger=0 } (ST or player sets pool in SETUP)
-- @return boolean success
function RC.initiateRoll(color, config) end

--- ST sets (or revises) the difficulty for a player's active roll.
-- Triggers result classification if dice values are already present.
-- Callable in any phase except RESOLVED.
-- @param color string Player seat color
-- @param difficulty number
-- @return boolean success
function RC.setDifficulty(color, difficulty) end

--- ST or player sets the pool size for an active roll in SETUP phase.
-- @param color string  Player seat color
-- @param normal number
-- @param hunger number
-- @return boolean success
function RC.setPool(color, normal, hunger) end

--- Advances the roll from SETUP to PRE_ROLL (ST "opens" the roll for the player).
-- Baton passes to PLAYER.
-- @param color string
-- @return boolean success
function RC.openRoll(color) end

--- Player opts to Take Half instead of rolling.
-- Requires: phase == PRE_ROLL, difficulty set, roll type supports take-half.
-- Records tookHalf = true, computes successes = takeHalf(pool), classifies result.
-- Advances to POST_ROLL.
-- @param color string
-- @return boolean success
function RC.takeHalf(color) end

--- Called when a die settles for a player's active roll.
-- Accumulates the die value and resets the debounce timer.
-- @param color string  Player seat color
-- @param dieType string  "normal" or "hunger"
-- @param value number  Face value of the settled die
function RC.onDieRandomized(color, dieType, value) end

--- Called by the debounce timer when all dice appear to have settled.
-- Reads accumulated values, computes result (if difficulty set), advances to POST_ROLL.
-- @param color string
function RC.onDiceSettled(color) end

--- Player spends Willpower to reroll up to 3 dice.
-- Requires: phase == POST_ROLL, willpower.available == true.
-- Marks willpower.spent = true, re-enters ROLLING phase for a targeted reroll.
-- Suffers 1 Superficial Willpower damage via state.
-- @param color string
-- @return boolean success
function RC.spendWillpower(color) end

--- Player or ST confirms the roll result (no more changes).
-- Advances phase to RESOLVED. Broadcasts result. Clears active roll.
-- Processes next entry in queue, if any.
-- @param color string
-- @return boolean success
function RC.confirmRoll(color) end

--- ST overrides the result class of an active roll (error correction / narrative adjustment).
-- @param color string
-- @param resultClass string  C.ResultClass value
-- @return boolean success
function RC.overrideResult(color, resultClass) end

--- Cancel the active roll without resolving it.
-- Also cancels any pending queue.
-- @param color string
-- @return boolean success
function RC.cancelRoll(color) end

--- Queue a RollConfig for sequential execution after the current active roll resolves.
-- Used for multi-rouse chains (e.g., aggravated healing = 3 Rouse Checks).
-- @param color string
-- @param config table  Same shape as config in initiateRoll()
function RC.queueRoll(color, config) end

--- Broadcast the resolved result to all players via chat and result panel.
-- Called automatically by confirmRoll().
-- @param color string
-- @param result table  active.result snapshot
-- @param label string|nil
function RC.broadcastResult(color, result, label) end

--- Re-classifies the active roll's result if both dice and difficulty are present.
-- No-ops if either is missing. Called internally by setDifficulty and onDiceSettled.
-- @param color string
function RC.tryClassifyResult(color) end
```

### 7.2 Internal Die Accumulation

To handle physical dice rolling (multiple dice settling over time), the controller uses an internal accumulation table and a debounce coroutine:

```lua
-- Internal accumulator (not persisted to state; transient during ROLLING phase)
-- RC._pendingDice[color] = { normal = {values...}, hunger = {values...} }
-- RC._debounceTimer[color] = coroutine handle (reset on each new die event)
```

When `RC.onDieRandomized(color, dieType, value)` is called:
1. Append `value` to `RC._pendingDice[color][dieType]`.
2. Cancel existing `RC._debounceTimer[color]` if present.
3. Start new `C.DICE_SETTLE_DEBOUNCE_SECONDS`-second timer that calls `RC.onDiceSettled(color)`.

When `RC.onDiceSettled(color)` fires:
1. Copy `RC._pendingDice[color]` into `active.dice`.
2. Clear `RC._pendingDice[color]`.
3. Call `RC.tryClassifyResult(color)`.
4. Advance phase to `POST_ROLL`.
5. Set `willpower.available = true` if roll type permits it.
6. Call `RC_UI.refreshPlayerRollPanel(color)` and `RC_UI.refreshSTDashboard()`.

### 7.3 Phase Transition Table

| From Phase | Trigger | To Phase | Baton Moves To |
|---|---|---|---|
| `SETUP` | `RC.openRoll(color)` | `PRE_ROLL` | PLAYER |
| `PRE_ROLL` | `RC.takeHalf(color)` | `POST_ROLL` | PLAYER |
| `PRE_ROLL` | Player clicks "Roll" in UI | `ROLLING` | AUTO |
| `ROLLING` | All dice settled (debounce) | `POST_ROLL` | PLAYER |
| `POST_ROLL` | `RC.spendWillpower(color)` | `ROLLING` (reroll) | AUTO |
| `POST_ROLL` | `RC.confirmRoll(color)` | `RESOLVED` | AUTO |
| `RESOLVED` | — | — (roll cleared) | — |
| Any | `RC.cancelRoll(color)` | — (roll cleared) | — |

ST may call `RC.setDifficulty` or `RC.overrideResult` at any phase except `RESOLVED`.

---

## 8. Module: `core/roll_ui.ttslua`

Translates roll state into TTS XML UI updates. Requires: `core.roll_controller`, `lib.constants`, `lib.util`.

### 8.1 Public API

```lua
--- Refresh the ST Roll Dashboard to show all active player rolls.
function RUI.refreshSTDashboard() end

--- Refresh a specific player's roll panel to match their current rollData.active state.
-- @param color string
function RUI.refreshPlayerRollPanel(color) end

--- Show the Roll Result Broadcast Panel with the resolved result (visible to all).
-- @param color string  Roller's color
-- @param result table  Resolved result record
-- @param label string|nil
function RUI.showResultBroadcast(color, result, label) end

--- Hide the Roll Result Broadcast Panel.
function RUI.hideResultBroadcast() end

--- Update the result broadcast panel from the last entry in a player's history.
-- Used when loading a saved game to restore the last visible result.
-- @param color string
function RUI.restoreLastResult(color) end
```

### 8.2 UI Element ID Conventions

All roll-related UI element IDs follow a consistent naming pattern:

| Element | ID Pattern | Notes |
|---|---|---|
| ST Roll Dashboard panel | `rollDash_ST` | Visibility: `"Black\|Host"` |
| ST row for player color | `rollDash_row_<Color>` | One per player color |
| ST difficulty input field | `rollDash_difficulty_<Color>` | `InputField` |
| ST open/confirm button | `rollDash_btn_<Color>` | Label changes by phase |
| Player Roll Panel | `rollPanel_<Color>` | Visibility: `"<Color>"` |
| Player phase label | `rollPanel_phase_<Color>` | Text element |
| Player pool display | `rollPanel_pool_<Color>` | "Nd + Mh" format |
| Player difficulty display | `rollPanel_diff_<Color>` | "—" when nil |
| Player dice display | `rollPanel_dice_<Color>` | Formatted per §6.1 |
| Player result label | `rollPanel_result_<Color>` | ResultClass label |
| Player "Roll" button | `rollPanel_btnRoll_<Color>` | `PRE_ROLL` only |
| Player "Take Half" button | `rollPanel_btnHalf_<Color>` | `PRE_ROLL` when eligible |
| Player "Spend WP" button | `rollPanel_btnWP_<Color>` | `POST_ROLL` when available |
| Player "Confirm" button | `rollPanel_btnConfirm_<Color>` | `POST_ROLL` only |
| Result Broadcast Panel | `rollResult_panel` | Shared; no visibility filter |
| Broadcast roller name | `rollResult_name` | |
| Broadcast dice display | `rollResult_dice` | |
| Broadcast result class | `rollResult_class` | |
| Broadcast successes | `rollResult_successes` | |
| Broadcast margin | `rollResult_margin` | "—" when no difficulty set |

---

## 9. Physical Dice Integration (`core/global_script.ttslua`)

### 9.1 `onObjectRandomize` Hook

TTS fires `onObjectRandomize(obj, playerColor)` when any object is randomized by a player (including dice). The hook determines whether the object is a player's die, which player it belongs to, and whether that player has an active roll in `ROLLING` phase.

```lua
function onObjectRandomize(obj, playerColor)
    -- Identify whether the randomized object is a die spawned from a player's dice bag.
    -- Use G.GetDiceOwner() to check the object's container parent GUID.
    -- If the die belongs to a player in ROLLING phase, forward to RC.onDieRandomized().
end
```

**Die Attribution:** When TTS spawns dice from a bag (player shakes bag), each die object's
`obj.getGMNotes()` or container parent can be checked. The recommended approach:
- Use `obj.getVar("diceOwnerColor")` if set by the bag's onLoad script.
- Fall back to zone-based attribution: use `getObjectsInZone()` on the player's seating area.
- Simplest reliable approach: check if the object's name matches `"DICE_NORMAL_<COLOR>"` or `"DICE_HUNGER_<COLOR>"` pattern (set by the bag spawn script).

### 9.2 Module Requires

Add to the require block in `core/global_script.ttslua`:

```lua
RC  = require("core.roll_controller")
RUI = require("core.roll_ui")
```

These are exposed as globals so TTS UI handlers (e.g. `onClick="HUD_rollConfirm"`) can call them.

### 9.3 UI Handler Functions

Add the following global handler functions (TTS XML `onClick` targets):

```lua
--- ST sets difficulty for a player's roll (from ST Dashboard input field).
-- @param player Player object
-- @param value string  Difficulty value from InputField
-- @param id string     Element ID (encodes player color: "rollDash_difficulty_<Color>")
function HUD_rollSetDifficulty(player, value, id) end

--- ST opens a pending roll (advances SETUP → PRE_ROLL).
-- @param player Player object
-- @param value string
-- @param id string  Encodes player color: "rollDash_btn_<Color>"
function HUD_rollSTAction(player, value, id) end

--- Player clicks "Roll" button (advances PRE_ROLL → ROLLING).
-- @param player Player object
-- @param value string
-- @param id string  "rollPanel_btnRoll_<Color>"
function HUD_rollRollButton(player, value, id) end

--- Player clicks "Take Half".
-- @param player Player object
-- @param value string
-- @param id string  "rollPanel_btnHalf_<Color>"
function HUD_rollTakeHalf(player, value, id) end

--- Player clicks "Spend Willpower".
-- @param player Player object
-- @param value string
-- @param id string  "rollPanel_btnWP_<Color>"
function HUD_rollSpendWP(player, value, id) end

--- Player clicks "Confirm" to finalize a POST_ROLL result.
-- @param player Player object
-- @param value string
-- @param id string  "rollPanel_btnConfirm_<Color>"
function HUD_rollConfirm(player, value, id) end

--- Player or ST cancels the active roll.
-- @param player Player object
-- @param value string
-- @param id string  "rollPanel_btnCancel_<Color>"
function HUD_rollCancel(player, value, id) end

--- Left sidebar roll buttons (one per roll type).
-- id encodes the roll type: "rollBtn_<RollType>_<Color>"
-- @param player Player object
-- @param value string
-- @param id string
function HUD_rollInitiate(player, value, id) end
```

---

## 10. UI XML Design (`ui/shared/roll_panels.xml`)

New file. Included from `ui/Global.xml` after all existing includes.

### 10.1 ST Roll Dashboard

```xml
<!-- ST Roll Dashboard (visibility: Black|Host only) -->
<Panel id="rollDash_ST"
  visibility="Black|Host"
  active="True"
  rectAlignment="LowerRight"
  ... >
  <VerticalLayout>
    <Text>ACTIVE ROLLS</Text>
    <!-- One row per player color, generated at load or dynamically shown/hidden -->
    <!-- Per row: player name | roll type | phase | difficulty input | action button | cancel -->
    <Panel id="rollDash_row_Brown" active="False" ...>...</Panel>
    <Panel id="rollDash_row_Orange" active="False" ...>...</Panel>
    <Panel id="rollDash_row_Red" active="False" ...>...</Panel>
    <Panel id="rollDash_row_Pink" active="False" ...>...</Panel>
    <Panel id="rollDash_row_Purple" active="False" ...>...</Panel>
  </VerticalLayout>
</Panel>
```

### 10.2 Player Roll Panels (one per player color)

```xml
<!-- Player Roll Panel: Brown (visibility: Brown only) -->
<Panel id="rollPanel_Brown"
  visibility="Brown"
  active="False"
  rectAlignment="LowerCenter"
  ... >
  <VerticalLayout>
    <Text id="rollPanel_phase_Brown">Awaiting Storyteller...</Text>
    <Text id="rollPanel_pool_Brown">Pool: —</Text>
    <Text id="rollPanel_diff_Brown">Difficulty: —</Text>
    <Text id="rollPanel_dice_Brown"></Text>
    <Text id="rollPanel_result_Brown"></Text>
    <HorizontalLayout>
      <Button id="rollPanel_btnRoll_Brown"    active="False" onClick="HUD_rollRollButton">ROLL</Button>
      <Button id="rollPanel_btnHalf_Brown"    active="False" onClick="HUD_rollTakeHalf">TAKE HALF</Button>
      <Button id="rollPanel_btnWP_Brown"      active="False" onClick="HUD_rollSpendWP">SPEND WILLPOWER</Button>
      <Button id="rollPanel_btnConfirm_Brown" active="False" onClick="HUD_rollConfirm">CONFIRM</Button>
      <Button id="rollPanel_btnCancel_Brown"  active="True"  onClick="HUD_rollCancel">CANCEL</Button>
    </HorizontalLayout>
  </VerticalLayout>
</Panel>
<!-- Repeat for Orange, Red, Pink, Purple -->
```

### 10.3 Result Broadcast Panel (shared, all players)

```xml
<!-- Roll Result Broadcast Panel (visible to all; no visibility filter) -->
<Panel id="rollResult_panel"
  active="False"
  rectAlignment="UpperCenter"
  ... >
  <VerticalLayout>
    <Text id="rollResult_name"      fontSize="24" fontStyle="Bold" />
    <Text id="rollResult_dice"      fontSize="16" />
    <Text id="rollResult_class"     fontSize="28" fontStyle="Bold" />
    <HorizontalLayout>
      <Text id="rollResult_successes" fontSize="20" />
      <Text id="rollResult_margin"    fontSize="20" />
    </HorizontalLayout>
  </VerticalLayout>
</Panel>
```

---

## 11. Control Flow — Step-by-Step Per Roll Type

### 11.1 Standard / Discipline Roll

```
1. Player clicks "Standard Roll" / "Discipline Roll" button (Left Sidebar → HUD_rollInitiate)
2. RC.initiateRoll(color, {rollType=STANDARD, pool={normal=0, hunger=0}})
   → active = {phase=SETUP, batonHolder=STORYTELLER, pool={0,0}, difficulty=nil, ...}
   → RUI.refreshSTDashboard() — ST sees "[Player]: Standard Roll — set difficulty"
   → rollPanel_<Color> shown with "Awaiting Storyteller..."

3. ST enters difficulty value, optionally sets pool, clicks "Open Roll"
   → RC.setPool(color, N, M) (optional)
   → RC.setDifficulty(color, D) (optional, may be skipped)
   → RC.openRoll(color)
   → phase=PRE_ROLL, batonHolder=PLAYER
   → rollPanel_<Color> shows pool, difficulty (or "—"), "ROLL" button and (if eligible) "TAKE HALF" button

4a. Player clicks "ROLL"
    → phase=ROLLING (debounce accumulator reset)
    → rollPanel shows "ROLLING..."

4b. (Alternative) Player clicks "TAKE HALF"
    → RC.takeHalf(color)
    → active.tookHalf=true, result.successes=floor(pool/2), resultClass=WIN
    → phase=POST_ROLL → proceed to step 6

5. Player physically rolls their dice (DICE_NORMAL_<COLOR> and/or DICE_HUNGER_<COLOR>)
   → onObjectRandomize fires for each die → RC.onDieRandomized(color, dieType, value) accumulates
   → After C.DICE_SETTLE_DEBOUNCE_SECONDS of silence → RC.onDiceSettled(color)
   → active.dice recorded; RC.tryClassifyResult(color)
     → If difficulty set: result classified, phase=POST_ROLL, batonHolder=PLAYER
     → If no difficulty: dice recorded, phase=POST_ROLL, result=nil, batonHolder=STORYTELLER
        (ST must set difficulty before result can be confirmed)

6. If difficulty not yet set (POST_ROLL with no result):
   → ST enters difficulty → RC.setDifficulty(color, D) → RC.tryClassifyResult(color)
   → result classified, batonHolder=PLAYER

7. Player reviews result panel (dice display, resultClass, margin)
   → "SPEND WILLPOWER" button shown if eligible
   → "CONFIRM" button available

8a. Player spends Willpower (optional):
    → RC.spendWillpower(color) → active.willpower.spent=true, phase=ROLLING (targeted reroll)
    → Player physically rerolls up to 3 dice (system collects new values)
    → RC.onDiceSettled re-fires → replaces rerolled die values → re-classifies → phase=POST_ROLL

8b. Player clicks "CONFIRM":
    → RC.confirmRoll(color)
    → phase=RESOLVED → RC.broadcastResult() fires
    → RUI.showResultBroadcast() — result panel visible to all for N seconds
    → Roll cleared from active; queue processed if non-empty

9. If queue non-empty: immediately run next queued roll (repeat from step 2, SETUP skipped
   if ST pre-approved all queued rolls).
```

### 11.2 Rouse Check

```
1. Triggered by: clicking Hunger dot (HUD) or Health dot (healing), or HUD_rollInitiate with ROUSE type
2. RC.initiateRoll(color, {rollType=ROUSE, pool={normal=1, hunger=0}})
   → phase=SETUP, batonHolder=STORYTELLER (ST can skip to PRE_ROLL or auto-open)
   NOTE: ST may auto-open Rouse Checks since they have no meaningful difficulty/pool variation.
         RC.openRoll can be called programmatically without ST interaction for queue-driven Rouses.

3. phase=PRE_ROLL → ROLLING (no Take Half available for Rouse)
4. Player rolls their 1 Normal die
5. RC.onDiceSettled(color):
   → difficulty for Rouse is always 1 (any success = pass)
   → result classified: WIN (≥1 success) or TOTAL_FAILURE (0 successes)
   → phase=POST_ROLL

6. RC.confirmRoll(color):
   → If TOTAL_FAILURE: S.setPlayerVal(color, "hunger", hunger+1)
     → If hunger was 5: RC.queueRoll(color, {rollType=FRENZY}) added to queue
   → If Rouse was triggered by a queue (healing), process next queued roll

Oblivion variant: same, but on TOTAL_FAILURE also S.setPlayerVal(color, "stains", stains+1)
```

### 11.3 Remorse Roll

```
1. Triggered by: Humanity dot click in End Phase, or HUD_rollInitiate with REMORSE type
2. RC.initiateRoll(color, {rollType=REMORSE}):
   → Pool auto-computed: max(1, 10 - currentHumanity - stains) Normal dice, 0 Hunger
   → difficulty auto-set to 1 (any success = preserve Humanity)
   → phase=SETUP → immediately advances to PRE_ROLL (no ST input required for standard Remorse)

3. Player rolls their dice
4. RC.onDiceSettled(color):
   → WIN / CRITICAL_WIN: Humanity preserved, stains clear
   → TOTAL_FAILURE: Humanity decreases by 1, stains clear
   → phase=POST_ROLL

5. RC.confirmRoll(color):
   → Applies state changes (humanity, stains)
   → Broadcasts result
```

### 11.4 Willpower Reroll (within any eligible roll)

```
(Occurs at step 8a of Standard Roll flow above)
1. Player clicks "SPEND WILLPOWER" button (phase must be POST_ROLL)
2. RC.spendWillpower(color):
   → Validate: willpower.available == true, willpower.spent == false, roll type permits it
   → S.setPlayerVal(color, "stats.willpower.superficial", superficial+1)
   → active.willpower.spent = true, active.willpower.available = false
   → Clear RC._pendingDice[color] (fresh accumulation for the reroll)
   → phase = ROLLING

3. Player picks up any 3 dice and re-rolls them physically
   → System collects new die values via onObjectRandomize (same mechanism)
   → Debounce fires → RC.onDiceSettled(color)

4. Since willpower.spent == true:
   → Store the new 3 values in active.willpower.rerolledNormal / rerolledHunger
   → Replace the lowest 3 values from active.dice with the new values
     (The player is physically responsible for only picking up 3; system trusts this)
   → Re-classify result
   → phase = POST_ROLL (confirm button re-enabled, WP button now disabled)
```

---

## 12. Implementation Phases

### Phase 1 — Core Math + State Foundation

**Goal:** The math works; state structure is in place; nothing breaks existing code.

Tasks:
1. Add constants to `lib/constants.ttslua` (RollType, RollPhase, BatonHolder, ResultClass enums + helper lookup tables)
2. Add `rollData` default to `getDefaultPlayerHUD()` in `core/state.ttslua`
3. Add dice GUIDs + helper functions to `lib/guids.ttslua`
4. Create `core/dice.ttslua` (pure math; no TTS, no UI)
5. Write debug tests in `core/debug.ttslua` for `Dice.classifyRoll` covering all 7 result classes + Remorse pool + Take Half

### Phase 2 — Controller + Basic UI + Physical Dice

**Goal:** ST can initiate a Standard Roll; player rolls physical dice; result is displayed.

Tasks:
1. Create `core/roll_controller.ttslua` with full public API (§7.1); physical die accumulation (§7.2)
2. Create `core/roll_ui.ttslua` with full panel update functions (§8)
3. Create `ui/shared/roll_panels.xml` with all panels (§10)
4. Add `onObjectRandomize` hook + module requires + HUD handler stubs to `core/global_script.ttslua`
5. Wire Left Sidebar roll buttons (HUD_rollInitiate) — requires corresponding XML changes to `ui/player/panel_left_sidebar.xml` (or new left sidebar file; see HUD Overview)
6. Wire ST Dashboard input field and buttons to handlers
7. End-to-end test: Standard Roll, Rouse Check, Remorse Roll

### Phase 3 — Advanced Roll Types

**Goal:** Extended, Teamwork, and Opposed rolls work.

Tasks:
1. Add extended sub-record handling to `RC.initiateRoll` and `RC.confirmRoll`
2. Add teamwork coordination functions: `RC.initiateTeamworkRoll`, `RC.contributeToTeamwork`
3. Add opposed flow: ST uses `RC.setDifficulty` post-hoc (the mechanism already exists from Phase 2)
4. Update ST Dashboard to show teamwork contributor rows
5. Add "Convert to Teamwork" button on ST Dashboard (callable during SETUP/PRE_ROLL)

### Phase 4 — Polish & Reliability

**Goal:** Production-ready; handles all edge cases gracefully.

Tasks:
1. Result panel animations (fade in/out, color-coded by result class)
2. Chat broadcast formatting (colorized, structured message)
3. Roll history display (last 5 results accessible from reference sidebar)
4. Timeout handling: if roll stays in ROLLING phase > 60 seconds, notify ST
5. Full error-recovery: ST can force-cancel any roll from Dashboard
6. Disconnect handling: if a player disconnects during ROLLING, auto-cancel their roll
7. Custom rule hooks: `C.RollModifiers` table for chronicle-specific rule overrides (e.g., "Willpower allows 4 dice reroll", "District rule: Rouse Checks always fail on 1–3")

---

## 13. Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| Player clicks Roll while another roll is active | RC.initiateRoll returns false; no-op |
| Player disconnects during ROLLING | onPlayerDisconnect hook calls RC.cancelRoll |
| ST sets invalid difficulty (< 0 or NaN) | RC.setDifficulty validates; rejects with console warning |
| All dice randomize events missed (bag not used) | Player or ST can use "Manual Entry" fallback on rollPanel to type die values |
| Willpower reroll produces worse result | Accepted; no reversal permitted (per V5 rules) |
| Take Half with difficulty nil | RC.takeHalf returns false; button hidden in UI |
| Queue item fails validation when dequeued | Skipped with console warning; next queue item attempted |
| Physical dice from wrong player's bag rolled | Die values attributed to wrong player; ST can override result |
| Phase skipped out of order (e.g. confirmRoll called during SETUP) | RC.confirmRoll validates phase; returns false |

---

## 14. Testing Notes

All test functions live in `core/debug.ttslua` and are callable from the TTS console.

```lua
-- Test all 7 result classes
DEBUG.testDiceClassification()

-- Test Remorse pool calculation edge cases
DEBUG.testRemorsePool()

-- Simulate a full Standard Roll flow without physical dice
DEBUG.testRollFlow_Standard(color, normalValues, hungerValues, difficulty)

-- Simulate a Rouse Check failure (verify hunger increment + Frenzy queue)
DEBUG.testRollFlow_Rouse(color, dieValue)

-- Verify state is clean after cancel
DEBUG.testRollCancel(color)
```

---

*Last Updated: 2026-04-16 (Initial full plan)*
