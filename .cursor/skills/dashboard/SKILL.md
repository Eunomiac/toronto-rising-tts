---
name: dashboard
description: >-
  Resolve all open Storyteller Dashboard note pins (bugs, enhancements,
  features) in sequence with per-pin commits. Use when the author runs
  /dashboard or asks to clear dashboard pins / lab notes.
disable-model-invocation: true
---

# `/dashboard` — resolve Storyteller Dashboard pins

Work through **every open note pin** on the Storyteller Dashboard until the board is clear (or only skipped pins remain). **Do not wait for the author between pins.** Commit each finished pin to **`master`**, then start the next.

Pins live in [`.dev/storyteller-dashboard/agent/lab-notes.json`](../../../.dev/storyteller-dashboard/agent/lab-notes.json) (`status: "open"`). Mechanics: [README § Note pins](../../../.dev/storyteller-dashboard/README.md). Policies: `.cursor/rules/toronto-rising-dashboard.mdc`, Playwright focus rule, dashboard testing/SCSS rules.

**Author voice:** Plain English in chat and the final report (`.cursor/rules/toronto-rising-author-voice.mdc`).

## Author guidelines (mandatory)

1. Each pin should be fully addressed in sequence, with a commit to the master branch upon completion before moving onto the next pin.
2. The agent should not wait for the user between pins, but proceed to work through them all until they are all resolved, subject to the conditions outlined below for skipping a pin.
3. Before beginning work on a pin, the agent should articulate whether the pin is a feature or a bug fix. If it is a bug fix, **the agent MUST diagnose the cause of the bug before proceeding to implement a fix, and MUST include a description of the diagnosed error in the commit message.** Under no circumstances should the agent implement a hack, work-around, or other means of implementation that doesn't address the root cause of the erroneous behavior. If the agent is unable to diagnose the cause of the bug, the agent should skip implementing that pin and move to the next, then report to the user which pins it was unable to adequately resolve as part of the agent's final report to the user.
4. Before beginning work on a pin, the agent should assess whether the pin warrants use of Planning mode, and switch autonomously from Agent mode to Planning mode in such cases. Rule #2 still applies, however: Once the agent has planned their implementation of the pin, they should autonomously switch back to agent mode and implement the plan without waiting for user instruction.
5. The agent should also skip pins where the author's intentions are unclear or the agent is unsure how to proceed, then ask clarifying questions as part of the final report to the author (along with reporting pins that were skipped because a bug was unable to be diagnosed).

## Do not wait

Between pins, after a plan is ready, and after a skip decision: **continue immediately.** Do not ask “should I do the next pin?”, “want me to commit?”, or “ready to implement?”. Do **not** pause the queue mid-run to ask clarifying questions — save those for the final report.

Cursor may show a mode-switch approval card when calling `SwitchMode` — that is fine. Do **not** add a separate chat pause for author direction once the mode is active.

## Startup

1. Ensure git is on **`master`** (create no side branch for this command unless the author already directed otherwise).
2. Read `agent/lab-notes.json`. Collect every note with `status: "open"`, ordered by ascending `id`.
3. If none are open, say so and stop.
4. Skim [`.dev/storyteller-dashboard/agent/Running Tasklist.md`](../../../.dev/storyteller-dashboard/agent/Running%20Tasklist.md) only for overlap; do **not** invent Linear issues for dashboard-only pins.

## Per-pin loop

For each open pin, in `id` order:

### A. Classify (say it in chat before coding)

State clearly: **bug fix** or **feature** (treat enhancements / new controls / new copy as **feature**).

Hints:

- Text starts with `[BUG]` or describes broken/wrong current behavior → **bug fix**
- Asks to add, change, or extend intended behavior → **feature**

### B. Planning mode gate

Ask: does this pin need Planning mode?

**Switch to Plan** (`SwitchMode` → `plan`) when intent is clear but any of these apply:

