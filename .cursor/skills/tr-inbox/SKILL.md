---
name: tr-inbox
description: Process the INBOX, sync Focus Stack and Linear, report current status of work focus
---

Run the **full Toronto Rising capture → schedule → prioritize** pipeline in this session. **Do not implement Active inbox items** during triage unless the author explicitly asked to fix something — **except Quick Fixes** (Part A.0). Goal: when you finish, a **new agent chat** can run **`/tr-start`** and immediately see a clean stack rank with no stale capture backlog.

Follow `.cursor/rules/toronto-rising-linear.mdc` and `.dev/DEVELOPMENT_WORKFLOW.md` § **Inbox capture & triage** and § **Focus & backlog prioritization**.

**Multiplayer authority:** When promoting or prioritizing work that touches events, load/bootstrap, HUD, or world I/O, ensure **`blockedBy`** reflects host-authority prerequisites (e.g. **TOR-221** bootstrap audit, **TOR-144** multiplayer E2E) where appropriate. Agents implementing promoted items must uphold **P1–P10** — [`.cursor/rules/toronto-rising-multiplayer-authority.mdc`](.cursor/rules/toronto-rising-multiplayer-authority.mdc), [Preparing For Multiplayer §1](.dev/Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md).

## Conventions (always apply in this command)

### Linear ID context

**Never cite a bare `TOR-XXX` without a short human label** (a few words — not a full sentence). Applies everywhere in your reply, in Focus lines you write, and in chat summaries — even when the same id appears in a table elsewhere.

- Bad: `TOR-139, TOR-140, TOR-142`
- Good: `TOR-139 (scenes panel trim + library grid), TOR-140 (sound panel text), TOR-142 (four scene Apply buttons)`

Use each issue’s tasklist title or Linear title as the label source.

### Precedence vs priority (do not conflate)

Two **independent** axes:

| Axis | Where it lives | Meaning |
| --- | --- | --- |
| **Precedence** (work order) | **Focus** stack + Linear **`blocks` / `blockedBy`** | What to tackle *now* vs later; “A before B” |
| **Priority** (importance) | Linear **Priority** field only | How important B is *when scheduled* — **not** downgraded because other bugs exist |

**Rules:**

- **Deferral ≠ Low priority.** Work waiting on prerequisites can stay **High** or **Medium** in Linear — importance is independent of Focus rank.
- **Use blocking liberally for sequencing:** when issue B should not start until A is done (hard dependency *or* soft “should complete first”), set **`blockedBy`** on B → A via `save_issue`. Author scans and removes blocks they disagree with — blocks are easier to audit than priority drift or informal deferral lists.
- **Do not** lower Linear priority on unrelated issues just because Focus bugs exist. Only change priority when the issue’s **intrinsic** urgency/importance changes.
- **`parentId` / sub-issues** — decomposition under an epic/feature (hierarchy). **`relatedTo`** — same theme, no sequencing. **`blockedBy`** — do A before B.

**Anti-gridlock:** Block **from the waiting issue only** (star pattern); keep **`blockedBy` lists short** (typically 1–6 direct prerequisites). Do not mesh peers or re-link the whole backlog. See `.cursor/rules/toronto-rising-linear.mdc` § Anti-gridlock.

### No back-burner deferral (author policy — 2026-06-21)

**Back-burner / “Deferred this cycle” is paused.** There is **no** reliable mechanism to resurface issues parked on a deferral list when prerequisites finish — so agents **must not** use it.

**Do not:**

- Add or update **Deferred this cycle** in RUNNING TASKLIST during `/tr-inbox`
- Present **Back-burner proposals** or wait for author approval before applying **`blockedBy`** or priority on inbox promotions
- Treat “not in Focus top stack” as a separate deferral bucket — open work stays in **domain tasklist sections** only

**Do instead:**

- **Focus** = small stack rank (top ~3–6) for what to run **`/tr-start`** on next
- **Sequencing** = Linear **`blockedBy`** on the **waiting** issue (star pattern, 1–6 direct prerequisites)
- **Inbox promotions** not in Focus: Linear issue + tasklist `[ ]` bullet in the right domain section + **`blockedBy`** when B should wait for A — apply blockers **without** asking
- When a **`blockedBy` prerequisite** is **Done** or **Canceled**: remove stale blockers on dependents (standard gate-close survey in `.cursor/rules/toronto-rising-linear.mdc`); optionally re-stack **Focus** — do **not** expect a deferral list to resurface work

