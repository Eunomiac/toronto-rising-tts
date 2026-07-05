# Step-by-step playbooks (Toronto Rising)

Iterative **AI/human hybrid** verification: bug repro, feature sign-off, ad-hoc Save & Play checks. The author pastes Lua from the IDE, acts in TTS only when automation cannot, and reads `PASS` / `FAIL` / `▶▶▶ HUMAN ▶▶▶` in the console.

**Authoritative template:** [`.Step-By-Step Template.md`](.Step-By-Step%20Template.md)  
**Agent skill:** [`.cursor/skills/step-by-step-guidance/SKILL.md`](../../.cursor/skills/step-by-step-guidance/SKILL.md)

## Three layers

Do not conflate **Steps** (author paste/click order), **Code Blocks** (one `U.RunSequence` per paste; split only at human gates), and **Phases** (console `printHeader` labels inside a block — never drive markdown structure). Multiple phases (1.1 → 2.1) stay in one Code Block until the tester must interact in TTS.

## When to use

| Use Step-by-step | Use legacy E2E ([README](../E2E%20Playbooks/README.md)) |
| --- | --- |
| New bug repro or targeted verify | Full regression suites (Dice, Scenes, Gameboard) |
| Agent chat runbook or short-lived `Topic-Verify.md` | `RunTest("Dice")` harness today |
| Feature sign-off before/after merge | **TOR-141** maintenance contract |

**Migration target:** All E2E playbooks eventually adopt this format plus retained `RunTest` wiring (**TOR-141**). Legacy files keep `printHeader("[HUMAN] …", 3)` until converted.

**Default after a fix:** Agents copy the template into a configured playbook here, fill it in for that change, and **link the file in chat** — the author verifies from the doc, not from inline chat steps.

**Persist vs chat-only:** Always write a file when verification spans setup + asserts + any TTS clicks, or when the procedure may be re-run. Chat-only numbered steps are for trivial one-paste smoke checks only.

## Configured playbooks

| Playbook | Issue | Purpose |
| --- | --- | --- |
| [TOR-281-clear-seat-verify.md](TOR-281-clear-seat-verify.md) | **TOR-281** Stage Clear seat activation + library persistence | Sign-off for Clear seat rules + live library mirror |

## Helper registry

Use these before writing custom assert helpers. Do **not** copy illustration dummies from the template.

| Need | Helpers | Reference |
| --- | --- | --- |
| Command index | `debugHelp()` | [TESTING.md § Console helpers](../TESTING.md#console-helpers-inspection) |
| State inspection | `showState()`, `showScene()` | TESTING.md |
| Dice setup / assert | `rollTest`, `rollConfirm`, `rollCancelAll`, `rollE2eExpectBroadcast` | [TESTING.md § Dice debug](../TESTING.md#dice-debug-solo-host--no-second-client) |
| File evidence | `DEBUG.logStateToFile`, `DEBUG.logToFile`, `DEBUG.writeWorkspaceFile` | [DEBUG_FILE_LOGGING.md](../DEBUG_FILE_LOGGING.md) |
| Domain DEBUG | `DEBUG.syncTableSimplified`, `DEBUG.compareLayoutPaths`, … | `debugHelp()` / TESTING.md |
| Console phase banners | `printHeader(text, 1\|2)` | [TESTING.md § E2E console output](../TESTING.md#e2e-console-output-conventions) |

**Human gates** in Step-by-step playbooks use `print("   ▶▶▶ HUMAN ▶▶▶ …")` — not `printHeader("[HUMAN]", 3)`.

## Execution defaults

- **Host** (solo OK). Assign seat in Lua — do not ask the author to pick a seat.
- **Save & Play** only when repo Lua changed since last load.
- **IDE Execute Lua Code** — no `lua` prefix, no `require` (globals only).
- **Camera:** `M.setCamera("ALL", "roll<Color>")` in the same sequence step as the HUMAN print when bags/tray/roll panel are involved.

## Related

- [TESTING.md](../TESTING.md) — helper index, legacy E2E conventions
- [E2E Playbooks](../E2E%20Playbooks/README.md) — regression playbooks (**TOR-141**)
