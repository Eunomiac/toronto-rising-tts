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

_Last populated: 2026-10-07 — /tr-inbox cleared ten author-confirmed rows: TOR-653 (dashboard sheet Pages 2–3 editing), TOR-654 (dashboard sheet Page 6 XP log), TOR-655 (relationships in gameState, dashboard Page 4), TOR-656 (dashboard sheet Page 5 projects), TOR-657 (Trace Sync timing), TOR-658 (ST roll dashboard from any seat), TOR-659 (dashboard requests refused until loaded), TOR-660 (dashboard Page 2 Blood Potency effects), TOR-661 (Prince's Court haven traits), TOR-662 (Black Caesar's page 6 Experience Log). TOR-663 (Refresh XML repaints The Court) still waiting for your first pass. Later the same day the whole Focus stack shipped: TOR-638 (willpower reroll restores bumped dice), TOR-639 (Rouse checks stay Rouse checks), TOR-526 (quick Rouse locks on impact, 1s result), TOR-640 (seat-role offset dump matches the offsets table, no scale)._

### High — session / join / first-load

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

### High — dice and rolls

#### TOR-638 — Willpower reroll puts back dice that got knocked

**How to verify:** Save & Play. From a player seat, make a roll with three or more normal dice and let it settle. Click **Spend Willpower**. Pick up one die and drop it onto a neighbouring die so the neighbour tumbles to a new number. Wait for everything to settle, then click **Confirm**. The neighbour should snap back to its original number, the result should use that original number, and the console should show a line saying the die "was bumped ... restoring". The die you actually rerolled should keep its new number.

#### TOR-639 — Rouse checks stay Rouse checks

**How to verify:** Save & Play. At a player seat, left-click the Rouse bag twice to start a Rouse check, then left-click the Normal dice bag. No standard die should appear, and the roll panel should still call it a Rouse check. Try the Hunger bag too: nothing should happen. Repeat with the Oblivion Rouse bag if that seat has one. Then start a normal roll with the Normal bag and add a Rouse die: that should still work and become a combined roll.

#### TOR-526 — Quick Rouse locks half a second after landing and shows a one-second result

**How to verify:** Save & Play. Sit at a player seat with no roll in progress and right-click the Rouse dice bag. The die should freeze about half a second after it hits the tray, even if it is still wobbling, and the result should appear straight away. The fullscreen result should disappear after about one second, and the die should be cleared at about the same time. Try the Oblivion Rouse bag too if the seat has one. Finally, make an ordinary roll and confirm it still waits for the dice to stop and shows its result for the usual six seconds. (If a six-second result is already on screen, the one-second Rouse result waits for it to finish first — that is expected.)

### Medium — seat layout tooling

#### TOR-640 — Seat-role offset dump pastes straight into the offsets table; no more scale

**How to verify:** Save & Play. Look around the table at each occupied seat: chairs (including Red's Prince throne, curtain and signet), signal candles and fires, famulus figurines, storage tomes and hand zones should all be the same size as before. Change tables once and back, and check that none of them change size. Then run `lua DEBUG.dumpSeatRoleOffsets("Red")` in the console and open `.dev/.debug/debug_logs/seat_role_offsets_RED.lua`. You should see one-line rows grouped under `shared`, `player` and `extraByOccupant = { Red = { ... } }`, with no `scale`, `guid` or `roleKey` anywhere, and a hidden object such as the signal fire should show its normal table height rather than -200.

### Medium — Prince's Court sheet

#### TOR-663 — Refresh XML puts The Court back the way it was

**How to verify:** Save & Play. Open The Court and go to the second spread so your Haven Merits are showing. On the Storyteller Phases panel, press **Refresh XML**. The Court should still be open on that same spread, with the same merits, dots, and text. Then press Refresh XML while The Court is closed: it should stay closed, and opening it afterwards should still show the current merits rather than the original blank page.

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
