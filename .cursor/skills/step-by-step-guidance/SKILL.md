---
name: step-by-step-guidance
description: Guide the author through TTS verification — rote numbered steps, bold directives, pasteable Execute-Lua blocks, U.RunSequence batching, DEBUG file capture; no hedging or branchy prose.
---

# Step-by-step guidance (Tabletop Simulator)

When the user must act or verify in TTS (testing, E2E, bug repro, author Save & Play checks), emit a **concrete runbook** the author can follow by rote — not a menu of options or a conversation.

- **Numbered steps** in fixed order: Step 1, Step 2, … One action per step.
- The **action directive should be bold**. Brief context only when necessary, immediately after the directive.
- Do not ask the user to paraphrase state you can assert in Lua (`rollConfirm`, harness helpers, `DEBUG.*` file dumps).

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
- **Fail loud in the runbook** — expected console/file output (`PASS`, `[HUMAN]`, dump path) so the author knows the step succeeded without guessing.

Goal: the author can execute top-to-bottom with minimal interpretation — paste, click, paste, click.

## Prerequisites

- Repo Lua runs in TTS only after **Save & Play** (bundled scripts match disk).
- The user will always be the **Host**.
- Do not request the user assign themselves to a specific seat: This can be done in the code block, as a preliminary call in the `U.RunSequence` procedure.
- **Change seat** for dice bag/camera steps per `.dev/TESTING.md`.
- Before bag/tray/roll-panel clicks, include **`M.setCamera("ALL", "roll<Color>")`** in the same sequence step as the human cue.

## Default: paste Lua from the IDE (not the TTS console)

The user can **Execute Lua Code** from the IDE — no `lua` prefix, no in-game console typing.

**IMPORTANT CAVEATS:**
* The "Execute Lua Code" command cannot include `require` statements; it must run independently in the global scope.  Most libraries have been exposed globally, however, and can be used without `require`.

**Default to Lua first:** setup, seeding, assertions, and file capture. Reserve **bold manual steps** only for UI clicks, visuals, or timing the engine cannot drive.

**Capture evidence via repo helpers** (not ad-hoc `io` or “tell me what you see”):

- Console: `printHeader`, harness `rollConfirm` / `rollTest` (`PASS` / `FAIL` in log)
- Files: `DEBUG.logStateToFile`, `DEBUG.logToFile`, `DEBUG.writeWorkspaceFile` → `.dev/.debug/` when the bridge listens on **39998** (see `.dev/DEBUG_FILE_LOGGING.md`)

Do not use MCP/`tts_execute_lua` unless the user explicitly asks — IDE execute is the default.

## Long procedures (E2E playbooks, multi-step verification)

**Merge automation; split on human gates.**

- Batch automated work in **`U.RunSequence({ … })`** — setup, cameras, `rollConfirm`, suite banners via **`printHeader(text, level)`**.
- **One `[HUMAN]` cue per pasted block** — use `printHeader("[HUMAN] …", 3)`. End the block there; start a **new** fenced Lua block for post-action asserts. Never two level-3 `[HUMAN]` headers in one block (they print back-to-back; `RunSequence` does not wait for the tester).
- Playbook-scale runs: **`RunTest("Dice")`** then **`RunTest()`** after each human gate (see `.dev/TESTING.md` § Streamlined block workflow). `RunTest` steps are separate paste boundaries like markdown blocks.
- Each `printHeader` / `print` in its **own** `function() … end` step inside the sequence.

**Canonical examples:**

- Block shape: `.dev/E2E Playbooks/Dice-E2E.md`
- How to run, pass criteria, deterministic rules: `.dev/E2E Playbooks/Dice-E2E-Guide.md`
- `printHeader` levels, split rules, templates: `.dev/TESTING.md`

**Important:** Do NOT interrupt a `U.RunSequence` call for any reason other than needing human interaction to proceed.  All `U.RunSequence` calls should, accordingly, end with a `[HUMAN]` cue explaining what the user should do before running the next sequence.
