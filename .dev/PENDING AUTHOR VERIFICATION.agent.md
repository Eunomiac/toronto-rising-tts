# Pending Author Verification — agent instructions

## Agent Routing

Read this when:
- **shipping any TTS-observable code** (Lua, XML, HUD, generated catalogs that Save & Play loads, and so on) — add an Outstanding row on the checklist **in the same session**
- marking a Linear issue **Done** before the author has confirmed in Tabletop Simulator (how-to-verify goes on the checklist **and** in the Linear **Done** comment)
- `/tr-inbox` / “process the inbox” — process author **✅** / **❌** / **⚠️** marks; catch up any shipped work a previous agent forgot to list
- `/tr-start` or “what’s next” when **reading** verification debt (skim/read only at bootstrap; if this session later ships code, add the row then)
- needing the writing-style rules for verify text

**Checklist (author-facing Outstanding list):** [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md)

Source of truth:
- [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md) for the living **Outstanding** entries (Linear **Done** ≠ verified in TTS)
- **This file** for how agents add, rewrite, and process those entries
- Linear for issue status / comments (including how-to-verify notes when Done)
- [RUNNING TASKLIST.md](RUNNING%20TASKLIST.md) for Focus + domain bullets

Verification:
- every shipped TTS-observable change that still needs in-game confirmation has an Outstanding row **before the implementation session ends**
- every checklist entry has a live `TOR-*` (Done / verification-gate In Progress, **or** open follow-up work marked **⌚**)
- every entry’s **How to verify** uses plain English (see **Writing style** below) — for **⌚** entries, how-to-verify is the future re-test after the fix ships
- process author marks **✅** / **❌** / **⚠️** on checklist headers during **`/tr-inbox`** only; maintain **⌚** on entries that are not ready to test yet
- remove an entry when the author marks **✅** (or confirms in chat / Linear during an inbox pass); then update the tasklist bullet
- when promoting an ❌/⚠️ follow-up to Linear instead of shipping in-session, keep/add the Outstanding entry with **⌚** until that follow-up is Done and ready to re-verify

Status: living agent policy for the author verification checklist.

---

## Same-session add (mandatory — definition of done)

**If you implemented code the author can see, hear, or load in Tabletop Simulator, add it to the checklist in that same session.** Do not wait for `/tr-inbox`. Do not leave how-to-verify only in a Linear comment hoping a later inbox pass will copy it over.

This applies to **every** implementation path — not a special case:

- a direct chat request (“fix X”, “add Y”)
- `/tr-start` or other targeted Linear-issue work
- `/tr-inbox` Quick Fixes or Immediate disposition
- `/tr-quick` **after** the plan is executed (not during the plan-only command)
- a drive-by bugfix discovered while doing something else

If the change can be observed after Save & Play (Lua, XML, HUD, lighting, audio, seats, generated catalogs that load in-game, and so on), it belongs on [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md).

**Definition of done for a ship includes all of:**

1. Linear **Done** comment with the same plain-English how-to-verify
2. An **unmarked** Outstanding row on the checklist (or **⌚** cleared if this was an open follow-up that just shipped)
3. “Pending Save & Play” on the matching tasklist bullet when one exists
4. The how-to-verify repeated in chat so the author does not have to open Linear

Skipping the checklist because “inbox will pick it up” is a policy failure. Inbox is a **catch-up**, not the primary add path.

### Safety when adding a row

The author often prefixes headers with **✅** / **❌** / **⚠️** between inbox passes. Treat those marks as author-owned.

When adding:

- **Append** a new `#### TOR-XXX` entry (or refresh the matching `TOR-*` row if you just shipped that follow-up)
- **Do not** strip **✅** / **❌** / **⚠️** from other headers
- **Do not** reorder, rewrite, or delete other Outstanding bodies
- Update the `_Last populated_` line
- If this `TOR-*` already has a **⌚** row, **remove ⌚** in this session and refresh **How to verify** — it is now ready to test. Do not wait for inbox.

### Still `/tr-inbox` only

| Allowed when shipping (any session) | Checklist edits — **`/tr-inbox` only** |
| --- | --- |
| Add Outstanding rows for work **this session just shipped** | Process **✅** / **❌** / **⚠️** marks; remove confirmed entries |
| Clear **⌚** on a follow-up **this session just shipped** | Catch-up: add any Done-without-confirm work a previous agent forgot |
| Put the same how-to-verify in Linear **Done** comments + chat | Immediate disposition for ❌ / ⚠️ follow-ups (unless you are already shipping the fix in this session) |
| Note “Pending Save & Play” on tasklist bullets | Sync checklist ↔ Linear / tasklist after author confirmation |

**Do not** process author test marks just because the file is open, you are on `/tr-start`, or you are debugging. If marks are present and would change what you should work on, tell the author to run `/tr-inbox` (or ask them to confirm you may process marks now).

Exception: the author explicitly asks you to process marks outside inbox.

