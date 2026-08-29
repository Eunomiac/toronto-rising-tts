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

_Last populated: 2026-08-29 — inbox Immediate polish shipped (**TOR-517**–**TOR-525**). Author confirmed **TOR-98** (Spotlight phase), **TOR-508** (rain particle bootstrap miss), **TOR-509** (hidden skyboxes), and **TOR-510** (Memoriam skybox catalog). **TOR-439** remains a multiclient gate (not a solo Save & Play)._

### High — session / join / first-load

#### ⌚ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

#### TOR-507 — Numbered table slots and figurine offsets

**How to verify:** Save & Play so the new scripts load. On Table A, Red should still sit in the center-front chair, Orange on Red’s right, and Pink on Red’s left; empty chairs should be plain wood with no spare throne. Switch to Table B and Table C from the Scenes panel — the same occupant order should hold, and cameras should still look at the person in that chair. On the PCs panel, turn Absent on for one player: their pile should drop under the table like an unused NPC. Turn Absent off: they should take the lowest free chair, or you should get an error if the table is full. Hidden character-sheet pages should stay hidden. The signal fire should sit at table height (about Y 7.85), not the tiny hide scale. If you Import or Apply a library scene that is missing a chair number on an in-session PC, you should get a named error, not a silent fallback.

**Context:** Phase 1 of the player-positioning redesign. Scatter, orbit, and join seating are still Phase 2.

#### TOR-512 — Absent off restores the full seat pile, including lights

**How to verify:** Save & Play so the new scripts load. On the PCs panel, turn **Absent** on for one player who is sitting at the table. Their whole pile should drop under the table and disappear, the same way an unused NPC seat does. Turn **Absent** off. That player should come back with the full pile at table height — figurine, character sheet, bags, chair, hand zone, **and seat lights** — not just the figurine. Lights should behave like a normal in-session seat. A sheet page that was already hidden should stay hidden; the page that was showing should still be showing. If a signal fire or hunger smoke was on before Absent, it should still be on after they return.

Pink’s tarot deck should stay **put away** (down in the table, not sitting out at Consult height) after Save & Play, table change, and after turning Pink Absent off — unless you had already clicked **Consult the Tarot**. Click that button: the deck should still come out; click again: it should go away.

**Context:** Turning Absent off was putting the figurine back on the chair but leaving everything else (including lights) buried under the table. The tarot dump had captured the deck while it was out, so layout was also putting it into the Consult pose by default.

#### TOR-247 — Seat occupancy from control-board tokens

**How to verify:** Save & Play so the new scripts and HUD load. Slot number boxes should be gone from the PCs panel and the Scenes panel Seat Activation row. The **Absent** toggle on the PCs panel should still be there.

On the stage control board, drag Red’s token onto a different chair snap (for example Orange’s old chair), then click **Apply**. Red’s pile on the live table should move to that numbered chair. Drag an NPC token onto the center-front chair (slot 1) and Apply: that NPC should sit there. Drag a PC token off the chair row (not onto another chair) and Apply: that player should go Absent (pile under the table, token locked out of sight). Turn **Absent** on from the PCs panel: that color’s token should leave the chair snap and disappear under the table (locked at Y about −200). Turn Absent off: the token should jump onto the chair they were assigned.

Put two tokens on the same chair snap and Apply: you should get a named error, and seats should not change. On Table B, you can still drop a token on chair 6 (beyond the small table) and Apply — the live table should grow if there are no loose dice on it.

**Context:** Chairs are the snaps; who sits there is whichever token you put on that snap. The HUD no longer types slot numbers.

#### TOR-513 — Absent hand zone, PC token stash, and Apply PC reseat

**How to verify:** Save & Play so the new scripts load. Put a few cards in Red’s hand. On the PCs panel, turn **Absent** on for Red. Red’s pile should drop under the table, the **hand zone should go with it** (Y about −200), and **those cards should move under the table too** — they should not stay floating at table height. Red’s PC token on the stage control board should disappear (locked under the board, not sitting in a park strip below the chairs). Turn Absent off: pile, hand zone, cards, and the PC token should all come back to Red’s chair.

Then, without changing any NPC tokens on the stage, drag Red’s PC token onto a different empty chair snap and click **Apply**. Red’s **live pile** on the table should move to that numbered chair, not only the token on the control board.

**Context:** Absent was hiding the pile but leaving the hand zone (and often the cards) at the table, and parking the PC token on the board. Apply that only moved PC tokens also skipped seat layout because the NPC reconciler thought nothing had changed.

---

### Medium — overlay / HUD / Spotlight

#### TOR-517 — Hide humidity on the weather overlay

**How to verify:** Save & Play. During a live outdoor scene, the weather panel should still show the weather words, wind, and temperatures. Humidity text (damp / dry / etc.) should no longer appear next to them.

**Context:** Humidity is still stored in the chronicle weather codes; it is just not shown on the overlay.

#### TOR-518 — Tighten PCs panel vertical spacing

**How to verify:** Save & Play. Open the Storyteller PCs panel. You should be able to leave it at full size and still fit it on screen. Seat names, Desire, track glyphs, and button labels should be the same font size as before, not smaller. Rows and buttons should sit closer together vertically.

**Context:** The panel was scaled down to 0.75 so it would fit, which made the text hard to read.

#### TOR-519 — Scene library buttons show the scene name only

**How to verify:** Save & Play. Open the Scenes panel. Each library button should show only the scene name (or a short truncation). Green/blue/grey colors should still mark selected, pending, and unlinked rows. You should not see “· live”, “· mirror”, or “· unlink” on the buttons.

**Context:** Color already tells you selected vs unlinked.

#### TOR-520 — Rain particle emitter follows the table

**How to verify:** Save & Play. Switch Table A → B → C from the Scenes panel. The rain particle object should stay centered over the current table. Its height should not jump.

**Context:** Floor and plinth already followed the table origin; the rain particles now do the same on X and Z.

#### TOR-521 — Right-click the player camera button for default view

**How to verify:** Save & Play while seated as a player (or hotseat a player color). Left-click the camera icon still opens the picker. Right-click the camera icon should jump you to that seat’s default table camera and close the picker.

**Context:** The camera icon is the one on the player overlay, not the inner default/dice/sheet buttons.

#### TOR-522 — Character-sheet center-strip right-click uses roll camera

**How to verify:** Save & Play. Right-click the inner/center strip of a character sheet. Your camera should move to that character’s roll view (the lower, closer roll preset), not the high dice-tray preset. Left-click on the strip should still go to the sheet camera.

**Context:** This amends the earlier dice-tray right-click on the same strip.

#### TOR-523 — Spotlight carousel Y −55, center Z 125

**How to verify:** Save & Play. Advance into Spotlight. The stand-in figurines should sit on a ring whose center is at X 0, Z 125, with figurines at Y about −55. Rotation and facing (outward / front person toward the table) should still work.

**Context:** Earlier Spotlight work used Z 175 and Y −45.

#### TOR-524 — End→Intermission cover uses overlay_blindfold_end

**How to verify:** Save & Play. From End, click Advance into Intermission. As the global cover comes down, the top image should be the End blindfold art (`overlay_blindfold_end`), not the session-start cover. After a full reload from the main menu, the default session cover should be back.

**Context:** The script does not switch the image back; a reload restores the XML default.

#### TOR-525 — Session number and title grow at the same rate

**How to verify:** Save & Play. Advance Intermission → Play and watch the session-start explode. The session number and the session title should grow toward the camera at the same speed. Character still-text / art pairs earlier in the sequence should be unchanged.

**Context:** They previously used different scale and waver timings.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._
