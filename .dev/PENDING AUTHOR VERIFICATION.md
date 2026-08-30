# Pending Author Verification

Your TTS checklist for shipped work that still needs Save & Play / in-game confirmation. Linear **Done** alone does not mean verified.

**Marks** (prefix the `####` header):

| Mark | Who | Meaning |
| --- | --- | --- |
| **✅** | Author | Confirmed in TTS — agents remove on next inbox |
| **❌** | Author | Still broken (+ **Verification Failures:** / optional **Verified:**) |
| **⚠️** | Author | Bad expectations (+ **Corrections:**) |
| **⌚** | Agent | Not ready to verify yet — fix is open in Linear / Focus; **do not** Save & Play for this row until the watch is cleared |

Unmarked = shipped (or verification gate) and waiting for your first pass. Agents add a new unmarked row whenever they ship in-game code; they process your **✅** / **❌** / **⚠️** marks on the next inbox. Agent policy: [PENDING AUTHOR VERIFICATION.agent.md](PENDING AUTHOR VERIFICATION.agent.md).

---

## Outstanding

_Last populated: 2026-08-30 — **TOR-539** (Memoriam configuration popup). **TOR-538** (overlay camera FirstPerson face-look cycle). **TOR-537** (randomize Table B seating). PAVE follow-ups **TOR-518** (PCs panel spacing) and **TOR-528** (resetToIntermission console-only). Author confirmed Intermission→Play explode chain (**TOR-531**–**TOR-536**), scene-library names, rain follow, camera defaults, CSHEET roll camera, Spotlight carousel, session explode grow, and control-board occupancy (**TOR-247**). **TOR-439** remains a multiclient gate (not a solo Save & Play)._

### High — session / join / first-load

#### ⌚ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

#### TOR-507 — Numbered table slots and figurine offsets

**How to verify:** Save & Play so the new scripts load. On Table A, Red should still sit in the center-front chair, Orange on Red’s right, and Pink on Red’s left; empty chairs should be plain wood with no spare throne. Switch to Table C from the Scenes panel — the same occupant order should hold, and cameras should still look at the person in that chair. Switching to Table B now randomizes packed seating (**TOR-537**). On the PCs panel, turn Absent on for one player: their pile should drop under the table like an unused NPC. Turn Absent off: they should take the lowest free chair, or you should get an error if the table is full. Hidden character-sheet pages should stay hidden. The signal fire should sit at table height (about Y 7.85), not the tiny hide scale. If you Import or Apply a library scene that is missing a chair number on an in-session PC, you should get a named error, not a silent fallback.

**Context:** Phase 1 of the player-positioning redesign. Scatter, orbit, and join seating are still Phase 2.

#### TOR-512 — Absent off restores the full seat pile, including lights

**How to verify:** Save & Play so the new scripts load. On the PCs panel, turn **Absent** on for one player who is sitting at the table. Their whole pile should drop under the table and disappear, the same way an unused NPC seat does. Turn **Absent** off. That player should come back with the full pile at table height — figurine, character sheet, bags, chair, hand zone, **and seat lights** — not just the figurine. Lights should behave like a normal in-session seat. A sheet page that was already hidden should stay hidden; the page that was showing should still be showing. If a signal fire or hunger smoke was on before Absent, it should still be on after they return.

Pink’s tarot deck should stay **put away** (down in the table, not sitting out at Consult height) after Save & Play, table change, and after turning Pink Absent off — unless you had already clicked **Consult the Tarot**. Click that button: the deck should still come out; click again: it should go away.

**Context:** Turning Absent off was putting the figurine back on the chair but leaving everything else (including lights) buried under the table. The tarot dump had captured the deck while it was out, so layout was also putting it into the Consult pose by default.

#### TOR-513 — Absent hand zone, PC token stash, and Apply PC reseat

**How to verify:** Save & Play so the new scripts load. Put a few cards in Red’s hand. On the PCs panel, turn **Absent** on for Red. Red’s pile should drop under the table, the **hand zone should go with it** (Y about −200), and **those cards should move under the table too** — they should not stay floating at table height. Red’s PC token on the stage control board should disappear (locked under the board, not sitting in a park strip below the chairs). Turn Absent off: pile, hand zone, cards, and the PC token should all come back to Red’s chair.

Then, without changing any NPC tokens on the stage, drag Red’s PC token onto a different empty chair snap and click **Apply**. Red’s **live pile** on the table should move to that numbered chair, not only the token on the control board.

**Context:** Absent was hiding the pile but leaving the hand zone (and often the cards) at the table, and parking the PC token on the board. Apply that only moved PC tokens also skipped seat layout because the NPC reconciler thought nothing had changed.

#### TOR-537 — Randomize Table B seating on cover transition

