# Pending Author Verification

## Agent Routing

Read this when:
- marking a Linear issue **Done** before the author has confirmed in Tabletop Simulator
- the author says they verified / Save & Play confirmed an issue
- `/tr-inbox`, `/tr-start`, or “what’s next” when surfacing verification debt
- closing a Focus item that still needs Save & Play / multiclient smoke

Source of truth:
- This file for **author verification debt** (Linear **Done** ≠ verified in TTS)
- Linear for issue status / comments
- [RUNNING TASKLIST.md](RUNNING%20TASKLIST.md) for Focus + domain bullets

Verification:
- every entry has a live `TOR-*` that is **Done** (or noted as a verification gate still In Progress)
- every entry’s **How to verify** uses plain English (see **Writing style** below)
- watch issue headers for author marks **✅** / **❌** / **⚠️** (see **Author marks on issue headers** below) and process them in the same session when you open this file
- remove an entry when the author marks **✅** (or confirms in chat / Linear); then update the tasklist bullet

Status: living registry — agents must keep it current.

---

## Purpose

Linear **Done** means the code and docs were shipped. It does **not** mean you have already tested the change inside Tabletop Simulator. This file is your checklist of shipped work that still needs a real in-game pass (Save & Play, multiclient join, listen check, and so on) before we treat it as fully closed.

**Do not put here:** External / `workshop-only` human gates, open Feature Todo work, or living docs such as **TOR-141** (E2E playbooks). Those keep their own Linear statuses.

---

## Author marks on issue headers (mandatory for agents)

As the author works through this checklist in Tabletop Simulator, they will prefix issue headings with one of these symbols. **Whenever you open or edit this file** (including `/tr-inbox`, `/tr-start`, finishing related work, or when the author says they marked items), scan every `####` heading under **Outstanding** for these marks and act on them. Do not wait for a separate chat instruction if the mark is already in the file.

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

This file follows the project-wide **author voice** rule: [`.cursor/rules/toronto-rising-author-voice.mdc`](../.cursor/rules/toronto-rising-author-voice.mdc). That rule covers **all** writing to the author (chat included). The notes below are the verify-entry specialization.

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

| Event | Update this file |
| --- | --- |
| Mark Linear **Done** but author has **not** confirmed in-TTS | **Add** an entry with a plain-English **How to verify** paragraph (and a playbook link if one exists) |
| Author marks header **✅** (or confirms in chat / Linear) | **Remove** the entry; mark the tasklist bullet author-confirmed; optional Linear comment |
| Author marks header **❌** + **Verification Failures:** (and optional **Verified:**) | Keep the entry; narrow **How to verify** to remaining failures; record what already passed in **Context** + Linear; open/reopen Bug as needed; do not treat as confirmed |
| Author marks header **⚠️** + **Corrections:** | Fix verify text / docs / code per the correction; clear the ⚠️ + Corrections once addressed; leave entry until re-tested |
| `/tr-inbox` / Focus re-stack | Skim **Outstanding** for **✅** / **❌** / **⚠️** and process them; mention remaining high-priority verify debt if it would block a play session |

When finishing work: if verification is still owed, say so in the Linear **Done** comment with a plain-English test note **and** add the entry here in the same change.

---

## Outstanding

_Last populated: 2026-08-04 — Linear Done scan plus RUNNING TASKLIST “Pending…” / “still pending Save & Play” / recent Done without author confirm. Prefer tasklist + Done-this-cycle notes over stale Linear description text (many Done issues still say “Pending Save & Play” after you already confirmed)._

### High — session / join / first-load

#### TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped).

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step%20Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**.

#### TOR-384 — Global HUD missing on first save load

**How to verify:** From the Tabletop Simulator main menu, load into the chronicle save (a fresh load, not a reload of an already-open session). Confirm that the Storyteller / player global HUD appears on that first load without needing File → Load a second time, and that Intermission music / ambient still starts. In the console you may see a line about the Global HUD canary missing and remounting; you should **not** see a two-minute `chainWait:timeout` stuck on `startup-ready-ensure-global-xml`.

**Context:** First recovery attempt waited on `UI.loading` before remounting; on a cold load that flag stayed true, so the gate never remounted and timed out after 180s. Fix: remount as soon as the canary is missing, even while `UI.loading` is true.

#### TOR-449 — Scenes preview deselect and THERE close guard

**How to verify:** In the Scenes panel, select a library row so the blue pending preview is active, then close the panel, reload the save, or run a scene transition — the pending preview should clear and you should be editing the live (green) scene again. While THERE mode is active on the Control Board, closing the Scenes panel should be blocked (with a Host/Black broadcast telling you to resolve THERE first). When you End a live scene, that scene should be **deselected** in the library (no row highlighted as the active edit target) — End is leaving the table with no live scene, not leaving a “preview of the scene you just ended.”

**Context:** Done this cycle; still pending Save & Play. Linear Done comment already matches End-clears-`activeKey`; an older **TOR-365** note about keeping the ended row selected is obsolete.

---

### Scenes / clock (2026-07-19 batch — still pending)

#### TOR-402 — Skybox-only Apply Location

**How to verify:** On the Scenes panel, change only the skybox (leave District and Site empty or unchanged) and press Apply Location. The skybox should update without the panel insisting you pick a District/Site first.

#### TOR-403 — Clock lerp control id parse

