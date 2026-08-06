# Pending Author Verification — agent instructions

## Agent Routing

Read this when:
- marking a Linear issue **Done** before the author has confirmed in Tabletop Simulator (write how-to-verify in the **Done comment** only — do **not** edit the checklist)
- `/tr-inbox` / “process the inbox” — **the only agent workflow that may edit** [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md)
- `/tr-start` or “what’s next” when **reading** verification debt (skim/read only; no checklist edits)
- needing the writing-style rules for verify text that will land in Linear comments or (later) on the checklist

**Checklist (author-facing Outstanding list):** [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md)

Source of truth:
- [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md) for the living **Outstanding** entries (Linear **Done** ≠ verified in TTS)
- **This file** for how agents add, rewrite, and process those entries — **edits to the checklist itself are `/tr-inbox` only**
- Linear for issue status / comments (including how-to-verify notes when Done)
- [RUNNING TASKLIST.md](RUNNING%20TASKLIST.md) for Focus + domain bullets

Verification (checked during **`/tr-inbox`**):
- every checklist entry has a live `TOR-*` that is **Done** (or noted as a verification gate still In Progress)
- every entry’s **How to verify** uses plain English (see **Writing style** below)
- process author marks **✅** / **❌** / **⚠️** on checklist headers during inbox only
- remove an entry when the author marks **✅** (or confirms in chat / Linear during an inbox pass); then update the tasklist bullet

Status: living agent policy for the author verification checklist.

---

## Edit gate (mandatory)

**Agents must not Write / StrReplace / otherwise edit** [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md) except during an explicit **`/tr-inbox`** (or “process the inbox”) run.

| Allowed anytime | Checklist edits — **`/tr-inbox` only** |
| --- | --- |
| **Read** / skim the checklist | Add Outstanding entries for Done-without-confirm work |
| Put plain-English how-to-verify in Linear **Done** comments + chat | Process **✅** / **❌** / **⚠️** marks; remove or rewrite entries |
| Note “pending Save & Play” on tasklist bullets | Sync checklist ↔ Linear / tasklist after author confirmation |

**Do not** touch the checklist when finishing a feature, running `/tr-start`, debugging, or “in passing” because the file is open. The author often edits this file by hand; treat it as author-owned between inbox passes.

Exception: the author explicitly asks you to edit that file outside inbox (rare).

---

## Purpose

Linear **Done** means the code and docs were shipped. It does **not** mean the author has already tested the change inside Tabletop Simulator. The checklist file is the author’s short list of shipped work that still needs a real in-game pass (Save & Play, multiclient join, listen check, and so on) before we treat it as fully closed.

**Do not put on the checklist:** External / `workshop-only` human gates, open Feature Todo work, or living docs such as **TOR-141** (E2E playbooks). Those keep their own Linear statuses.

---

## Author marks on issue headers (`/tr-inbox` only)

As the author works through the checklist in Tabletop Simulator, they will prefix issue headings with one of these symbols. **During `/tr-inbox` only**, scan every `####` heading under **Outstanding** in [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md) for these marks and act on them. Outside inbox: if the author says they marked items, remind them that checklist updates run on the next **`/tr-inbox`** (or ask them to run it), unless they explicitly ask you to edit the file now.

**Where the mark appears:** on the issue header line, for example:

```markdown
#### ✅ TOR-384 — Global HUD missing on first save load
#### ❌ TOR-449 — Scenes preview deselect and THERE close guard
**Verification Failures:** Closing the Scenes panel while THERE did not block…
**Verified:** Selecting a blue pending row and closing the panel while HERE restored the green live selection. End scene deselected as expected.
#### ⚠️ TOR-402 — Skybox-only Apply Location
**Corrections:** …
```

| Mark | Meaning | What the agent must do (**`/tr-inbox`**) |
| --- | --- | --- |
| **✅** | Confirmed. The author followed the **How to verify** steps and everything passed. | **Remove** this entire issue entry from **Outstanding**. Mark the matching RUNNING TASKLIST bullet as author-confirmed (or clear its “Pending Save & Play” wording). Optionally leave a short Linear comment that author verification passed. Treat the work as fully closed for verification debt. |
| **❌** | Testing failed. The bug or missing behavior is still live. | Expect **`**Verification Failures:**`** (and optional **`**Verified:**`**). Narrow the checklist entry (remaining how-to-verify + Context for what already passed). Then handle remaining failures under **§ Immediate disposition** below — same urgency as INBOX **For Immediate Implementation**. Keep the Outstanding entry until fixed and the author re-confirms with **✅**. |
| **⚠️** | The issue definition or expected validation is wrong or misleading (for example, “End scene should remain selected” when End should deselect). | Expect **`**Corrections:**`**. Fix inaccurate verify text / docs immediately when that is the whole correction. If the correction implies product/code change, handle under **§ Immediate disposition** below. After doc-only corrections are applied, **remove the ⚠️ mark and the Corrections paragraph** (or replace with a short **Context** note that verify text was corrected and re-test is still owed). Leave the entry until the author marks **✅** or **❌** on a fresh pass. |

**Unmarked headers** still mean “not yet tested” — leave them alone unless you are adding a new entry (inbox) or the author confirmed elsewhere and inbox is syncing that fact.

