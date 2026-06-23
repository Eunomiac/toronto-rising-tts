# Manual E2E playbooks (Toronto Rising)

Ordered, in-table verification scripts for critical systems. Run as the table **Host** (the only connected client in solo dev).

**Linear:** **TOR-141** (Manual E2E playbooks — living doc, stays open). Multiplayer follow-up: **TOR-144** (multiplayer E2E checklist).

## Maintenance contract (TOR-141)

Update these playbooks in the **same PR** when you change behavior they cover:

| Trigger | Update |
| --- | --- |
| Roll FSM, bags, WP, Take Half, rouse, ST rolls | [Dice-E2E.md](Dice-E2E.md) + [Dice-E2E-Guide.md](Dice-E2E-Guide.md) |
| Scene library apply, clock, present day, RT ticker, seats, map pins | [Scenes-E2E.md](Scenes-E2E.md) |
| NPC gameboard Apply/Clear, stage placements, tokens, reconcile | [Gameboard-E2E.md](Gameboard-E2E.md) |
| New/removed `DEBUG.*` console helpers | [TESTING.md](../TESTING.md) + relevant playbook |
| Purge/replace automated test panels | [TESTING.md](../TESTING.md), [RUNNING TASKLIST.md](../RUNNING%20TASKLIST.md) |

Agents: if shipped code diverges from a playbook step, fix the doc or file a **Bug** — do not leave silent drift.

## Prerequisites

1. **Save & Play** from this repo so TTS runs the current bundled Lua (External Editor alone is not enough).
2. **Single connection (typical solo dev):** You are the only player at the table. You have **Host** privileges regardless of which seat color you occupy. You **cannot** be seated at Black and Brown simultaneously — only one seat at a time.
3. **Seat choice:**
   - **Scenes + DEBUG + Storyteller toolbar:** Recommended seat **Black** (Storyteller). UI uses `visibility="Host"`; Black matches ST/dice-tray layout.
   - **Dice (physical bags / roll panel):** `rollTest` / `rollStTest` move Host to the roll seat, hide loading overlay, and spoof camera automatically. `rollCancel` returns Host to **Black** when testing a PC color.
4. Scene library has **two distinct scenes** prepared for Suite B (different `siteKey`, lighting preset, and `npcWorld.placements` if possible).
5. TTS console (`~`) or **External Editor** execute on Global (`guid` `-1`) for Lua snippets below.

## Conventions

| Symbol | Meaning |
| --- | --- |
| **Pass if** | Continue to next step |
| **Stop if** | Do not continue — fix this layer first |
| **IDE Lua** | Paste into External Editor / execute on Global; globals only (`S`, `DEBUG`, `SS`, `JSON`, `C`, `RC` when loaded) — **no `require`** |

Snippets are diagnostic only. Do **not** call `Sync.full({ force = true })` during normal passes except the labeled **repair** step in each playbook.

### Console output (`printHeader` + `U.RunSequence`)

All manual playbooks should structure Lua steps like **[Dice-E2E.md](Dice-E2E.md)** so the TTS log is ordered and readable:

- **Lean playbook file** — title + fenced `lua` blocks only; suite/step names in `printHeader`, not markdown headings. Split blocks **only** on human TTS interaction ([TESTING.md § Streamlined block workflow](../TESTING.md#streamlined-block-workflow)).
- **`RunTest` driver** — `npm run e2e-playbook:generate` embeds Dice blocks into `lib/e2e_playbook_dice.ttslua`; in TTS: `RunTest("Dice")` then `RunTest()` per step. Scenes/Gameboard return not-yet-prepared until their markdown is processed the same way.
- **`U.RunSequence`** — one paste per block; `printHeader` / `print` each in its own `function()` step.
- **`printHeader(text, level)`** — level 1 `*` (suite), 2 `=` (step), 3 `-` (`[HUMAN]` instructions; never closed). Close suites/steps with `printHeader("", level)`; add `print("")` after each suite.
- **`M.setCamera("ALL", "roll<Color>")`** — before human bag/dice/panel steps.

Full rules, layout (100-char banner with spaces around text), and a copy-paste template: [TESTING.md § E2E console output conventions](../TESTING.md#e2e-console-output-conventions). Dice workflow + detail: [Dice-E2E-Guide.md § Running the playbook](Dice-E2E-Guide.md#running-the-playbook-streamlined-blocks), [§ Console output](Dice-E2E-Guide.md#console-output-printheader--urunsequence).

## Playbooks

| Doc | Scope |
| --- | --- |
| [Scenes-E2E.md](Scenes-E2E.md) | Scene smoke (A–E) + deep suites: present day clock, RT autoprogression, clock draft, seat/map pins (absent vs present), library flush (F–N) |
| [Dice-E2E.md](Dice-E2E.md) | Dice E2E — streamlined `U.RunSequence` blocks only (run from Suite 0; see Guide for workflow) |
| [Dice-E2E-Guide.md](Dice-E2E-Guide.md) | Dice E2E reference: helpers, conventions, prerequisites, sign-off |
| [Gameboard-E2E.md](Gameboard-E2E.md) | Gameboard smoke (Apply/Clear/mirror/Z flip) + scene library Apply gate + full reconcile suites + deferred TOR-172/173/175/174 probes |

## Related docs

- [TESTING.md](../TESTING.md) — console helper index (`rollTest`, `showState`, …)
- [HUD_FUNCTIONS.md](../HUD_FUNCTIONS.md) — Scenes / Sound panel handlers
- [Reconciler Contract](../Sychronizing%20Game%20Functionality/Reconciler%20Contract.md)
- [TTS_MCP.md](../TTS_MCP.md) — agent execute / `TR_AGENT_V1` lines

## TOR-144 (multiplayer E2E)

**Prerequisite:** **TOR-248** (Establish multi-client TTS session workflow — External Todo, author human gate). Execution of the multiplayer playbook is blocked until you have a repeatable Host + join-client setup.

After solo suites pass and **TOR-248** is satisfied, run **[Multiplayer-E2E.md](Multiplayer-E2E.md)** with a second real client — Host authority guards must prevent duplicate world I/O.
