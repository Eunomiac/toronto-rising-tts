---
name: step-by-step-guidance
description: Guide the author through in-TTS verification after a fix or feature change — produce a configured step-by-step playbook from the template and link it in chat.
---

# Step-by-step guidance (Tabletop Simulator)

Use this skill whenever the author must **confirm something works in TTS** — after a bugfix, feature slice, refactor, or Save & Play sign-off. Do not improvise verification in chat prose alone.

## Default deliverable

1. Copy [`.dev/Step-By-Step Playbooks/.Step-By-Step Template.md`](../../.dev/Step-By-Step%20Playbooks/.Step-By-Step%20Template.md) to a configured playbook file, e.g. `.dev/Step-By-Step Playbooks/TOR-281-clear-seat-verify.md` (or a descriptive name when no Linear id yet).
2. Fill in title, goal, prerequisites, Run order, and Code Blocks for **this** fix — valid Lua, repo helpers, asserts for everything Lua can check.
3. **Link the configured file** in chat (markdown path). The author runs it top-to-bottom from that doc — not from a wall of inline steps.
4. Chat message stays short: what was fixed, link to the playbook, Step 1 reminder (**Save & Play** if repo Lua changed).

Use chat-only numbered steps (no file) only for trivial one-paste smoke checks. When verification spans setup, asserts, and any TTS clicks, write the playbook file.

**Blank template:** [`.Step-By-Step Template.md`](../../.dev/Step-By-Step%20Playbooks/.Step-By-Step%20Template.md) · **Index:** [README.md](../../.dev/Step-By-Step%20Playbooks/README.md)

Legacy E2E playbooks ([Dice-E2E](../../.dev/E2E%20Playbooks/Dice-E2E.md), etc.) still use `printHeader("[HUMAN] …", 3)` until **TOR-141** migration. **New** runbooks follow this skill + template (triangle HUMAN format).

## Three layers (do not conflate)

| Layer | Name | Drives splits? |
| --- | --- | --- |
| Author run order | **Step 1, Step 2, …** | Paste IDE block or **bold** manual click |
| Paste boundaries | **Code Block 0, A.1, …** | Split **only** when tester must act in TTS between pastes |
| Console structure | **Phase 1.1, 2.1, …** | **Never** — `printHeader(..., 1)` labels inside a block |

**Agent rule:** Step numbers track **author actions**, not test phases. Phases 1.1 → 2.1 → 3.1 belong in **one** Code Block until a human gate forces the next paste.

**Anti-patterns:** Do not create Step N = “Phase 2.1”. Do not add markdown `### Phase 2.1` above Lua fences. Do not split blocks because a phase number changed.

## Rote guide discipline (no hedging, no branches)

**Write one path.** The guide should read like a checklist or playbook block, not advice.

**Do not:**

- Branch in prose: “if X, do A; otherwise B”, “depending on…”, “you might see…”
- Offer alternatives: “you could either…”, “optionally…”, “or try…”
- Hedge: “just to be safe…”, “you might want to check…”, “it’s worth verifying…”, “if that doesn’t work…”
- Leave steps open-ended: “confirm things look right”, “make sure the state is correct”

**Do instead:**

- **Pick defaults** from Prerequisites (seat, camera, Save & Play) and state them once up front — not as repeated conditionals.
- **Replace “check if” with Lua** — assert in the paste block; on failure the log says why. Split setup/assert blocks; don’t ask the human to eyeball state Lua can read.
- **Resolve uncertainty before the guide** — if seat, scene, or repro path is genuinely unknown, ask **one** blocking question, then emit a single linear sequence. Do not embed “maybe do X” inside the steps.
- **Fail loud in the runbook** — expected console output (`PASS`, `FAIL`, `▶▶▶ HUMAN ▶▶▶`, dump path) so the author knows the step succeeded without guessing.
- **Subjective HUMAN only as last resort** — lighting intensity, timing, layout eyeball when Lua assert would be prohibitively complex.

Goal: the author can execute top-to-bottom with minimal interpretation — paste, click, paste, click.

## Numbered Steps (author run order)

- **Numbered steps** in fixed order: Step 1, Step 2, … One action per step.
- **Paste steps:** “Execute Lua Code — Code Block …” (not bold).
- **Manual steps:** The **action directive should be bold** when the console HUMAN line requires a TTS click or subjective visual. Brief context only when necessary, immediately after the directive.
- When HUMAN says `Run Code Block X` with no click, the next step is a paste step — no bold manual step.
- Do not ask the user to paraphrase state you can assert in Lua (`rollConfirm`, harness helpers, `DEBUG.*` file dumps).

