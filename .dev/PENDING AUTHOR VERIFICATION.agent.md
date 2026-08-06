# Pending Author Verification — agent instructions

## Agent Routing

Read this when:
- marking a Linear issue **Done** before the author has confirmed in Tabletop Simulator
- the author says they verified / Save & Play confirmed an issue
- `/tr-inbox`, `/tr-start`, or “what’s next” when surfacing verification debt
- closing a Focus item that still needs Save & Play / multiclient smoke
- processing author marks (**✅** / **❌** / **⚠️**) on checklist headers

**Checklist (author-facing Outstanding list):** [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md)

Source of truth:
- [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md) for the living **Outstanding** entries (Linear **Done** ≠ verified in TTS)
- **This file** for how agents add, rewrite, and process those entries
- Linear for issue status / comments
- [RUNNING TASKLIST.md](RUNNING%20TASKLIST.md) for Focus + domain bullets

Verification:
- every checklist entry has a live `TOR-*` that is **Done** (or noted as a verification gate still In Progress)
- every entry’s **How to verify** uses plain English (see **Writing style** below)
- watch issue headers in the checklist for author marks **✅** / **❌** / **⚠️** (see **Author marks on issue headers** below) and process them in the same session when you open either file
- remove an entry when the author marks **✅** (or confirms in chat / Linear); then update the tasklist bullet

Status: living agent policy for the author verification checklist.

---

## Purpose

Linear **Done** means the code and docs were shipped. It does **not** mean the author has already tested the change inside Tabletop Simulator. The checklist file is the author’s short list of shipped work that still needs a real in-game pass (Save & Play, multiclient join, listen check, and so on) before we treat it as fully closed.

**Do not put on the checklist:** External / `workshop-only` human gates, open Feature Todo work, or living docs such as **TOR-141** (E2E playbooks). Those keep their own Linear statuses.

---

## Author marks on issue headers (mandatory for agents)

As the author works through the checklist in Tabletop Simulator, they will prefix issue headings with one of these symbols. **Whenever you open or edit either verification file** (including `/tr-inbox`, `/tr-start`, finishing related work, or when the author says they marked items), scan every `####` heading under **Outstanding** in [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md) for these marks and act on them. Do not wait for a separate chat instruction if the mark is already in the checklist.

**Where the mark appears:** on the issue header line, for example:

```markdown
#### ✅ TOR-384 — Global HUD missing on first save load
#### ❌ TOR-449 — Scenes preview deselect and THERE close guard
**Verification Failures:** Closing the Scenes panel while THERE did not block…
**Verified:** Selecting a blue pending row and closing the panel while HERE restored the green live selection. End scene deselected as expected.
#### ⚠️ TOR-402 — Skybox-only Apply Location
**Corrections:** …
```

| Mark | Meaning | What the agent must do |
| --- | --- | --- |
| **✅** | Confirmed. The author followed the **How to verify** steps and everything passed. | **Remove** this entire issue entry from **Outstanding**. Mark the matching RUNNING TASKLIST bullet as author-confirmed (or clear its “Pending Save & Play” wording). Optionally leave a short Linear comment that author verification passed. Treat the work as fully closed for verification debt. |
| **❌** | Testing failed. The bug or missing behavior is still live. | Expect two paragraphs under that entry when the author provides them: **`**Verification Failures:**`** (what still breaks) and, when anything passed, **`**Verified:**`** (which parts of the how-to-verify steps succeeded). Read both carefully. **Do not remove** the entry until remaining failures are fixed and the author re-confirms with **✅**. Narrow the remaining work: rewrite **How to verify** so it only covers what still needs checking; put already-passed behavior in **Context** (or a short “Already verified” note) so the next pass does not re-litigate it. Mirror that narrowing in Linear (Bug description / comments on the original Done issue or a new related Bug): what passed, what remains. Prefer creating or reopening a Linear **Bug** (`relatedTo` the original Done issue when one exists), set it **In Progress** if you are fixing now. Summarize in plain English in chat. |
| **⚠️** | The issue definition or expected validation is wrong or misleading (for example, “End scene should remain selected” when End should deselect). | Expect a paragraph under that entry beginning with **`**Corrections:**`** — read it carefully. Fix the inaccurate **How to verify** text (and any matching docs, E2E asserts, or Linear notes) so they match intended behavior. If the correction implies a code change, treat that as real work (Linear update + implement). After corrections are applied, **remove the ⚠️ mark and the Corrections paragraph** (or replace them with a short **Context** note that the verify text was corrected and re-test is still owed). Leave the entry in **Outstanding** until the author marks **✅** or **❌** on a fresh pass. |

**Unmarked headers** still mean “not yet tested” — leave them alone unless you are adding a new entry or the author confirmed elsewhere (chat / Linear).

**If both a mark and detail paragraphs appear**, trust the mark for status and the paragraphs for specifics. For **❌**, use **Verified:** to shrink scope and **Verification Failures:** to define remaining work. If a mark is present but the expected failure/correction paragraph is missing (**Verification Failures:** / **Corrections:**), ask the author in plain English what failed or what to correct before guessing. A missing **Verified:** on **❌** is allowed when nothing passed — do not invent successes.

---

## Writing style (mandatory for agents)

Checklist entries follow the project-wide **author voice** rule: [`.cursor/rules/toronto-rising-author-voice.mdc`](../.cursor/rules/toronto-rising-author-voice.mdc). That rule covers **all** writing to the author (chat included). The notes below are the verify-entry specialization.

When you add or rewrite a verification entry, write **plain English instructions the author can follow without decoding shorthand**.

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

Same standard applies to Linear Done comments that say verification is still owed: write a short plain-English test note there too, not only a code dump.

Also: [`.cursor/rules/toronto-rising-linear.mdc`](../.cursor/rules/toronto-rising-linear.mdc) § Pending author verification.

---

## Agent maintenance (mandatory)

Edits to **Outstanding** happen in [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md). Policy lives here.

| Event | Update the checklist |
| --- | --- |
| Mark Linear **Done** but author has **not** confirmed in-TTS | **Add** an entry with a plain-English **How to verify** paragraph (and a playbook link if one exists) |
| Author marks header **✅** (or confirms in chat / Linear) | **Remove** the entry; mark the tasklist bullet author-confirmed; optional Linear comment |
| Author marks header **❌** + **Verification Failures:** (and optional **Verified:**) | Keep the entry; narrow **How to verify** to remaining failures; record what already passed in **Context** + Linear; open/reopen Bug as needed; do not treat as confirmed |
| Author marks header **⚠️** + **Corrections:** | Fix verify text / docs / code per the correction; clear the ⚠️ + Corrections once addressed; leave entry until re-tested |
| `/tr-inbox` / Focus re-stack | Skim **Outstanding** for **✅** / **❌** / **⚠️** and process them; mention remaining high-priority verify debt if it would block a play session |

When finishing work: if verification is still owed, say so in the Linear **Done** comment with a plain-English test note **and** add the entry to the checklist in the same change.
