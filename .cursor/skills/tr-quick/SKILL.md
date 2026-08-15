---
name: tr-quick
description: >-
  Assess Linear Focus issues for a combined small-batch implementation, then
  switch to Plan mode and draft one plan. Use when the user runs /tr-quick,
  with or without TOR-* ids.
disable-model-invocation: true
---

# `/tr-quick` — Focus batch into one plan

Review the **Focus stack**, choose issues that can ship together without a major refactor, then **immediately** enter Plan mode and write **one** implementation plan for that batch. **Do not implement** in this command — planning only.

Follow `.cursor/rules/toronto-rising-linear.mdc` (labeled `TOR-*` ids), `.cursor/rules/toronto-rising-author-voice.mdc` (plain English), and `.dev/DEVELOPMENT_WORKFLOW.md` § Focus.

## Do not wait for confirmation

**Never pause to ask whether the chosen issues are the right ones.**

This forbids:

- “Are these the issues you want?”
- “Should I include TOR-X?”
- “Drop TOR-Y from the batch?”
- Any other approval step between assessment and the plan

If the author listed ids, use that list (minus too-complex items). If they listed none, **you** pick from Focus and go straight to planning. The CreatePlan / Plan-mode artifact is the handoff — not a candidate-list question.

You may still ask a **product** question that would change the code (for example Health vs Willpower) **inside the plan**, as a stated decision with a default. Do not block entering Plan mode on that.

## Inputs

Read first:

1. `## Focus` in [`.dev/RUNNING TASKLIST.md`](../../../.dev/RUNNING%20TASKLIST.md)
2. Matching Linear issues (`get_issue` / `list_issues`)
3. Enough code to judge size (owning files, overlap, dual-apply / bundling risk)

Do **not** edit [PENDING AUTHOR VERIFICATION.md](../../../.dev/PENDING%20AUTHOR%20VERIFICATION.md) (inbox-only). Do **not** re-stack Focus or set Linear **Deferred this cycle** (paused). “Defer” below means **leave out of this batch** — issues stay on Focus / domain sections.

### With issue ids (`/tr-quick TOR-487 TOR-488 …`)

Assess **only** the listed ids (Focus rank is context, not a filter). Drop any that are too complex to attack **in the same batch as the others**. Plan the remainder as one combined implementation.

If every listed id is too heavy for a combined sweep, still switch to Plan mode and write a short plan that says so, names the deferrals (labeled), and recommends a single next `/tr-start` id — **without asking**.

### Naked `/tr-quick` (no ids)

Assess the current **Focus table** (top stack, typically ≤6). Select every row that is appropriate for a one-fell-swoop batch. Omit living docs, External / workshop-only, verification-only gates, and major refactors. **Do not ask the author to confirm the set.** Proceed immediately to Plan mode with what you selected.

If nothing on Focus qualifies, still Plan: explain why, and name the smallest single Focus item for a later `/tr-start`.

## What counts as too complex (defer from the batch)

Omit from the combined plan when **any** of these is true:

- Major refactor or architecture (light-mode centralization, Sync.full audit, phase UX redesign, rotational seat layout, and similar)
- Living documentation (`living-doc`), External / `workshop-only` / human-gate, or verification-only (e.g. join-stress re-smoke with no code)
- Open **`blockedBy`** whose prerequisite is not Done/Canceled
- Unclear product/scope that would need INBOX `?` answers
- Combining it with the rest would force an unsafe dual-writer or a dedicated solo session

**Small/medium bounded bugs and features stay in.** Shared files (especially `core/global_script.ttslua`) are OK if the plan uses **sequential slices and separate commits**, not parallel agents editing the same hunks.

File overlap is not automatic deferral. A medium wrap that copies an existing pattern (for example staged blindfold + `skipSoundscape`) can stay in the batch if it is last and isolated.

## Plan mode (mandatory, no wait)

1. If the session is **not** already in Plan mode, call **SwitchMode** to `plan` (brief explanation: combined Focus batch).
2. Research remaining issues (code + Linear). Prefer parallel explore for independent domains.
3. **CreatePlan** for **one** implementation that covers all remaining issues: slice order, files, risks (Lua local order, object-script bundling, dual-apply), commits per slice, author TTS checks.
4. Do **not** start coding until the author accepts that plan (Cursor Plan flow). `/tr-quick` itself stops at the plan.

## Plan shape

- Lead with **in-batch** vs **deferred this sweep** (labeled `TOR-*`, one-line why).
- Default to **one agent, sequential slices, commit after each** — not N parallel writers on `global_script`.
- Put the riskiest remaining item **last** so earlier slices can still ship.
- Author voice in the plan overview; file paths as markdown links.

## Reply (while planning)

Keep the chat short: batch list, deferred list with reasons, then the plan artifact. No “want me to include…?”
