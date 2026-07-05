---
name: step-by-step-guidance
description: Guide the author through TTS verification — bold step directives, pasteable Execute-Lua blocks, U.RunSequence batching, DEBUG file capture; minimize manual gates.
---

# Step-by-step guidance (Tabletop Simulator)

When the user must act or verify in TTS (testing, E2E, bug repro, author Save & Play checks):

- Describe each step concisely in plain English. The **action directive should be bold**.
- Add brief context only when necessary, immediately after the directive.
- Do not ask the user to paraphrase state you can assert in Lua (`rollConfirm`, harness helpers, `DEBUG.*` file dumps).

## Prerequisites

- Repo Lua runs in TTS only after **Save & Play** (bundled scripts match disk).
- Table **Host** (solo is fine). **Black** for ST/scenes/debug; **change seat** for dice bag/camera steps per `.dev/TESTING.md`.
- Before bag/tray/roll-panel clicks, include **`M.setCamera("ALL", "roll<Color>")`** in the same sequence step as the human cue.

## Default: paste Lua from the IDE (not the TTS console)

The user can **Execute Lua Code** from the IDE — no `lua` prefix, no in-game console typing.

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
