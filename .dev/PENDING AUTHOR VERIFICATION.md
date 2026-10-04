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

_Last populated: 2026-10-04 — TOR-652 (Storyteller toolbar closes before every blindfold) added; TOR-644 / TOR-647 / TOR-648 / TOR-649 / TOR-650 / TOR-651 cleared._

### UI & HUD

#### TOR-652 — The Storyteller toolbar closes before every blindfold

**How to verify:** Save & Play. Open the Scenes panel, choose only a skybox (no site), and click Apply Location. The whole Storyteller toolbar, tabs included, should close before the blindfold slides down.

Then, during Play, open the Memoriam modal and click Advance. The toolbar should also be closed when the Memoriam cover drops.

If you have a moment, also try one ordinary scene Apply, one table button, and one phase Advance. Each should still close the toolbar first, as before.

**Context:** Most Storyteller buttons that start a blindfold already closed the toolbar. The skybox-only Apply Location and the Memoriam Advance did not. The blindfold itself now closes the toolbar as it starts, so every transition, including future ones, behaves the same way.

### High — session / join / first-load

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
