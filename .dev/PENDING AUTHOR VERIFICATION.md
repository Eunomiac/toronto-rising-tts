# Pending Author Verification

Your TTS checklist for shipped work that still needs Save & Play / in-game confirmation. Linear **Done** alone does not mean verified.

**Marks** (prefix the `####` header):

| Mark | Who | Meaning |
| --- | --- | --- |
| **✅** | Author | Confirmed in TTS — agents remove on next inbox |
| **❌** | Author | Still broken (+ **Author Comment:**) |
| **⚠️** | Author | Bad expectations (+ **Author Comment::**) |
| **⌚** | Agent | Not ready to verify yet — fix is open in Linear / Focus; **do not** Save & Play for this row until the watch is cleared |

Unmarked = shipped (or verification gate) and waiting for your first pass. Agents add a new unmarked row whenever they ship in-game code; they process your **✅** / **❌** / **⚠️** marks on the next inbox. Agent policy: [PENDING AUTHOR VERIFICATION.agent.md](PENDING AUTHOR VERIFICATION.agent.md).

---

## Outstanding

_Last populated: 2026-09-21 — TOR-605 camera look-at Y stays at authored constants; Willpower reroll dice can be picked up (Linear quota blocked a new issue; noted on TOR-31)._

### Soundscape

#### ✅ TOR-593 — Ravenwing nightclub should replace the default theme

**How to verify:** Save & Play so scripts reload. Be in Play with the usual default theme already going (Main). On the Scenes panel, pick **Ravenwing** and click **Apply Location** (or Apply a library scene whose site is Ravenwing).

1. After the cover, you should hear only the Ravenwing nightclub bed — not the default theme underneath it.
2. Leave Ravenwing for a normal outdoor site (or End scene). The default theme should come back, and the nightclub bed should stop.

**Context:** The site says “no background playlist,” but leftover Main mood was still starting on the music emitters while nightclub started on the location emitters.

### Phases / session start

#### TOR-596 — Hide Storyteller camera and seat bars during session-start splash

**How to verify:** Save & Play so scripts and Global XML reload. From Intermission (or Host console `lua DEBUG.resetToIntermission()`), leave **Quick Transition** off and click **Advance**.

1. While the character splash and session number/title play, the bottom-left Storyteller camera buttons (Main / Mid / Stage / Palette / Rolls) and the bottom-right colored seat buttons must be gone.
2. After the splash and black fade finish, those same bars must come back.
3. Optional: click **Clear Loading Overlay** mid-splash — the bars should return immediately.

**Context:** TEST BED already hid `adminControls` and `panel_STcamera`. relatedTo **TOR-567**.

#### TOR-581 — Rain emitter hidden off Play

**How to verify:** Save & Play. Note the rain particle object on the table during Play (with rain weather if you have a rainy scene).

1. In Play it should sit on the table origin and play rain when weather calls for it.
2. Advance to Spotlight, End, or Intermission: it should be parked under the table (not sitting in the playfield).
3. If you Apply a Scatter scene during Play, Scatter should still hide it; leaving Scatter while still in Play should bring it back.

#### TOR-527 — Main and Downtime follow the live scene

**How to verify:** Save & Play. Start from Intermission with no scene on the table.

1. Advance to Play. The overlay should **not** show date + **DOWNTIME** on this first landing — that first overlay is prologue copy (**TOR-598**). Changing the Scenes clock should not change chronicle present-day.
2. Apply a library scene. The Play subphase should switch to Main and the overlay should show location and normal time.
3. End the scene. You should be back in Downtime, now with a date and the word **DOWNTIME** (no district/site text).
4. Click **Main** or **Downtime** when already on the correct one: nothing should change. Click the “wrong” one: it should snap to the correct one for whether a scene is live.
5. If you enter Memoriam from a live scene, then click **Main**, that scene should come back. If Memoriam started with no scene, you should land in Downtime.

#### TOR-598 — Session-start first Downtime overlay is prologue copy

**How to verify:** Save & Play so scripts reload. On the Phases panel, set the session number (for example 1) and type a session title such as `The Devils You Know`. Start from Intermission with no scene on the table (Host console `lua DEBUG.resetToIntermission()` is fine).

