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

_Last populated: 2026-10-07 — /tr-inbox cleared ten author-confirmed rows: TOR-653 (dashboard sheet Pages 2–3 editing), TOR-654 (dashboard sheet Page 6 XP log), TOR-655 (relationships in gameState, dashboard Page 4), TOR-656 (dashboard sheet Page 5 projects), TOR-657 (Trace Sync timing), TOR-658 (ST roll dashboard from any seat), TOR-659 (dashboard requests refused until loaded), TOR-660 (dashboard Page 2 Blood Potency effects), TOR-661 (Prince's Court haven traits), TOR-662 (Black Caesar's page 6 Experience Log). TOR-663 (Refresh XML repaints The Court) still waiting for your first pass. Later the same day the whole Focus stack shipped: TOR-638 (willpower reroll restores bumped dice), TOR-639 (Rouse checks stay Rouse checks), TOR-526 (quick Rouse locks on impact, 1s result), TOR-640 (seat-role offset dump matches the offsets table, no scale). After your first pass: TOR-639 now hides the Normal bag, TOR-526's result holds longer, and two new rows: TOR-664 (hunger smoke crash) and TOR-665 (Willpower reroll highlights); then TOR-673 (blue glow brightens under the rolling player's cursor) and TOR-674 (Rouse checks open without waiting for the Storyteller). Then the sync speed-up plan shipped as seven rows, TOR-666 through TOR-672 (tracing, whole-table scans, NPC Apply layout, cheap skipped passes, startup trims, a single startup sync, per-seat hunger refresh)._

### High — session / join / first-load

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

### High — sync speed-ups (one test session covers all seven)

**Context:** These seven rows are one plan: make the slowest sync calls cheaper. Test them together. Turn on **Trace Sync** (Debug panel button, yellow when on) before you load, then capture the same three traces as before (a full load from the main menu, one NPC Apply on the Gameboard, and one Storyteller hunger change) into `.dev/Performance Audits/Trace Sync/`, so the agent can compare them with the old ones. The rows below list what should still *work*; the traces show whether it got faster.

#### TOR-666 — Trace Sync shows the hidden costs inside NPC, board and layout syncs

**How to verify:** With Trace Sync on, do an NPC Apply. The `[SyncTrace]` block for that sync should now show nested lines inside the NPC reconcile, the control-board mirror and the seat layout (for example the preload sweep, seat rigs, compulsion cards and dice re-park), each with its own time, instead of one big block of unexplained "self" time.

#### TOR-667 — Seat layout, NPC and control-board syncs stop scanning the whole table

**How to verify:** Save & Play and change tables once. Chairs, NPC seat objects and each PC's selected Compulsion card should end up in the right places, the same as before. Then pick up an NPC token from the palette and drop it beside one of its family members on the board: the family should still spread around it as before.

#### TOR-668 — NPC Apply no longer forces a full seat layout when no seat changed

**How to verify:** On the Gameboard, drop an NPC token onto a seat snap and click Apply: the NPC should be seated at the table (this is the old TOR-210 check). Then move that NPC onto the stage and Apply: its home chair and seat light should behave as before while it is on stage. Finally, Apply with only stage changes (no seat moves): seats, lights and overlays should not change, and the trace should show `NPCS.commitNpcSeatLayout` as `skipped`.

#### TOR-669 — Syncs that change nothing are now actually cheap

**How to verify:** Do two NPC Applies in a row without changing anything in between. Both should leave the table exactly as it was: no NPC figurines or lights blinking, and none of the preload NPCs or preload dice bags appearing on the table. Also enter and leave Scatter once: hidden preload NPCs should stay hidden.

**Context:** A separate bug turned up while working on this: parked control-board markers creep further along the table on every full board mirror. It is filed as TOR-675 and not fixed yet.

#### TOR-670 — Startup skips a few redundant passes

**How to verify:** Load a save that is in Intermission: the table should come up dark with the Intermission theme playing. Load a save that is in Play: seat lights, overlays and occupied seats should look right once the cover lifts. On load, every player's dice drawer should be closed and nobody's seat should be stuck in the bright rolling light, even if the save was made mid-roll.

#### TOR-671 — Only one full sync at startup

**Context:** The plan said to wait for a fresh trace from you before this step. It was shipped anyway so the whole plan could be finished; if startup misbehaves, this change can be undone on its own without touching the others.

**How to verify:** Load a Play-phase save from the main menu. The session-start cover should stay down for the whole load and lift only once, after the table is fully laid out (no flash of a half-built table). Chairs, NPCs, seat lights, hunger bags (hidden) and the Storyteller dice drawers (home and closed) should all be correct when it lifts. If the Gameboard was in a THERE preview when you saved, it should come back in HERE mode with the board tokens matching the live table, and no errors in the console. The load trace should show one `Sync.full` (reason `onLoad_startup_gate`) instead of two.

#### TOR-672 — Hunger changes refresh one seat, once

**How to verify:** From the Storyteller panel (or the dashboard PC sheet), change one player's Hunger up and then down. That seat's hunger overlay and hunger smoke should update straight away each time, and the other seats should not change. In the trace, the hunger overlay should be applied once per change, not twice.

### High — dice and rolls

#### TOR-638 — Willpower reroll puts back dice that got knocked

**How to verify:** Save & Play. From a player seat, make a roll with three or more normal dice and let it settle. Click **Spend Willpower**. Pick up one die and drop it onto a neighbouring die so the neighbour tumbles to a new number. Wait for everything to settle, then click **Confirm**. The neighbour should snap back to its original number, the result should use that original number, and the console should show a line saying the die "was bumped ... restoring". The die you actually rerolled should keep its new number.

