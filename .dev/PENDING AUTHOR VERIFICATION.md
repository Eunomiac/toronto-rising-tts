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

_Last populated: 2026-10-02 — TOR-644 spacing follow-up and TOR-647 (Memoriam cover) added. Confirmed rows removed._

### Table objects

#### TOR-648 — Pink tarot button follows Pink after a Memoriam

**How to verify:** Save & Play. During Play, enter a Memoriam with a subject who is **not** Pink, and do not put Pink in it, so Pink loses her chair for the Memoriam. Then click End Scene.

When the cover lifts in Downtime, Pink's tarot deck button should sit next to her tarot drawer at her new seat, like the rest of her objects. It should not be left behind at the seat she had before the Memoriam. Clicking it should still open and close the tarot set.

**Context:** While Pink is not present, the button is parked and its spot is saved. The tarot step after the table layout used to move the parked button back onto the table without updating that saved spot, so when Pink came back the button was restored to her old seat. It now stays parked under her new seat and the saved spot is updated.

### Overlay

#### ⚠️ TOR-644 — Downtime overlay sits in the right place after End Scene

**How to verify:** Save & Play. During Play, with a scene on the table, click End Scene. When the cover lifts you should be in Downtime.

The center overlay should show the date and the word DOWNTIME, and the session number should stay on screen. The time line's class should be `large_red_text` again. It should not keep the gold title or the TORONTO RISING banner.

**Context:** Leaving the prologue (or Spotlight) left a taller class on the time line, which pushed the session number off the top. That line is set back to `large_red_text` when that formatting is reversed. Overlay copy is still the `text` attribute only.

**Author Notes:** Still not quite right:  The session number is being pushed off the top of the screen, for some reason. I suspect I'll need to play around with the XML elements myself to figure this out -- don't worry about fixing this for now.
### Scenes

#### ✅ TOR-647 — Memoriam splash stays up for the whole cover

**How to verify:** Save & Play. During Play, enter a Memoriam (not Just Smoke, so a splash image is used). Watch the cover from the moment it starts to drop until it lifts.

You should see only the Memoriam splash. A generic scene blindfold should not slide in behind it, and it should not appear when the splash lifts.

**Context:** While the cover was down, a full refresh repainted it with a normal scene blindfold and dropped the splash. That refresh now keeps the splash until the cover lifts.

### High — session / join / first-load

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
