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

_Last populated: 2026-09-05 — cloud asset sync (Full build)._

### Tooling / assets

#### TOR-558 — Cloud asset sync (CustomUIAssets + Cloud catalog)

**How to verify:** With Steam running and logged into the chronicle account, run `npm run cloud-asset-sync:dry-run` from the repo root. You should see the `siteCards` job keep ~170 Sites images and list any stale `siteCard_*` names, plus a `LuaCatalog` plan for `Cloud.Sites`. Then either run `npm run cloud-asset-sync` in a normal terminal (answer **y** if it asks about removing stale names) or run **BUILD PIPELINE (Full)** / `npm run build:full` (that path auto-accepts purges). Reload save **230** in Tabletop Simulator. Site card art should still resolve; after a catalog write, `print(Cloud.Sites and Cloud.Sites.AnarchBar and Cloud.Sites.AnarchBar.URL)` in the TTS console should show a hosted URL.

**Context:** Replaces the manual Assets 1→2→3 loop for configured jobs. Main and XML builds do not run this.

### Dashboard

#### TOR-555 — Saved search tags and Lua Execute Code

**How to verify:** Restart the **STORYTELLER DASHBOARD** task. On **Stage NPCs**, type `dog angry` and click **+**. Both words should appear as buttons on the left, sorted A–Z, and stay selected. Click **angry** — it should leave the search box and the grid should widen; click it again to put it back. Tags should still be there after a browser refresh.

Then **disable the TTS Tools extension** (only one editor can listen on 39998). Load the chronicle in Tabletop Simulator with External Editor on. Open the **Lua** tab, type `print("hello")`, click **Run**. The output box should show `hello`. If the extension is still on, the tab should tell you port 39998 is in use.

**Context:** Same External Editor hook as Execute Code. TTS listens on 39999; this dashboard listens on 39998 while it is running.

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

#### TOR-540 — Memoriam popup: reverse bar, nested periods, Just Smoke, location

**How to verify:** Save & Play so the new scripts load. During Play, open the Phases panel and click **Memoriam**, then pick **Fomórach**. The date and the location line under it should update as you move the slider; the location should match the gold period (for example Toronto, Kharkiv, or Jaffa) and go blank in a black gap. The gold bar should sit on the same side of the strip as the slider handle (present toward the left, matching the right-to-left slider). The long Toronto years should split around Kharkiv and Jaffa, and sliding onto any Toronto chunk should gold **all** of Toronto's chunks together. Click a scene button that is not green: the slider should jump into that period (not into a nested hole), that column should highlight, and the location should match. Move the slider into a different period: the old yellow button should clear. **Just Smoke** sits centered under the grid and stays green; click it, drag through a gap, and it should stay selected. **Advance** with Just Smoke in a gap should succeed and print a Host line that includes `justSmoke` and a default panel. The slider range is now 0–2400.

**Context:** Follow-up to TOR-539 after the first in-game look. The default Just Smoke panel in Lua is a placeholder for you to fill in.

#### TOR-541 — Memoriam slider: present on the right; sort ties by endYear

**How to verify:** Save & Play. During Play, open Phases → **Memoriam** and pick a character. The slider handle should start on the **right** (present day). The gold bar block should sit under that handle on the right. Drag the handle left: dates should go backward, and the gold block should follow to the left. The scene-button columns should still run earliest on the left and latest on the right, lining up with the strip. If two periods share a start year, the one that ends sooner should appear first (left of the other).

**Context:** Follow-up to TOR-540 after the Photoshop mockup. Dragging left is how you move into the past; the strip and handle stay together.

#### TOR-542 — Memoriam slider range 0–5000

**How to verify:** Save & Play. Open Memoriam, pick a character, and move the slider slowly across a long period. Dates and the gold block should still line up with the strip the same way as before, just with finer steps. The handle should still start on the right (present). Clicking a dim scene button should still jump into that period.

**Context:** You raised the slider max from 2400 to 5000. The year mapping now fills that full range; the colored strip is still 1200 pixels wide.

#### TOR-543 — Memoriam scene buttons ignore XML highlight/selected colors

**How to verify:** Save & Play. Open Memoriam and pick a character. Scene buttons in the current period should use the color from `selection_button_highlighted` in the modal XML (currently yellow). The one you click should use `selection_button_selected` (currently green). Just Smoke should follow the same two classes. Empty dummy C/D cells can stay black.

**Context:** Lua was painting button colors directly, so XML Default class colors never showed. It now switches classes with `UI.setClass` and leaves color to those Defaults.

#### TOR-544 — Memoriam bar: white for nested/overlapping shorter periods

