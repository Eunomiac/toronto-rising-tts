# Project System Overview

## Agent Routing

Read this when:
- the user explicitly asks to plan or implement the Projects system
- changing coterie data that overlaps future project stakes
- triaging TOR-231 / implementing TOR-232

Source of truth (planned):
- this document (authoritative contract)
- `ui/storyteller/project_editor_modal.xml` (ST editor chrome; stake-row pool is agent-owned under TOR-228)
- `core/coterie.ttslua`, `lib/coterie_data.ttslua`, `lib/json/Coterie.json` (coterie advantages)
- `core/state.ttslua`, `core/present_day_clock.ttslua`
- existing roll path: `C.RollType.LAUNCH` / Storyteller PC Launch

Verification:
- no implementation verification yet; human-gated planning document
- before implementation, confirm Linear TOR-232 scope against this contract

Status: implemented (TOR-228 / TOR-232); multiclient scripting confirmed via TOR-144 (2026-07-13).

---

## Purpose (v1)

Storyteller-only system to create and manage chronicle **Projects**: launch setup, launch roll (via existing Launch roll type), staked advantages, project die derived from present-day clock while in progress, display on PC / coterie sheets, and manual completion.

Deferred (not in v1): player-created proposals, ST approval workflow, automated Goal-roll application.

---

## ST surface

### Projects panel

Added to the Storyteller Control Panel after **Stats**. Same navigation pattern as Stats: pick a PC or **coterie**, list projects registered to that source, **Edit** per row, **+** to create.

**Listed for a source** = projects whose `displayFor` contains that source key (PC key or `"coterie"`).

### Project Editor Modal

XML: `ui/storyteller/project_editor_modal.xml`.

- Opens for create or edit; create generates an 8-character alphanumeric `id` immediately and inserts a live project record into `gameState`.
- Owner dropdown defaults to the PC selected in the Projects panel (PC keys only — never coterie).
- Field writes persist on `onEndEdit` / dropdown change (live state, not a disposable draft stash).
- Phases `setup` → `preLaunch` → `postLaunch` auto-advance when field gates pass (checked after those events). **`inProgress` and `complete` are manual buttons** (Lock & Begin / Complete).
- Hardcoded layout-test values in XML (except Contributors default `1`) are not contracts; modal should start inactive.

---

## Editor lifecycle (OK / Cancel / Delete / Lock & Begin / Complete)

| Action | Behavior |
| --- | --- |
| **Open (new)** | Create project in `gameState` at `phase = "setup"` with new `id`; owner prefilled. |
| **Open (edit)** | Load existing project into modal. |
| **OK** | Close modal only (state already persisted). |
| **Cancel** | If phase is still before `inProgress` (`setup` / `preLaunch` / `postLaunch`): delete project from state and release any stakes. If phase is `inProgress` or `complete`: close modal only (use Delete to destroy). |
| **Delete** | Always destroy project and release stakes; close modal. |
| **Lock & Begin** | Enabled only in `postLaunch` when Begin eligibility is met (see phase machine). Sets `phase = "inProgress"`, locks Result/Margin, starts project-die derivation. |
| **Complete** | Enabled only for `inProgress`. Sets `phase = "complete"` and releases stakes. Allowed regardless of current project die. |

---

## Canonical storage

Projects live in one map keyed by id (e.g. `gameState.projects[id]`). Sheets and the Projects panel resolve membership via `displayFor`.

### Persisted fields

```lua
{
  id = "a1b2c3d4",                    -- 8-char alphanumeric; created on open
  owner = "lordLucien",               -- PC key only; Launch roller
  displayFor = { "lordLucien" },      -- derived; see Stake rows
  phase = "setup",                    -- setup | preLaunch | postLaunch | inProgress | complete
  goal = "",                          -- one sentence
  scope = nil,                        -- integer
  startDate = {                       -- narrative clock table (same shape as presentDayClock)
    year = 2027, month = 9, day = 14, hour = 0, minute = 0
  },
  -- UI shows/edits a plain-English date string; parse into this table on end edit.
  -- Suggested accept pattern (UI only): /^([A-Za-z]{3}).*?(\d{1,2}),?\s(\d{4})$/
  -- Default when opening a new project: current present-day (or shown) clock datetime.
  increment = "daily",                -- daily|weekly|biweekly|monthly|quarterly|yearly|byDecade|byCentury
  projectDieMod = 0,                  -- ST-edited; usually ≤ 0; "increments added to the standard 10"
  launchRollSkill = "Politics",       -- modal left field
  launchRollAdvantage = "Influence: Finance", -- modal right field
  -- display string for roll panel = skill .. " + " .. advantage (when both set)
  launchRollDifficulty = 5,           -- initially Scope+2; ST may override (see Difficulty)
  numContributors = 1,                -- ST integer; retained for stake floor + debug; default 1
  launchRollResult = nil,             -- C.ResultClass.WIN | C.ResultClass.CRITICAL_WIN | nil
  launchRollMargin = nil,             -- required when result is WIN; ignored for CRITICAL_WIN
  stakeRows = {                       -- ordered UI rows; see Stake rows
    -- { source = "coterie", name = nil, focus = nil, qty = nil }, -- display-only (displayFor only)
    -- { source = "fomorach", name = "Contact", focus = "UwU_byte_me", qty = 2 },
  },
}
```

