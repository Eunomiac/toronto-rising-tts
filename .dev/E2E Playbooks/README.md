# Manual E2E playbooks (Toronto Rising)

## Agent Routing

Read this when:
- running or updating manual regression playbooks
- changing roll, scene, gameboard, or multiplayer behavior covered by E2E steps
- updating the `RunTest` harness or generated E2E Lua modules

Source of truth:
- `.dev/TESTING.md`
- `core/debug.ttslua`
- `lib/e2e_playbook_dice.ttslua` generated from `Dice-E2E.md`
- `lib/e2e_playbook_scenes.ttslua` generated from `Scenes-E2E.md`
- `lib/e2e_playbook_gameboard.ttslua` generated from `Gameboard-E2E.md`

Verification:
- `npm run e2e-playbook:generate:test`
- `npm run e2e-playbook:generate`
- Save & Play, then run the relevant manual suite in TTS

Status: current manual regression index; TOR-141 is a living-doc anchor.

Ordered, in-table verification scripts for critical systems. Run as the table **Host** (the only connected client in solo dev).

**Linear:** **TOR-141** (Manual E2E playbooks — living doc, stays open). Multiplayer follow-up: **TOR-144** (multiplayer E2E checklist).

## Maintenance contract (TOR-141)

Update these playbooks in the **same PR** when you change behavior they cover:

| Trigger | Update |
| --- | --- |
| Roll FSM, bags, WP, Take Half, rouse, ST rolls | [Dice-E2E.md](Dice-E2E.md) + [Dice-E2E-Guide.md](Dice-E2E-Guide.md) |
| Scene library apply, clock, present day, RT ticker, seats, map pins | [Scenes-E2E.md](Scenes-E2E.md) + [Scenes-E2E-Guide.md](Scenes-E2E-Guide.md) |
| NPC gameboard Apply/Clear, stage placements, tokens, reconcile, PC seat-row tokens | [Gameboard-E2E.md](Gameboard-E2E.md) + [Gameboard-E2E-Guide.md](Gameboard-E2E-Guide.md) + [Scenes-E2E.md](Scenes-E2E.md) Suite D (TOR-152 load mirror) |
| New/removed `DEBUG.*` console helpers | [TESTING.md](../TESTING.md) + relevant playbook |
| Purge/replace automated test panels | [TESTING.md](../TESTING.md), [RUNNING TASKLIST.md](../RUNNING%20TASKLIST.md) |

Agents: if shipped code diverges from a playbook step, fix the doc or file a **Bug** — do not leave silent drift.

## Prerequisites

1. **Save & Play** from this repo so TTS runs the current bundled Lua (External Editor alone is not enough).
2. **Single connection (typical solo dev):** You are the only player at the table. You have **Host** privileges regardless of which seat color you occupy. You **cannot** be seated at Black and Brown simultaneously — only one seat at a time.
3. **Seat choice:**
   - **Scenes + DEBUG + Storyteller toolbar:** Recommended seat **Black** (Storyteller). UI uses `visibility="Host"`; Black matches ST/dice-tray layout.
   - **Dice (physical bags / roll panel):** `rollTest` / `rollStTest` move Host to the roll seat, hide loading overlay, and spoof camera automatically. `rollCancel` returns Host to **Black** when testing a PC color.
4. Scenes Suite 0 creates deterministic E2E fixture rows in Scene Library slots 17-20.
5. TTS console (`~`) or **External Editor** execute on Global (`guid` `-1`) for Lua snippets below.

## Conventions

| Symbol | Meaning |
| --- | --- |
| **Pass if** | Continue to next step |
| **Stop if** | Do not continue — fix this layer first |
| **IDE Lua** | Paste into External Editor / execute on Global; globals only (`S`, `DEBUG`, `SS`, `JSON`, `C`, `RC` when loaded) — **no `require`** |

Snippets are diagnostic only. Do **not** call `Sync.full({ force = true })` during normal passes except the labeled **repair** step in each playbook.

### Migration note (Step-by-step target format)