1. Click **Advance** to Play. After the cover, the center overlay should show **T O R O N T O   R I S I N G** on the top line (a clearly wider gap between TORONTO and RISING than between letters), **– I –** (or the matching compact roman for your session number) in the middle, the title as spaced uppercase (for that example **T H E   D E V I L S   Y O U   K N O W**, with the same wider gaps between words), and **PROLOGUE** on the bottom. It should not say **DOWNTIME**, and there should be no date or district/site.
2. Apply a library scene. The overlay should go back to the usual red date, location, and clock (not gold title / PROLOGUE).
3. End that scene. You should land in Downtime with a date and the word **DOWNTIME** — not the prologue layout again.

**Context:** Only the first Intermission→Play Downtime uses this layout. relatedTo **TOR-527**. Word gaps are ordinary spaces written with `setAttributes` `text` (**TOR-601**). Non-breaking spaces were wrong (**TOR-600**).

#### TOR-600 — Prologue overlay word gaps stay three spaces wide

**How to verify:** Save & Play so scripts reload, then use the same Intermission → Play check as **TOR-598**.

1. **T O R O N T O   R I S I N G** must have a visibly wider gap between the two words than between letters. Same for **T H E   D E V I L S   Y O U   K N O W** — four words, three wider gaps.
2. It must not look like one run of letters: `T O R O N T O R I S I N G`.
3. It must not show stray **Â** characters in those gaps.

**Context:** Follow-up to **TOR-598**. `UI.setValue` collapses ordinary double spaces; non-breaking spaces showed as Â. **TOR-601** writes those strings with `setAttributes` `text` instead.

#### TOR-601 — Prologue overlay spaces use setAttributes, not setValue

**How to verify:** Save & Play so scripts reload. Same Intermission → Play check as **TOR-598**.

1. Top line should read **T O R O N T O   R I S I N G** with a wider gap between the two words, and **no Â**.
2. Session title should read **T H E   D E V I L S   Y O U   K N O W** the same way.

**Context:** Author confirmed `UI.setAttributes(..., { text = "T O R O N T O   R I S I N G" })` keeps the three spaces. relatedTo **TOR-600**.

#### TOR-604 — Play overlay clock height after leaving prologue

**How to verify:** Save & Play so scripts reload. From Intermission with no scene, Advance to Play (prologue overlay), then Apply a library scene.

1. The center overlay should show roman session, district/site, the red date, **and the clock** (for example `8:00 PM`) inside the gold frame — not clipped off the bottom.
2. Session number and location should sit near the top of that frame, similar to a normal Play overlay that never went through prologue.
3. Optional: End the scene. Date + **DOWNTIME** should also sit in that same vertical layout, with **DOWNTIME** fully visible.

**Context:** Leaving prologue used to clear the time row height to empty, which collapsed it. relatedTo **TOR-598**.

#### TOR-599 — End overlay says EPILOGUE

**How to verify:** Save & Play so scripts reload. Advance to **End** (Play → Spotlight → End, or however you usually get there).

1. The center overlay should show the session name on the date line and **EPILOGUE** underneath — not **DEBRIEF**.
2. Optional: Advance back through Intermission → Play (no scene) and confirm the prologue overlay from **TOR-598** still works after End.

**Context:** Copy change only. relatedTo **TOR-98**.

### Character sheets
#### Dashboard PCs tab — live sheet snapshot/apply

**How to verify:** Save & Play so the new Global functions load. Keep External Editor on, and keep the TTS Tools Cursor extension **off** (only one process can listen on the editor port). Restart the Storyteller Dashboard if it was already running.

1. Open the Storyteller Dashboard and click **PCs**. The status line under the two-page spread should say it is live from Tabletop Simulator, not a stand-in fixture. You should see all five player cards on the left and a page-1 sheet plus an empty page 2. The subtitle should read like “Eighth Generation Ancilla of Clan Malkavian ◆ Descendant of the Pythia”.
2. Select a seated player. Hunger, XP, Health, and Humanity should **move on the dashboard as soon as you click**. Left-click Hunger to add a pip, right-click to remove one (no popup). Same for the XP jewel. Click Health superficial **three times quickly**: the dashboard should show all three immediately. After a short wait the in-game Health track should match — without three long pauses. Mend should heal up to current Mending and close the menu. Humanity stain should not pile up a hidden tally while the red impaired box is showing. The status line may say it is updating Tabletop Simulator.
3. Change Desire and leave the field — the in-game Desire should update. Optional: click **Std** on the selected card and confirm a Storyteller-initiated roll starts for that seat.

