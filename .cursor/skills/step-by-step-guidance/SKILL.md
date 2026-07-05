---
name: step-by-step-guidance
description: Guide the author through in-TTS verification after a fix or feature change — produce a configured step-by-step playbook from the template and link it in chat.
---

# Step-by-step guidance (Tabletop Simulator)

Use this skill whenever the author must **confirm something works in TTS** — after a bugfix, feature slice, refactor, or Save & Play sign-off. Do not improvise verification in chat prose alone.

## Default deliverable

1. Copy [`.dev/Step-By-Step Playbooks/.Step-By-Step Template.md`](../../.dev/Step-By-Step%20Playbooks/.Step-By-Step%20Template.md) to a configured playbook file, e.g. `.dev/Step-By-Step Playbooks/TOR-281-clear-seat-verify.md` (or a descriptive name when no Linear id yet).
2. Fill in title, goal, prerequisites, Run order, and Code Blocks for **this** fix — valid Lua, repo helpers, asserts for everything Lua can check.
3. Write in a concise but conversational tone, avoiding too much abbreviation or shorthand.
  **BAD:** "Verify **TOR-281 (Stage Clear seat activation + live scene-library seat persistence)**: Clear-from-stage homeland seat rules (disabled + visible stage light → activate; enabled seat unchanged) and `seatSlots.isPresent` write-back into the linked scene library row."
  **GOOD:** "Verify TOR-281: Clearing NPC figurines from the stage when those NPCs occupy table seats should return them to their chair; the seat should activate if the NPC was lit on stage. Seat toggles during play should persist in the scene library when you re-apply that scene."
4. **Prerequisites prose: 2–4 bullets max.** Only what the author must do before pasting Code Block 0 (usually **Save & Play** + Host connected). **Automate everything else in Code Block 0** — seat, table, tokens, dummy library rows, harness baseline. Do not list workshop setup the script can perform (see **Automate prerequisites** below).
5. **Link the configured file** in chat (markdown path). The author runs it top-to-bottom from that doc — not from a wall of inline steps.
6. Chat message stays short: what was fixed, link to the playbook, Step 1 reminder (**Save & Play** if repo Lua changed).

Use chat-only numbered steps (no file) only for trivial one-paste smoke checks. When verification spans setup, asserts, and any TTS clicks, write the playbook file.

**Blank template:** [`.Step-By-Step Template.md`](../../.dev/Step-By-Step%20Playbooks/.Step-By-Step%20Template.md) · **Index:** [README.md](../../.dev/Step-By-Step%20Playbooks/README.md)

Legacy E2E playbooks ([Dice-E2E](../../.dev/E2E%20Playbooks/Dice-E2E.md), etc.) still use `printHeader("[HUMAN] …", 3)` until **TOR-141** migration. **New** runbooks follow this skill + template (triangle HUMAN format).

## Three layers (do not conflate)

