# Roll Broadcast Messages (TOR-296)

## Agent Routing

Read this when:
- changing roll broadcast panel copy, roll result headlines, difficulty visibility, or broadcast suppression/auto-broadcast behavior
- debugging mismatches between player/ST roll panel result text and the final broadcast panel

Source of truth:
- `core/roll_ui.ttslua`
- `core/roll_controller.ttslua`
- `ui/shared/roll_panels.xml`
- `lib/constants.ttslua`

Verification:
- `npm run build`
- `.dev/E2E Playbooks/Dice-E2E.md`
- `DEBUG.rollBroadcastMessageAudit()`

Reference catalog for the **Roll Result Broadcast Panel** (`rollRes_panel`) and the shared result headline logic used on player/ST roll panels. Source of truth: `core/roll_ui.ttslua` (`narrativeLabel`, `panelResultHeadline`, `panelResultDisplayText`, `showResultBroadcast`, `broadcastResultClassString`).

## Panel fields

| Element | Source | Notes |
| --- | --- | --- |
| `rollRes_rollType` | `C.RollTypeLabel[rollType]` | e.g. "Standard Roll", "Rouse Check" |
| `rollRes_rollIntro` | `{rollerName} rolls …` | Black/NPC rolls may use history `label` as roller name |
| `rollRes_die_*` | Main die row | Standard pool; rouse-only rolls (TOR-294) show rouse faces here |
| `rollRes_rousePanel_*` | Rouse outcome strips | Hidden for pure Rouse/Obliv-Rouse broadcasts |
| `rollRes_successes` / `rollRes_difficultyDisplay` | Hidden for no-difficulty roll types (see below) |
| `rollRes_resultDisplay` | Headline ± signed margin | ALL CAPS headline from `panelResultHeadline` |

**Timeout:** Panel auto-hides after `C.ROLL_RESULT_BROADCAST_SECONDS` (6s).

## Fixed / auxiliary broadcast strings

These appear on `rollRes_panel` in addition to the classified headline:

| String | Element | When |
| --- | --- | --- |
| `{rollerName} rolls …` | `rollRes_rollIntro` | Every broadcast; NPC/ST may substitute history `label` for roller name |
| `{n} Success` / `{n} Successes` | `rollRes_successes` + `rollRes_successesPhrase` | When successes row visible (not a no-difficulty roll type) |
| `vs.` | `rollRes_difficultyVS` (XML default) | When difficulty number is shown (`result.margin` set → difficulty inferred) |
| `{difficulty}` | `rollRes_difficulty` | Same as above |
| `ROUSED` / `STAINED` / `ROUSED & STAINED` | `rollRes_rouseText_*` | Rouse outcome strip corner labels (not the main headline) |
| `?` | `rollRes_resultDisplay` | Unknown `resultClass` fallback (`narrativeLabel` only; rare) |

**Headline casing:** `panelResultHeadline` uppercases narrative text for broadcast — e.g. Rouse **SUCCESS**, Brutal **BRUTAL FAILURE**, Frenzy **FIGHT FOR CONTROL!**

## `ROLL COMPLETE` (nil result broadcast)

When `showResultBroadcast` receives **`result == nil`**, the main headline is the literal **`ROLL COMPLETE`** (all caps). Successes and difficulty rows are hidden. Roll type, intro line, and die images still populate from history when available.