**Do not** auto-set Linear **Low** on work that is simply “not Focus #1” — that is sequencing/importance, not low importance.

### INBOX cleanup (after triage)

After handling each capture item, **remove its bullet lines** from **Quick Fixes**, **Active**, or **Needs clarification** (and any nested `?` / `Answer:` lines). **Keep every section header** and the existing file structure (`---`, **Unclear Bugs** / **Intents** / **Ideas** subsections, **Processed**).

**Do not** insert filler where bullets were removed — no `_(empty)_`, `(empty)`, “none”, or similar placeholder lines under empty sections.

Move handled items to **Processed** (`YYYY-MM-DD TOR-XXX — summary` or `shipped` / `duplicate` / `dismissed`). Also log promotions in [`.dev/plans/linear-alignment-log.md`](.dev/plans/linear-alignment-log.md).

**Exception:** Items **parked** in **Needs clarification** with open **`?`** stay until answered and re-triaged.

## Part A — Inbox triage

Read [`.dev/INBOX.md`](.dev/INBOX.md) (**Quick Fixes**, **Active**, **Needs clarification**).

### Part A.0 — Quick Fixes (run first)

For each bullet under **Quick Fixes**:

1. Inspect the codebase; decide **implement now** vs **promote to Linear**.
2. **Implement now** when the fix is clearly small (typically one file, a few lines, no design fork):
   - Patch the repo; run `npm run build` when Lua/XML/build inputs change.
   - **Commit** without asking (Quick Fixes grants commit permission during `/tr-inbox`).
   - If a matching open Linear issue exists → mark **Done** with a short comment; else log in [`.dev/plans/linear-alignment-log.md`](.dev/plans/linear-alignment-log.md) as shipped (create a **Bug** issue only when you want a bug anchor).
   - Do **not** add a Focus row for work already shipped here unless the author should verify in TTS.
3. **Promote** when not a quick fix → same as Active (Linear + RUNNING TASKLIST + alignment log).

Quick Fixes **override** the tracking-only rule for Active items — this is the only inbox section where agents implement game code during `/tr-inbox`.

### Phase 1 — Clarify

For each **Active** item and each **Needs clarification** item missing **`Answer:`** on every `?`:

1. Search codebase + Linear for duplicates and context; resolve alone when unambiguous.
2. If still unclear: move to **Needs clarification** (**Unclear Bugs** / **Unclear Intents** / **Unclear Ideas**); add **`?` bullets** (repro, scope, module, priority, duplicate check).
3. Do **not** block on chat — author answers inline in the file. If you parked new questions, list them in your summary so the user knows what to fill in.

Items where **every `?` has `Answer:`** → ready for Phase 2.

### Phase 2 — Promote

For every ready item (clear Active lines + fully answered Needs clarification):

1. Dedupe against Linear `TOR-*`.
2. Promote per workflow table (Linear + RUNNING TASKLIST for scoped work; Backlog-only for vague ideas; dismiss/duplicate → alignment log only).
3. Move handled lines to **Processed** (`YYYY-MM-DD TOR-XXX — summary`) and record in [`.dev/plans/linear-alignment-log.md`](.dev/plans/linear-alignment-log.md).
4. Never leave a scheduled promotion without **both** Linear issue (when applicable) and tasklist `_(TOR-XX)_` bullet.

### End of Part A — Clean up INBOX

After Quick Fixes + Phase 1/2, apply **INBOX cleanup** (Conventions above): remove handled bullets, keep headers, no placeholder lines.

## Part B — Focus & Linear prioritization (always run)

Even if capture sections were empty, refresh the stack so **`/tr-start`** readers get current truth:

1. Read **`## Focus`** in [`.dev/RUNNING TASKLIST.md`](.dev/RUNNING%20TASKLIST.md).
2. List open Linear **Bug** issues and non-epic **In Progress** work (ignore epic-only noise unless actively blocking).
3. **Re-stack Focus** (update the table + dated blurb) using this default policy unless the user overrode in chat:
   - **Session-blocking bugs** and audible/regression failures first.
   - **Manual E2E playbooks — TOR-141 (Dice + Scenes E2E playbooks)** soon after the worst scene/audio bugs — regression harness before large refactors.
   - Quick tooling wins (e.g. **TOR-137 (Sites unicode minus import)**) after that.
   - Large in-flight refactors (e.g. **TOR-81 (light modes cleanup)**) when Focus bugs + TOR-141 foundation are done.
   - UI polish / ST workflow features lower in Focus unless the user is blocked on them.
4. **Sequencing (no back-burner):** For inbox promotions **not** in the Focus top stack, add **`blockedBy`** on the waiting issue when prerequisites exist — **apply directly**; do **not** defer to **Deferred this cycle** or ask for back-burner approval. Flag in **Linear sync** if an issue needs >6 blockers (justify or use one umbrella gate).
5. **Linear priority** (intrinsic importance — independent of Focus rank):
   - **Urgent** — true show-stoppers only
   - **High** — bugs in Focus, regression harness (**TOR-141 (E2E playbooks)**), or author-confirmed must-ship-soon
   - **Medium** — real features/improvements (including inbox captures with full specs that are not Focus #1)
   - **Low** — polish/nice-to-have **only when author confirms** low importance — never as a side effect of “not in Focus”
6. **Blocking links:** When B should wait for A, add **`blockedBy: [A, …]`** on B (liberal sequencing OK). **Anti-gridlock:** star pattern on B only; 1–6 direct prerequisites; no peer-to-peer mesh. List new blocks in **Linear sync** (reply format).
7. Ensure every Focus row has a matching open tasklist bullet and Linear issue; remove Focus rows for **Done** or **Canceled** work.
8. **Do not** update **Deferred this cycle** — it is **paused** (historical line in RUNNING TASKLIST is context only).

Part B remains **tracking-only** (no Active-item implementation). Quick Fixes are handled in Part A.0 only.

## Part C — `/tr-start` readiness checklist

Before your final reply, verify and report:

| Check | Expected |
| --- | --- |
| **Quick Fixes** | Handled bullets removed; headers kept; **no** placeholder lines added |
| **Active** | Handled bullets removed; headers kept; **no** placeholder lines added |
| **Needs clarification** | Answered/promoted items removed; parked open-`?` items remain if any |
| **Processed** | New session entries appended for handled items |
| **RUNNING TASKLIST** | New `[ ]` bullets for every scheduled promotion |
| **Focus** | Dated stack rank; top row is the recommended next task |
| **Linear** | Priorities reflect **importance**; **`blockedBy`** reflects **precedence**; no orphan promoted ids |

If unanswered **`?`** remain, say so explicitly — repo is still **`/tr-start`-ready** for implementation on existing Focus items; promotion waits for **`Answer:`** + re-run **`/tr-inbox`**.

## Your reply format

1. **Inbox summary** — quick-fix shipped / promoted / parked / dismissed / duplicate. Every `TOR-XXX` includes a short label.
2. **Focus table** — reproduce the updated **`## Focus`** rows (top 6 max). Ids in the table already have a **Why now** column — that satisfies the context rule for those rows.
3. **Linear sync** — **priority** changes and new **`blockedBy`** links; each id with label (e.g. `TOR-143 (phase system redesign) → Medium`; `TOR-143 blockedBy TOR-141 (E2E playbooks)`).
4. **Blocked on author** — any `?` still needing **`Answer:`** in INBOX (copy the questions).
5. **Sequencing notes** — inbox promotions not in Focus: where they landed (domain section) and **`blockedBy`** applied (labeled). If none promoted this session, say *“No new sequencing.”*
6. **Handoff** — one sentence with labeled id if naming a specific next task: *“Open a new chat and run `/tr-start TOR-135 NPC cutouts on scene apply` (include the issue id in the message so scope is obvious). After the agent sets Linear **In Progress**, rename the chat to `TOR-135 — NPC cutouts on scene apply` — agents cannot rename Cursor chats themselves.”*

---

*Slash command: `/tr-inbox` — run after testing capture sessions; pair with `/tr-start` in a fresh agent chat for implementation.*