**TOR-141** long-term target: migrate playbooks to [Step-by-step template](../Step-By-Step%20Playbooks/.Step-By-Step%20Template.md) (`▶▶▶ HUMAN ▶▶▶` cues, merged phases per Code Block) while retaining **`RunTest`** harness wiring. Dice, Scenes, and Gameboard now use the two-document lean playbook + guide format. New ad-hoc verification should use [Step-By-Step Playbooks](../Step-By-Step%20Playbooks/README.md).

### Console output (`printHeader` + `U.RunSequence`)

All manual playbooks should structure Lua steps like **[Dice-E2E.md](Dice-E2E.md)** so the TTS log is ordered and readable:

- **Lean playbook file** — title + fenced `lua` blocks only; suite/step names in `printHeader`, not markdown headings. Split blocks **only** on human TTS interaction ([TESTING.md § Streamlined block workflow](../TESTING.md#streamlined-block-workflow)).
- **`RunTest` driver** — `npm run e2e-playbook:generate` embeds Dice, Scenes, and Gameboard blocks into `lib/e2e_playbook_*.ttslua`; in TTS: `RunTest("Dice")`, `RunTest("Scenes")`, or `RunTest("Gameboard")`, then `RunTest()` per step.
- **`U.RunSequence`** — one paste per block; `printHeader` / `print` each in its own `function()` step.
- **`printHeader(text, level)`** — level 1 `*` (suite), 2 `=` (step), 3 `-` (`[HUMAN]` instructions; never closed). Close suites/steps with `printHeader("", level)`; add `print("")` after each suite.
- **`M.setCamera("ALL", "roll<Color>")`** — before human bag/dice/panel steps.

Full rules, layout (100-char banner with spaces around text), and a copy-paste template: [TESTING.md § E2E console output conventions](../TESTING.md#e2e-console-output-conventions). Dice workflow + detail: [Dice-E2E-Guide.md § Running the playbook](Dice-E2E-Guide.md#running-the-playbook-streamlined-blocks), [§ Console output](Dice-E2E-Guide.md#console-output-printheader--urunsequence).

## Playbooks

| Doc | Scope |
| --- | --- |
| [Scenes-E2E.md](Scenes-E2E.md) | Scenes E2E — streamlined `U.RunSequence` blocks only (run from Suite 0; see Guide for workflow) |
| [Scenes-E2E-Guide.md](Scenes-E2E-Guide.md) | Scenes E2E reference: fixture slots, conventions, prerequisites, sign-off |
| [Dice-E2E.md](Dice-E2E.md) | Dice E2E — streamlined `U.RunSequence` blocks only (run from Suite 0; see Guide for workflow) |
| [Dice-E2E-Guide.md](Dice-E2E-Guide.md) | Dice E2E reference: helpers, conventions, prerequisites, sign-off |
| [Gameboard-E2E.md](Gameboard-E2E.md) | Gameboard E2E — streamlined `U.RunSequence` blocks only (run from Suite 0; see Guide for workflow) |
| [Gameboard-E2E-Guide.md](Gameboard-E2E-Guide.md) | Gameboard reference: fixture constants, macro helpers, smoke/full/deferred tables, sign-off |

## Related docs

- [TESTING.md](../TESTING.md) — console helper index (`rollTest`, `showState`, …)
- [HUD_FUNCTIONS.md](../HUD_FUNCTIONS.md) — Scenes / Sound panel handlers
- [Reconciler Contract](../Sychronizing%20Game%20Functionality/Reconciler%20Contract.md)
- [TTS_MCP.md](../TTS_MCP.md) — agent execute / `TR_AGENT_V1` lines

## TOR-144 (multiplayer E2E)

**Human gate:** **TOR-249** (run initial multiclient session with a friend on a **second machine** via Steam invite). Same-PC multi-client (**TOR-248**) was **Canceled** — not viable.

**Shipped prerequisites (solo):** **TOR-284** (execution model), **TOR-345** (Steam auto seat on connect + load), **TOR-143** / **TOR-319** (phase sequence + Intermission connect blindfold). Complete Preparing §1.5–§1.6 and keep Dice/Gameboard/Scenes smokes green before inviting.

After solo suites pass, run **[Multiplayer-E2E.md](Multiplayer-E2E.md)** (matrix) using the step script in [Preparing For Multiplayer §2](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md) — Host + join client; verify auto-seat, phase connect blindfold, no duplicate world I/O.
