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

_Last populated: 2026-10-02 — confirmed rows removed (TOR-634, TOR-92, TOR-636, TOR-635, TOR-632). Bugged rows left in place._

### Scatter / table layout

#### ⏰ TOR-602 — Scatter Mode player HUD (group strip + click-to-move)

The group strip and click-to-move checks passed on 2026-10-01. Do not re-test until **TOR-641** (Scatter table change turns off every character sheet page) has shipped.

**How to verify:** Save & Play. On a normal table, leave at least one character-sheet page open (and another page off, if you want the contrast). Switch the table to Scatter. The pages that were open should still be open. Pages that were off should stay off. The group strip from the earlier check should still work.

**Context:** Author check: almost everything in the Scatter player HUD was right, except every character sheet turned off. relatedTo **TOR-572**.

### Memoriam

#### ❌ TOR-101 — Memoriam runtime apply (enter / exit)

**How to verify:** Save & Play so scripts and Global XML reload. Confirm Custom Assets include names like `memoriamBlindfold_rashid7` (Cloud sync job `memoriamBlindfolds`).

1. ✅ **Real period Advance:** During Play, open Phases → Memoriam, pick a PC, pick a scene panel (not Just Smoke), set assignments if you like, click Advance. The global cover should show that period’s Memoriam blindfold art. Under the cover you should land on Table B0, the subject at seat 1, overlay showing the Memoriam location string (no site/weather row), a night clock on the Memoriam date, and the chosen panel skybox. Hunger should be unchanged; Health and Willpower should be full for PCs present as themselves.
2. ❌ **Just Smoke:** Same flow but click Just Smoke then Advance. Host console should print `[Memoriam] …` and the world/subphase should **not** change.
**Author Comment:** There is no "Just Smoke" option to select.  Additionally, any attempt to set the time slider in a "gap" that doesn't have a defined time period throws an error when I click "Advance" -- this is the situation where "Just Smoke" should be assigned automatically, and a standard global blindfold transition (i.e. without a memoriam splash image) should be shown as we transition to the new scene.
3. ✅ **Exit restore:** Start Memoriam from an applied library scene, then click Main (or Downtime). You should return to that library scene (flushed evolving data). Start Memoriam with no live scene, then exit: Downtime + no-scene baseline.
4. ✅ **Scene Apply while Memoriam:** Apply a library scene with NOW — time should use the clock from just before Memoriam began, not wall present-day. End Scene while Memoriam should clear Memoriam and apply the usual no-scene End path.
5. ✅ **Re-select:** While already in Memoriam, open Memoriam again, pick a different period, Advance — new blindfold/world apply without dropping the original return-scene memory until you finally exit.

**Context:** Catalog `blindfoldURL` removed. PC-as-NPC sheet swap still TOR-95; LUT/sepia still TOR-321.

### High — session / join / first-load

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

#### ❌ TOR-512 — Absent off restores the full seat pile, including lights

**How to verify:** Save & Play so the new scripts load. On the PCs panel, turn **Absent** on for one player who is sitting at the table. Their whole pile should drop under the table and disappear, the same way an unused NPC seat does. Turn **Absent** off. That player should come back with the full pile at table height — figurine, character sheet, bags, chair, hand zone, **and seat lights** — not just the figurine. Lights should behave like a normal in-session seat. A sheet page that was already hidden should stay hidden; the page that was showing should still be showing. If a signal fire or hunger smoke was on before Absent, it should still be on after they return.

**Context:** Occupancy stash at Y=−200 was keeping satellites buried. relatedTo **TOR-507**.

**Update (TOR-631):** The PCs panel **Absent** toggle is gone. "Absent on" is now: Debug panel in green **Assume Connected**, click the player's **Connected** button so it reads **Disconnected**, then advance a phase. "Absent off" is clicking the button again.

**Author Comment:** There are several odd behaviors related to players "Connecting" and "Disconnecting" (via the buttons) -- please review all code paths and confirm that, when a player is "Disconnected", ALL of their seat objects are parked -- this includes seat objects that are unique to individual players, such as the Red player's additional scenery items, the Pink player's Tarot deck, and other player objects. Additionally, when a player disconnects during a scene (and they are dimmed out without fully parking all of their objects, in case they quickly reconnect), the full absent-from-session process should park their objects during the next blindfold transition.  This is not happening elegantly -- their cards-in-hand are not being locked and moved,  causing them to "swoop" in an attempt to find their hand zone.