**How to verify:** Save & Play. Open Memoriam and pick **Fomórach**. On the period strip, Kharkiv and Jaffa (the short periods nested inside the long Toronto span) should be **white** when the gold handle is not on them. Toronto’s remaining gray chunks should still alternate with the other non-nested periods. Sliding onto Kharkiv or Jaffa should gold those white blocks as usual.

**Context:** Nested periods skip the two-gray stripe so they stay readable against the longer period they sit inside.

#### TOR-545 — Memoriam bar: four greys so nested panels can alternate

**How to verify:** Save & Play. Open Memoriam and pick **Fomórach**. On the period strip, Toronto (the long span) should use the two darker greys for its chunks, and Kharkiv and Jaffa (the nested shorts) should use the two lighter greys — not the same light shade next to each other. Sliding onto a nested period should still gold that block as usual. Empty years stay black.

**Context:** One white for every nested period made adjacent nested panels look like one block. Base periods and nested periods now each have their own alternating pair.

#### TOR-546 — Memoriam scene buttons go grey when selected

**How to verify:** Save & Play. Open Memoriam and pick a character. Scene buttons in the current period should be yellow. Click one: that button should turn green and stay green (not drop back to grey). The other current-period buttons should stay yellow. Click Just Smoke: it should turn green the same way. You can still change the highlighted/selected colors in the modal XML Defaults.

**Context:** The layout class was painting grey, and a TTS button click puts that grey back after Lua sets the selected class. Idle, highlighted, and selected are now separate color classes.

#### TOR-547 — Memoriam bar: abutting years are not overlapping

**How to verify:** Save & Play. Open Memoriam and pick a character who has two periods that only meet at a year (one ends the year the next begins, for example 1949–1955 then 1955–1965). Those two blocks should sit side by side in the darker base greys, not jump to the lighter nested greys. A period that is truly inside a longer one (including a single year in the middle of a longer span) should still use the lighter nested greys.

**Context:** Sharing only a start/end year is adjacent time, not a nested overlay.

#### TOR-548 — Memoriam scene buttons keep XML labels; dummy C/D stay dark

**How to verify:** Save & Play. Open Memoriam and pick a character. Scene buttons should show the catalog panel names, not “Period 3, Panel A”. Unused columns, including 13 and 14, should disappear. Pick a character whose period has only A/B: C and D in that column should be empty black placeholders. Switch to a character who has C/D (or fewer periods so that column is unused): those C/D cells should become real named buttons, or hide, and must not stay black from the previous character.

**Context:** Lua was applying class after text, so XML placeholders came back. Dummy C/D had been painted black as a leftover color that survived a PC change.

#### TOR-549 — Memoriam bar drops a same-year period on a neighbor’s last year

**How to verify:** Save & Play. Open Memoriam and pick **Lord Lucien**. On the period strip, 1999 should show a short Kingston block (`lucien23`) sitting on the last year of Montreal (`lucien19`, 1980–1999), not disappear into Montreal. Rashid’s single-year 2013 period should still appear as before. Two multi-year periods that only meet at a year (1949–1955 then 1955–1965) should still sit side by side.

**Context:** The abutting-year skip was hiding any period that started on another period’s last year, including a 1999–1999 period whose only year is that shared year.

#### TOR-550 — Memoriam popup: PC row of five exclusive buttons

**How to verify:** Save & Play so the new scripts load. During Play, open Phases → **Memoriam**. Instead of a dropdown, you should see a row of five grey buttons: Lord Lucien, Rashid Abdulrahman, Aishe Tache, Fomórach, and Black Caesar. Click one: that button should turn green and the others should stay grey. The timeline, date slider, and scene grid should fill for that character, the same as the old dropdown did. Click a different character: the first should go grey, the new one green, and the strip should rebuild. Clicking the already-green button should leave it green (only one character selected at a time).

**Context:** Follow-up to TOR-539. Same idle grey / selected green classes as the scene panel buttons.

#### TOR-551 — Memoriam: present-as-self toggles and subject NPC assignment

**How to verify:** Save & Play so the new scripts load. During Play, open Phases → **Memoriam**, pick a character, then pick a scene (or Just Smoke). All five names should appear. The character you picked should have a **green** name and **no** square to the left; the other four should have a small empty grey square before their names. Click a square: it should turn green, and that character is coming as themselves. Click it again: it should go grey. Click **+** on the subject (green name) and assign an NPC: Advance should still print `subjectKey` as that PC, and their `assignments` entry should be the NPC (`kind` / `key` / `label`), not `self`. Advance with no NPC on the subject: their assignment should be `{kind = "self"}`. A non-subject with a green square should also be `{kind = "self"}`. A non-subject with neither a green square nor an NPC should be missing from `assignments`. Assigning an NPC to someone who had a green square should clear the square (they are playing the NPC, not themselves).

**Context:** Follow-up to TOR-539. Rituals and similar can bring other people into Memoriam as themselves; the subject can also enter as someone else.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._
