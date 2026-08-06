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
| **❌** | Testing failed. The bug or missing behavior is still live. | Expect two paragraphs under that entry when the author provides them: **`**Verification Failures:**`** (what still breaks) and, when anything passed, **`**Verified:**`** (which parts of the how-to-verify steps succeeded). Read both carefully. **Do not remove** the entry until remaining failures are fixed and the author re-confirms with **✅**. Narrow the remaining work: rewrite **How to verify** so it only covers what still needs checking; put already-passed behavior in **Context** (or a short “Already verified” note) so the next pass does not re-litigate it. Mirror that narrowing in Linear (Bug description / comments on the original Done issue or a new related Bug): what passed, what remains. Prefer creating or reopening a Linear **Bug** (`relatedTo` the original Done issue when one exists), set it **In Progress** if you are fixing now. Summarize in plain English in chat. |
| **⚠️** | The issue definition or expected validation is wrong or misleading (for example, “End scene should remain selected” when End should deselect). | Expect a paragraph under that entry beginning with **`**Corrections:**`** — read it carefully. Fix the inaccurate **How to verify** text (and any matching docs, E2E asserts, or Linear notes) so they match intended behavior. If the correction implies a code change, treat that as real work (Linear update + implement). After corrections are applied, **remove the ⚠️ mark and the Corrections paragraph** (or replace them with a short **Context** note that the verify text was corrected and re-test is still owed). Leave the entry in **Outstanding** until the author marks **✅** or **❌** on a fresh pass. |

**Unmarked headers** still mean “not yet tested” — leave them alone unless you are adding a new entry (inbox) or the author confirmed elsewhere and inbox is syncing that fact.

**If both a mark and detail paragraphs appear**, trust the mark for status and the paragraphs for specifics. For **❌**, use **Verified:** to shrink scope and **Verification Failures:** to define remaining work. If a mark is present but the expected failure/correction paragraph is missing (**Verification Failures:** / **Corrections:**), ask the author in plain English what failed or what to correct before guessing. A missing **Verified:** on **❌** is allowed when nothing passed — do not invent successes.

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
| Author marks header **❌** + **Verification Failures:** (and optional **Verified:**) | On **`/tr-inbox`**: keep the entry; narrow **How to verify**; record what already passed in **Context** + Linear; open/reopen Bug as needed. |
| Author marks header **⚠️** + **Corrections:** | On **`/tr-inbox`**: fix verify text / docs / code per the correction; clear the ⚠️ + Corrections once addressed; leave entry until re-tested |

When finishing work: if verification is still owed, say so in the Linear **Done** comment with a plain-English test note. **Do not** add the checklist entry until **`/tr-inbox`**.