### Do not put on the checklist

- Agent-docs / instruction-only changes with no TTS-observable effect
- External / `workshop-only` human gates, vague Future Features, or living docs such as **TOR-141** (E2E playbooks)
- Pure Linear / tasklist tracking with no in-game change

Open follow-ups that came from PAVE ❌/⚠️ Immediate disposition **may** stay on the checklist with **⌚** so the author can see what is waiting without trying to verify unfinished work.

---

## Purpose

Linear **Done** means the code and docs were shipped. It does **not** mean the author has already tested the change inside Tabletop Simulator. The checklist file is the author’s short list of work that still needs a real in-game pass (Save & Play, multiclient join, listen check, and so on) before we treat it as fully closed.

**Two kinds of Outstanding rows:**

| Kind | Header mark | Meaning for the author |
| --- | --- | --- |
| Ready to verify | unmarked, or author **✅** / **❌** / **⚠️** after testing | Shipped (or verification-gate) work — please Save & Play / run the how-to-verify steps |
| Not ready yet | **⌚** | Follow-up work is open in Linear (not shipped). Do **not** test yet; the how-to-verify text is the future re-test after the fix lands |

---

## Author marks on issue headers (`/tr-inbox` only)

As the author works through the checklist in Tabletop Simulator, they will prefix issue headings with one of these symbols. **During `/tr-inbox` only**, scan every `####` heading under **Outstanding** in [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md) for these marks and act on them. Outside inbox: if the author says they marked items, remind them that mark processing runs on the next **`/tr-inbox`** (or ask them to run it), unless they explicitly ask you to process marks now. You may still **append** newly shipped rows in any session.

**Where the mark appears:** on the issue header line, for example:

```markdown
#### ✅ TOR-384 — Global HUD missing on first save load
#### ❌ TOR-449 — Scenes preview deselect and THERE close guard
**Verification Failures:** Closing the Scenes panel while THERE did not block…
**Verified:** Selecting a blue pending row and closing the panel while HERE restored the green live selection. End scene deselected as expected.
#### ⚠️ TOR-402 — Skybox-only Apply Location
**Corrections:** …
#### ⌚ TOR-476 — Scene transition audio crossfade (aligned with district/site cards)
```

| Mark | Who sets it | Meaning | What the agent must do (**`/tr-inbox`**) |
| --- | --- | --- | --- |
| **✅** | Author | Confirmed. The author followed the **How to verify** steps and everything passed. | **Remove** this entire issue entry from **Outstanding**. Mark the matching RUNNING TASKLIST bullet as author-confirmed (or clear its “Pending Save & Play” wording). Optionally leave a short Linear comment that author verification passed. Treat the work as fully closed for verification debt. |
| **❌** | Author | Testing failed. The bug or missing behavior is still live. | Expect **`**Verification Failures:**`** (and optional **`**Verified:**`**). Narrow the checklist entry (remaining how-to-verify + Context for what already passed). Then handle remaining failures under **§ Immediate disposition** below — same urgency as INBOX **For Immediate Implementation**. Keep the Outstanding entry until fixed and the author re-confirms with **✅**. If the fix is **not** shipped in this inbox session, switch the header to **⌚** (keep failure/context in the body) so the author does not re-test unfinished work. |
| **⚠️** | Author | The issue definition or expected validation is wrong or misleading (for example, “End scene should remain selected” when End should deselect). | Expect **`**Corrections:**`**. Fix inaccurate verify text / docs immediately when that is the whole correction. If the correction implies product/code change, handle under **§ Immediate disposition** below. After doc-only corrections are applied, **remove the ⚠️ mark and the Corrections paragraph** (or replace with a short **Context** note that verify text was corrected and re-test is still owed). Leave the entry until the author marks **✅** or **❌** on a fresh pass. If code work remains unshipped, use **⌚**. |
| **⌚** | Agent | **Not ready to verify.** The fix was promoted to Linear / Focus instead of shipping during inbox (or the follow-up is still open). | Set or keep **⌚** when adding/keeping an Outstanding row for open follow-up work. Do **not** ask the author to Save & Play that issue yet. Keep plain-English how-to-verify for the future re-test. When the follow-up ships (**Done**) **in that implementation session**, **remove ⌚** so the row becomes a normal ready-to-verify entry (unmarked until the author tests). Never leave a shipped-and-ready entry under **⌚**. |

**Unmarked headers** (no ✅ / ❌ / ⚠️ / ⌚) mean “shipped or verification-gate — not yet tested by the author.” Leave them alone unless you are adding a new shipped entry or the author confirmed elsewhere and inbox is syncing that fact.

**If both a mark and detail paragraphs appear**, trust the mark for status and the paragraphs for specifics. For **❌**, use **Verified:** to shrink scope and **Verification Failures:** to define remaining work. If a mark is present but the expected failure/correction paragraph is missing (**Verification Failures:** / **Corrections:**), ask the author in plain English what failed or what to correct before guessing. A missing **Verified:** on **❌** is allowed when nothing passed — do not invent successes.