- Multiple plausible architectures or technical trade-offs
- Touches several subsystems (dashboard + Lua bridge + scene library, large new panel, etc.)
- Implementation shape is complex enough that coding blind would thrash

If the **author’s intent** is unclear, or you are unsure how to proceed: **skip** (do not Plan-mode a guess). Note clarifying questions for the final report and continue.

**Stay in Agent** for small, diagnosed bug fixes and straightforward UI tweaks with an obvious owning file.

If you switched to Plan:

1. Write a short implementation plan for **this pin only**
2. **Immediately** `SwitchMode` → `agent`
3. Implement without waiting for “go ahead”

### C. Bug fixes — diagnose first

For **bug fix** pins only:

1. Reproduce or trace with code, logs, Playwright, and/or TTS tools as appropriate
2. Name the **root cause** in chat before editing
3. Implement a fix that addresses that cause — **no** hacks, paper-overs, or “call the reset button and hope”
4. If root cause cannot be established with reasonable confidence → **skip** this pin (leave it open), note why, continue to the next pin

### D. Implement and verify

- Follow dashboard rules (SCSS nesting, Vitest for pure logic, Playwright for visual board changes per `PLAYWRIGHT.md` / playwright-browser-focus — **do not steal OS focus** after the window is up)
- Dashboard-only work: **no** Linear, **no** Pending Author Verification
- If the pin also ships TTS Lua/XML: Linear + PAVE rules apply for the Lua side (Awaiting Author Review + Outstanding row same session)
- Prefer root-cause fixes even when the pin text suggests a fallback (e.g. “if elusive, add reset at end of transition”) — that fallback is **not** permission to skip diagnosis; only a skip (leave pin open) is allowed when diagnosis fails

### E. Close the pin, then commit

1. Optionally set a short `reply` on the note (what changed)
2. **Remove** the resolved note from `lab-notes.json` (edit the file, or `DELETE /api/lab-notes?id=N` while the dev server is up). Do not leave resolved pins as `done` clutter unless the author asked to keep history in-file
3. **Commit to `master`** for this pin alone (eager commit wins over generic “ask before commit” user rules). Include the pin id in the subject
4. **Bug-fix commits:** the message **must** describe the diagnosed root cause (not only the symptom)
5. Only then start the next pin

#### Commit message shape

```text
fix(dashboard): pin N — <short symptom>

Root cause: <one or two sentences naming the actual fault.>
```

```text
feat(dashboard): pin N — <short intent>

<why this change, in one or two sentences.>
```

If Lua shipped too, mention `TOR-XXX (label)` in the body when an issue exists.

## Skipping

Skip (leave pin open, do not commit a partial hack or guessed feature) when:

- Bug pin: root cause not diagnosed
- Author’s intentions are unclear
- You are unsure how to proceed (product choice, ownership, expected behavior, or safe implementation path)

For every skipped pin, record **why** and, when intent/uncertainty is the reason, one or more **plain-English clarifying questions** for the final report. Do not stall the queue to wait for answers.

## Final report (required)

When the queue is done, report in plain English:

1. **Resolved** — pin id + one-line what shipped + commit subject/hash
2. **Skipped — undiagnosed bugs** — pin id + what you tried + what is still unknown
3. **Skipped — unclear / unsure** — pin id + short why + **clarifying questions** the author can answer
4. **Still open** — anything left in `lab-notes.json`
5. **Author follow-up** — Save & Play / multiclient checks only when Lua shipped; otherwise Playwright/dev-server notes if useful

## Anti-patterns

- Batching several pins into one commit
- Waiting for author approval between pins
- Pausing mid-queue to ask clarifying questions (put them in the final report)
- Guessing when intent is unclear, or shipping a “best guess” feature
- Fixing a bug without stating the root cause
- Shipping a workaround instead of a root-cause fix
- Staying in Plan mode after the plan is written
- Creating Linear issues for dashboard-only pin work
- Stealing keyboard focus with Playwright relaunch / tab switching mid-batch