#### TOR-639 — Normal bag disappears during a Rouse check

**Context:** Your follow-up: instead of a Normal bag that silently ignores clicks, the bag is now hidden for the whole Rouse check.

**How to verify:** Save & Play. At a player seat, left-click the Rouse bag to start a Rouse check. The Normal dice bag should vanish straight away, and the Rouse dice should still line up in their usual spot. Finish or cancel the roll: the Normal bag should come back in its normal place. Do the same with the Oblivion Rouse bag if that seat has one, and once with the idle right-click quick Rouse. Then start a normal roll with the Normal bag and add a Rouse die: the Normal bag should stay visible, and it should become a combined roll.

#### TOR-664 — No more error when hunger smoke should turn on

**Context:** The "attempt to index a nil value" error you hit after a quick Rouse. It was older than tonight's work: since mid-September, the code that turns hunger smoke on (and part of the signal fire code) was calling a helper that never finished loading. A failed Rouse that raises Hunger simply walks into it.

**How to verify:** Save & Play. At a player seat with low Hunger, do quick Rouse checks (right-click the Rouse bag) until one fails and raises Hunger. There should be no red error in the console, the result should show, and that seat's hunger smoke should appear if the new Hunger level calls for it. Also toggle a player's signal fire on and off once: no errors.

#### TOR-665 — Willpower reroll dice glow blue, then cyan

**How to verify:** Save & Play. From a player seat, make a roll with three or more normal dice (with a Hunger die too, if you like) and let it settle. Click **Spend Willpower**. Every die you are allowed to reroll should glow deep blue; Hunger dice (and anything else you can't reroll) should not glow. Pick up one blue die and roll it: the moment it is thrown, its glow should brighten to cyan. If the roll has a reroll limit, reaching it should make the remaining blue dice stop glowing as they lock. Click **Confirm**: all glows should disappear when the result shows. Also start a Willpower reroll and then cancel the roll: no die should be left glowing, including on the next roll.

#### TOR-673 — Blue Willpower glow brightens under your cursor

**Context:** Your follow-up on the glows above: the blue glow was hiding TTS's normal hover outline, so you could no longer tell which die your cursor was on. Test it in the same session as TOR-665.

**How to verify:** Save & Play. From a player seat, roll some dice and click **Spend Willpower** so the rerollable dice glow deep blue. Move your cursor over one blue die: its glow should brighten to a lighter blue straight away, and drop back to deep blue as soon as the cursor moves off it. Sweep the cursor across several blue dice: only the one under the cursor should be bright. A die you have already rerolled (cyan) should stay cyan when hovered. If you have a second seat or a hotseat swap handy, hovering the dice from a different color should not brighten them. Everyone at the table sees the brightening, since TTS highlights can't be shown to just one player.

#### TOR-674 — Rouse checks open without waiting for the Storyteller

**Context:** A Rouse check has nothing for the Storyteller to set (difficulty is always 1), so it no longer waits for the ST to click Open. This applies however the Rouse check starts: player bag click, ST-started, or the ST's own Rouse roll.

**How to verify:** Save & Play. At a player seat with no roll in progress, left-click the Rouse bag. The roll panel should appear straight away with the **Roll** button usable, not greyed out with "Awaiting Storyteller", and the Storyteller should not need to do anything. Left-click the Rouse bag once or twice more to add dice, then click Roll: the check should resolve as normal. Do the same with the Oblivion Rouse bag. A normal roll (left-click the Normal bag) should still wait for the Storyteller as before. The right-click quick Rouse should still toss and resolve on its own.

#### TOR-526 — Quick Rouse result stays readable for a full second

**Context:** You confirmed the half-second lock works. The first version's result vanished almost as soon as it finished fading in, because the panel spends its first second waiting and fading in. The hold is now two seconds, so the result sits fully visible for about one second.

**How to verify:** Save & Play. Sit at a player seat with no roll in progress and right-click the Rouse dice bag. Once the result has faded in, it should stay fully visible for about a second, long enough to read comfortably, then fade out. The die should be cleared at about the same time. Ordinary rolls should still show their result for the usual six seconds.

### Medium — seat layout tooling

#### TOR-640 — Seat-role offset dump pastes straight into the offsets table; no more scale

**How to verify:** Save & Play. Look around the table at each occupied seat: chairs (including Red's Prince throne, curtain and signet), signal candles and fires, famulus figurines, storage tomes and hand zones should all be the same size as before. Change tables once and back, and check that none of them change size. Then run `lua DEBUG.dumpSeatRoleOffsets("Red")` in the console and open `.dev/.debug/debug_logs/seat_role_offsets_RED.lua`. You should see one-line rows grouped under `shared`, `player` and `extraByOccupant = { Red = { ... } }`, with no `scale`, `guid` or `roleKey` anywhere, and a hidden object such as the signal fire should show its normal table height rather than -200.

### Medium — Prince's Court sheet

#### TOR-663 — Refresh XML puts The Court back the way it was

**How to verify:** Save & Play. Open The Court and go to the second spread so your Haven Merits are showing. On the Storyteller Phases panel, press **Refresh XML**. The Court should still be open on that same spread, with the same merits, dots, and text. Then press Refresh XML while The Court is closed: it should stay closed, and opening it afterwards should still show the current merits rather than the original blank page.

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
