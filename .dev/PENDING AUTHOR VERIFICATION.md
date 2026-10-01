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

_Last populated: 2026-10-01 — session intro catalog lookup (TOR-632)._

### Character sheets / XP

#### ⚠️ TOR-92 — Page 6 Experience Log + ST XP modal

**How to verify:** Run `npm run csheet-xp-log:bake` (or a full build) so `ui/player/csheets/page6_lordLucien.xml` exists, then Save & Play so object Includes and scripts reload.

1. ✅ Open **Lord Lucien**’s character sheet and go to **page 6**. You should see baked history (Rollover / Time of Legacy / etc.) immediately — no blank page. The Host console must **not** show a page-6 `setXml` remount for that tile. A **down** chevron should appear at the bottom when there are older sessions off-page.
2. ✅ Click the **bottom** (down) chevron once. Sessions from page 1 should hide and the next older sessions (e.g. earlier negative session blocks) should appear; a **top** (up) chevron should become available to return.
3. ✅ Click the **top** chevron to return to the newest page. Confirm the first-page sessions are back.
4. ✅ Open the Storyteller **PCs** panel. Confirm each seat shows an **XP** button (not up/down/apply) and a current XP number.
5. ⚠️ Click **XP** on one present PC. Enter a positive amount (e.g. `1`) and a short description, then **Apply**. The modal’s last-entry strip should show the line; page 1 `xp_text` and the panel XP value should rise by 1; page 6 should show the live session title and that gain (via `setAttribute` only).