This is **not** the same as the roll-panel phase string **`Roll complete.`** (sentence case) — see [Related panel copy](#related-panel-copy-not-broadcast) below.

### When `result` is nil at confirm

Classification requires an effective difficulty (`resolveClassificationDifficulty` in `core/roll_controller.ttslua`):

| Roll type | Classifies without ST difficulty? |
| --- | --- |
| **Standard**, **Werewolf** | Yes — implicit difficulty **1**, margin hidden (TOR-163) |
| **Simple Check**, dedicated **Rouse** / **Remorse** / **Frenzy** | Yes — dedicated classifiers |
| **Discipline**, **Willpower**, **Humanity**, **Launch**, **Goal** | **No** — if ST never sets difficulty, `active.result` stays nil |

**Practical trigger:** Confirm a **Discipline** (or Willpower/Humanity/Launch/Goal) roll in POST_ROLL when the ST has **not** set difficulty → auto-broadcast / confirm shows **`ROLL COMPLETE`** with dice images but no WIN/FAILURE headline.

Take Half always builds a synthetic `result` before confirm (no `ROLL COMPLETE` on that path).

### Broadcast blocked (no panel text)

Auto-broadcast does **not** run while:

- `pendingResolution` is set (Oblivion **Hunger or Stain?**, Werewolf **Brutal Fail / Violence** choice buttons)
- Black roll has `meta.suppressBroadcast` (secret confirm — TOR-226); ST may broadcast later via dashboard **B**

## Difficulty visibility

**Success-count contests (TOR-309):** Rolls with **no** ST difficulty or **difficulty = 0** (except Simple Check, Rouse, Oblivion Rouse) hide the difficulty row and margin. Headline shows success count: `3 Successes`, `2 Crit Successes`, `4 Messy Successes`, or `Failure` / `Bestial Failure`.

These roll types **hide** the successes/difficulty row on broadcast (`rollTypeHidesSuccessesRow`):

- Simple Check
- Rouse Check
- Rouse Check (Oblivion)

**Narrative roll types (TOR-312):** Frenzy, Remorse, Willpower, Discipline, Humanity, etc. show **success count** and **difficulty when ST-set** on broadcast and roll panels. Headline stays narrative (no signed margin suffix) via `rollTypeHidesMarginInHeadline`.

All other roll types show successes count when the successes row is visible. The **`vs.` + difficulty number** row appears only when `result.margin` is set (ST-set difficulty). **Standard/Werewolf** rolls without ST difficulty still classify (implicit diff 1) but **omit margin and difficulty display** (TOR-163).

**Margin on headline:** When `result.margin` is set, headline appends signed margin: `WIN +2`, `FAILURE −1` (Unicode minus). Narrative types and success-count contests omit margin on the headline.

## Headline resolution order (`narrativeLabel`)

1. **`result.brutalNarrative`** when set (Brutal Outcome fork) — overrides all class labels.
2. **Roll-type narrative overrides** (below).
3. **`C.ResultClassLabel[resultClass]`** — default seven-class VTM labels.

### Standard Roll special case

For `standard` + `win` without `brutalNarrative`, panel/broadcast headline uses **`WIN`** (from `C.ResultClassLabel.win`), not the word "Success".

## By roll type

### Standard / Discipline / Willpower / Humanity / Werewolf / Launch / Goal

Use default **`C.ResultClassLabel`** unless Brutal Outcome applies:

| Result class | Broadcast headline | CSS suffix (broadcast) |
| --- | --- | --- |
| `messyCritical` | MESSY CRITICAL | `rollRes_result_messyCritical` |
| `criticalWin` | CRITICAL WIN | `rollRes_result_criticalWin` |
| `win` | WIN (+ margin if shown) | `rollRes_result_win` |
| `failure` | FAILURE (+ margin) | `rollRes_result_failure` |
| `bestialFailure` | BESTIAL FAILURE | `rollRes_result_bestialFailure` |
| `totalFailure` | TOTAL FAILURE | `rollRes_result_totalFailure` |
| `totalBestialFailure` | TOTAL BESTIAL FAILURE | `rollRes_result_totalBestialFailure` |

**Brutal Outcome pending (`BRUTAL_FAIL_VIOLENCE`):** Broadcast blocked until ST chooses Fail or Violence.

| Choice | `brutalNarrative` | Typical class after apply |
| --- | --- | --- |
| Fail | Brutal Failure | failure (downgraded from win) |
| Violence | Brutal Outcome | win/criticalWin/totalFailure per recalc (+4 successes) |

### Simple Check

No difficulty row. Uses default class labels (usually WIN / FAILURE / TOTAL FAILURE for difficulty 1).

### Rouse Check / Rouse Check (Oblivion)

No difficulty row. Headline from `result.rouseNarrative` when set, else:

| Outcome | Headline |
| --- | --- |
| Pass (`win` class) | Success |
| Fail (`failure` class) | Hunger Roused |

**Dedicated Rouse narratives** (`buildDedicatedRouseResult` / `lib/rouse_outcomes.ttslua`):

| Condition | `rouseNarrative` |
| --- | --- |
| Standard rouse pass | Success |
| Standard rouse fail | Hunger Roused |
| Obliv: hunger + stain | Hunger Roused & Stained |
| Obliv: hunger only | Hunger Roused |
| Obliv: stain only (10) | Stained |
| Obliv: clean | Success |
| Obliv: pending ST choice | Hunger or Stain? (panel; broadcast after confirm) |

**Compound rolls** (Rouse dice + normal pool): revert to standard class labels; rouse strips may appear in `rollRes_rousePanel_*`.

**Rouse strip corner labels** (`rouseStripLabelText`): ROUSED, STAINED, ROUSED & STAINED.

**TOR-294:** Pure rouse-only broadcast moves dice to main `rollRes_die_*` row and clears rouse corner panels.

### Remorse Roll

Narrative headline (no signed margin). **Shows successes row + difficulty when ST-set** (TOR-312). Overrides:

| Result class | Headline |
| --- | --- |
| `win`, `criticalWin` | Stains Cleared |
| `failure`, `totalFailure` | Degeneration |

**Uncovered classes** (`messyCritical`, `bestialFailure`, `totalBestialFailure`): no narrative override — fall back to default **`C.ResultClassLabel`** (e.g. **MESSY CRITICAL**).

Broadcast CSS maps remorse win → `rollRes_result_win`, fail → `rollRes_result_failure`.

### Frenzy Roll

Narrative headline (no signed margin). **Shows successes row + difficulty when ST-set** (TOR-312). Overrides:

| Result class | Headline | Broadcast CSS |
| --- | --- | --- |
| `criticalWin` | The Leash Holds | `rollRes_result_criticalWin` |
| `win` | Fight For Control! | styled as `rollRes_result_messyCritical` |
| `failure`, `totalFailure` | FRENZY! | `rollRes_result_failure` |

**Uncovered classes** (`messyCritical`, `bestialFailure`, `totalBestialFailure`): fall back to default **`C.ResultClassLabel`**.

### Take Half

Synthetic main-pool result uses standard class labels (WIN / FAILURE / TOTAL FAILURE). Margin shown when ST difficulty is set. Broadcast die images: half pool as success faces, remainder blank; rouse-family dice appended when present.

## Manual Storyteller broadcast

ST dashboard **B** button re-broadcasts from history via `RUI.showResultBroadcastFromEntry` — same rules as auto-broadcast on confirm. Secret rolls (TOR-226) suppress auto-broadcast; manual **B** still uses this panel.

## Related panel copy (not broadcast)

These strings appear on **roll control panels** or the **ST dashboard**, not on `rollRes_panel`. Easy to confuse with broadcast copy:

| String | Surface | Phase / context |
| --- | --- | --- |
| `Roll complete.` | PC `rollControl_rollInstructions_*` | `RESOLVED` |
| `Roll complete — clear slot on dashboard` | ST `rollPanelST_phase` | Black `RESOLVED` |
| `Complete` | ST dashboard `rollDash_phase_*` | PC snapshot when `RESOLVED` |
| `Result ready — confirm when done` | PC roll instructions | POST_ROLL with result |
| `Dice read — awaiting classification...` | PC roll instructions | POST_ROLL, no result, no difficulty |
| `Dice read — awaiting difficulty...` | PC roll instructions | POST_ROLL, no result (typical when ST has not set difficulty on Discipline-class rolls) |
| `Roll Your Dice!` | PC roll instructions | `ROLLING` |
| `Hunger or Stain?` | POST_ROLL choice buttons (Oblivion) | Blocks broadcast until resolved |
| Brutal Fail / Violence button labels | POST_ROLL (Werewolf) | Blocks broadcast until resolved |

History / internal `diceDisplay` may also include `(took half: {successes} of {poolSize})` — not shown on the broadcast headline.

## Code map

| Function | Role |
| --- | --- |
| `narrativeLabel(rollType, result)` | Headline text |
| `panelResultHeadline(rollType, result)` | Uppercase headline for display |
| `panelResultDisplayText(rollType, result, difficulty)` | Headline + margin |
| `broadcastResultClassString(rollType, result)` | Broadcast CSS class string |
| `showResultBroadcast(color, result, label, historyEntryOverride)` | Panel assembly |
| `C.ResultClassLabel` | Default class names (`lib/constants.ttslua`) |
| `C.RollTypeLabel` | Roll type subtitle |

## Debug harness

Console: `lua DEBUG.rollBroadcastMessageAudit()` — prints this matrix from live constants (smoke check after label changes).

## Related issues

- **TOR-294** — rouse-only main die row layout
- **TOR-292** — ST manual re-broadcast persistence
- **TOR-226** — secret rolls suppress auto-broadcast
