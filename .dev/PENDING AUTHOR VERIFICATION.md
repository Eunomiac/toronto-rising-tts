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

_Last populated: 2026-10-07 — /tr-inbox cleared ten author-confirmed rows: TOR-653 (dashboard sheet Pages 2–3 editing), TOR-654 (dashboard sheet Page 6 XP log), TOR-655 (relationships in gameState, dashboard Page 4), TOR-656 (dashboard sheet Page 5 projects), TOR-657 (Trace Sync timing), TOR-658 (ST roll dashboard from any seat), TOR-659 (dashboard requests refused until loaded), TOR-660 (dashboard Page 2 Blood Potency effects), TOR-661 (Prince's Court haven traits), TOR-662 (Black Caesar's page 6 Experience Log). TOR-663 (Refresh XML repaints The Court) still waiting for your first pass._

### High — session / join / first-load

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

### Medium — Prince's Court sheet

#### TOR-663 — Refresh XML puts The Court back the way it was

**How to verify:** Save & Play. Open The Court and go to the second spread so your Haven Merits are showing. On the Storyteller Phases panel, press **Refresh XML**. The Court should still be open on that same spread, with the same merits, dots, and text. Then press Refresh XML while The Court is closed: it should stay closed, and opening it afterwards should still show the current merits rather than the original blank page.

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