**How to verify:** On Scene Time, click the minute / hour / day (and related) lerp delta buttons. They should advance or rewind the narrative clock without a console error about being unable to parse the clock lerp control.

#### TOR-404 — Advance yields so the toolbar can close first

**How to verify:** With the Storyteller toolbar open, press Phases **Advance**. The toolbar should visibly close before the rest of the phase work continues, without a long hitch where the close animation waits until everything else is done.

#### TOR-405 — Close ST toolbar before clock lerp

**How to verify:** Start a Scene Time clock lerp (delta button, dusk/dawn, or year Go) while the Storyteller toolbar is open. The toolbar should close first, the same way it does before a scene Apply, and then the lerp should run.

#### TOR-222 — Animated Scene Time lerp grids

**How to verify:** Exercise the full Scene Time grids (minutes, hours, days, weeks, months, dusk/dawn, year Go). Confirm the clock eases forward or backward and settles into the expected narrative time. Parsing and toolbar-close fixes for that flow are covered by **TOR-403** and **TOR-405**.

---

### Debug chrome (INBOX re-open under test)

#### TOR-394 — Debug last-load clock label

**How to verify:** Load the save, open the DEBUG / admin controls panel, and confirm the last-load time under the DEBUG heading shows a sensible `HH:MM AM/PM` for when this session loaded. If the label was blank when the panel first opened before, it should appear now when you open the panel.

#### TOR-396 — Debug toolbar vertical offset

**How to verify:** Open the DEBUG toolbar and check that it sits about 100px lower than the old position (offset moved so it is easier to reach / less overlapping). Twirl-down behavior for the body should be unchanged.

---

### NPC / gameboard smoke

#### TOR-423 — npc_gameboard module split

**How to verify:** Save & Play so the split `npc_gameboard_*` siblings load. Smoke Control Board Apply and Clear, drop an NPC token onto a stage snap, and confirm seating / placement still works with no nil-call or missing-module errors in the console.

#### TOR-238 — Hover token → stage figurine spotlight preview

**How to verify:** Bind and hold the **Spotlight NPC (hold)** game key, then sweep the cursor over NPC control tokens on the Control Board. The matching stage figurine should briefly enter spotlight, and the Storyteller board indicator should follow the token, without writing lasting game state. Release the key and the preview should end.

#### TOR-413 — Group relocate keeps close family together

**How to verify:** With group-move held, relocate a Mid Center family toward CENTER (or another close family move that used to leave siblings behind). All tokens in that family should travel and re-seat together rather than stranding one member.

#### TOR-414 — Group flip and palette token scale

**How to verify:** Drag an NPC token from the palette onto a stage ring and confirm it keeps that ring’s token scale (not reset to the tiny default). While holding group-move, flip one token and confirm sibling faces in the family match the flipped token’s face. Follow-ups for family/face/Y/stage light are still tracked under open **TOR-419**.

---

### Recent UI Quick Fixes (Done — no author confirm logged)

#### TOR-460 — Character sheet right-click → dice tray camera

**How to verify:** At a PC seat, left-click the character sheet inner-edge control as usual — it should still snap the camera to the sheet. Right-click that same control — the camera should move to that seat’s dice tray view instead.

#### TOR-461 — Map / Court / Coteries mutual exclusivity

**How to verify:** From the right sidebar, open Map, then open Court or Coteries — Map should close. Open Map again while Court or Coteries is open — those panels should close. Only one of Map / Court / Coteries should be open at a time.

#### TOR-100 — Pink Tarot camera on activate / hide

**How to verify:** Activate the Pink Tarot deck — Pink’s camera should go to the dice-tray style view used for Tarot. Hide the Tarot deck — Pink’s camera should return to the default seat view.

#### TOR-453 — Scene Time present day when nothing is selected

**How to verify:** Clear or avoid a Scenes library selection so no pending/live library row is driving the clock. Scene Time should show / behave as present day (blank or present-day presentation as designed) rather than a stale selected-scene time.

#### TOR-452 — Compulsion with companion tray

**How to verify:** Draw and resolve a Compulsion while a companion / famulus tray is in play for that seat. The Compulsion flow should complete cleanly with the companion tray present (no missing UI, stuck camera, or broken select/remove).

#### TOR-450 — Location and camera popouts stay fully opaque

**How to verify:** Open a location or camera popout from the HUD. It should stay fully opaque at rest and on hover (no idle fade to translucent), and you should still be able to click through its interactive targets.

#### TOR-451 — Right-sidebar button tint

**How to verify:** Watch a right-sidebar toggle at rest (middling grey), on hover (white), and while its panel is open / active (deep red). The three states should be easy to tell apart.

---

## Possibly stale Linear “pending” text (do not treat as owed)

These Linear **Done** descriptions or comments still say “Pending Save & Play”, but RUNNING TASKLIST **Done this cycle** (or domain bullets) already record **author confirmed**. Clear the Linear wording when convenient; **do not** block a play session on them.

Examples: **TOR-446** (remove FirstPerson on blindfold), **TOR-447** (Tarot shuffle on activate), **TOR-436** (blindfold parent), **TOR-428** / **TOR-430** / **TOR-438** (join Defer controls + timing API), **TOR-406**–**TOR-412**, **TOR-425**, **TOR-204**, **TOR-244**, **TOR-281**, and older June soundscape/gameboard Done issues (**TOR-268**–**TOR-270**, **TOR-274**–**TOR-277**, and similar) where the tasklist already says author confirmed.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._

_(empty)_
