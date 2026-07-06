# Roll Broadcast Messages (TOR-296)

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

**No result object:** When `result` is nil at broadcast time, panel shows `ROLL COMPLETE` (successes row hidden). Rare; most confirms supply a classified result.

**Timeout:** Panel auto-hides after `C.ROLL_RESULT_BROADCAST_SECONDS`.

## Difficulty visibility

These roll types **hide** the successes/difficulty row on broadcast (`hidesDifficulty`):

- Simple Check
- Rouse Check
- Rouse Check (Oblivion)
- Remorse Roll
- Frenzy Roll

All other roll types show successes count and difficulty when `result.margin` is set (difficulty inferred as `successes - margin`).

**Margin on headline:** When difficulty is shown and `result.margin` is set, headline appends signed margin: `WIN +2`, `FAILURE −1` (Unicode minus). When margin is hidden, headline alone: `WIN`, `FAILURE`, etc.

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

No difficulty row. Narrative overrides:

| Result class | Headline |
| --- | --- |
| `win`, `criticalWin` | Stains Cleared |
| `failure`, `totalFailure` | Degeneration |

Broadcast CSS maps remorse win → `rollRes_result_win`, fail → `rollRes_result_failure`.

### Frenzy Roll

No difficulty row. Narrative overrides:

| Result class | Headline | Broadcast CSS |
| --- | --- | --- |
| `criticalWin` | The Leash Holds | `rollRes_result_criticalWin` |
| `win` | Fight For Control! | styled as `rollRes_result_messyCritical` |
| `failure`, `totalFailure` | FRENZY! | `rollRes_result_failure` |

### Take Half

Synthetic main-pool result uses standard class labels (WIN / FAILURE / TOTAL FAILURE). Margin shown when ST difficulty is set. Broadcast die images: half pool as success faces, remainder blank; rouse-family dice appended when present.

## Manual Storyteller broadcast

ST dashboard **B** button re-broadcasts from history via `RUI.showResultBroadcastFromEntry` — same rules as auto-broadcast on confirm. Secret rolls (TOR-226) suppress auto-broadcast; manual **B** still uses this panel.

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