#### ❌ TOR-513 — Absent hand zone, PC token stash, and Apply PC reseat

**How to verify:** Save & Play so the new scripts load. Put a few cards in Red’s hand. On the PCs panel, turn **Absent** on for Red. Red’s pile should drop under the table, the **hand zone should go with it** (Y about −200), and **those cards should move under the table too** — they should not stay floating at table height. Red’s PC token on the stage control board should disappear (locked under the board, not sitting in a park strip below the chairs). Turn Absent off: pile, hand zone, cards, and the PC token should all come back to Red’s chair.

Then, without changing any NPC tokens on the stage, drag Red’s PC token onto a different empty chair snap and click **Apply**. Red’s **live pile** on the table should move to that numbered chair, not only the token on the control board.

**Context:** Absent was hiding the pile but leaving the hand zone (and often the cards) at the table, and parking the PC token on the board. Apply that only moved PC tokens also skipped seat layout because the NPC reconciler thought nothing had changed.

**Re-test after the 2026-10-01 fix (Absent off left the cards behind):** Burying the hand used to tag the hand zone as a hidden object. A tagged hand zone stops holding its cards, so when Absent was turned off the zone came back to the chair and the cards stayed under the table. Absent now moves the hand zone and its cards with the same single hand mover the Hand Lab confirmed, and nothing tags the zone. When you re-run the steps above, the key check is: after Absent **off**, Red’s cards are back in Red’s fan at the chair and can be picked up. Use a player who was **not** already Absent before this Save & Play. Cards stranded by the old code may need to be fetched by hand once.

**Second re-test (2026-10-01, cards swooped back to the table on Absent on):** At Y −200 the cards sit inside the floor. Unlocked cards get shoved out by the physics engine and fly to the table edge with the "swoop" sound, so it looked like they never moved. The single hand mover now locks the cards whenever it moves a hand to a parked height (Y −195 or lower), and unlocks them whenever it moves a hand anywhere higher. When you turn Absent **on**, there should be no swoop sound and no cards landing on the table edge; Red’s cards should quietly vanish under the table with the hand zone. When you turn Absent **off**, the cards should come back in Red’s fan, and you should be able to pick them up (they are not left locked).

**Third re-test (2026-10-01, cards stayed locked under the table on Absent off):** Your probe showed that once cards are locked, TTS no longer counts them as being in the hand, so the restore found nothing to bring back. Now, whenever the hand mover parks a hand, it also tags each card `LockedCard<Color>` (for example `LockedCardRed`). When the hand comes back, it gathers the tagged cards along with the normal hand cards, removes the tag first, then moves the hand zone and unlocks and moves each card. The tag is saved with the game, so a player who stays Absent across sessions still gets their cards back. Purple's cards were parked before this change and carry no tag yet: with Purple still Absent, run `TagStrandedHandCards("Purple")` from the TEST BED once, then turn Purple's Absent off. For a clean test, use a different player: turn Absent on (optionally run `ProbeHandCards` for that color to see the parked cards listed as locked), then turn Absent off. Success is all the cards back in the fan, unlocked and pick-up-able, with no `LockedCard…` tag left on them.

**Also in the same Save & Play (TOR-301, old seat layout code removed):** About 1,600 lines of old seat-layout code that nothing called anymore were deleted. Nothing should look different, but a removal like this can only fail in-game. While you are testing, switch the table once (for example Table A to Table B and back) and run `DEBUG.refreshSeatRigsFromReference()` once from Execute Code. Success is chairs, lights, figurines and hands landing where they did before, with no red "attempt to call a nil value" errors in the console.

**Update (TOR-631):** The PCs panel **Absent** toggle is gone, and a disconnected PC's control-board token now sits locked a few units beneath the board rather than at Y −200. "Absent on" is now: Debug panel in green **Assume Connected**, click the player's **Connected** button so it reads **Disconnected**, then advance a phase. "Absent off" is clicking the button again. Dragging a PC token to a different empty chair and clicking **Apply** still moves that player.

**Author Comment:** **PLEASE MERGE TOR-512 and TOR-513**; my comments under TOR 512 apply here.

#### 🚫 TOR-630 — Scene Apply clears Absent and re-seats the player

