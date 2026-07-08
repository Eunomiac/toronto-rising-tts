# Step-by-step playbooks (Toronto Rising)

## Agent Routing

Read this when:
- creating a targeted bug repro, feature sign-off, or ad-hoc verification playbook
- deciding where human TTS actions must interrupt Lua automation
- updating the step-by-step playbook template or guidance skill

Source of truth:
- `.dev/Step-By-Step Playbooks/.Step-By-Step Template.md`
- `.cursor/skills/step-by-step-guidance/SKILL.md`
- `.dev/TESTING.md`

Verification:
- validate generated Lua snippets against `core/debug.ttslua` helpers
- Save & Play before running TTS verification when repo Lua changed

Status: current preferred format for new targeted verification.

Iterative **AI/human hybrid** verification: bug repro, feature sign-off, ad-hoc Save & Play checks. The author pastes Lua from the IDE, acts in TTS only when automation cannot, and reads `PASS` / `FAIL` / `▶▶▶ HUMAN ▶▶▶` in the console.

**Authoritative template:** [`.Step-By-Step Template.md`](.Step-By-Step%20Template.md)  
**Agent skill:** [`.cursor/skills/step-by-step-guidance/SKILL.md`](../../.cursor/skills/step-by-step-guidance/SKILL.md)

## Three layers

Do not conflate **Steps** (author paste/click order), **Code Blocks** (IDE paste units; split only at [human gates](../../.cursor/skills/step-by-step-guidance/SKILL.md#human-gates-when-to-stop-automation)), and **Phases** (console `printHeader` labels inside a block). Merge Lua-only phases in one block until a human gate applies.

**Principle:** Automate what is **reasonable in Lua** (state, setup, asserts); ask the author for **simple, faithful** TTS actions (drop, click, roll) instead of hacky simulators. HUMAN cues for gates **(1)–(4)** only — not Lua-only handoffs.

## When to use

| Use Step-by-step | Use current E2E regression playbooks ([README](../E2E%20Playbooks/README.md)) |
| --- | --- |
| New bug repro or targeted verify | Full regression suites (Dice, Scenes, Gameboard) |
| Agent chat runbook or short-lived `Topic-Verify.md` | `RunTest("Dice")` harness today |
| Feature sign-off before/after merge | **TOR-141** maintenance contract |

**Migration target:** All E2E playbooks eventually adopt this format plus retained `RunTest` wiring (**TOR-141**). Current E2E files keep `printHeader("[HUMAN] …", 3)` until converted.

**Default after a fix:** Agents copy the template into a configured playbook here, fill it in for that change, and **link the file in chat** — the author verifies from the doc, not from inline chat steps.

**Persist vs chat-only:** Always write a file when verification spans setup + asserts + any TTS clicks, or when the procedure may be re-run. Chat-only numbered steps are for trivial one-paste smoke checks only.

## Configured playbooks

| Playbook | Issue | Purpose |
| --- | --- | --- |
| [TOR-281-clear-seat-verify.md](TOR-281-clear-seat-verify.md) | **TOR-281** Clear stage → return NPC to seat + library persistence | Sign-off when clearing stage returns seated NPCs correctly and seat toggles survive re-Apply |

## Helper registry

Use these before writing custom assert helpers. Do **not** copy illustration dummies from the template.

| Need | Helpers | Reference |
| --- | --- | --- |
| Command index | `debugHelp()` | [TESTING.md § Console helpers](../TESTING.md#console-helpers-inspection) |
| State inspection | `showState()`, `showScene()` | TESTING.md |
| Dice setup / assert | `rollTest`, `rollConfirm`, `rollCancelAll`, `rollE2eExpectBroadcast` | [TESTING.md § Dice debug](../TESTING.md#dice-debug-solo-host--no-second-client) |
| File evidence | `DEBUG.logStateToFile`, `DEBUG.logToFile`, `DEBUG.writeWorkspaceFile` | [DEBUG_FILE_LOGGING.md](../DEBUG_FILE_LOGGING.md) |
| Domain DEBUG | `DEBUG.syncTableSimplified`, `ensureSceneLibraryStub`, `DEBUG.compareLayoutPaths`, … | `debugHelp()` / TESTING.md |
| Console phase banners | `printHeader(text, 1\|2)` | [TESTING.md § E2E console output](../TESTING.md#e2e-console-output-conventions) |

**Human gates** in Step-by-step playbooks use `print("   ▶▶▶ HUMAN ▶▶▶ …")` only when the skill’s gates **(1)–(4)** apply — not for Lua-only handoffs between blocks.

## Execution defaults

- **Host** (solo OK). Assign seat, table, tokens, and test data in **Code Block 0** — do not ask the author to pick a seat or pre-configure the save.
- **Save & Play** only when repo Lua changed since last load.
- **IDE Execute Lua Code** — no `lua` prefix, no `require` (globals only).
- **Camera:** `M.setCamera("ALL", "roll<Color>")` in the same sequence step as the HUMAN print when bags/tray/roll panel are involved.

## Automate prerequisites (mandatory)

Human-facing **Prerequisites** in each playbook: **2–4 bullets** (Save & Play + Host connected). **Code Block 0** performs session setup then verify.

| Need | Prefer |
| --- | --- |
| Black / ST seat | `rollE2eSeatPrep("Black")` |
| Table layout | `DEBUG.syncTableSimplified(tableKey)` |
| NPC tokens | `DEBUG.spawnNpcControlBoardTokens()` |
| Gameboard baseline | `gbE2eReset()`, `gbE2ePrereqCheck()` |
| Scene library row | `ensureSceneLibraryStub(slotIndex, sceneKey?, opts?)` |

See [step-by-step-guidance SKILL](../../.cursor/skills/step-by-step-guidance/SKILL.md) § Automate prerequisites.

## Related

- [TESTING.md](../TESTING.md) — helper index and E2E conventions
- [E2E Playbooks](../E2E%20Playbooks/README.md) — regression playbooks (**TOR-141**)