## Prerequisites

- **Save & Play:** Required **only when repo Lua changed** since the last load (bundled scripts must match disk). Do **not** require Save & Play for doc/skill/template-only edits — the process is time-consuming on a large repo.
- The user will always be the **Host** (solo is fine).
- Do not request the user assign themselves to a specific seat — automate in the first `U.RunSequence` (e.g. seat change helpers, `rollTest` for dice).
- **Change seat** for dice bag/camera steps per [`.dev/TESTING.md`](../../.dev/TESTING.md).

## Default: paste Lua from the IDE (not the TTS console)

The user can **Execute Lua Code** from the IDE — no `lua` prefix, no in-game console typing.

**IMPORTANT CAVEATS:**

- The "Execute Lua Code" command cannot include `require` statements; it must run independently in the global scope. Most libraries are exposed globally and can be used without `require`.

**Default to Lua first:** setup, seeding, assertions, and file capture. Reserve **bold manual steps** only for UI clicks, visuals, or timing the engine cannot drive.

Do not use MCP/`tts_execute_lua` unless the user explicitly asks — IDE execute is the default.

## Use repo helpers first

Do **not** copy illustration dummies from the template into production runbooks. Prefer existing globals:

| Need | Helpers | Reference |
| --- | --- | --- |
| Command index | `debugHelp()` | [`.dev/TESTING.md`](../../.dev/TESTING.md) |
| State inspection | `showState()`, `showScene()` | TESTING.md § Console helpers |
| Dice setup / assert | `rollTest`, `rollConfirm`, `rollCancelAll`, `rollE2eExpectBroadcast` | TESTING.md § Dice debug |
| File evidence | `DEBUG.logStateToFile`, `DEBUG.logToFile`, `DEBUG.writeWorkspaceFile` | [`.dev/DEBUG_FILE_LOGGING.md`](../../.dev/DEBUG_FILE_LOGGING.md) |
| Domain DEBUG | `DEBUG.syncTableSimplified`, `DEBUG.compareLayoutPaths`, … | `debugHelp()` / TESTING.md |
| Console banners | `printHeader(text, level)` | TESTING.md § E2E console output (levels 1–2 for phases; not for HUMAN in Step-By-Step playbooks) |

## Long procedures (multi-step verification)

**Merge automation; split on human gates.**

- Batch automated work in **`U.RunSequence({ … })`** — setup, cameras, `rollConfirm`, phase banners via **`printHeader(text, level)`** (levels 1–2 for phases/suites inside a block).
- **Human cue format (authoritative):** one line per block, last step of the sequence:

```lua
function()
  M.setCamera("ALL", "rollBrown")  -- bag/tray/panel: same step as HUMAN
  print("   ▶▶▶ HUMAN ▶▶▶ Left-click Normal bag 5 times, then run Code Block A.2.")
end
```

- **One `▶▶▶ HUMAN ▶▶▶` line per pasted block** — never two in one `U.RunSequence` (they print back-to-back; `RunSequence` does not wait for the tester). End the block there; start a **new** fenced Lua block for post-action asserts.
- **Every** `U.RunSequence` must end with a HUMAN line. The agent must consciously choose:
  - **Click/visual:** exact TTS action, then “run Code Block …”
  - **Handoff:** `Run Code Block X.` (no click)
  - **Complete:** `Verification complete. No further action.`
- Each `printHeader` / `print` in its **own** `function() … end` step inside the sequence (preserves console order).
- Playbook-scale runs with legacy harness: **`RunTest("Dice")`** then **`RunTest()`** after each human gate ([TESTING.md § Streamlined block workflow](../../.dev/TESTING.md#streamlined-block-workflow)). Target: migrate E2E to Step-By-Step format + retain `RunTest`.

**Canonical examples:**

- **Primary:** [`.dev/Step-By-Step Playbooks/.Step-By-Step Template.md`](../../.dev/Step-By-Step%20Playbooks/.Step-By-Step%20Template.md)
- **Legacy (until TOR-141 migration):** [Dice-E2E.md](../../.dev/E2E%20Playbooks/Dice-E2E.md), [Dice-E2E-Guide.md](../../.dev/E2E%20Playbooks/Dice-E2E-Guide.md), [TESTING.md](../../.dev/TESTING.md)

**Important:** Do NOT interrupt a `U.RunSequence` for any reason other than needing human interaction to proceed. Merge phases across phase banners within one block; split only at paste boundaries when the tester must act in TTS before the next block runs.