### Derived (do not treat as independent authority)

| Field | Rule |
| --- | --- |
| `launchRoll` (display) | `launchRollSkill .. " + " .. launchRollAdvantage` |
| `requiredStake` | If `CRITICAL_WIN` → `0`. If `WIN` → `max(scope + 1 - launchRollMargin, numContributors)`. Else `nil`. |
| `stakedAdvantages` | Projection of stake rows that have `source` + advantage identity + `qty >= 1`. |
| `displayFor` | Unique list: always `owner`, plus every row `source` (including display-only rows). |
| `projectDie` / `endDate` | Pure functions of `startDate`, `increment`, `projectDieMod`, and present-day clock — **only while `phase == "inProgress"`**. In other phases, UI may show `—` or hide die/end (die does not tick). |
| Effective advantage disabled | See Stakes and sheets. |

Dropdown labels in XML are display-only; Lua maps `selectedIndex` → canonical keys/enums.

---

## Phase machine

`setup` → `preLaunch` → `postLaunch` auto-advance when field gates pass (after `onEndEdit` / dropdown change). **`inProgress` only via Lock & Begin**; **`complete` only via Complete**. No intentional “go back a phase” control. Result and Margin stay editable in `postLaunch` until Lock & Begin; then locked.

### `setup`

Any of these unset: Owner, Goal, Scope, Increment, Start Date, Launch Roll skill, Launch Roll advantage, Difficulty.

### `preLaunch`

All setup fields set. **R** (Launch) enabled.

**R button:** initiates a `C.RollType.LAUNCH` roll for `owner` with `launchRollDifficulty` preset and roll-panel message like `Roll Politics + Influence: Finance` (same family as ST PC panel Launch). Roll resolution does **not** auto-write project Result — ST enters Result/Margin manually.

**Launch failure (manual):** ST bumps Difficulty by +1 and presses R again, or Cancel/Delete the project. No Fail result value in the project schema.

### `postLaunch`

Entered when Result is set, and if Result is `WIN`, Margin is also set.

- Result and Margin remain editable until **Lock & Begin**.
- **Lock & Begin** is disabled until Begin eligibility is met; helper / `projectEditor_stakeValidation` can explain what’s missing (e.g. “Stake 2 more dots” / “Ready — press Lock & Begin”).

#### Begin eligibility (enables Lock & Begin)

All of:

1. Phase is `postLaunch`.
2. Result is `WIN` (Margin set) or `CRITICAL_WIN`.
3. Stake side:
   - If `requiredStake == 0` (Critical Win): no stakes required (display-only rows optional for extra `displayFor` sources).
   - If `requiredStake > 0`: `sum(qty)` over stake rows with real stakes `>= requiredStake`, and every committing row validates (source exists, advantage selected, qty ≥ 1, source has enough free dots after other projects’ stakes + manual disabled).
4. Invalid stake rows keep Lock & Begin disabled and set validation message text.

Accidental Critical Win is harmless: ST can change Result back to Win (or clear it) until they press Lock & Begin.

### `inProgress`

Entered **only** by **Lock & Begin**. Locks Result/Margin. Project die derives from the clock (policy **A**).

### `complete`

Only via **Complete** button from `inProgress`. Releases stakes. Not automatic when die hits 0 (ST may Complete early or late).

---

## Difficulty vs Scope

When Scope is set/changed:

- If Difficulty is empty, **or** Difficulty still equals the previous auto value (`oldScope + 2`), set Difficulty to `Scope + 2`.
- Otherwise leave the ST override alone (supports fail → +1 Difficulty → R again without Scope edits wiping it).

---

## Project die (pure derive, inProgress only)

Narrative clock tables: `{ year, month, day, hour, minute }` — same family as `presentDayClock` / `U.compareNarrativeClock`. Not Unix epoch.

**Only while `phase == "inProgress"`:**

```text
duration   = max(0, 10 + projectDieMod)          -- mod usually ≤ 0
elapsed    = floor( number of increment steps from startDate → presentDay )
projectDie = clamp(duration - elapsed, 0, duration)
endDate    = startDate advanced by `duration` increments
```

- Present day before `startDate` → die displays as `duration` (typically 10 if mod is 0).
- Present day after `endDate` / huge Memoriam jumps → die clamps to `0` (and duration upper bound as above).
- **CSHEET / Court image:** always set `project_die_N` for in-progress projects with display index clamped to **0–10** (`project_die_0` … `project_die_10`). Never leave the image attribute blank while in progress (blank → white tile). Values above 10 (positive `projectDieMod`) still show `project_die_10`.
- ST never edits `projectDie` directly; Goal-roll outcomes are applied by editing `projectDieMod`.
- No per-project timeline event table in v1. On present-day settle / jump, recompute derived die/end for in-progress projects (N is small).