**How to verify:** Save & Play so the new scripts load. Seat a mix of player characters and NPCs at the table, and mark one player **Absent** on the PCs panel. Apply a library scene that uses Table B, or click **Table B** on the Scenes panel so the cover comes down. When the cover lifts, the people who were sitting should be in a new random order, with no empty chairs in the middle of the ring. The physical table should match how many people are actually sitting (the small five-chair table if five or fewer). On the stage control board, the chair-row tokens should match that new order. The Absent player’s token should stay hidden under the board, not sitting on a chair. Click **Apply** on the control board without a cover: seats should stay where you put the tokens, not reshuffle.

**Context:** Table B is the round “everyone sits in a packed ring” family. Cover transitions shuffle PCs and NPCs together; Absent players do not take a chair.

#### TOR-538 — Overlay camera FirstPerson face-look cycle

**How to verify:** Save & Play so the new scripts load. Sit as a player with NPCs on the stage (at least two different polar areas, e.g. Center and Mid Left). Switch to a seat whose camera is *not* already at default (for example, look around, then sit Red). Left-click the overlay camera button: the picker should open **and** your view should snap to that seat’s usual default table camera. Right-click that same button: you should first move to that default location in FirstPerson, then after a short beat look **up at the face** of the lead figurine (not stay at the horizon, and not stay at the old camera position). Right-click again: you should look at the next occupied area in order (Center, Center Left, Center Right, Mid Center, Mid Left, Mid Right, Far Center-Left, Far Center-Right, Far Left, Far Right), skipping empty ones, then loop. Click **Apply** on the stage control board, then right-click again: the cycle should start over from the first occupied area. Clear the stage and right-click: FirstPerson with your default framing (looking at the table, not a missing NPC).

**Context:** ThirdPerson cannot pitch above the horizon, so this is how players look at life-sized figurine faces. Right-click no longer jumps to the old default table camera (that was TOR-521).

---

### Medium — overlay / HUD / Spotlight

#### TOR-517 — Hide humidity on the weather overlay

**How to verify:** Save & Play. During a live outdoor scene, the weather panel should still show the weather words, wind, and temperatures. Humidity text (damp / dry / etc.) should no longer appear next to them.

**Context:** Humidity is still stored in the chronicle weather codes; it is just not shown on the overlay.

#### TOR-518 — Tighten PCs panel vertical spacing

**How to verify:** Save & Play. Open the Storyteller PCs panel at full size. Seat names, Desire, track glyphs, and button labels should keep the same font sizes as before. Rows and buttons should sit tighter vertically (less padding, shorter row heights). You should still be able to read the health / willpower / humanity glyph rows without clipping.

**Context:** The first trim still left too much vertical space. Row containers and children now have explicit preferred/min heights; button rows are shorter than the glyph rows.

#### TOR-524 — End→Intermission cover uses overlay_blindfold_end

**How to verify:** Save & Play. From End, click Advance into Intermission. As the global cover comes down, the top image should be the End blindfold art (`overlay_blindfold_end`), not the session-start cover. After a full reload from the main menu, the default session cover should be back.

**Context:** The script does not switch the image back; a reload restores the XML default.

#### TOR-528 — DEBUG.resetToIntermission for intro re-tests

**How to verify:** Save & Play. In the Host console run `lua DEBUG.resetToIntermission()`. The global session cover should come back with the usual session-start art (not the End blindfold). You should hear the looping Intermission theme (TR_Loop), not the session-start overture or Main. The Phases panel should show Intermission. Click **Advance →**: the intro animation and overture should play again. You can run the console command again after the intro — or even while it is still playing — to jump back without going through Spotlight and End. Tables, skyboxes, and seat piles should stay where they were. The Host console should print a short status line; it should not write a test-results file under `.dev/.debug`.

**Context:** Debug helper only. It does not run the full Intermission enter (no no-scene table prep). Console-only; the print-to-file path was removed.

#### TOR-539 — Memoriam configuration popup (subphase gate)

**How to verify:** Save & Play so the new scripts load. During Play, open the Phases panel and click **Memoriam**. The Memoriam popup should appear, and the Phases label should still show the subphase you were already on (Main or Downtime). Pick a character from the dropdown. The timeline bar and scene grid should fill, and the slider should sit at the right (present day). Move the slider: the date should change, the gold bar segment should follow (black gaps stay black), and that period's scene buttons should turn green. Click a scene: the NPC assignment rows should appear **without** the character you picked. Click **+** on another character, then pick a listed NPC or type a library key and OK. Click **Advance** with the slider in a black gap, or with no scene chosen: the popup should stay open and you should get a Host message. Fill those in and click **Advance**: the Host console should print a one-line summary, the popup should close, and Phases should show Memoriam. Click **Memoriam** again, fill partway, then **Cancel**: the popup should close and the subphase should stay Memoriam.

**Context:** The popup is the gate for entering Memoriam. Skybox, LUT, and overlay still wait on TOR-101. NPC names in the catalog are often still blank, so the picker list can be empty.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._