**Context:** `GlobalDashboardPcSheetApply` accepts one command or a JSON array (`core/dashboard_pc_sheet.ttslua`). Dashboard clicks paint locally and flush queued clicks in one execute-lua call. **TOR-595**. Async apply-queue work is in a parallel dashboard session — do not treat that as this row.

### Scatter / table layout
#### TOR-590 — Hand zone and cards move together

**How to verify:** Save & Play so the instant-move scripts load. Put a few cards in at least two hands. Start in **Play** on Table B.

1. Advance **Play → Spotlight**. After the cover lifts you should **not** hear a long swoop of cards flying, and you should **not** see white cards stranded on figurines, sheets, or mid-table. Each colored hand-zone box on Table A should have its own fan sitting in that hand, grabbable.
2. Advance **Spotlight → End** (Table B0). Same check: boxes and fans arrive together at the new seats. Cards must not stay in the old Spotlight/Table A fan.
3. Optional: turn **Absent** on and off for one seat. Those cards should bury under the table with that hand zone and come back with it.

**Context:** First Save & Play of the unified mover used a smooth lerp. After Play→Spotlight the cover lifted while cards were still flying Table B→A; they stalled mid-path. The mover now teleports the zone and cards in one step (no lock). relatedTo **TOR-513** (Absent hand stash) and **TOR-572** (Scatter Mode).

#### TOR-573 — Scatter import and live Standard↔Scatter switch

**How to verify:** Save & Play so scripts reload.

1. **Import a Scatter scene from chairs:** Paste v2 JSON whose `sessionScene.tableKey` is `Scatter` (you can omit `placementMode` if the table key is Scatter). Give two PCs the same `tableSlot`, and put a stage NPC in `npcWorld.placements` with `scatterGroup` 1–6 and no `u`/`v`. Import, then Apply. The wood table should hide. Those two PCs should share one scatter group; a lone PC in a group should stand on PC slot 1, which is now the gold hole.
2. **Live switch:** Start from a normal table scene with people in chairs and NPCs on polar packs. Click **Scatter** on the Scenes panel. The cover should run, and the Host console should **not** print `Object reference not set to an instance of an object`. Chairs should become scatter groups by chair number (7 wraps to group 1). Polar packs should fill scatter groups in CENTER, then Mid Center, and so on; a seventh occupied pack should vanish as if you hit Clear. Click **Table A**. Same rule: no Object reference error. Everyone who was still in a scatter group should return to the chairs and packs they had before Scatter. NPCs you Cleared while in Scatter should stay gone.
3. **Authored Scatter with no prior table:** Apply a Scatter library scene, then click Table A. PCs should sit Lucien 1, Rashid 2, Aishe 3, Fomorach 4, Black Caesar 5 (or shuffle if you pick a Table B size). NPCs should fill polar packs in that same family order; extra NPCs from one scatter group should take the next whole pack, and the following scatter group should skip that overflow pack.

**Context:** relatedTo **TOR-572** (in-game Scatter table) and **TOR-570** (dashboard scatter JSON). Dashboard Copy JSON can keep using `scatterPlacements`; chair-style import is the other legal paste.

#### TOR-602 — Scatter Mode player HUD (group strip + click-to-move)

**How to verify:** Save & Play so Global XML and scripts reload. Confirm Custom UI assets exist for `scatterGroupToggle_inactive` / `_hover`, `scatterGroupSelector_hover` / `_active`, `scatterGroupControl_bg`, and `scatterModeControlPC_lordLucien` / `rashid` / `aishe` / `fomorach` / `blackCaesar`. If any portrait or button is blank, that is a missing asset name in the save, not the Lua.

1. Switch the table to Scatter. Each PC should see the **inactive** toggle near the top of **their** screen only. Hover it: it should become the hover graphic. The six-group strip starts closed.
2. Open the toggle. The inactive toggle should disappear (that look is in the strip background). Hover the same spot: the hover graphic should appear. Portraits should match who is in each group; the center portrait slot (`pc1`) is gold / first-join. Lucien’s face is `scatterModeControlPC_lordLucien`. The group you occupy should show the active selector overlay; other groups should show only the background until you hover them.
3. Click a **different** group. Your figurine, bags/sheet/camera, and PC token should move there immediately. An empty group uses the gold hole. The strip closes and the inactive toggle should return. Other players with the strip open should see you in the new group.
4. Open the strip again and click the group you are **already** in. Nothing should move, and the strip should **stay open**.
5. Storyteller: drop a PC token onto another group. That player’s figurine should move, and HUD portraits should follow without that player clicking.
6. Leave Scatter. The toggle and strip should disappear.