**Increment step meaning** (implementation must define calendar arithmetic explicitly): daily = +1 day; weekly = +7 days; biweekly = +14 days; monthly / quarterly / yearly / byDecade / byCentury = calendar-aware steps on the narrative Y/M/D (document exact rules in code comments when implementing).

---

## Stake rows (UI + data)

Replace the multiline DSL. Modal shows structured rows.

### Row shapes

1. **Display-only:** `source` set; advantage and qty empty. Adds `source` to `displayFor` only (e.g. show on coterie sheet without staking). Not used as a phase-confirm gesture — that is **Lock & Begin**.
2. **Stake:** `source` + advantage (from dropdown of that source’s backgrounds/merits) + `qty >= 1`. Adds to `displayFor` and to `stakedAdvantages`.
   - When `source == "coterie"`, the dropdown also lists top-level domain ratings **Chasse**, **Lien**, **Portillon**, **Haven** (stake `name` = Title case, `focus` empty). Free-dots use the matching `coterieData[ratingKey]` table, not trait arrays.

### Row activation (XML pool)

- Prefab a fixed pool of row elements with most `active=false`.
- Always show **one blank row** while Begin’s stake requirement is **not** yet met (`requiredStake > 0` and `sum(qty) < requiredStake`).
- When a blank row becomes **defined**, activate the next pooled blank row (if any remain).
- **Defined** means: source selected for a display-only row, **or** source + advantage + qty for a stake row.
- Once Begin’s stake side is satisfied (`requiredStake == 0`, or `sum(qty) >= requiredStake`), **do not** activate further blank rows.
- Over-staking is allowed on rows already visible (`sum(qty)` may exceed `requiredStake`).

### Validation

On row change, recompute Begin eligibility:

- Unknown / empty required fields on committing rows → message on `projectEditor_stakeValidation`; Lock & Begin stays disabled.
- Insufficient free dots on that advantage (after other active projects’ stakes + manual disabled) → same.

---

## Stakes and sheets (no blind `disabled +=`)

`advantage.disabled` in Stats remains **manual-only** authority.

Effective disabled for sheet/XML rendering:

```text
effectiveDisabled = manualDisabled
  + sum(qty for this advantage across all projects still holding stakes)
```

Projects hold stakes while phase is `postLaunch` (once rows commit dots) and `inProgress`. Release on Complete, Delete, or Cancel-while-pre-inProgress wipe.

Do not permanently mutate `disabled` as the stake ledger. Optionally cache nothing; derive at reconcile/sheet build from `gameState.projects`.

---

## Sheet display (Page 5 / coterie)

For a given sheet source S, show projects where `displayFor` contains S.

**`displayFor` derivation (working):** always includes `owner`, plus every stake-row `source` (including display-only rows with source set and no qty). Selecting **Coterie** as a stake source adds `"coterie"`.

**Where it renders today:**

| Surface | Wired? |
| --- | --- |
| PC character sheet page 5 | Yes — `Projects.buildPage5DocumentXml` |
| ST Projects panel list for Coterie target | Yes — `listForDisplaySource("coterie")` |
| Prince’s Court HUD (page 3 left / coterie sheet art) | Yes — scrollable fixed 8-slot pool (0-based indices) from `ui/.templates/princes_court/partials/project_block.xml`; project classes come from Global `ui/defaults_classes.xml` (same `project_*` set as CSHEET); `Projects.reconcileCourtProjectsAll` applies `listForDisplaySource("coterie")` through `U.setAttribute` |

So a project owned by `lordLucien` with Coterie stakes correctly gets `"coterie"` in `displayFor`, appears under ST Projects → Coterie, on Lucien’s page 5, and on Prince’s Court page 3. Court blocks use the same sheet-style structure and Defaults as character-sheet projects (scope, result/margin, up to four stake rows, die, and dates); empty slots are hidden.

Sort (when listing for a source):

1. Projects owned by the sheet’s PC first (when S is a PC); then others.
2. Then by derived `endDate` ascending (soonest completion first). Completed projects: define a stable secondary rule at implement time (e.g. after active, or separate section).

Stake row styling on the PC sheet (relative to S):

| Stake `source` | Class suffix | Look |
| --- | --- | --- |
| Same as S | `self` | white dots / bold label |
| `coterie` | `coterie` | yellow dots / yellow label |
| Any other PC | `other` | grey dots / grey italic label |

---

## Deferred

- Player-created projects and ST approval.
- Automated Goal roll → `projectDieMod`.
- Generic chronicle timeline event bus for non-project features.

---

## Implementation checklist (TOR-232)

1. `gameState.projects` map + mutation/reconcile split (Sync after mutations; sheet/disabled derive on reconcile).
2. ST Projects panel (Stats-like target list).
3. Wire modal fields, phase gates, R → Launch roll, Lock & Begin / Complete / Delete / Cancel / OK.
4. Stake row XML pool + advantage dropdowns per source.
5. Pure die derive on present-day settle for `inProgress` projects.
6. Page 5 / coterie project list from `displayFor`.
7. Update Event Listener Policy for new HUD handlers.
8. Solo smoke: create → preLaunch → R → enter Win+Margin → stake rows → Lock & Begin → clock advance → Complete; also Critical Win → Lock & Begin with zero stakes.