**How to verify:** Save & Play. On the PCs panel, mark one player **Absent** (their pile, hand and control-board token go under the table). Open the Scenes panel and **Apply** a different library scene in which that player's seat is active. The player should stay Absent: the Absent toggle stays on, no pile or chair appears for them, and their control-board token stays hidden. Then apply a Scatter scene and come back to a standard-table scene; they should still be Absent throughout. Finally, turn Absent off on the PCs panel: they should get a chair at the current table with their cards.

**Context:** Applying a scene replaced the live seat rows with the library scene's copy, which wiped the Absent flag. Absent is now treated as a session fact: every scene change copies the live Absent flags onto the new scene's seats, and a scene's own Absent value is ignored. The control-board preview (THERE) also shows Absent players as Absent.

**Update (TOR-631):** The PCs panel **Absent** toggle is gone. To make a player Absent (now called *unoccupied*) for this check, switch the Debug panel to green **Assume Connected**, click that player's **Connected** button on the PCs panel so it reads **Disconnected**, then advance a phase. To bring them back, click the button again.

**Author Comment:** This issue is irrelevant and superceded by the behavior being tested in TOR-512 and TOR-513.

### Players & Connection

#### 🚫 TOR-631 — Connection-driven seat occupancy

**How to verify:** Save & Play so the scripts and Global UI reload.

1. Open the Debug panel. The connection button should read **Assume Connected** in green (the default), and every PC should be seated as before.
2. Click the button. It should turn yellow and read **By Connection Status**. Nobody moves yet; disconnected players' seats only go dark. Advance a phase: any PC whose player is not connected should lose their chair (no pile at the table, control-board token locked a little beneath the board). Click the button back to green: every PC should be seated straight away, with no blindfold.
3. Open the PCs panel. Each seat now has a green **Connected** button where the Absent toggle used to be. Click Red's. It should turn red and read **Disconnected**. Red's seat should go dark, but the chair, sheet and hand stay put.
4. Advance a phase (or apply a scene, or change table). Under the blindfold, Red should lose the chair: pile and hand go under the table, and Red's control-board token goes beneath the board. On Table B with random seating, Red's spot becomes an empty chair somewhere in the shuffle.
5. Click Red's button again. Red should be seated at once at their usual chair (or the lowest free one if it is taken), with their cards back and no blindfold.
6. On the control board, drag a connected PC's token off its chair onto the stage. It should snap back. Swap two PC tokens between chairs and click **Apply**. The two players should swap chairs at the table.
7. In a Scatter scene, disconnect a PC and advance a phase. They should leave their group. Reconnect them; they should appear in an empty group.
8. Click the Debug button back to yellow. The per-seat Connected buttons should disappear. Save, reload, and confirm the mode you left it in is remembered. During that reload every PC should be seated while the game sets up, even players who are not connected. Once the console prints **Startup readiness gate complete**, any PC whose player is not connected should lose their chair.
9. Optional: the Storyteller Dashboard PCs tab no longer has an Absent checkbox. The player rail shows **Seated** or **Unoccupied**, plus **Disconnected** when relevant.

**Context:** Whether a PC holds a chair is now decided only by connection; the Storyteller can no longer mark a PC Absent by hand. Present / Not Present (lit or dark seat) is unchanged and separate. Full model: `docs/solutions/seat-occupancy-and-connection.md`. relatedTo **TOR-630** and **TOR-513**.

**Author Comment:** **PLEASE MERGE WITH TOR-512 and TOR-513**; comments there apply here, as well.

#### ❌ TOR-633 — Character sheet pages come back when a PC's seat returns

**How to verify:** Save & Play (every PC starts with sheet pages 1 and 2 showing). On the Debug panel, switch to green **Assume Connected**.

1. On Red's character sheet, turn page 2 off so only page 1 is showing. If you want to check the signal fire too, light Red's signal fire.
2. On the PCs panel, click Red's **Connected** button so it reads **Disconnected**, then advance a phase. Red's whole pile, including the sheet, should go under the table.
3. Click Red's button again so it reads **Connected**. Red should be seated at once with **page 1 showing** and **page 2 still off**, the way it was before. If you lit the signal fire, it should be lit again.
4. Optional: repeat in a Scatter scene. When Red rejoins a group, the same pages should come back.

**Context:** When the pile was buried, the code noted which pages were showing. On the way back it checked "is this page under the table?" first, decided every page had been turned off on purpose, and then threw the note away. It now checks the note first. relatedTo **TOR-631** and **TOR-512**.

**Author Comment:** Mostly working, but cards-in-hand are not properly restored due to the bug reported under TOR-512 where the cards are never locked and parked in the first place.

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