**Context:** Gold is PC slot 1 (not 3). Occupancy written under the old slot-3 scheme will sit on the wrong hole until you re-enter Scatter or move that PC once. relatedTo **TOR-572**.

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
#### TOR-560 — Generic NPC import (spawn, scene library, Dashboard bridge)

**How to verify:** Save & Play so Global + CONTROL_BOARD UI update. The **Import** field should sit on the control-board edge **opposite** the Apply/Clear row (not stacked above those buttons). Paste a short key list from the Storyteller Dashboard (for example `dogGuard_01,academicsProfessor_02`) and click **Import** (or press Enter in the field). A Storyteller-only name popup should open with those rows pre-filled from sheet labels — change a name if you like, then confirm. You should get face-down tokens in a spaced row on the edge **opposite** the PC seat-token row (not on top of the PCs), with tooltip nicknames matching whatever you typed in the popup, rotation `{0, 0, 180}`, and **Toggles → Snap** on so they pull onto control-board snap points. Figurines should park under the table with lights off. Apply should place them from token positions like other stage NPCs. Leaving the scene (or Clear) should destroy those generic objects; applying that library scene again should recreate them with the same display names.

Separately, restart the Storyteller Dashboard with the TTS Tools extension **disabled**. Gold highlights should appear after **Copy** or **Spawn in TTS**. **Clear Generics** should clear gold only. With the extension enabled again, **Spawn in TTS** and Lua **Run** should grey out and explain that port 39998 is busy.

**Context:** Runtime spawn exception to the named-NPC preload pool. Seating / PC-as-NPC / Memoriam generics are still out of scope. Post-ship polish: import UI edge, spawn row flip/spacing, nickname after reload, fixed rotation, Snap toggle on at spawn. Generics park in the next free under-table bay (named NPCs keep their sorted stable slots).

### High — session / join / first-load
#### ⌚ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

#### TOR-512 — Absent off restores the full seat pile, including lights

**How to verify:** Save & Play so the new scripts load. On the PCs panel, turn **Absent** on for one player who is sitting at the table. Their whole pile should drop under the table and disappear, the same way an unused NPC seat does. Turn **Absent** off. That player should come back with the full pile at table height — figurine, character sheet, bags, chair, hand zone, **and seat lights** — not just the figurine. Lights should behave like a normal in-session seat. A sheet page that was already hidden should stay hidden; the page that was showing should still be showing. If a signal fire or hunger smoke was on before Absent, it should still be on after they return.

**How to verify:** Save & Play so scripts reload. Put Pink’s tarot away if it is out. Confirm the deck is parked at y = −200 (invisible). Click **Consult the Tarot**. The deck should appear on the **tarot deck anchor** (same X/Z as that anchor object, height about 7.7) — not at some leftover park X/Z under the table. Put it away again: park at −200. Change table / Scatter and Consult again: still snaps to the live anchor.

**Context:** Reveal was only restoring Y ≈ 7.7 onto the parked stash X/Z. `C.ObjectPositions.TAROT_DECK_PINK.on` now uses `TAROT_DECK_ANCHOR_PINK` + height, and restore passes that resolved pose.

#### TOR-513 — Absent hand zone, PC token stash, and Apply PC reseat

**How to verify:** Save & Play so the new scripts load. Put a few cards in Red’s hand. On the PCs panel, turn **Absent** on for Red. Red’s pile should drop under the table, the **hand zone should go with it** (Y about −200), and **those cards should move under the table too** — they should not stay floating at table height. Red’s PC token on the stage control board should disappear (locked under the board, not sitting in a park strip below the chairs). Turn Absent off: pile, hand zone, cards, and the PC token should all come back to Red’s chair.

Then, without changing any NPC tokens on the stage, drag Red’s PC token onto a different empty chair snap and click **Apply**. Red’s **live pile** on the table should move to that numbered chair, not only the token on the control board.

**Context:** Absent was hiding the pile but leaving the hand zone (and often the cards) at the table, and parking the PC token on the board. Apply that only moved PC tokens also skipped seat layout because the NPC reconciler thought nothing had changed.

### Camera