**⌚ vs ❌:** After Immediate disposition promotes a follow-up without shipping it, prefer a single header mark **⌚** (failure details stay under **Verification Failures:** / **Context**). Do not leave **❌** on an issue the author cannot re-test yet — that reads as “try again now.”

### Immediate disposition for ❌ / ⚠️ (`/tr-inbox`)

Treat **Verification Failures** and **Corrections** that need code or behavior changes like bullets under [INBOX.md](INBOX.md) **For Immediate Implementation**:

> After registering each issue with Linear in the ordinary fashion, briefly review it: If it is a quick or easy fix, **implement it immediately** without waiting for author confirmation. Otherwise, promote it to the **top of the Focus Stack**, and offer to begin work on it immediately when summarizing inbox processing. If multiple items need promotion this way, consider how best to resolve them quickly, and offer to draft an implementation plan in the summary.

| Disposition | When | Agent action |
| --- | --- | --- |
| **Implement now** | Clear, bounded fix (wrong verify wording, small bug, obvious one-file/logic tweak) | Register/update Linear Bug if needed (`relatedTo` the original Done issue), set **In Progress**, **ship the fix in this inbox session**, leave/narrow the PAVE entry for re-test (**unmarked**, not **⌚**) |
| **Focus #1 (or top stack) + offer to start** | Needs a short plan or a few coordinated files, but not a large redesign | Create/update Linear, put at **top of Focus**, offer to begin immediately in the inbox summary; keep/narrow Outstanding with header **⌚** until shipped |
| **Defer into Linear only** | Truly complex refactor, multi-system redesign, or unclear architecture | Create/update Linear with full description; place in the right domain tasklist section with **`blockedBy`** as needed; Outstanding row gets **⌚** — **do not** use backlog deferral as the default for verify failures |

**Do not** park ordinary ❌ / ⚠️ follow-ups as quiet Backlog/Todo while inbox finishes. Author verification debt that still breaks is urgent unless complexity clearly forces a planned refactor.

Mirror what passed vs what remains in Linear comments. Prefer a new related **Bug** when the original feature issue is already **Done**.

---

## Writing style (mandatory for agents)

Checklist entries follow the project-wide **author voice** rule: [`.cursor/rules/toronto-rising-author-voice.mdc`](../.cursor/rules/toronto-rising-author-voice.mdc). That rule covers **all** writing to the author (chat included). The notes below are the verify-entry specialization.

When you add or rewrite a verification entry (on ship, or on **`/tr-inbox`** catch-up), or when you write how-to-verify in a Linear **Done** comment, write **plain English instructions the author can follow without decoding shorthand**.

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

Same standard applies to Linear Done comments that say verification is still owed: write a short plain-English test note there too. The checklist row is added **in the ship session**; inbox only copies over rows a previous agent forgot.

Also: [`.cursor/rules/toronto-rising-linear.mdc`](../.cursor/rules/toronto-rising-linear.mdc) § Pending author verification.

---

## Agent maintenance

Policy lives here. The checklist is [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md).

| Event | What to do |
| --- | --- |
| Ship TTS-observable code (any path) and the author has **not** confirmed in-TTS | **Add** an unmarked Outstanding row **now**. Put the same plain-English how-to-verify in the Linear **Done** comment and chat. Note “Pending Save & Play” on the tasklist bullet. If a **⌚** row already exists for this id, clear **⌚**. |
| **`/tr-inbox`** | Process **✅** / **❌** / **⚠️**. Catch-up: add any missing Outstanding entries from recent Done-without-confirm work. For ❌/⚠️ follow-ups not shipped this session, set header **⌚**. If a previously **⌚** follow-up is already **Done** (a ship session should have cleared this), remove **⌚** so the author can re-test. Mention remaining high-priority verify debt if it would block a play session. |
| Author marks header **✅** (or confirms in chat / Linear) | On **`/tr-inbox`**: **Remove** the entry; mark the tasklist bullet author-confirmed; optional Linear comment. Outside inbox: do not process marks unless the author explicitly asks. |
| Author marks header **❌** + **Verification Failures:** (and optional **Verified:**) | On **`/tr-inbox`**: keep/narrow the entry; then **§ Immediate disposition** (implement now / Focus top / defer only if complex refactor). If you ship the fix in this session, leave the row **unmarked**. If unshipped after disposition → **⌚**. |
| Author marks header **⚠️** + **Corrections:** | On **`/tr-inbox`**: apply doc corrections immediately when possible; code/behavior corrections use **§ Immediate disposition**; clear ⚠️ + Corrections once addressed; leave entry until re-tested (or **⌚** if code still open) |

When finishing work: if verification is still owed, the checklist row **and** the Linear **Done** comment both get the how-to-verify note. **Do not** treat Linear as the only record.
