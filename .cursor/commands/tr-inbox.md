---
description: "Process INBOX + sync Focus and Linear — prep repo for /tr-start"
---

Run the **full Toronto Rising capture → schedule → prioritize** pipeline in this session. **Do not implement game code** unless the user explicitly asked to fix something during triage. Goal: when you finish, a **new agent chat** can run **`/tr-start`** and immediately see a clean stack rank with no stale capture backlog.

Follow `.cursor/rules/toronto-rising-linear.mdc` and `.dev/DEVELOPMENT_WORKFLOW.md` § **Inbox capture & triage** and § **Focus & backlog prioritization**.

## Part A — Inbox triage (both phases)

Read [`.dev/INBOX.md`](.dev/INBOX.md) (**Active**, **Needs clarification**, **Processed**).

### Phase 1 — Clarify

For each **Active** item and each **Needs clarification** item missing **`Answer:`** on every `?`:

1. Search codebase + Linear for duplicates and context; resolve alone when unambiguous.
2. If still unclear: move to **Needs clarification** (Bugs / Intents / Ideas); add **`?` bullets** (repro, scope, module, priority, duplicate check).
3. Do **not** block on chat — author answers inline in the file. If you parked new questions, list them in your summary so the user knows what to fill in.

Items where **every `?` has `Answer:`** → ready for Phase 2.

### Phase 2 — Promote

For every ready item (clear Active lines + fully answered Needs clarification):

1. Dedupe against Linear `TOR-*`.
2. Promote per workflow table (Linear + RUNNING TASKLIST for scoped work; Backlog-only for vague ideas; dismiss/duplicate → **Processed**).
3. Move handled lines to **Processed** (`YYYY-MM-DD TOR-XXX — summary`).
4. Never leave a scheduled promotion without **both** Linear issue and tasklist `_(TOR-XX)_` bullet.

Append meaningful entries to [`.dev/plans/linear-alignment-log.md`](.dev/plans/linear-alignment-log.md) when creating issues or changing workflow surfaces.

## Part B — Focus & Linear prioritization (always run)

Even if **Active** was empty, refresh the stack so **`/tr-start`** readers get current truth:

1. Read **`## Focus`** in [`.dev/RUNNING TASKLIST.md`](.dev/RUNNING%20TASKLIST.md).
2. List open Linear **Bug** issues and non-epic **In Progress** work (ignore epic-only noise unless actively blocking).
3. **Re-stack Focus** (update the table + dated blurb) using this default policy unless the user overrode in chat:
   - **Session-blocking bugs** and audible/regression failures first.
   - **Manual E2E playbooks (TOR-141)** soon after the worst scene/audio bugs — regression harness before large refactors.
   - Quick tooling wins (e.g. TOR-137) after that.
   - Large in-flight refactors (e.g. TOR-81) when Focus bugs + TOR-141 foundation are done.
   - UI polish / ST workflow features deferred unless the user is blocked on them.
4. Set **Linear priority** on Focus items to match tiers: bugs + TOR-141 → **High**; tooling → **Medium**; deferred polish → **Low**. Use **Urgent** only for true show-stoppers.
5. Ensure every Focus row has a matching open tasklist bullet and Linear issue; remove Focus rows for **Done** or **Canceled** work.
6. Add a **Deferred this cycle** line for polish/features intentionally not in Focus.

Do **not** start implementation work — this command is tracking-only.

## Part C — `/tr-start` readiness checklist

Before your final reply, verify and report:

| Check | Expected |
| --- | --- |
| **Active** | Empty, or only items you just parked with open `?` |
| **Needs clarification** | Only items awaiting inline **`Answer:`** |
| **Processed** | New promotions archived with date + `TOR-*` |
| **RUNNING TASKLIST** | New `[ ]` bullets for every scheduled promotion |
| **Focus** | Dated stack rank; top row is the recommended next task |
| **Linear** | Priorities aligned with Focus; no orphan promoted ids |

If unanswered **`?`** remain, say so explicitly — repo is still **`/tr-start`-ready** for implementation on existing Focus items; promotion waits for **`Answer:`** + re-run **`/tr-inbox`**.

## Your reply format

1. **Inbox summary** — promoted / parked / dismissed / duplicate (with `TOR-*` ids).
2. **Focus table** — reproduce the updated **`## Focus`** rows (top 6 max).
3. **Linear sync** — priority changes you made.
4. **Blocked on author** — any `?` still needing **`Answer:`** in INBOX (copy the questions).
5. **Handoff** — one sentence: *“Open a new chat and run `/tr-start` (optionally `/tr-start TOR-XXX`) to begin implementation.”*

---

*Slash command: `/tr-inbox` — run after testing capture sessions; pair with `/tr-start` in a fresh agent chat for implementation.*
