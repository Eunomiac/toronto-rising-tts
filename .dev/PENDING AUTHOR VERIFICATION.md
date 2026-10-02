# Pending Author Verification

Your TTS checklist for shipped work that still needs Save & Play / in-game confirmation. Issues listed here should be **Awaiting Author Review** in Linear.

**Marks** (prefix the `####` header):

| Mark | Who | Meaning |
| --- | --- | --- |
| **✅** | Author | Confirmed in TTS — agents remove on next inbox |
| **❌** | Author | Still broken (+ **Author Comment:**) |
| **⚠️** | Author | Bad expectations (+ **Author Comment:**) |
| **⏰** | Agent | Not ready to verify yet — fix is open in Linear / Focus; **do not** Save & Play for this row until the watch is cleared |
| **🚫** | Author | Irrelevant or obsolete - feature being tested is to be replaced by the Storyteller Dashboard; follow-up validation of this issue can be discarded (see **Author Comment**s for more details on how to handle the Linear issue) |

Unmarked = shipped (or verification gate) and waiting for your first pass. Agents add a new unmarked row and set Linear to **Awaiting Author Review** whenever they ship in-game code. They process your **✅** / **❌** / **⚠️** marks on the next inbox. A **✅** moves the Linear issue to **Fully Complete** by default, or **Complete (KEEP)** when its Linear history should be retained. Agent policy: [PENDING AUTHOR VERIFICATION.agent.md](PENDING AUTHOR VERIFICATION.agent.md).

---

## Outstanding

_Last populated: 2026-10-02 — TOR-646 (prologue overlay after End Scene) added._

### Scenes

#### TOR-643 — A second scene Apply must keep the cover down

**How to verify:** Save & Play. During Play, apply a scene and wait until the blindfold has started to rise (or is about to). Immediately apply a different scene.

The cover should come back down and stay down while the second scene is set up. You should not see the table rearrange in the open between the two. When the second cover lifts, you should be in the second scene.

**Context:** The first cover's timer kept running and lifted the blindfold while the second scene was still being applied. A new Apply now cancels that timer and the rest of the first sequence.

### Overlay

#### TOR-646 — Prologue only on the first Downtime

**How to verify:** Save & Play. Advance from Intermission into Play with no scene on the table. The center overlay should show PROLOGUE, with the session name in gold.

Apply a scene. The phase should read Play / Main, and the overlay should show that scene's place and time.

Click End Scene. When the cover lifts you should be in Downtime. The overlay should show the date and the word DOWNTIME. It should not show PROLOGUE or the gold session name.

**Context:** Starting a scene was supposed to turn off the opening-Downtime flag, but that happened inside a follow-up sequence that never ran while the cover was working. The flag stayed on, so the next Downtime still used the prologue wording. Applying a scene now switches to Main immediately and turns the flag off. Ending a scene turns it off as well.

#### TOR-644 — Downtime overlay looks right after End Scene

**How to verify:** Save & Play. During Play, with a scene on the table, click End Scene. When the cover lifts you should be in Downtime.

The center time and location overlay should show the date and the word DOWNTIME in the usual Downtime styling (bright red, the time line tall enough for that word). It should not keep the gold title, the TORONTO RISING banner spacing, or a squashed/plain time line from the epilogue.

**Context:** Writing the overlay text with setAttributes was clearing color, font, and height. Ordinary lines now use setValue, and the class is applied again after any attribute write.

### Character sheets

#### TOR-645 — Experience log returns to the top when page 6 is turned away

**How to verify:** Save & Play so the new scripts load. Sit a character whose experience log has more than one page (use the chevrons on page 6 until you are looking at an older session, not the newest one at the top).

1. Turn the sheet forward from page 6, or back from page 5, so pages 5 and 6 leave the table.
2. Turn back to pages 5 and 6.
3. Page 6 should show the newest session at the top again, with the older-session chevron available if there is more than one page. It should not still be sitting on the older page you had open.

**Context:** The log remembered `xpLogPage` after the page was parked. Hiding page 6 now sets that back to page 1 and repaints the listing. The check uses the page being moved, so both the forward button on page 6 and the back button on page 5 count.

### High — session / join / first-load

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
