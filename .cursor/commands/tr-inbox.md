---
description: "Process INBOX + sync Focus and Linear — prep repo for /tr-start"
---

Run the **full Toronto Rising capture → schedule → prioritize** pipeline in this session. **Do not implement game code** unless the user explicitly asked to fix something during triage. Goal: when you finish, a **new agent chat** can run **`/tr-start`** and immediately see a clean stack rank with no stale capture backlog.

Follow `.cursor/rules/toronto-rising-linear.mdc` and `.dev/DEVELOPMENT_WORKFLOW.md` § **Inbox capture & triage** and § **Focus & backlog prioritization**.

## Conventions (always apply in this command)

### Linear ID context

**Never cite a bare `TOR-XXX` without a short human label** (a few words — not a full sentence). Applies everywhere in your reply, in Focus/Deferred lines you write, and in chat summaries — even when the same id appears in a table elsewhere.

- Bad: `TOR-139, TOR-140, TOR-142`
- Good: `TOR-139 (scenes panel trim + library grid), TOR-140 (sound panel text), TOR-142 (four scene Apply buttons)`

Use each issue’s tasklist title or Linear title as the label source.

### Precedence vs priority (do not conflate)

Two **independent** axes:

| Axis | Where it lives | Meaning |
| --- | --- | --- |
| **Precedence** (work order) | **Focus** stack, **Deferred this cycle**, Linear **`blocks` / `blockedBy`** | What to tackle *now* vs later; “A before B” |
| **Priority** (importance) | Linear **Priority** field only | How important B is *when scheduled* — **not** downgraded because other bugs exist |

**Rules:**

- **Deferral ≠ Low priority.** An inbox feature can be **Deferred this cycle** and still be **Medium** or **High** in Linear (author just captured a detailed spec — importance stays high; sequencing waits).
- **Use blocking liberally for sequencing:** when issue B should not start until A is done (hard dependency *or* soft “should complete first”), set **`blockedBy`** on B → A via `save_issue`. Author scans and removes blocks they disagree with — blocks are easier to audit than priority drift.
- **Do not** lower Linear priority on unrelated issues just because Focus bugs exist. Only change priority when the issue’s **intrinsic** urgency/importance changes.
- **`parentId` / sub-issues** — decomposition under an epic/feature (hierarchy). **`relatedTo`** — same theme, no sequencing. **`blockedBy`** — do A before B.

**Anti-gridlock:** Block **from the waiting issue only** (star pattern); keep **`blockedBy` lists short** (typically 1–6 direct prerequisites). Do not mesh deferred peers or re-link the whole backlog. See `.cursor/rules/toronto-rising-linear.mdc` § Anti-gridlock.

### Inbox back-burner confirmation

Before **any item promoted from INBOX this session** is placed outside the Focus top stack or marked **Deferred this cycle**:

1. **Do not write** deferral to RUNNING TASKLIST / Focus yet (and do not add **`blockedBy`** links or change Linear **priority** for that item yet).
2. Present a **Back-burner proposal** (reply format §5) for each inbox-origin `TOR-XXX (label)`:
   - **Focus:** in stack vs **Deferred this cycle**
   - **Blocking (proposed):** minimal direct prerequisites only — star pattern on this issue (`TOR-A (label)` blocks this one); avoid peer meshes; flag if >6 blockers
   - **Linear priority (proposed):** separate from deferral — e.g. Medium for a spec’d feature even when deferred
3. **Stop and wait** for author **Approve / adjust** (or explicit override in the same message). On approve: apply Focus deferral, **`blockedBy`** links, and priority **each as proposed and confirmed**.

No confirmation needed when an inbox item lands in **Focus** and is not deferred.

**Do not** auto-set Linear **Low** on deferred inbox items unless the author confirms low *importance* — not just “not this cycle.”

## Part A — Inbox triage (both phases)

Read [`.dev/INBOX.md`](.dev/INBOX.md) (**Active**, **Needs clarification**, **Processed**).

### Phase 1 — Clarify