#### TOR-605 — Scatter roll camera uses the raised ReferenceCameraAngles position

**How to verify:** Save & Play so scripts reload. Be in Scatter Mode. Sit as Host in a player seat whose PC is actually in a scatter group (bottom-right seat-color buttons are fine).

1. Open Debug Camera and click **roll** (the short button, not rollBrown). The look-at **Y** should match `C.ReferenceCameraAngles.roll` (about **10.84**), not ~9 units lower. Same check for **sheet** (about **5.84**) and **default** (about **18.58**). Those heights should match a wood-table seat of the same color.
2. Click that seat’s spoof button (Brown, Red, …). The Storyteller camera set should match that seat’s current Scatter cameras, including those Y values.
3. Optional: leave Scatter for a wood table (cover should still snap you to that table’s default). Come back to Scatter and click **roll** again. Y should still be about 10.84.
4. Sit back on Black. Storyteller Rolls / Main / Mid should still be the usual Black views.

**Context:** Roll was stored in game state and could keep the old angle. Occupied-seat Storyteller copies were leftover saved cameras. Scatter then applied the figurine floor-Y shift to look-at Y even though sheets stay at authored height. relatedTo **TOR-603**.

#### TOR-603 — Storyteller camera follows the occupied seat after table or scene layout

**How to verify:** Save & Play so scripts reload. Sit as Host. Use the bottom-right colored seat buttons to sit in a player seat (for example Brown). Look at that seat’s usual default table view so you know what it should be.

1. Apply a library scene that uses a **different table**, or switch tables from the Scenes panel, so the seats actually move.
2. After the cover lifts, your camera should be that seat’s **new** default for the table you landed on — not the old table’s view, and not the Storyteller Black Main/Mid/Stage views.
3. Sit back on Black with the black seat button. Apply or switch tables again. After the cover, you should get the usual Storyteller views (Main / Mid / Stage), not a leftover player-seat camera.

**Context:** Sitting in a player seat already copied that seat’s cameras onto the Storyteller. Table and scene layout were rewriting the player’s cameras and then snapping views **before** that copy was refreshed.

#### TOR-597 — Overlay camera: quick click default, hold 1s to open picker

**How to verify:** Save & Play so Global scripts and HUD XML reload. Sit as a player.

1. Quick-click the bottom-left overlay camera icon. You should snap to your usual table camera in ThirdPerson, and the picker should stay closed.
2. Click and hold that same icon for about one second. The picker should open, and your camera should not jump.
3. Right-click still goes FirstPerson toward the stage after a short settle.

**Context:** Follow-up to **TOR-538**. relatedTo **TOR-594**.

#### TOR-594 — ThirdPerson except overlay camera right-click FirstPerson

**How to verify:** Save & Play so Global scripts reload. Sit as a player character.

1. Right-click the bottom-left camera button. After about a quarter-second you should be in FirstPerson so you can look around the stage (tilt with the mouse).
2. Quick-click that same camera button. You should snap to your usual default table view in ThirdPerson (the picker stays closed).
3. Hold the camera button for about one second to open the picker, then click sheet, dice tray, or another preset. Each one should also be ThirdPerson.
4. Right-click the camera button again to go FirstPerson, then immediately click a picker preset (or quick-click the camera button). You should not stay stuck in FirstPerson.

**Context:** Overlay right-click is the only scripted FirstPerson camera. Other camera snaps were leaving players in FirstPerson because lookAt can no-op and a delayed FirstPerson switch was not cancelled. Left-click vs hold is **TOR-597**.

### Dice

#### TOR-31 — Willpower reroll dice can be picked up

**How to verify:** Save & Play so scripts reload. Start a normal player roll with a few standard dice (right-click Roll is fine). When the result is up, click **Spend Willpower**.

1. The standard dice should unlock. You should be able to pick them up and reroll up to the usual three.
2. Hunger dice should stay locked, and Rouse dice should stay locked.
3. After a die you rerolled comes to rest, that die should lock again so you cannot reroll it a second time.
4. Optional: left-click Roll (not right-click) on a fresh pool. The dice should unlock and you should be able to pick them up and throw them yourself.

**Context:** Recycled dice were put back on the table with interaction turned off. Spending Willpower only cleared the physics lock, so the dice still could not be picked up. Linear could not open a new bug issue (workspace quota). relatedTo **TOR-165** (willpower reroll wave) and **TOR-287** (dice preload pool).

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._