**Author Comment:** An X-close button should be available at the top right of the modal, which has the same effect as "Cancel" but without the connotation of cancelling work already done (because the modal doesn't close automatically on Apply)

6. ✅ Log a spend with a negative amount (e.g. `-2`) and another description. Confirm the spend appears in red on page 6 and totals update (negative banked XP is allowed).
7. ❌ Click **Undo** twice and confirm both lines disappear and totals return.

**Author Comment:** While this does work for standard single-player awards/spends, clicking "Undo" after an "Apply to All" gain only removes the gain from the player targeted by the modal, and not from all players. (Undoing an "Apply to All" should undo the entire "Apply to All" action)

8. ✅ Mark another PC **Absent**, enter a gain, click **Apply to All**, and confirm the Absent seat did not change while present seats did.
9. ✅ _(Deferred until session 2 startup data is in place to avoid errors on attempting to start a sessionNum greater than 1)_ After you advance session number (End→Intermission), **without** re-baking, you should get a Storyteller warning about a stale page 6 bake; the live block still accepts new entries for the new session. After `npm run csheet-xp-log:bake` + Save & Play, the previous session should appear as a baked block in that character’s `page6_<charKey>.xml`.
10. ✅ Optional authoring check: on the Storyteller Dashboard **PCs** tab, open **JSON**. The bottom pane should be a dump of that seat’s raw `playerData` (including the full `xp` Experience Log with **string** session keys and **no** `timeline` field). Paste under `"xp": { … }`, **Apply**, re-open JSON, and confirm the dump matches. Then **Save** the game — onSave must succeed (no `noKeyConversion` JSON error). The sheet jewel still shows banked XP.

**Context:** Scalar `stats.xp` removed; log is `playerData.<pid>.xp` with string session keys. Page 6 markup is **template-baked** (`ui/.templates/csheet/` → `page6_<charKey>.xml`); runtime paints live slots and pagination with `setAttribute` only (no Lua-built XML / no page-6 `setXml`).



### Phases / session end

#### ✅ End→Intermission: session music fades out with blackout FadeIn (no new TOR — Linear quota; comment on TOR-143 / TOR-506)

**How to verify:** Save & Play so phase scripts reload. Advance through a session until you are on **End**, with location or Main music still audible (any scene bed is fine).

1. Advance **End → Intermission**.
2. As the screen goes black (about five seconds), that session music should **fade out** over the same stretch — not cut off, and not wait until the blackout lifts.
3. When the blackout is fully up (brief hold), you should hear silence or near-silence — no TR_Loop yet.
4. When the blackout starts fading out and the session-end splash appears, **TR_Loop** should fade in over those same five seconds (this part was already confirmed earlier).

**Context:** Outgoing ambient used to wait for blackout FadeOut (with TR_Loop). FadeIn now owns the outgoing fade; FadeOut owns TR_Loop only. relatedTo **TOR-506**, **TOR-143**.

### Scatter / table layout

#### ✅ TOR-629 — Hand zone rigid co-move (no zone-only place first)

**How to verify:** Save & Play so scripts reload. Put a full hand of cards in at least two PC seats (for example Red and Pink).

1. Advance **Play → Spotlight** so the table changes. After the cover lifts, each colored hand-zone box should have its own white fan with it — cards should not be stranded at the old table.
2. Advance **Spotlight → End**. Same check: boxes and cards arrive together and stay held (grabbable in the new fan).
3. Optional: on the PCs panel, turn **Absent** on for one seated PC, then off. That seat’s hand zone and cards should bury and return together.

**Context:** Hand Lab showed rigid-instant works. `U.movePlayerHand` already did that; rotational layout was also `placeObjectExact`-ing the reference hand zone first (zero delta → cards left behind). relatedTo **TOR-590** (hand-zone co-move).

#### 🚫 TOR-628 — Scatter Mode HERE/THERE preview + token lifecycle

**How to verify:** Save & Play so scripts reload.

1. **Live Scatter (HERE):** Drop a PC or NPC control token onto a scatter group. Figurines should move right away. The PC token on a center hole should lock. If a library row is linked for live writes, that row’s `scatterPlacements` should update after the edit.
2. **THERE preview:** Select a pending library row and switch the Control Board to **THERE**. Rearrange scatter tokens on the parchment — the live stage figurines should **not** move. Click **Reset** — tokens should match the library row’s pack again. Leave THERE (click THERE → HERE) — the pending row’s `scatterPlacements` should match what you left on the board.
3. **Pending table while THERE:** On a Table A pending scene in THERE, click **Scatter** on the Scenes panel. The Control Board art should switch to Scatter (live wood table stays). Click **Table A** again. Board art should return to Standard. Apply that scene — you should **not** see `sessionScene.seatSlots.Brown.tableSlot: required…`.
4. **Remove → palette:** Pick up an NPC token from a group and drop it on empty table space (not on a group). It should return to the **CONTROL_BOARD_PALETTE**. On HERE, that character’s figurine should leave the group immediately.
5. **Dice bag roll:** From Scatter, drop an NPC token onto an ST dice bag to start a roll. The token should park on the **palette**, not snap back onto a Scatter hole. The roll should still open as usual.
6. **Apply pending Scatter scene:** Apply a pending Scatter library row. The world should match the committed pack, and the board should return to HERE.

**Context:** Aligns Scatter with polar HERE/THERE (`previewDraft.scatterPlacements`). relatedTo **TOR-572** (in-game Scatter).

**Author Comment:** I am planning to rely more heavily on the Storyteller Dashboard to control previewing and editing scenes. Please close this issue accordingly, noting that this functionality will soon be replaced by Storyteller Dashboard integration.

#### ✅ TOR-573 — Scatter import and live Standard↔Scatter switch

**How to verify:** Save & Play so scripts reload.

1. **Import a Scatter scene from chairs:** Paste v2 JSON whose `sessionScene.tableKey` is `Scatter` (you can omit `placementMode` if the table key is Scatter). Give two PCs the same `tableSlot`, and put a stage NPC in `npcWorld.placements` with `scatterGroup` 1–6 and no `u`/`v`. Import, then Apply. The wood table should hide. Those two PCs should share one scatter group; a lone PC in a group should stand on PC slot 1, which is now the gold hole.
2. **Live switch:** Start from a normal table scene with people in chairs and NPCs on polar packs. Click **Scatter** on the Scenes panel. The cover should run, and the Host console should **not** print `Object reference not set to an instance of an object`. Chairs should become scatter groups by chair number (7 wraps to group 1). Polar packs should fill scatter groups in CENTER, then Mid Center, and so on; a seventh occupied pack should vanish as if you hit Clear. Click **Table A**. Same rule: no Object reference error. Everyone who was still in a scatter group should return to the chairs and packs they had before Scatter. NPCs you Cleared while in Scatter should stay gone.
3. **Authored Scatter with no prior table:** Apply a Scatter library scene, then click Table A. PCs should sit Lucien 1, Rashid 2, Aishe 3, Fomorach 4, Black Caesar 5 (or shuffle if you pick a Table B size). NPCs should fill polar packs in that same family order; extra NPCs from one scatter group should take the next whole pack, and the following scatter group should skip that overflow pack.

**Context:** relatedTo **TOR-572** (in-game Scatter table) and **TOR-570** (dashboard scatter JSON). Dashboard Copy JSON can keep using `scatterPlacements`; chair-style import is the other legal paste.

#### ❌ TOR-602 — Scatter Mode player HUD (group strip + click-to-move)

**How to verify:** Save & Play so Global XML and scripts reload. Confirm Custom UI assets exist for `scatterGroupToggle_inactive` / `_hover`, `scatterGroupSelector_hover`, `scatterGroupControl_bg`, and `scatterModeControlPC_lordLucien` / `rashid` / `aishe` / `fomorach` / `blackCaesar`. If any portrait or button is blank, that is a missing asset name in the save, not the Lua.

1. Switch the table to Scatter. Each PC should see the **inactive** toggle near the top of **their** screen only. Hover it: it should become the hover graphic. The six-group strip starts closed.
2. Open the toggle. The inactive toggle should disappear (that look is in the strip background). Hover the same spot: the hover graphic should appear. Portraits should match who is in each group and keep even spacing even when a group has empty holes (empty slots are transparent, not deactivated). The center portrait slot (`pc1`) is gold / first-join. Lucien’s face is `scatterModeControlPC_lordLucien`. Your current group should keep the selector hover graphic on (hovering it should dim it to half alpha), and its NPC names should use the brighter active-list style. Other groups should show only the background until you hover them.
3. Click a **different** group. Your figurine, bags/sheet/camera, and PC token should move there immediately. An empty group uses the gold hole. The strip closes and the inactive toggle should return. Other players with the strip open should see you in the new group.
4. Open the strip again and click the group you are **already** in. Nothing should move, and the strip should **stay open**.
5. Storyteller: drop a PC token onto another group. That player’s figurine should move, and HUD portraits should follow without that player clicking.
6. Leave Scatter. The toggle and strip should disappear.

**Context:** Gold is PC slot 1 (not 3). Occupancy written under the old slot-3 scheme will sit on the wrong hole until you re-enter Scatter or move that PC once. relatedTo **TOR-572**.

**Author Comment:** Almost! Except the players' character sheets are all being disabled, leaving no sheets active -- the pages that were active when the Scatter transition began should be retained, as with any other table change.

### Character sheets

#### ✅ UISet — batch / sequence UI attribute helper (no new TOR — Linear quota)

**How to verify:** Save & Play so Global scripts reload. Open **Execute Lua** on Global.

1. Pick any Global XmlUI element you can see change (for example a debug panel id). Run `UISet("<that_id>", { active = "true" })` then again with `active = "false"`. It should show and hide with no console error.
2. Optional object form: with a character-sheet page GUID from the Objects pane, run `UISet("<guid>", "paper_root", { padding = "50 50 110 100" })` (or another real page-2 id). Confirm no `no object for GUID` / nil UI error.
3. Optional sequence: `UISet("<guid>", "dot_rc_L_2_#", { image = "dot_yellow", active = "true" }, { ["#"] = { 1, 2, 3, 4, 5 } })` should light five dots if those ids exist on that page. With two placeholders, e.g. `dot_rc_#_@` and `{ ["#"] = { 1, 2 }, ["@"] = { "L", "R" } }`, all four combinations should update (cartesian product), not half-substituted ids.

**Context:** Helper from the page-2 XML dump, shipped as `U.UISet` in `lib/util.ttslua` and Global `UISet`. Linear could not create a new issue (workspace free-issue limit).

#### ✅ TOR-595 — Dashboard PCs tab: live-only sheet (no stand-in) + Ambition from gameState

**How to verify:** Save & Play so the snapshot script reloads. Keep External Editor on. Restart the Storyteller Dashboard if it was already running.

1. **Offline notice:** On the **PCs** tab, click **Release Port** (or leave the port unclaimed). You should see a blank spread titled **No live sheet** with a short reason (for example that the dashboard is not holding the editor port). You must **not** see fake character names, Desire, Ambition, or tracker dots from a stand-in sheet.
2. **Live sheet:** Click **Claim Port**. The status should say it is live from Tabletop Simulator. Player cards and page 1 should fill from the table. Subtitles and chronology come from the live seat snapshot (PCS identity in TTS), not from a dashboard hardcode file.
3. **Ambition:** In Execute Lua / TEST BED, run something like `SetPcAmbition("aishe", "Create a legacy in Toronto that long outlasts me")` for a few seats. After Claim Port (or wait a couple of seconds for the poll), each Ambition line under the name on page 1 should match what you set. Empty `playerData.ambition` shows no quote — it must not invent text from the PCS catalog.
4. Optional: click **JSON** next to Claim/Release Port — a scrollable modal should show pretty-printed data for the seat on screen. Paste only `"ambition": "…"`, click **Apply**, and confirm Ambition updates **without** clearing the character name or other identity fields. Nested patches (for example `attributes.charisma.base`) should deep-merge. Escape or Close dismisses the modal.
5. With the PCs tab open and Claim Port held, leave the table alone for about 30 seconds. Tabletop Simulator should **not** hitch every couple of seconds — the tab no longer polls execute-lua on a timer.

**Context:** Follow-up on the live PCs bridge (**TOR-595**). Snapshot/apply live in `dashboard/pc_sheet.ttslua` (`require("dashboard.pc_sheet")`). Snapshot fields include identity + `ambition` from `playerData`. Dashboard never paints a fixture when TTS is unreachable. Partial `mergeSeat` patches must not rewrite empty `sheetOverlay` fields.

### Memoriam

#### TOR-101 — Memoriam runtime apply (enter / exit)

**How to verify:** Save & Play so scripts and Global XML reload. Confirm Custom Assets include names like `memoriamBlindfold_rashid7` (Cloud sync job `memoriamBlindfolds`).

1. **Real period Advance:** During Play, open Phases → Memoriam, pick a PC, pick a scene panel (not Just Smoke), set assignments if you like, click Advance. The global cover should show that period’s Memoriam blindfold art. Under the cover you should land on Table B0, the subject at seat 1, overlay showing the Memoriam location string (no site/weather row), a night clock on the Memoriam date, and the chosen panel skybox. Hunger should be unchanged; Health and Willpower should be full for PCs present as themselves.
2. **Just Smoke:** Same flow but click Just Smoke then Advance. Host console should print `[Memoriam] …` and the world/subphase should **not** change.
3. **Exit restore:** Start Memoriam from an applied library scene, then click Main (or Downtime). You should return to that library scene (flushed evolving data). Start Memoriam with no live scene, then exit: Downtime + no-scene baseline.
4. **Scene Apply while Memoriam:** Apply a library scene with NOW — time should use the clock from just before Memoriam began, not wall present-day. End Scene while Memoriam should clear Memoriam and apply the usual no-scene End path.
5. **Re-select:** While already in Memoriam, open Memoriam again, pick a different period, Advance — new blindfold/world apply without dropping the original return-scene memory until you finally exit.

**Context:** Catalog `blindfoldURL` removed. PC-as-NPC sheet swap still TOR-95; LUT/sepia still TOR-321.

### NPC / stage

#### 🚫 TOR-560 — Generic NPC import (spawn, scene library, Dashboard bridge)

**How to verify:** Save & Play so Global + CONTROL_BOARD UI update. The **Import** field should sit on the control-board edge **opposite** the Apply/Clear row (not stacked above those buttons). Paste a short key list from the Storyteller Dashboard (for example `dogGuard_01,academicsProfessor_02`) and click **Import** (or press Enter in the field). A Storyteller-only name popup should open with those rows pre-filled from sheet labels — change a name if you like, then confirm. You should get face-down tokens in a spaced row on the edge **opposite** the PC seat-token row (not on top of the PCs), with tooltip nicknames matching whatever you typed in the popup, rotation `{0, 0, 180}`, and **Toggles → Snap** on so they pull onto control-board snap points. Figurines should park under the table with lights off. Apply should place them from token positions like other stage NPCs. Leaving the scene (or Clear) should destroy those generic objects; applying that library scene again should recreate them with the same display names.

Separately, restart the Storyteller Dashboard with the TTS Tools extension **disabled**. Gold highlights should appear after **Copy** or **Spawn in TTS**. **Clear Generics** should clear gold only. With the extension enabled again, **Spawn in TTS** and Lua **Run** should grey out and explain that port 39998 is busy.

**Context:** Runtime spawn exception to the named-NPC preload pool. Seating / PC-as-NPC / Memoriam generics are still out of scope. Post-ship polish: import UI edge, spawn row flip/spacing, nickname after reload, fixed rotation, Snap toggle on at spawn. Generics park in the next free under-table bay (named NPCs keep their sorted stable slots).

**Author Comment:** The importing of Generic NPCs, and their positioning on the control board, are going to be handled by the Storyteller Dashboard.

### High — session / join / first-load

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

#### TOR-512 — Absent off restores the full seat pile, including lights

**How to verify:** Save & Play so the new scripts load. On the PCs panel, turn **Absent** on for one player who is sitting at the table. Their whole pile should drop under the table and disappear, the same way an unused NPC seat does. Turn **Absent** off. That player should come back with the full pile at table height — figurine, character sheet, bags, chair, hand zone, **and seat lights** — not just the figurine. Lights should behave like a normal in-session seat. A sheet page that was already hidden should stay hidden; the page that was showing should still be showing. If a signal fire or hunger smoke was on before Absent, it should still be on after they return.

**Context:** Occupancy stash at Y=−200 was keeping satellites buried. relatedTo **TOR-507**.

**Update (TOR-631):** The PCs panel **Absent** toggle is gone. "Absent on" is now: Debug panel in green **Assume Connected**, click the player's **Connected** button so it reads **Disconnected**, then advance a phase. "Absent off" is clicking the button again.

#### ✅ Pink Tarot Consult: one delayed place at authored height (no new TOR — Linear quota; relatedTo TOR-411)

**How to verify:** Save & Play so `lib/tarot_toggle.ttslua` reloads. Put Pink’s tarot away (deck at y ≈ −200). Confirm `C.ObjectPositions.TAROT_DECK_PINK.on.height` is the height you want (currently **8.5**).

1. Click **Consult the Tarot**. The **drawer** should start opening first. The **deck** should stay invisible for about **1.5 seconds** (`on.delay`), then appear **once** on the deck anchor at height **8.5** — not flash at the drawer surface and then hop up.
2. Put it away again: park at −200. Consult again: same single delayed appear at 8.5.
3. Optional: change `height` to another value, Save & Play, Consult — the deck should land at that new height on first appearance (no earlier wrong height).

**Context:** Reveal was calling `GlobalRestoreObject` immediately (ignoring delay) and then `applyResolvedPose` again after `on.delay`, so the deck popped early at the wrong height and snapped a second time. relatedTo **TOR-512** / **TOR-411**.

#### TOR-513 — Absent hand zone, PC token stash, and Apply PC reseat

**How to verify:** Save & Play so the new scripts load. Put a few cards in Red’s hand. On the PCs panel, turn **Absent** on for Red. Red’s pile should drop under the table, the **hand zone should go with it** (Y about −200), and **those cards should move under the table too** — they should not stay floating at table height. Red’s PC token on the stage control board should disappear (locked under the board, not sitting in a park strip below the chairs). Turn Absent off: pile, hand zone, cards, and the PC token should all come back to Red’s chair.

Then, without changing any NPC tokens on the stage, drag Red’s PC token onto a different empty chair snap and click **Apply**. Red’s **live pile** on the table should move to that numbered chair, not only the token on the control board.

**Context:** Absent was hiding the pile but leaving the hand zone (and often the cards) at the table, and parking the PC token on the board. Apply that only moved PC tokens also skipped seat layout because the NPC reconciler thought nothing had changed.

**Re-test after the 2026-10-01 fix (Absent off left the cards behind):** Burying the hand used to tag the hand zone as a hidden object. A tagged hand zone stops holding its cards, so when Absent was turned off the zone came back to the chair and the cards stayed under the table. Absent now moves the hand zone and its cards with the same single hand mover the Hand Lab confirmed, and nothing tags the zone. When you re-run the steps above, the key check is: after Absent **off**, Red’s cards are back in Red’s fan at the chair and can be picked up. Use a player who was **not** already Absent before this Save & Play. Cards stranded by the old code may need to be fetched by hand once.

**Second re-test (2026-10-01, cards swooped back to the table on Absent on):** At Y −200 the cards sit inside the floor. Unlocked cards get shoved out by the physics engine and fly to the table edge with the "swoop" sound, so it looked like they never moved. The single hand mover now locks the cards whenever it moves a hand to a parked height (Y −195 or lower), and unlocks them whenever it moves a hand anywhere higher. When you turn Absent **on**, there should be no swoop sound and no cards landing on the table edge; Red’s cards should quietly vanish under the table with the hand zone. When you turn Absent **off**, the cards should come back in Red’s fan, and you should be able to pick them up (they are not left locked).

**Third re-test (2026-10-01, cards stayed locked under the table on Absent off):** Your probe showed that once cards are locked, TTS no longer counts them as being in the hand, so the restore found nothing to bring back. Now, whenever the hand mover parks a hand, it also tags each card `LockedCard<Color>` (for example `LockedCardRed`). When the hand comes back, it gathers the tagged cards along with the normal hand cards, removes the tag first, then moves the hand zone and unlocks and moves each card. The tag is saved with the game, so a player who stays Absent across sessions still gets their cards back. Purple's cards were parked before this change and carry no tag yet: with Purple still Absent, run `TagStrandedHandCards("Purple")` from the TEST BED once, then turn Purple's Absent off. For a clean test, use a different player: turn Absent on (optionally run `ProbeHandCards` for that color to see the parked cards listed as locked), then turn Absent off. Success is all the cards back in the fan, unlocked and pick-up-able, with no `LockedCard…` tag left on them.

**Also in the same Save & Play (TOR-301, old seat layout code removed):** About 1,600 lines of old seat-layout code that nothing called anymore were deleted. Nothing should look different, but a removal like this can only fail in-game. While you are testing, switch the table once (for example Table A to Table B and back) and run `DEBUG.refreshSeatRigsFromReference()` once from Execute Code. Success is chairs, lights, figurines and hands landing where they did before, with no red "attempt to call a nil value" errors in the console.

**Update (TOR-631):** The PCs panel **Absent** toggle is gone, and a disconnected PC's control-board token now sits locked a few units beneath the board rather than at Y −200. "Absent on" is now: Debug panel in green **Assume Connected**, click the player's **Connected** button so it reads **Disconnected**, then advance a phase. "Absent off" is clicking the button again. Dragging a PC token to a different empty chair and clicking **Apply** still moves that player.

#### TOR-630 — Scene Apply clears Absent and re-seats the player

**How to verify:** Save & Play. On the PCs panel, mark one player **Absent** (their pile, hand and control-board token go under the table). Open the Scenes panel and **Apply** a different library scene in which that player's seat is active. The player should stay Absent: the Absent toggle stays on, no pile or chair appears for them, and their control-board token stays hidden. Then apply a Scatter scene and come back to a standard-table scene; they should still be Absent throughout. Finally, turn Absent off on the PCs panel: they should get a chair at the current table with their cards.

**Context:** Applying a scene replaced the live seat rows with the library scene's copy, which wiped the Absent flag. Absent is now treated as a session fact: every scene change copies the live Absent flags onto the new scene's seats, and a scene's own Absent value is ignored. The control-board preview (THERE) also shows Absent players as Absent.

**Update (TOR-631):** The PCs panel **Absent** toggle is gone. To make a player Absent (now called *unoccupied*) for this check, switch the Debug panel to green **Assume Connected**, click that player's **Connected** button on the PCs panel so it reads **Disconnected**, then advance a phase. To bring them back, click the button again.

### Players & Connection

#### TOR-631 — Connection-driven seat occupancy

**How to verify:** Save & Play so the scripts and Global UI reload.

1. Open the Debug panel. The connection button should read **By Connection Status** in yellow. Any PC whose player is not connected should have no chair: no pile at the table, and their control-board token locked a little beneath the board (you cannot pick it up).
2. Click the button. It should turn green and read **Assume Connected**. Every PC should be seated straight away, with no blindfold.
3. Open the PCs panel. Each seat now has a green **Connected** button where the Absent toggle used to be. Click Red's. It should turn red and read **Disconnected**. Red's seat should go dark, but the chair, sheet and hand stay put.
4. Advance a phase (or apply a scene, or change table). Under the blindfold, Red should lose the chair: pile and hand go under the table, and Red's control-board token goes beneath the board. On Table B with random seating, Red's spot becomes an empty chair somewhere in the shuffle.
5. Click Red's button again. Red should be seated at once at their usual chair (or the lowest free one if it is taken), with their cards back and no blindfold.
6. On the control board, drag a connected PC's token off its chair onto the stage. It should snap back. Swap two PC tokens between chairs and click **Apply**. The two players should swap chairs at the table.
7. In a Scatter scene, disconnect a PC and advance a phase. They should leave their group. Reconnect them; they should appear in an empty group.
8. Click the Debug button back to yellow. The per-seat Connected buttons should disappear. Save, reload, and confirm the mode you left it in is remembered.
9. Optional: the Storyteller Dashboard PCs tab no longer has an Absent checkbox. The player rail shows **Seated** or **Unoccupied**, plus **Disconnected** when relevant.

**Context:** Whether a PC holds a chair is now decided only by connection; the Storyteller can no longer mark a PC Absent by hand. Present / Not Present (lit or dark seat) is unchanged and separate. Full model: `docs/solutions/seat-occupancy-and-connection.md`. relatedTo **TOR-630** and **TOR-513**.

#### TOR-633 — Character sheet pages come back when a PC's seat returns

**How to verify:** Save & Play (every PC starts with sheet pages 1 and 2 showing). On the Debug panel, switch to green **Assume Connected**.

1. On Red's character sheet, turn page 2 off so only page 1 is showing. If you want to check the signal fire too, light Red's signal fire.
2. On the PCs panel, click Red's **Connected** button so it reads **Disconnected**, then advance a phase. Red's whole pile, including the sheet, should go under the table.
3. Click Red's button again so it reads **Connected**. Red should be seated at once with **page 1 showing** and **page 2 still off**, the way it was before. If you lit the signal fire, it should be lit again.
4. Optional: repeat in a Scatter scene. When Red rejoins a group, the same pages should come back.

**Context:** When the pile was buried, the code noted which pages were showing. On the way back it checked "is this page under the table?" first, decided every page had been turned off on purpose, and then threw the note away. It now checks the note first. relatedTo **TOR-631** and **TOR-512**.

### Soundscape / session start

#### TOR-632 — Session intro track and splash art follow the session number

**How to verify:** Save & Play so the scripts reload. Start on **Intermission**. Quick Transition on the Phases panel should be off.

1. Set the session number to **1** and click **Advance**. You should hear Session Starter 1 (about 70 seconds). The cover, the session number, and the session title should be session 1’s pictures, and the splash should finish with the song.
2. Go back to Intermission (Advance through the rest of the loop, or run `DEBUG.resetToIntermission()` from Execute Code). Set the session number to **4** and Advance again. You should hear the shorter Session Starter 4 (about 37 seconds), and the splash should be paced to that shorter song. Session **5** is the long one (about 77 seconds).
3. Set the session number to **99** (no starter and, unless you have added them, no session 99 pictures) and Advance again. A Storyteller warning should name the missing track and say which of the five starters is playing instead. The splash length should match that chosen song. The cover should be the generic session-end picture (`overlay_sessionEndSplash_1`). The session number and session title should not appear (they stay in the animation, fully transparent). You should not see a white broken image box.

**Context:** The song and its length now come from the sound catalog (`TR_SessionStart` plus the session number). The old constants that duplicated that are gone. A missing track is chosen at random from the session intros that are registered, and that choice stays the same for the rest of the splash. A missing start-splash image uses the generic end-splash picture. A missing session number or title stays invisible (fully transparent) so the rest of the splash still plays.

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