**If both a mark and detail paragraphs appear**, trust the mark for status and the paragraphs for specifics. For **❌**, use **Verified:** to shrink scope and **Verification Failures:** to define remaining work. If a mark is present but the expected failure/correction paragraph is missing (**Verification Failures:** / **Corrections:**), ask the author in plain English what failed or what to correct before guessing. A missing **Verified:** on **❌** is allowed when nothing passed — do not invent successes.

### Immediate disposition for ❌ / ⚠️ (`/tr-inbox`)

Treat **Verification Failures** and **Corrections** that need code or behavior changes like bullets under [INBOX.md](INBOX.md) **For Immediate Implementation**:

> After registering each issue with Linear in the ordinary fashion, briefly review it: If it is a quick or easy fix, **implement it immediately** without waiting for user confirmation. Otherwise, promote it to the **top of the Focus Stack**, and offer to begin work on it immediately when summarizing inbox processing. If multiple items need promotion this way, consider how best to resolve them quickly, and offer to draft an implementation plan in the summary.

| Disposition | When | Agent action |
| --- | --- | --- |
| **Implement now** | Clear, bounded fix (wrong verify wording, small bug, obvious one-file/logic tweak) | Register/update Linear Bug if needed (`relatedTo` the original Done issue), set **In Progress**, **ship the fix in this inbox session**, leave/narrow the PAVE entry for re-test |
| **Focus #1 (or top stack) + offer to start** | Needs a short plan or a few coordinated files, but not a large redesign | Create/update Linear, put at **top of Focus**, offer to begin immediately in the inbox summary |
| **Defer into Linear only** | Truly complex refactor, multi-system redesign, or unclear architecture | Create/update Linear with full description; place in the right domain tasklist section with **`blockedBy`** as needed — **do not** use backlog deferral as the default for verify failures |

**Do not** park ordinary ❌ / ⚠️ follow-ups as quiet Backlog/Todo while inbox finishes. Author verification debt that still breaks is urgent unless complexity clearly forces a planned refactor.

Mirror what passed vs what remains in Linear comments. Prefer a new related **Bug** when the original feature issue is already **Done**.

---

## Writing style (mandatory for agents)

Checklist entries follow the project-wide **author voice** rule: [`.cursor/rules/toronto-rising-author-voice.mdc`](../.cursor/rules/toronto-rising-author-voice.mdc). That rule covers **all** writing to the author (chat included). The notes below are the verify-entry specialization.

When you add or rewrite a verification entry (**`/tr-inbox`**), or when you write how-to-verify in a Linear **Done** comment (any time), write **plain English instructions the author can follow without decoding shorthand**.

**Do:**

- Use complete sentences.
- Say what to open, click, or load, and what “pass” looks like.
- Name panels, buttons, and seats the way they appear in TTS when you know them.
- One issue = enough detail that a tired author does not need to open Linear to understand the test.

**Do not:**

- Use telegram-style fragments (`Cold File→Load`, `Idle/hover/active`, `Arm → 2 HUD`).
- Rely on internal nicknames alone (`canary remount`, `Defer triad`) without a short explanation.
- Compress the whole test into a single cryptic clause.

**Bad:** `Cold File→Load: Global HUD present without reload; canary remount path`

**Good:** `Load into the save from the main menu. Ensure the global HUD appears without requiring a reload, confirming that the script checks for the existence of the global HUD on load and remounts it automatically if it does not.`

Same standard applies to Linear Done comments that say verification is still owed: write a short plain-English test note there too. Checklist population from those notes happens on **`/tr-inbox`**.

Also: [`.cursor/rules/toronto-rising-linear.mdc`](../.cursor/rules/toronto-rising-linear.mdc) § Pending author verification.

---

## Agent maintenance

Edits to **Outstanding** happen in [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md) **only during `/tr-inbox`**. Policy lives here.

| Event | What to do |
| --- | --- |
| Mark Linear **Done** but author has **not** confirmed in-TTS | **Do not** edit the checklist. Put a plain-English how-to-verify note in the Linear **Done** comment (and chat). Optionally note “Pending Save & Play” on the tasklist bullet. |
| **`/tr-inbox`** | Add missing Outstanding entries from recent Done-without-confirm work (Linear Done comments, tasklist “Pending Save & Play” wording). Process **✅** / **❌** / **⚠️**. Mention remaining high-priority verify debt if it would block a play session. |
| Author marks header **✅** (or confirms in chat / Linear) | On **`/tr-inbox`**: **Remove** the entry; mark the tasklist bullet author-confirmed; optional Linear comment. Outside inbox: do not edit the checklist unless the author explicitly asks. |
| Author marks header **❌** + **Verification Failures:** (and optional **Verified:**) | On **`/tr-inbox`**: keep/narrow the entry; then **§ Immediate disposition** (implement now / Focus top / defer only if complex refactor). |
| Author marks header **⚠️** + **Corrections:** | On **`/tr-inbox`**: apply doc corrections immediately when possible; code/behavior corrections use **§ Immediate disposition**; clear ⚠️ + Corrections once addressed; leave entry until re-tested |

When finishing work: if verification is still owed, say so in the Linear **Done** comment with a plain-English test note. **Do not** add the checklist entry until **`/tr-inbox`**.
