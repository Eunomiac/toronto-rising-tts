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

_Last populated: 2026-10-02 — confirmed rows removed (TOR-602, TOR-631); TOR-101 row replaced by TOR-642 (Just Smoke re-test)._

### Memoriam

#### TOR-642 — Memoriam Just Smoke (gap and button)

**How to verify:** Save & Play so the new scripts and Global XML load. During Play, open Phases → Memoriam and pick a PC.

1. **Button is there.** Under the scene grid there should be a yellow **Just Smoke** button. With the slider inside a defined period, click it. It should turn green, the period's scene buttons should all go back to unselected, and the PC assignment rows should appear (the NPC list for picking period NPCs will be empty).
2. **Gap picks it automatically.** Drag the slider into a black gap between periods. **Just Smoke** should turn green on its own, the date should follow the slider, and the location line should be blank. Drag back into a period: Just Smoke should go back to yellow and the assignment rows should hide (unless you had clicked the Just Smoke button yourself in step 1, in which case it stays green).
3. **Advance in a gap.** With the slider in a gap, mark another PC present if you like, and click Advance. You should see the **standard** global blindfold (no Memoriam splash art). Under it: Table B0, the subject at seat 1 (plus anyone you marked present), the overlay showing the gap date and no location, a night time on the clock, the **Just Smoke** skybox, no weather, and silence. Health and Willpower should be full for PCs present as themselves.
4. **Leave again.** Click Main (or Downtime). You should return to the scene you were in before Memoriam, exactly as when leaving a normal period.

**Context:** Author check of **TOR-101** (Memoriam runtime apply): real-period Advance, exit restore, Scene Apply while in Memoriam, and re-selecting a period all passed. Only Just Smoke failed. The button had collapsed to zero width because the modal repainted it with the normal scene-button class, a gap could not Advance at all, and a Just Smoke Advance would have been rejected. Just Smoke now enters Memoriam for real.

### High — session / join / first-load

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