| Layer | Name | Drives splits? |
| --- | --- | --- |
| Author run order | **Step 1, Step 2, …** | Paste IDE block or **bold** manual click |
| Paste boundaries | **Code Block 0, A.1, …** | Split **only** at a [human gate](#human-gates-when-to-stop-automation) (not for phase labels or handoff) |
| Console structure | **Phase 1.1, 2.1, …** | **Never** — `printHeader(..., 1)` labels inside a block |

**Agent rule:** Step numbers track **author actions**, not test phases. Phases 1.1 → 2.1 → 3.1 belong in **one** Code Block and **one** `U.RunSequence` until a [human gate](#human-gates-when-to-stop-automation) forces a stop.

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
- **Subjective HUMAN only as last resort** — lighting intensity, timing, layout eyeball when Lua assert would be prohibitively complex (human gate **(2)** or **(3)**).

Goal: **automate what is reasonable in Lua**; **ask the author** for simple faithful TTS actions (drop, click, roll) rather than building simulators to avoid them.

## Numbered Steps (author run order)

- **Numbered steps** in fixed order: Step 1, Step 2, … One action per step.
- **Paste steps:** “Execute Lua Code — Code Block …” (not bold) — one Code Block may cover many automated phases; do not add a paste step between Lua-only sections.
- **Manual steps:** The **action directive should be bold** only when a [human gate](#human-gates-when-to-stop-automation) requires a TTS click, visual check, or timed wait the author must perform.
- Do not ask the user to paraphrase state you can assert in Lua (`rollConfirm`, harness helpers, `DEBUG.*` file dumps).

## Prerequisites

**Two layers — do not duplicate.**

| Layer | Where | Content |
| --- | --- | --- |
| **Human prerequisites** | Markdown (2–4 bullets) | Save & Play when needed; Host connected; anything that truly cannot run in Lua (almost never: seat color, table, tokens, library rows) |
| **Session setup** | **Code Block 0** | Assign Black, switch table, spawn/move tokens, seed dummy `gameState`, domain harness reset — then **verify** with asserts |

**Rule:** If you wrote a prerequisite the author could satisfy by pasting Lua, it belongs in Code Block 0 instead.

- **Save & Play:** Required **only when repo Lua changed** since the last load. Do **not** require Save & Play for doc/skill/template-only edits.
- **Host connected** (solo is fine) — the only standing human requirement besides Save & Play.
- **Never** ask the author to pick a seat, switch tables manually, place tokens, or pre-populate library rows — automate in Code Block 0.

## Automate prerequisites (mandatory in Code Block 0)

Before the test body runs, Code Block 0 should **prepare** then **verify**. Prefer existing globals; add inline `S.setStateVal` only for test-specific dummy data.

| Need | Prefer | Notes |
| --- | --- | --- |
| Storyteller seat (Black) | `rollE2eSeatPrep("Black")` | Also hides startup overlay + camera spoof ([TESTING.md](../../.dev/TESTING.md)) |
| Active table | `DEBUG.syncTableSimplified("Table A")` | Layout + `currentTableKey`; use `skipTransitionBlindfold` table paths only when the test requires blindfold UX |
| NPC control tokens | `DEBUG.spawnNpcControlBoardTokens()` | Idempotent when tokens already exist; pair with `gbE2eReset()` / harness placement for board UV |
| Gameboard baseline | `gbE2eReset()`, `gbE2ePrereqCheck()` | Empty placements + fixture preload; use when the playbook targets gameboard/NPC stage |
| Scene library slot | `ensureSceneLibraryStub(slotIndex, sceneKey?, opts?)` | Minimal `sessionScene` stub for the test — do not require a pre-authored workshop row |
| Dice / roll context | `rollTest(color, …)` | Includes seat prep automatically |

**Agent checklist:** List human prerequisites (≤4 bullets) → implement every other default in Code Block 0 → end Code Block 0 with verify asserts, not “fail if the world wasn't already perfect.”

## Default: paste Lua from the IDE (not the TTS console)

The user can **Execute Lua Code** from the IDE — no `lua` prefix, no in-game console typing.

**IMPORTANT CAVEATS:**

- The "Execute Lua Code" command cannot include `require` statements; it must run independently in the global scope. Most libraries are exposed globally and can be used without `require`.

**Default to Lua first** means setup, seeding, **assertions**, and file capture — not simulating every in-world gesture. Reserve **bold manual steps** for UI clicks, drops, rolls, visuals, or timing the engine cannot drive **reasonably**.

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
| Session setup | `rollE2eSeatPrep`, `DEBUG.spawnNpcControlBoardTokens`, `gbE2eReset`, `ensureSceneLibraryStub`, `DEBUG.syncNpcs` | **Automate prerequisites** above; **`Sync` is not global** in Execute Lua — use `DEBUG.syncNpcs(opts)` |
| Console banners | `printHeader(text, level)` | TESTING.md § E2E console output (levels 1–2 for phases; not for HUMAN in Step-By-Step playbooks) |

## Long procedures (multi-step verification)

**Default: merge automation.** Batch setup, phase banners, and asserts in as few `U.RunSequence` steps and Code Blocks as possible. Split only at a human gate.

### Human gates (when to stop automation)

**Balance:** Automate everything **reasonable and practical** in Lua (state, harness helpers, asserts). The author **is available** and **does not mind** simple TTS actions — drops, bag clicks, dice rolls, panel toggles. Do **not** invent elaborate automation to avoid those.

End a `U.RunSequence` / start a new Code Block / emit `▶▶▶ HUMAN ▶▶▶` **only** when one of these applies:

| # | Gate | When to use | Examples |
| --- | --- | --- | --- |
| **1** | **Human interaction required** | Normal UI / table action is the **straightforward** path | Toolbar Clear (5s confirm), Scenes panel toggle, **drop token on snap**, **click dice bag**, Apply scene |
| **2** | **Human senses required** | Lua cannot reliably observe or schedule the check | Visual fade/timing, layout eyeball, “wait ~12s for blindfold” when `U.waitUntil` is not trustworthy |
| **3** | **Automation unreasonable** | Automating would be **fragile, clunky, or disproportionate** — not merely “human could do it” | Many manual alignments at once, simulating drag/drop/physics, fake bag clicks, spawning objects to mimic a roll **when the author can just roll** |
| **4** | **Verification complete** | Playbook finished | `Verification complete. No further action.` |

**Gate (3) — read carefully:** This is **not** “avoid human interaction at all costs.” If the faithful test path is “drop token, then assert,” use gate **(1)** and ask for the drop. Gate **(3)** applies when an agent would otherwise write **hacky simulators** (synthetic drops, scripted pick-up cycles, click spoofing, physics-style placement) that are **more complex and less trustworthy** than the author doing the obvious TTS action once.

| Prefer gate **(1)** — author action | Do **not** over-automate |
| --- | --- |
| Drop NPC token on board snap | `spawnObject` + scripted pick/place to “simulate” drop |
| Click Normal bag N times | Loop of `clickObject` / coordinate hacks |
| Roll dice on table | Force faces via debug **only when** harness already provides that path (`rollSetFaces`, `rollTest`); do not build a one-off roller |
| Clear toolbar (5s confirm) | `GlobalGameboardClear` alone when the test is **about** the real Clear UX |

**Not a human gate:** “Run Code Block X” handoffs between Lua-only sections, phase number changes, or checkpoint pastes when the author does nothing in TTS. **Merge** those into the same `U.RunSequence` and prefer **one Code Block** until gate **(1)–(4)**.

### `U.RunSequence` — inter-step waits (read before splitting blocks)

Implementation and comments: [`lib/util.ttslua`](../../lib/util.ttslua) (`U.RunSequence`, `U.RunSequenceWithOptions`, `U.waitUntil`).

Each step is a `function() … end`. After a step runs, its **return value** becomes the `U.waitUntil` **testRef** that controls when the **next** step runs:

| Step returns | Next step waits until… |
| --- | --- |
| `number` | That many seconds elapse |
| GameObject | Object is resting and not loading |
| `function` | The function returns true (poll loop) |
| `table` | Every entry in the table satisfies its own test (AND) |
| `nil` / nothing | Default **0.5s** delay |

So **`U.RunSequence` does wait** between steps — including while the author performs a TTS action — when the prior step returns an appropriate testRef. The caller’s chunk returns immediately; work continues in coroutines. The return value of `U.RunSequence(...)` is `isDone()` — a function that becomes true when the full chain finishes (or errors).

**Gate (1) pattern (preferred when state is pollable):** print `▶▶▶ HUMAN ▶▶▶` and **`return` a wait** in the **same step**; put post-action asserts in the **next** step(s) of the **same** sequence — no extra Code Block paste.

```lua
function()
  M.setCamera("ALL", "rollBlack")
  print("   ▶▶▶ HUMAN ▶▶▶ On CONTROL_BOARD: click Clear once, wait five seconds, click Clear again.")
  return function()
    return next(S.getStateVal("sessionScene", "npcWorld", "placements") or {}) == nil
  end
end,
function()
  if NPCS.resolveSeatNarrativePresence("NPC1") ~= true then
    error("[FAIL] NPC1 seat should be active after Clear")
  end
  print("PASS — seat active after Clear")
end,
```

**Gate (2) timing:** return a **number** (seconds) when a fixed delay is enough; return a **poll function** when Lua can observe readiness (e.g. blindfold flag, phase change). Use a subjective HUMAN + separate Code Block only when neither is reliable. Poll only for the human action’s effect — assert feature behavior in the following step(s). Coroutine faults print as `[coroutine] …` via `U.logCoroutineIssue` when a wait or step throws.

**`U.RunSequenceWithOptions`** (when needed): `maxWait` / `frequency` per inter-step wait (default max **60s** — increase for slow human actions, e.g. `U.RunSequence(funcs, 120)`), `onComplete(ok, detail)`, `stepNames`, `sequenceTimeoutSeconds`, `cancelRegistry` for external abort. See inline option comments in `util.ttslua`.

**When to split into a new Code Block anyway:**

- Gate **(2)** or **(3)** with no trustworthy poll (subjective visual, manual alignment report).
- Legacy **`RunTest`** harness — still expects a paste boundary at `[HUMAN]` ([TESTING.md § U.RunSequence](../../.dev/TESTING.md#usequence-ordering-rules)).
- Optional **recovery** — author re-pastes only the assert half while debugging (not required if poll + assert share one sequence).

**Do not split** gate **(1)** into “setup block → human paste → assert block” when a return testRef can bridge the action and the asserts in one `U.RunSequence`.

### Console cues

- Batch automated work in **`U.RunSequence({ … })`** — setup, cameras, `rollConfirm`, phase banners via **`printHeader(text, level)`** (levels 1–2 for phases inside one block).
- **`▶▶▶ HUMAN ▶▶▶` format** — in the step that **`return`s the inter-step wait** (gate **(1)** / **(2)**), or alone at completion (gate **(4)**). See gate **(1)** example in [`U.RunSequence`](#usequence--inter-step-waits-read-before-splitting-blocks) above.
- **One `▶▶▶ HUMAN ▶▶▶` cue per human gate** — the step that prints it must **`return` the inter-step wait** before the next step runs; never two HUMAN prints back-to-back in adjacent steps with no wait between.
- **Between automated steps:** use `print("PASS — …")` breadcrumbs; do **not** insert handoff HUMAN lines.
- Each `printHeader` / `print` in its **own** `function() … end` step inside the sequence (preserves console order).
- Playbook-scale runs with legacy harness: **`RunTest("Dice")`** then **`RunTest()`** after each human gate ([TESTING.md § Streamlined block workflow](../../.dev/TESTING.md#streamlined-block-workflow)). Target: migrate E2E to Step-By-Step format + retain `RunTest`.

**Canonical examples:**

- **Primary:** [`.dev/Step-By-Step Playbooks/.Step-By-Step Template.md`](../../.dev/Step-By-Step%20Playbooks/.Step-By-Step%20Template.md)
- **Legacy (until TOR-141 migration):** [Dice-E2E.md](../../.dev/E2E%20Playbooks/Dice-E2E.md), [Dice-E2E-Guide.md](../../.dev/E2E%20Playbooks/Dice-E2E-Guide.md), [TESTING.md](../../.dev/TESTING.md)

**Important:** Minimize **unnecessary** gates (no handoff splits, no phase splits). **Do** use gate **(1)** for ordinary TTS actions the author can perform in seconds. **Do not** substitute gate **(3)**-grade simulation scripts to avoid a simple drop, click, or roll.