For each **Active** item and each **Needs clarification** item missing **`Answer:`** on every `?`:

1. Search codebase + Linear for duplicates and context; resolve alone when unambiguous.
2. If still unclear: move to **Needs clarification** (**Unclear Bugs** / **Unclear Intents** / **Unclear Ideas**); add **`?` bullets** (repro, scope, module, priority, duplicate check).
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
   - **Manual E2E playbooks — TOR-141 (Dice + Scenes E2E playbooks)** soon after the worst scene/audio bugs — regression harness before large refactors.
   - Quick tooling wins (e.g. **TOR-137 (Sites unicode minus import)**) after that.
   - Large in-flight refactors (e.g. **TOR-81 (light modes cleanup)**) when Focus bugs + TOR-141 foundation are done.
   - UI polish / ST workflow features deferred unless the user is blocked on them.
4. **Inbox back-burner gate:** If any **inbox-promoted-this-session** issue would be deferred from Focus, run **Back-burner confirmation** (Conventions above) **before** writing deferrals, **`blockedBy`** links, or priority changes for that item.
5. **Linear priority** (intrinsic importance — independent of Focus deferral):
   - **Urgent** — true show-stoppers only
   - **High** — bugs in Focus, regression harness (**TOR-141 (E2E playbooks)**), or author-confirmed must-ship-soon
   - **Medium** — real features/improvements (including **deferred** inbox captures with full specs)
   - **Low** — polish/nice-to-have **only when author confirms** low importance — never as a side effect of deferral
6. **Blocking links:** When deferring B because A should finish first, add **`blockedBy: [A, …]`** on B (liberal sequencing OK). **Anti-gridlock:** star pattern on B only; 1–6 direct prerequisites; no peer-to-peer mesh among deferred items; justify in Back-burner proposal if >6. List new blocks in **Linear sync** (reply format).
7. Ensure every Focus row has a matching open tasklist bullet and Linear issue; remove Focus rows for **Done** or **Canceled** work.
8. Add a **Deferred this cycle** line for work intentionally not in Focus this cycle — **each id with a short label**. Deferral here does **not** imply Linear Low.

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
| **Linear** | Priorities reflect **importance**; **`blockedBy`** reflects **precedence**; no orphan promoted ids |

If unanswered **`?`** remain, say so explicitly — repo is still **`/tr-start`-ready** for implementation on existing Focus items; promotion waits for **`Answer:`** + re-run **`/tr-inbox`**.

If **Back-burner proposal** is pending author OK, say so — Focus deferrals, **`blockedBy`** links, and priority changes for those inbox items are **not** written until confirmed; other Focus updates may still apply.

## Your reply format

1. **Inbox summary** — promoted / parked / dismissed / duplicate. Every `TOR-XXX` includes a short label.
2. **Focus table** — reproduce the updated **`## Focus`** rows (top 6 max). Ids in the table already have a **Why now** column — that satisfies the context rule for those rows.
3. **Linear sync** — **priority** changes and new **`blockedBy`** links; each id with label (e.g. `TOR-143 (phase system redesign) → Medium`; `TOR-143 blockedBy TOR-141 (E2E playbooks)`).
4. **Blocked on author** — any `?` still needing **`Answer:`** in INBOX (copy the questions).
5. **Back-burner proposal** — if any inbox-promoted item would be deferred from Focus: list each `TOR-XXX (label)` with **proposed Focus treatment**, **proposed blockers** (labeled, minimal star-pattern set), **proposed Linear priority** (separate from deferral), rationale, and ask **Approve / adjust**. If none apply, say *“No inbox items deferred — nothing to confirm.”*
6. **Handoff** — one sentence with labeled id if naming a specific next task: *“Open a new chat and run `/tr-start` (optionally `/tr-start TOR-135 NPC cutouts on scene apply`) to begin implementation.”*

---

*Slash command: `/tr-inbox` — run after testing capture sessions; pair with `/tr-start` in a fresh agent chat for implementation.*
