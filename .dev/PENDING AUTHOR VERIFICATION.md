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

_Last populated: 2026-09-21 — TOR-590 unified hand-zone mover._

### Phases / session start

#### TOR-578 — Phases Advance click-again-to-confirm

**How to verify:** Save & Play so the Phases panel XML reloads. Open the Phases tab.

1. Click **Advance →** once. Red text **Click Again to Confirm** should appear immediately to the right of the button. The phase should not change.
2. Click **Advance →** again within about five seconds. The hint should disappear and the phase should advance.
3. Click **Advance →** once more, then wait five seconds without a second click. The red hint should go away by itself. Closing the Phases panel should also clear it.

#### TOR-580 — End→Intermission waits until the cover is down

**How to verify:** Save & Play. Advance through Play and Spotlight to End, then click **Advance →** (second click to confirm) to go to Intermission.

1. The session-end splash should slide down fully before the table, skybox, or lights jump.
2. The splash art should still be the session that just ended, not the next session number.

#### TOR-581 — Rain emitter hidden off Play

**How to verify:** Save & Play. Note the rain particle object on the table during Play (with rain weather if you have a rainy scene).

1. In Play it should sit on the table origin and play rain when weather calls for it.
2. Advance to Spotlight, End, or Intermission: it should be parked under the table (not sitting in the playfield).
3. If you Apply a Scatter scene during Play, Scatter should still hide it; leaving Scatter while still in Play should bring it back.

#### TOR-527 — Main and Downtime follow the live scene

**How to verify:** Save & Play. Start from Intermission with no scene on the table.

1. Advance to Play. The overlay should show a date and the word **DOWNTIME** (no district/site text). Changing the Scenes clock should not change chronicle present-day.
2. Apply a library scene. The Play subphase should switch to Main and the overlay should show location and normal time.
3. End the scene. You should be back in Downtime.
4. Click **Main** or **Downtime** when already on the correct one: nothing should change. Click the “wrong” one: it should snap to the correct one for whether a scene is live.
5. If you enter Memoriam from a live scene, then click **Main**, that scene should come back. If Memoriam started with no scene, you should land in Downtime.

#### TOR-579 — Spotlight uses stand-ins, not home figurines

**How to verify:** Save & Play. Advance into Spotlight.

1. Home seat figurines should stay at the chairs. Each player should still be unable to see their own home figurine.
2. The ring should show the dedicated Spotlight stand-ins. The Host console should print a line listing those stand-in GUIDs.

#### TOR-586 — Load shows character sheet pages 1 and 2

**How to verify:** Before Save & Play, leave at least one PC sheet showing a later page (3 or 4). Save & Play.

1. Every player character sheet should be showing pages 1 and 2 above the table.
2. Later pages should be parked, not the pair you are looking at.

#### TOR-587 — Session-start cover shows black instead of splash art

**How to verify:** Save & Play so the Global HUD XML reloads. You should be in Intermission (or run `lua DEBUG.resetToIntermission()` in the Host console).

1. You should see the usual session-start splash art for the current session number — not a solid black screen.
2. Optional: leave **Quick Transition** off, click **Advance →**, and let the character splash finish. Near the end a black fade should cover the stack, then lift. After that, `lua DEBUG.resetToIntermission()` should bring the splash art back, not leave a black sheet.

**Context:** The Intermission cover is a black panel; splash art is a child that was defaulting off. The end-of-splash blackout panel Lua already showed was missing from the XML. relatedTo **TOR-567**.

#### ✅ Session-start splash timing and Intermission-theme fade

**How to verify:** Save & Play so scripts reload. Leave **Quick Transition** off. From Intermission (or Host console `lua DEBUG.resetToIntermission()`), click **Advance**.

1. The character splash should match the timing you tuned in TEST BED (including Lord Lucien’s caption sliding up from lower on the screen). The session number, then the title, should use the current session’s art.
2. The Intermission loop should still be audible, about a quarter of its volume, when the session-start track begins. It should finish fading out during the opening of that track, not cut off at the first note.
3. Near the end, a black cover should fade in, the session-start splash should go away behind it, and the black cover should fade out. The Storyteller HUD should still be the normal one — not a freshly remounted panel. Main music and the Willpower heal popup should still be able to appear after that.

**Context:** relatedTo **TOR-567**. Quick Transition still skips the session-start track. Linear create blocked if the workspace is at its issue cap; noted on **TOR-567**.

### Character sheets

#### ⚠️ Dashboard PCs tab — live sheet snapshot/apply

**How to verify:** Save & Play so the new Global functions load. Keep External Editor on, and keep the TTS Tools Cursor extension **off** (only one process can listen on the editor port).

1. Open the Storyteller Dashboard and click **PCs**. The status line under the two-page spread should say it is live from Tabletop Simulator, not a stand-in fixture. You should see all five player cards on the left and a page-1 sheet plus an empty page 2. The subtitle should read like “Eighth Generation Ancilla of Clan Malkavian ◆ Descendant of the Pythia”.
2. Select a seated player. Left-click Hunger to add a pip, right-click to remove one (no popup). Same for the XP jewel. Click Health: left-click the superficial icon to add damage, right-click to remove; fill the track then add one more and confirm a superficial box becomes aggravated. Mend should heal up to current Mending and close the menu. Humanity stain should not pile up a hidden tally while the red impaired box is showing.
3. Change Desire and leave the field — the in-game Desire should update. Optional: click **Std** on the selected card and confirm a Storyteller-initiated roll starts for that seat.

**Context:** `GlobalDashboardPcSheetSnapshot` / `Apply` in `core/dashboard_pc_sheet.ttslua`. Dashboard UI is local; this row is the TTS Lua. Track under Character Sheets epic TOR-38 until a TOR id can be filed.

**Author Comment:** The interfacing between the dashboard and TTS is causing significant performance interruption —— at least, when _sending_ intructions; it seems to be able to update itself against changes in TTS much more speedily. Regardless, can we make the transfer of data to TTS asynchronous somehow, while keeping the display of information on the dashboar

#### ✅ CSHEET blank-base page 1 overlays + dynamic page 2 disciplines

**How to verify:** First upload `dot_yellow.webp`, `dot_white.webp`, and `dot_grey.webp` into Steam Cloud `Vampire the Masquerade 5E/CSheets/Page1` if they are not there yet (Cloud currently has the box glyphs and `dot_red` only — your page‑1 objects still have yellow/white/grey from before). Then File → Load save **230** (or reload after Cloud sync) so CustomUIAssets stick, and Save & Play so scripts/XML load.

1. **Page 1:** Open a PC’s page 1. Attribute/skill dots should show gold fills for base ratings on the blank face (empty rings on the art), centered on each ring — no yellow fills over Strength/Brawl labels, no gap at the third ring on Manipulation/Subterfuge, and no stray fill up by the character name. Temp up should look white; temp down grey. Blood Potency uses large red fills. Health / Willpower / Humanity should be single images per box (white / grey slash / red X / purple stain / red impaired). Blood Surge / Mending decals should still update when Blood Potency changes.
2. **Page 2:** Flip to page 2. You should see up to six discipline blocks (name plate + empty dotline + fills + power names). If the character has rituals and/or ceremonies (e.g. Black Caesar, Rashid), the matching gold divider appears with up to two columns of rows — and the console must **not** show `resources owned by different scripts`. Dump or inspect the live XML: repeated styles should be class-only under page‑2 `<Defaults>`, and structural nodes should have `db_…` ids while fill dots keep `dot_…` / `dot_rc_…`. Page‑2 Blood Potency decals (bane severity / disc bonus / disc reroll) should still swap.
3. Optional: re-run `npm run cloud-asset-sync -- --job csheetPage1Overlays,csheetPage2Assets --yes-purge` after the three missing Page1 dots are in Cloud.

**Context:** Blank CustomImage faces (author-set); one XmlUI Image per page‑1 slot; page‑2 dynamic XmlUI; Cloud jobs `csheetPage1Overlays` / `csheetPage2Assets`. Linear issue create hit workspace quota this session — track under Character Sheets epic TOR-38 until a TOR id can be filed.

#### TOR-585 — Character sheet pages restore to y = 3.20

**How to verify:** Save & Play so scripts reload. Flip a PC sheet so a hidden page comes back on. That page should sit at y = 3.20, not 3.19.

**Context:** Catalog and layout now use y = 3.20 (`C.ObjectPositions.CSHEET_PAGE`, seat-role offsets, object-script slice).

#### TOR-582 — Hunger overlay defaults to 1

**How to verify:** Save & Play from a cold load (File → Load, then Save & Play). Each PC Hunger overlay should match Hunger 1 (one pip), not the empty Hunger-0 art, unless you already changed that character's Hunger in play.

**Context:** Missing Hunger was defaulting to 0 in bootstrap and state normalize. New or missing Hunger now defaults to 1. Saved Hunger values other than nil are unchanged.

#### TOR-588 — CSHEET page 2 discipline rows should not stretch vertically

**How to verify:** Save & Play so character-sheet XML reloads. Open a PC sheet to page 2. The two discipline rows (name plates and power lists) should stay at their usual height instead of stretching taller to fill extra space on the page.

**Context:** `page2_disc_row` Defaults now include `flexibleHeight="0"`.

#### CSHEET page 2 — discipline fill dots + power line breaks

**How to verify:** Save & Play so object scripts reload. Open a PC sheet to page 2 (Aishe is a good check).

1. Each discipline’s five-dot track should show gold fills for that discipline’s rating — not an empty ring row. Temp-up/temp-down coloring on page 1 is unrelated; here you mainly want filled vs empty from base rating.
2. Power names under each discipline should be **one line per power level**, with an eight-space indent, not a single run-on line. Same-level powers still share a line joined with ◆.

**Context:** After dynamic `setXml`, fill paint now waits one frame; power text is applied with `UI.setAttribute` so newlines survive (XML attributes flatten `\n` to spaces). Track under Character Sheets epic **TOR-38** (workspace issue quota). Commit `d1a1b253`.

### Synchronization / objects

#### ⌚ TOR-579 — Spotlight carousel must use preload stand-ins, not home seat figurines

**How to verify:** Save & Play so scripts reload.

1. Advance into **Spotlight**. On the Host camera, confirm each player's **home** figurine is still at its Table A seat (not under the table at y = −200). Visibility must match **`C.HiddenObjects`**: each home figurine is invisible **only to its own seat color** (Red cannot see the Red figurine; other players can). Do **not** hide every home figurine from every PC.
2. Confirm the carousel ring shows the separate workshop stand-ins (`SPOTLIGHT_FIGURE_*`), not the home seat objects. Home seats and carousel figures should both exist at once. Carousel **lights** should not show the cone/arrow object indicator (invisible looping effect) unless you turned **Toggle Spotlights** on in the Host debug menu.
3. Advance **Spotlight → End**. Home figurines and their seat lights should land on Table B0 seats at normal height with the same owner-only catalog visibility — not stuck at carousel poses, −200, or odd light aim. Bags / companions / compulsion decks should still be parked until Intermission.

**Context:** Inbox Immediate 2026-09-21: the carousel is still using home seat figurines. **TOR-579** is Focus #1. Do not Save & Play this row until that ships. Related to **TOR-98** (Spotlight phase).

#### Unified hide/restore — y = −200 parking protocol

**How to verify:** Save & Play so scripts reload.

1. **Absent seat bury/restore:** On the PCs panel, mark one player **Absent**, then Apply or sync. Their figurine, sheet pages, bags, hand zone, and other `C.HiddenObjects` catalog pieces for that seat should bury at y = −200 and be **invisible to everyone** (including Storyteller — cameras should not collide with invisible on-table geometry). Mark them **Present** again — the full pile should return at normal height, interactable, with no stale `HiddenObject` tag stuck on.
2. **Dice bags:** During Hunger-off or Spotlight/End, disabled bags should sit at y = −200, locked, non-interactable. When Hunger returns or you leave Spotlight into Intermission, bags should rise to their seat rest Y without needing a second reload.
3. **CSHEET page flip:** Flip through every page for one seat. Off pages should be invisible under the table (not just parked at y = −200). Bring a hidden page back on — it should sit at normal height and be visible to the right seats, not stuck invisible from an old hide.
4. **Signal fire / hunger smoke:** Toggle off/on from the signal candle or hunger control. Objects should park at −200 when off and animate back when on; Black should still see them when parked.
5. **Gameboard markers:** On the control board, switch active table so an inactive table chip hides — it should stash at −200 with the `HiddenObject` tag. Switch back — the chip should reappear on the minimap at the correct UV, not stay buried.
6. **Spotlight:** Enter Spotlight phase. Playfield toys (bags, companion figurines, compulsion decks) should stay parked at y = −200; carousel stand-ins not on the ring should park at the side grid. PC **home** figurines must **stay at their seat positions** (not bury at −200) with **`C.HiddenObjects` visibility** (invisible only to the owning seat color). Stand-ins on the carousel ring should be the dedicated `SPOTLIGHT_FIGURE_*` copies, visible and separate from the home seats. Leave Spotlight into End — home figurines keep catalog visibility and Table B0 seating; bags/companions/decks stay parked until Intermission.
7. **Preload pools on load:** After Save & Play, look under the table (or fly Host camera down). Preload NPC figurines, their paired lights, and warmed dice under bags should be **invisible to everyone** (not just PCs), locked, and non-interactable — even though they were already saved at y = −200. Console should **not** spam `[O.hideObject] Refusing to snapshot parked Y`. Roll dice from a bag once — claimed dice should become visible on the tray; when the roll finishes and dice return to the pool, they should hide again.

**Context:** New central API in `core/objects.ttslua` (`O.hideObject`, `O.restoreObject`, `gameState.hiddenObjects` snapshot). Preload NPC + dice pools migrated in follow-up. Linear issue not created this session (workspace quota).

### Scatter / table layout

#### Scatter → Table C (or any wood table) on scene Apply

**How to verify:** Save & Play so the hardening loads. This was a same-tick race (hard to force on purpose). You do **not** need to hunt for the original mess.

1. From a Scatter scene, Apply a **Table C** library scene directly (no Table A in between). After the cover, figurines, sheets, chairs, and seat lights should already match — same as when you switched A then C.
2. If anything still looks wrong, switch Table A then Table C again. That second layout is the “settled” path; the hardening is meant to make the first Apply look like that.

**Context:** Leaving Scatter could unhide chairs/lights from their Scatter snapshots after layout, and Table C could read its width before the wood table finished unparking. relatedTo **TOR-572** (Scatter Mode) and **TOR-573** (Scatter import / Standard switch).

#### Scatter figurine height uses FLOOR_Y

**How to verify:** Save & Play with `C.Tables.Scatter.FLOOR_Y` set to **-65** (or another value you choose). Enter Scatter and place NPCs on a group (or switch from a table that already has stage NPCs). Those figurines’ world **Y** should match `FLOOR_Y` (e.g. −65), not the old −52.89 floor. PC figurines on the same group should use the same height.

**Context:** Scatter placement was letting seat-offset / restore paths keep the old −52.89 Y; NPC scatter poses now force `ScatterLayout.floorY()` after unhide. relatedTo **TOR-572**.

#### Scatter enter places NPC figurines + forces lit tokens

**How to verify:** Save & Play so scripts reload.

1. On a normal table, put two or three NPCs on the stage. Leave at least one of them **unlit** (token face-down / dark). Switch to **Scatter** on the Scenes panel. Those NPC tokens should rearrange onto scatter-group holes **face-up (lit)**. Their figurines and spotlights should appear around the matching scatter positions in the world **without** clicking Apply on the control board.
2. Drop another NPC token from the palette onto a calibrated scatter group. It should park face-up (lit) on a dashed-ring hole. After Apply (or if drop already updates state), that figurine should stand lit at the group — not stay dark or face-down on the board.
3. Optional: Apply NOW once and confirm a second Apply does not shove figurines or flip tokens face-down.

**Context:** Sync was treating scatter orbit NPCs as “preload,” which pulled figurines under the table after enter; Apply worked because it placed them before a skipped Sync. Orbit lights and parked tokens are always STANDARD / face-up in Scatter. relatedTo **TOR-572** (Scatter Mode). Linear create hit workspace quota this session.

#### TOR-590 — Hand zone and cards move together

**How to verify:** Save & Play. Put a few cards in at least two hands.

1. Advance **Play → Spotlight** from Table B. The colored hand-zone boxes **and** the white fanned cards should travel together to Table A.
2. Advance **Spotlight → End** (Table B0). The boxes and the white fans should arrive together, stay fanned in the new hands, and be grabbable — cards must not stay locked in the old Spotlight/Table A fan.
3. Optional: turn **Absent** on and off for one seat. Those cards should bury under the table with that hand zone and come back with it.

**Context:** One `U.movePlayerHand` rigid-moves the Hand Zone and every card in that hand (smooth on the table, instant when parking Absent). Layout no longer locks cards. relatedTo **TOR-513** (Absent hand stash) and **TOR-572** (Scatter Mode).

#### TOR-573 — Scatter import and live Standard↔Scatter switch

**How to verify:** Save & Play so scripts reload.

1. **Import a Scatter scene from chairs:** Paste v2 JSON whose `sessionScene.tableKey` is `Scatter` (you can omit `placementMode` if the table key is Scatter). Give two PCs the same `tableSlot`, and put a stage NPC in `npcWorld.placements` with `scatterGroup` 1–6 and no `u`/`v`. Import, then Apply. The wood table should hide. Those two PCs should share one scatter group; a lone PC in a group should stand on PC slot 1 (not the gold hole used when you drop tokens during play).
2. **Live switch:** Start from a normal table scene with people in chairs and NPCs on polar packs. Click **Scatter** on the Scenes panel. The cover should run, and the Host console should **not** print `Object reference not set to an instance of an object`. Chairs should become scatter groups by chair number (7 wraps to group 1). Polar packs should fill scatter groups in CENTER, then Mid Center, and so on; a seventh occupied pack should vanish as if you hit Clear. Click **Table A**. Same rule: no Object reference error. Everyone who was still in a scatter group should return to the chairs and packs they had before Scatter. NPCs you Cleared while in Scatter should stay gone.
3. **Authored Scatter with no prior table:** Apply a Scatter library scene, then click Table A. PCs should sit Lucien 1, Rashid 2, Aishe 3, Fomorach 4, Black Caesar 5 (or shuffle if you pick a Table B size). NPCs should fill polar packs in that same family order; extra NPCs from one scatter group should take the next whole pack, and the following scatter group should skip that overflow pack.

**Context:** relatedTo **TOR-572** (in-game Scatter table) and **TOR-570** (dashboard scatter JSON). Dashboard Copy JSON can keep using `scatterPlacements`; chair-style import is the other legal paste.

#### TOR-572 — In-game Scatter Mode

**How to verify:** Save & Play so scripts reload. You will need the Scatter control-board Cloud image already uploaded (the same file the dashboard uses).

1. **Enter Scatter:** Apply a library scene whose JSON has `"placementMode": "scatter"`, or from the Host console run `lua require("lib.rotational-seat-layout").SetTableTo("Scatter")`. The control board should switch to the Scatter parchment, every wood table should vanish, and polar snap points on the board should be gone. The **Stage Control board** (and palette) should stay **hidden from all PC seats** per `C.HiddenObjects` — not visible to players after the art swap. Every PC and NPC chair, plus Red’s Prince signet and curtain, should be invisible to **everyone** (including you) and not grabbable. The floor and table plinth should stay at their normal heights but become **invisible to PC seats and White/Grey** (you as Storyteller on Black should still see them). The bottom fog emitter (`BOTTOM_FOG`) should play **Looping Effect 2** (visible fog) and must **not** jump to y = −200. The rain emitter and stage board should sit on X/Z `{0, 0}` (their heights should not change). The two main lights should sit at Z `0`.
2. **Calibrate (once per group):** Leave only three control tokens on the parchment (not on the palette). Put one on a group’s gold hole, one on the upper-left white hole, and one on the top NPC hole of that dashed ring. Host console: `lua DEBUG.calibrateScatterGroup(1)` on the **far-left** circle (then 2–6 clockwise). Turn on Snap mode — you should see a snap on gold, four whites sitting on the printed square (not a stretched diamond), and **twelve** NPC snaps on the dashed circle (round, not a tall/wide ellipse). Dropping those three tokens should print a Host message to run calibrate, not `await:timeout: maxWait exceeded (1s)`. Tokens sitting on the palette must not be counted. The wood-table miniature and table-component chips should not sit on the Scatter parchment. **Do not paste the dump into `D.SCATTER_BOARD` until those snaps sit on the printed holes.** After you paste and Save & Play again, auto-park can use that group.
3. **Drop and Apply:** Drop a PC token onto a calibrated group — it should jump to gold and sit upright. Drop a second PC onto the same group — the first should stay put. Click Apply NOW — PC figurines, cameras, sheets, and bags should move to that group’s arc; NPC tokens on the ring should spawn/move figurines facing the group origin. A second Apply with the same occupancy should not shove the first PC to a different slot. Tokens left on the palette should not be treated as on that group. **Move test:** Drag one PC’s token from group A to join a PC already at group B, then Apply — the moved PC’s figurine and pile should relocate to group B (second PC keeps gold; joiner takes the nearest free white hole). Hidden sheet pages, off signal fires, and other parked objects at y = −200 must **stay hidden/invisible** after the move — only X/Z may shift with the figurine.
4. **Leave Scatter:** Apply a normal table scene (or `SetTableTo("Table A")`). Standard board art, polar snaps, and a real table should return. Chairs and the Prince signet/curtain should be visible again (with the usual per-seat hiding). The Stage Control board should **still** be hidden from PC seats (same as before Scatter — only Storyteller sees it). The floor and table plinth should be **visible to everyone** again. `BOTTOM_FOG` should return to **Looping Effect 1** (inactive) and stay at its deep authored Y (about −350). The floor, plinth, and rain emitter should sit on that table’s origin (Table A is Z `50`). The stage board should return to about X `0`, Z `62` (same height as before Scatter). The main lights should return to that table’s light positions.
5. **Storyteller dice tray:** Put an NPC on a calibrated scatter group. Drop that NPC’s control token on a Storyteller dice bag. The tray should appear on the World Ray between that group’s PC arc and NPC arc, rotated to match that ray. Drop the same group’s token again — the first roll should clear and the same tray should run the new roll. Start rolls at three different groups, then a fourth: the oldest of the three should vanish and that tray should jump to the new group. Drop a token for an NPC who is not on the stage — the tray should sit at the world origin, un-rotated.
6. **Scatter token scale and slots:** Drop a PC token onto a group — it should land on the **gold** center hole at scale `{0.5, 1, 0.5}`, stay grabbable, and the figurine should face `PC_SCATTER_GROUP_ORIGIN`. Move the token to the palette — scale should return to `{0.2, 1, 0.2}`.
7. **Pink Tarot and signal lights in Scatter:** While still in Scatter with at least one PC placed, click Pink’s tarot button — the drawer/deck should toggle without `[TarotButton] seatLayout.currentTableKey is not ready after retries`. Click a player’s signal candle while seated as that color — the signal fire should **move** (not stay frozen at y = −200): off parks at −200 via the normal hide protocol; on rises beside that PC’s figurine at **table-top height** (about y = 7.85, same as on a normal table — not the lowered figurine floor at −53). After you turn a signal fire **on**, it should stay **locked** (not grabbable). Console should show **no** Lua error and no `[SignalCandle] Failed to toggle` line.
8. **Storyteller dice tray height:** When a scatter roll opens a tray (step 5), the tray should rise to the **same on height as at a normal table** (about y = −0.64), not the figurine floor near y = −50. When the roll finishes, it should park at y = −200.
9. **Preload pool:** Enter Scatter with NPCs still in the preload pool under the stage. Those figurines and their spotlights should stay **hidden at y = −200**, not visible under the table.
10. **Scatter cameras:** After Apply with PCs in one or more groups, each seated player’s **default** camera should look at their own scatter-group pile (not a stale Table A angle). Re-seat a PC to another group and Apply again — that player’s default view should follow the new group. If you swap into a PC seat so Storyteller copies that seat’s camera angles, those angles should match the scatter pile (same as the player would see).
11. **NPC lights in scatter groups:** Drop NPC tokens onto a calibrated group and Apply. Each NPC figurine should face **outward** (away from World Origin / the PC cluster), and its spotlight should sit with that figurine as one rigid body (STANDARD mode — not left on the old “toward World Origin” side).
12. **Hunger dice bag scale:** In Scatter, each PC’s hunger dice bag should stay at scale `{1, 1, 1}` — layout must not inflate it to `{1.35, 1.35, 1.35}`.
13. **Debug Scatter panel:** Open the Storyteller debug menu → **Debug Scatter**. Sliders should show current `C.Tables["Scatter"]` geometry values. Move a slider (nothing moves yet), then **Apply** — PCs and NPCs in scatter groups should reposition to match the new radii/arcs. **Done** closes the panel.
14. **Scatter as a table type:** Enter Scatter from the Scenes panel and via library Apply — same cover/table-change behavior as before. While already in Scatter, Host Sync / `SetTableTo("Scatter")` should refresh layout without stacking a second full enter. Leave to Table A — standard art and chairs return. Playfield origin and objectPositions come from the `C.Tables["Scatter"]` row (`centerPoint`), not a separate mode blob.
15. **Spotlight hold hotkey on Scatter board:** With Scatter active and an NPC token on a group hole (after Apply so the figurine is in the world), hold your **Spotlight NPC (hold)** Game Key and hover that token — the stage figurine should go to SPOTLIGHT for as long as you hold, same as on the normal polar board. Release or move off the token — it returns to STANDARD. Group-move hotkey is not required in Scatter.
16. **NPC hole reuse:** Drop two NPCs onto a calibrated group (they take holes 1 and 2). Drag the first NPC’s token to the palette (or another group). Drop a third NPC onto the first group — it should be allowed to use the freed hole (not jump past it as if the departed NPC still owned that slot).

**Context:** relatedTo **TOR-507** (figurine satellites) and **TOR-570** (dashboard scatter JSON). Auto-park stays silent-error until that group’s calibration dump is pasted. Scatter config lives in `C.Tables["Scatter"]` (`shape = SCATTER`); `C.Scatter` is an alias.

### Storyteller Dashboard

#### TOR-571 — Scenes tab: token crop, board size, clock/weather, chrome

**How to verify:** Restart the Storyteller Dashboard so port 8788 reloads (`npm run storyteller-dashboard:dev`, or stop and start the existing 8788 window). Maximize the Scenes tab at 1920×1080. No Save & Play is required unless you also re-test Import in TTS.

1. **Tokens:** NPC and PC portraits should sit inside the circular frames, not as full-height figurines. Drag a PC onto a chair — the drag ghost should be the small token, and dropping should land on the chair you aimed at.
2. **Board size:** The parchment board should fill most of the remaining screen under the top bar, not sit as a small island in black.
3. **Chrome:** District, Site, Skybox, Weather, Lighting, fog, Sound, and Conditions should each be their own labeled box. They may wrap as whole boxes, but should not split through the middle of the District/Site/Skybox set.
4. **Clock / weather:** Drag Time of day / Day / Month, type a Year, and pick a Weather. Uncheck Present day for a historical scene. **Copy JSON** should include `clock.year/month/day/hour/minute` and weather under `soundscapeNarrative` when weather is not None.
5. **Sites:** Open Site. District-specific sites should be in a group above General sites.
6. **Add NPCs:** Open Add NPCs…. Group tabs should show names such as Bee's Hive, not `beesHive`.

**Context:** Follow-up on **TOR-570** (Scenes tab). relatedTo **TOR-570**.

#### TOR-570 — Storyteller Dashboard Scenes tab

**How to verify:** Restart the Storyteller Dashboard (`npm run storyteller-dashboard:dev` from the repo, or restart the existing 8788 window) so it picks up the new Scenes tab. Save & Play in TTS so the new import function is loaded. Maximize the dashboard at 1920×1080 — the Scenes tab should fit without page scroll (only pop-up pickers may scroll). Disable TTS Tools and leave External Editor on before **Import in TTS**.

1. **Standard:** Leave Standard selected. Confirm the five PCs start on the chair row. Click **Add NPCs…**, pick a named NPC, drag them onto the stage (polar pack). Double-click that token — the frame should switch between lit and unlit. **Copy JSON** and confirm it includes `"placementMode": "standard"` and `npcWorld.placements`. Paste that JSON into the in-game **Import Scene** box — it should accept. **Import in TTS** from the dashboard should add/replace a library button without changing the live table.
2. **Scatter:** Click **Scatter**. Table chips should hide. Drag PCs onto a numbered center pentagon and NPCs onto an orbit ring. **Copy JSON** should include `scatterPlacements` and must **not** include `seatSlots`, `npcWorld`, or `tableKey`. Import should add a library row; the table should stay as it was.
3. **Must fail (path error, not repaired):** Standard JSON that also has `scatterPlacements`; Scatter JSON that also has `seatSlots` / `npcWorld` / `tableKey`; missing scatter area keys; `npcWorld.byArea` on schemaVersion 2; `placementMode` set to anything other than `standard` or `scatter`.
4. **Group handle (Standard only):** Put NPCs on a destination polar pack, then drag the gold group handle from another occupied pack onto it. The destination tokens should be pushed aside and land unlit; the moving pack should fill the destination.

**Context:** Catalogs come from `npm run dashboard:scene-catalogs`. relatedTo **TOR-569** (Scene Import Guide), parent **TOR-552** (tab shell).

### Memoriam

#### TOR-101 — Memoriam runtime apply (enter / exit)

**How to verify:** Save & Play so scripts and Global XML reload. Confirm Custom Assets include names like `memoriamBlindfold_rashid7` (Cloud sync job `memoriamBlindfolds`).

1. **Real period Advance:** During Play, open Phases → Memoriam, pick a PC, pick a scene panel (not Just Smoke), set assignments if you like, click Advance. The global cover should show that period’s Memoriam blindfold art. Under the cover you should land on Table B0, the subject at seat 1, overlay showing the Memoriam location string (no site/weather row), a night clock on the Memoriam date, and the chosen panel skybox. Hunger should be unchanged; Health and Willpower should be full for PCs present as themselves.
2. **Just Smoke:** Same flow but click Just Smoke then Advance. Host console should print `[Memoriam] …` and the world/subphase should **not** change.
3. **Exit restore:** Start Memoriam from an applied library scene, then click Main (or Downtime). You should return to that library scene (flushed evolving data). Start Memoriam with no live scene, then exit: Downtime + no-scene baseline.
4. **Scene Apply while Memoriam:** Apply a library scene with NOW — time should use the clock from just before Memoriam began, not wall present-day. End Scene while Memoriam should clear Memoriam and apply the usual no-scene End path.
5. **Re-select:** While already in Memoriam, open Memoriam again, pick a different period, Advance — new blindfold/world apply without dropping the original return-scene memory until you finally exit.

**Context:** Catalog `blindfoldURL` removed. PC-as-NPC sheet swap still TOR-95; LUT/sepia still TOR-321.

### Phases / session start

#### Phases Quick Transition (replaces Lerp explode)

**How to verify:** Save & Play so scripts and the Phases panel XML reload. Open **Phases**. Next to **Advance →** you should see a **Quick Transition** checkbox (not Lerp explode). It should start unchecked.

1. From Intermission (or Host console `lua DEBUG.resetToIntermission()`), leave **Quick Transition** off and click **Advance**. You should get the full splash and the session-start music after the usual lead-in, with the Intermission loop fading out until that music starts.
2. Run `lua DEBUG.resetToIntermission()` again. Check **Quick Transition**, then Advance. You should **not** hear the session-start track. The splash should run in the short `songDuration = 0` timing (character beats collapse; session number/title still play at their usual unscaled speed). The Intermission loop should cut as the splash starts. When that short sequence finishes, Main music and the Willpower heal popup should still be able to appear as usual.
3. Uncheck **Quick Transition**. The next Advance from Intermission should be the full song path again. The checkbox is a Host preference and resets if you Save & Play.

**Context:** Lerp explode path removed. Linear issue not created this session (workspace quota); noted on **TOR-559**.

#### TR_Loop fade across the session-start song lead-in (TOR-567 follow-up)

**How to verify:** Save & Play so scripts reload. Leave **Quick Transition** off on the Phases panel. Start from Intermission (cold load, or Host console `lua DEBUG.resetToIntermission()`). Click **Advance**.

1. Lights and the Storyteller HUD should still update behind the cover first, same as before. The looping Intermission theme should keep playing at full volume through that short lights settle.
2. As soon as the character splash starts, the Intermission loop should begin a slow fade. It should reach silence at the same moment the session-start music begins — not cut out when that track starts, and not finish fading well before it. The splash itself should look the same (Black Caesar, then the others, then session number and title).
3. When the song and splash finish together, the overlay should fade out, Main music should come in, and the Willpower heal popup should still be able to appear if anyone has Superficial Willpower to heal.

**Context:** Default splash only. Linear issue not created this session (workspace quota); noted on **TOR-567**.

#### TOR-567 — TEST BED session-start intro sequence on Advance

**How to verify:** Save & Play so scripts reload. Leave **Quick Transition** off on the Phases panel. Start from Intermission (cold load, or Host console `lua DEBUG.resetToIntermission()`). Click **Advance**.

1. Lights and the Storyteller HUD should still update behind the cover first, same as before. Then the character splash should play (Black Caesar slides in from the left, then the others Grow / slide, then the session number and title). The Intermission loop should fade and the session-start music should start a little while after the first character appears — not at the first frame, and not as early as the old pair-2 beat. That lead-in after clicking Advance can feel a bit longer; that is expected.
2. When the song and splash finish together, the overlay should fade out, stay gone, Main music should come in, and the Willpower heal popup should still be able to appear if anyone has Superficial Willpower to heal.

**Context:** Ported the confirmed TEST BED `runIntroSequence` into `SessionExplode.playAttribute`. relatedTo **TOR-559**. Lerp explode path later removed.

#### TOR-566 — Global blindfold: instant hide + wrong End→Intermission splash

**How to verify:** Save & Play so Global XML and scripts reload.

1. **Scene Apply lift:** Apply a library scene with District + Site. The cover should slide down, then after settle **slide up** over about two seconds (not vanish instantly).
2. **End → Intermission splash:** Advance through End into Intermission. The cover should show the **session-end** art for the session you just finished (for example session 1 → `overlay_sessionEndSplash_1`), not a random `overlay_globalBlindfold_N` tile. It should stay up until the next reload.

**Context:** End exit was incrementing `sessionNum` before the splash name was chosen; `UI.show` also reset the Image to the XML default. Hide path was snapping `active=false` / missing on-element SlideOut attrs. relatedTo **TOR-565**.

#### ⌚ TOR-565 — Session-start overlay split + all-clients global blindfold

**How to verify:** First confirm CustomUIAssets were renamed (or re-run `npm run custom-ui-assets:rename-overlays:dry-run` — it should report nothing left to rename). Reload the save from the main menu, then Save & Play so the new Global XML loads.

1. **Cold load:** You should see the session-start splash (character stack) covering everyone. There should be no separate “end” panel and no per-seat transition panel.
2. **Intermission → Play:** Advance. The session-start explode should run, then that overlay should fade out and stay gone.
3. **Scene Apply:** Apply a library scene with a District and Site. The global cover should slide down for everyone (including you on Black), show destination cards, then slide up after the settle.
4. **End → Intermission:** Advance through to End, then into Intermission. The global cover should slide down with the session-end splash and stay up until the next reload.

**Context:** Split session-start explode into `panel_overlay_session_start.xml`; new SlideIn_Top global cover for transitions and End→Intermission; retired transition/end panels; renamed CustomUIAssets. relatedTo **TOR-561**, **TOR-444**.

**Verification Failures:** Slide-up hide was instant; End→Intermission showed a random global variant instead of the session-end splash. Follow-up **TOR-566** is shipped — verify that row instead. Do not re-run this original checklist (Lerp explode / old overlay split).

#### TOR-563 — Session-start attribute-path static attrs in XML Defaults

**How to verify:** Save & Play so the Global HUD picks up the new Defaults (or Save & Play, then click Phases → **Refresh XML**). Leave **Quick Transition** off. From Intermission, click **Advance** to Play and watch the session-start splash: the character pairs should still Grow/FadeIn, the frame should FadeIn, the session number/title should Grow/FadeIn, the cover should FadeOut at the end, and the session-start music should still kick in after the authored lead-in. Then in the Host console run `lua DEBUG.resetToIntermission()` and Advance again — the second run should still look and time the same.

**Context:** Moved static `showAnimation` / `hideAnimation` / colors out of Lua into `session_splash_*` Defaults. Lua only writes song-scaled delays and durations. relatedTo **TOR-559**. Lerp explode path later removed.

### NPC / stage

#### TOR-560 — Generic NPC import (spawn, scene library, Dashboard bridge)

**How to verify:** Save & Play so Global + CONTROL_BOARD UI update. The **Import** field should sit on the control-board edge **opposite** the Apply/Clear row (not stacked above those buttons). Paste a short key list from the Storyteller Dashboard (for example `dogGuard_01,academicsProfessor_02`) and click **Import** (or press Enter in the field). A Storyteller-only name popup should open with those rows pre-filled from sheet labels — change a name if you like, then confirm. You should get face-down tokens in a spaced row on the edge **opposite** the PC seat-token row (not on top of the PCs), with tooltip nicknames matching whatever you typed in the popup, rotation `{0, 0, 180}`, and **Toggles → Snap** on so they pull onto control-board snap points. Figurines should park under the table with lights off. Apply should place them from token positions like other stage NPCs. Leaving the scene (or Clear) should destroy those generic objects; applying that library scene again should recreate them with the same display names.

Separately, restart the Storyteller Dashboard with the TTS Tools extension **disabled**. Gold highlights should appear after **Copy** or **Spawn in TTS**. **Clear Generics** should clear gold only. With the extension enabled again, **Spawn in TTS** and Lua **Run** should grey out and explain that port 39998 is busy.

**Context:** Runtime spawn exception to the named-NPC preload pool. Seating / PC-as-NPC / Memoriam generics are still out of scope. Post-ship polish: import UI edge, spawn row flip/spacing, nickname after reload, fixed rotation, Snap toggle on at spawn. Generics park in the next free under-table bay (named NPCs keep their sorted stable slots).

### Tooling / assets

#### TOR-564 — Memoriam panel art from Steam Cloud

**How to verify:** Finish uploading the Memoriam panel images to Cloud Manager (`Vampire the Masquerade 5E/Memoriam`, named like `blackCaesar37_a.jpg`). With Steam running, run `npm run cloud-asset-sync:catalog` from the repo root — it should report a `memoriamPanels` job with every file kept and none skipped, then write `lib/cloud_catalog.ttslua`. Save & Play. In the Host console, look for one line starting `[constants] Memoriam panel art:` — it should say how many panels were linked from Cloud, how many catalog panels still have no art, and (only if something is misnamed) list Cloud files that match no period. Then run `lua print(C.resolveMemoriamPanelURL("blackCaesar37", "panelA"))` — you should see a `steamusercontent` URL, not an error. Optionally `lua log(C.getMemoriamPanelsWithoutArt())` lists any panels still waiting for art; when the upload is complete that list should be empty. When I regenerated the catalog mid-upload, the 27 missing panels were all Rashid periods.

**Context:** Cloud is the source of truth for `C.MemoriamSkyboxes[key].panelA–D.url`. The sheet no longer emits panel or NPC image URLs (**TOR-577**). The Memoriam apply path (**TOR-101**) should call `C.resolveMemoriamPanelURL(skyboxKey, panelKey)`, which errors loudly when art is missing. The Memoriam popup itself does not read the URLs yet.

#### TOR-574 — Cloud sync skips missing folders; Memoriam NPC keys keep `mem_`

**How to verify:** Run **BUILD PIPELINE (Full)** (or `npm run cloud-asset-sync -- --yes-purge`) while the Memoriam NPC Cloud folders are still empty or missing. The build should finish. You should see `SKIP: no matching Cloud files` for the three Memoriam NPC jobs, not a failed build. Save & Play. In the Host console, `lua print(C.cloudCatalogURL(Cloud.MemoriamNpcFigurines, "mem_maximillianSteele"))` should print an empty line (no error). After you upload `mem_maximillianSteele.webp` plus `tokenFront_mem_maximillianSteele.webp` / `tokenBack_mem_maximillianSteele.webp` and re-run `npm run cloud-asset-sync:catalog`, that same print should show a steamusercontent URL, and a sheet NPC whose Key is `mem_maximillianSteele` should pick up the matching figurine and token URLs.

**Context:** relatedTo **TOR-564** (Memoriam panel art). Missing Cloud art is an empty URL, not a build abort. Token Cloud keys are `tokenFront_mem_<stem>` / `tokenBack_mem_<stem>` when the NPC Key is `mem_<stem>` (see **TOR-576**).

#### TOR-575 — Memoriam figurine shared back from `mem_BACK.webp`

**How to verify:** Put `mem_BACK.webp` in Steam Cloud `NPC Cutouts/Memoriam/Figurines` (same folder as the character fronts). With Steam running, run `npm run cloud-asset-sync:catalog` from the repo root — the `memoriamNpcFigurines` job should keep `mem_BACK.webp` as catalog key `mem_BACK`. Save & Play. In the Host console, `lua print(C.cloudCatalogURL(Cloud.MemoriamNpcFigurines, "mem_BACK"))` should show a steamusercontent URL. Then pick any real Memoriam NPC on a period (for example Lucien 19’s first filled slot) and print `figurine.back` — it should be that same URL, not that NPC’s front. There should be no Memoriam character named BACK; `mem_BACK` is only the reverse image.

**Context:** Same idea as generic `Back_00.webp`. relatedTo **TOR-574** (Memoriam NPC Cloud keys). If the file is not uploaded yet, that print should be an empty line, not an error.

#### TOR-576 — Memoriam token Cloud keys `tokenFront_mem_` / `tokenBack_mem_`

**How to verify:** Upload token files named like `tokenFront_mem_maximillianSteele.webp` and `tokenBack_mem_maximillianSteele.webp` (not `mem_tokenFront_…`). Run `npm run cloud-asset-sync:catalog`, then Save & Play. In the Host console, `lua print(C.cloudCatalogURL(Cloud.MemoriamNpcTokenFronts, "tokenFront_mem_maximillianSteele"))` should show a steamusercontent URL. A sheet NPC whose Key is `mem_maximillianSteele` should pick up that token front (and the matching `tokenBack_mem_` back).

**Context:** Matches generic/other NPC token filenames. relatedTo **TOR-574**.

#### TOR-577 — Memoriam sheet import drops panel/NPC URL columns

**How to verify:** Open `lib/skyboxes_catalog.ttslua` and jump to `MemoriamSkyboxes`. Period rows should have panel display/weather/audio, but **no** `url =` on panels and **no** `tokenURL` / `figurineURL` on NPC slots. Scene skyboxes above that (`SkyboxesCatalog.Skyboxes`) should still have their URLs — those still come from the sheet. Save & Play. In the Host console, `lua print(C.resolveMemoriamPanelURL("lucien19", "panelA"))` should still show a steamusercontent URL if that Cloud file is uploaded (Constants fills `panel.url` from Cloud at load). You should not see `#REF!` as a panel URL.

**Context:** relatedTo **TOR-564** (Memoriam panel art from Cloud). The Google Sheet is no longer a source of Memoriam image URLs.

#### TOR-529 — Memoriam catalog NPCs: `name`, `fullName`, `figurineScale`

**How to verify:** Confirm the Memoriam sheet has `NPC 1 Key`, `NPC 1 Label`, and (optional) `NPC 1 Scale` columns through NPC 10, then run `npm run skyboxes:import` (or **BUILD PIPELINE (Full)**). Open `lib/skyboxes_catalog.ttslua` and jump to a period that has people — for example Lucien 2. Each filled NPC slot should look like `name`, `fullName`, and `figurineScale` (53 unless that row has a Scale number). Empty slots should still have those three fields, with blank name/fullName and scale 53. There should be no `label =` on those slots. Save & Play. Open Phases → Memoriam and pick that period: the NPC picker should show the `fullName` text, not a blank.

**Context:** Sheet Key/Label/Scale → catalog fields that match `lib/npcs_data.ttslua`. Cloud still fills image URLs from `npc.name` at load. Follow-up on **TOR-577** (dropped URL fields). Linear could not create a new issue this session (workspace issue cap).

#### TOR-558 — Cloud asset sync (CustomUIAssets + Cloud catalog)

**How to verify:** With Steam running and logged into the chronicle account, run `npm run cloud-asset-sync:dry-run` from the repo root. You should see the `siteCards` job keep ~170 Sites images and list any stale `siteCard_*` names, plus a `LuaCatalog` plan for `Cloud.Sites`. Then either run `npm run cloud-asset-sync` in a normal terminal (answer **y** if it asks about removing stale names) or run **BUILD PIPELINE (Full)** / `npm run build:full` (that path auto-accepts purges). Reload save **230** in Tabletop Simulator. Site card art should still resolve; after a catalog write, `print(Cloud.Sites and Cloud.Sites.AnarchBar and Cloud.Sites.AnarchBar.URL)` in the TTS console should show a hosted URL.

**Context:** Cloud sync in Full build / `cloud-asset-sync` covers configured jobs. The VS Code **Assets 1 / 2 / 3** tasks stay for ad-hoc Cloud folders that are not in that job list. Main and XML builds do not run Cloud sync.

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

**How to verify:** Save & Play so scripts reload. Put Pink’s tarot away if it is out. Confirm the deck is parked at y = −200 (invisible). Click **Consult the Tarot**. The deck should appear on the **tarot deck anchor** (same X/Z as that anchor object, height about 7.7) — not at some leftover park X/Z under the table. Put it away again: park at −200. Change table / Scatter and Consult again: still snaps to the live anchor.

**Context:** Reveal was only restoring Y ≈ 7.7 onto the parked stash X/Z. `C.ObjectPositions.TAROT_DECK_PINK.on` now uses `TAROT_DECK_ANCHOR_PINK` + height, and restore passes that resolved pose.

#### TOR-513 — Absent hand zone, PC token stash, and Apply PC reseat

**How to verify:** Save & Play so the new scripts load. Put a few cards in Red’s hand. On the PCs panel, turn **Absent** on for Red. Red’s pile should drop under the table, the **hand zone should go with it** (Y about −200), and **those cards should move under the table too** — they should not stay floating at table height. Red’s PC token on the stage control board should disappear (locked under the board, not sitting in a park strip below the chairs). Turn Absent off: pile, hand zone, cards, and the PC token should all come back to Red’s chair.

Then, without changing any NPC tokens on the stage, drag Red’s PC token onto a different empty chair snap and click **Apply**. Red’s **live pile** on the table should move to that numbered chair, not only the token on the control board.

**Context:** Absent was hiding the pile but leaving the hand zone (and often the cards) at the table, and parking the PC token on the board. Apply that only moved PC tokens also skipped seat layout because the NPC reconciler thought nothing had changed.

#### TOR-537 — Randomize Table B seating on cover transition

**How to verify:** Save & Play so the new scripts load. Seat a mix of player characters and NPCs at the table, and mark one player **Absent** on the PCs panel. Apply a library scene that uses Table B, or click **Table B** on the Scenes panel so the cover comes down. When the cover lifts, the people who were sitting should be in a new random order, with no empty chairs in the middle of the ring. The physical table should match how many people are actually sitting (the small five-chair table if five or fewer). On the stage control board, the chair-row tokens should match that new order. The Absent player’s token should stay hidden under the board, not sitting on a chair. Click **Apply** on the control board without a cover: seats should stay where you put the tokens, not reshuffle.

**Context:** Table B is the round “everyone sits in a packed ring” family. Cover transitions shuffle PCs and NPCs together; Absent players do not take a chair.

#### TOR-538 — Overlay camera left-click default + right-click stage cycle

**How to verify:** Save & Play so the new scripts load. Sit as a player with NPCs on the stage (at least two different polar areas, e.g. Center and Mid Left). Left-click the overlay camera button: the picker should open **and** your view should snap to that seat’s usual default table camera. Right-click again after Apply on the control board: the area cycle should restart from the first occupied polar area. Further right-clicks should advance Center → Center Left → … → Far Right, skipping empty areas, then loop. Clear the stage and right-click: elevated default framing with no NPC yaw retarget.

**Context:** Cycle / Apply-reset behavior from the original overlay camera work. Aim math is covered by **TOR-562** below.

#### TOR-562 — Overlay camera right-click: horizon yaw (keep default distance)

**How to verify:** Save & Play so Global scripts reload. Sit as a player with at least one NPC on the stage. Look around so you are not already on default, then right-click the overlay camera icon. Your view should stay on that seat’s usual default focus in the XZ plane (same `distance` as default), with the look-at point raised, pitch flat on the horizon, and yaw turned **toward** the lead figurine (not 180° the other way). After about a quarter-second you should be in FirstPerson so you can tilt up yourself if you need to. Right-click again to confirm the next occupied area gets a new yaw while the focus XZ / distance still feel like a turn, not a teleport.

**Context:** Replaces the old pitch-up face-look path. TTS cannot script a pitch above the horizon; players finish the look in FirstPerson. Yaw uses the heading as-is (the previous `180 − heading` flip was backwards in-game).

---

### Medium — overlay / HUD / Spotlight

#### Scene apply — locked weather HUD no longer crashes

**How to verify:** Save & Play so scripts reload. In the Scenes library, Apply **Scarlett & the Boys Concert** (or any imported scene whose JSON sets `soundscapeNarrative` wind, rain, and thunderstorm together). The Host console must **not** print `ChronicleWeather.applyHudAudioOverrides: missing … soundscape during manual weather hold`. The scene transition should finish. Ravenwing is indoor, so the weather panel in the top-right overlay may stay hidden — that is expected. Light rain and medium wind should still be the locked audio for that scene.

**Context:** The weather triple in the import JSON is valid. It locks chronicle weather, and the overlay then reads live rain/wind from soundscape. The lookup used a nested `gameState` key that never exists. Linear issue create hit workspace quota this session — track under Scenes epic TOR-33 until a TOR id can be filed.

#### TOR-517 — Hide humidity on the weather overlay

**How to verify:** Save & Play. During a live outdoor scene, the weather panel should still show the weather words, wind, and temperatures. Humidity text (damp / dry / etc.) should no longer appear next to them.

**Context:** Humidity is still stored in the chronicle weather codes; it is just not shown on the overlay.

#### TOR-583 — PCs panel: drop color/nickname row and shrink tracker fonts

**How to verify:** Save & Play. Open the Storyteller PCs panel. Each block should start with the character's full name (no Brown · nickname line). HP, WP, Humanity, and Hunger trackers should fit inside their rows without clipping.

**Context:** Follow-up to **TOR-518** (PCs panel vertical trim). Track fonts are 18; Hunger dots are 16.

#### TOR-518 — Tighten PCs panel vertical spacing

**How to verify:** Save & Play. Open the Storyteller PCs panel at full size. Seat names, Desire, track glyphs, and button labels should keep the same font sizes as before. Rows and buttons should sit tighter vertically (less padding, shorter row heights). You should still be able to read the health / willpower / humanity glyph rows without clipping.

**Context:** The first trim still left too much vertical space. Row containers and children now have explicit preferred/min heights; button rows are shorter than the glyph rows.

#### TOR-561 — Separate session-start and session-end global blindfolds

**How to verify:** Save & Play so the new Global XML and scripts load. Confirm CustomUIAssets include `overlay_blindfold_session_<N>` and `overlay_blindfold_end_session_<N>` for your current session number.

1. **Cold load in Intermission:** From the main menu, load the save. You should see the session-start cover art for the current session number (not a blank Image). The end cover should stay hidden.
2. **Intermission session number edit:** On the Phases panel, change the session number while still in Intermission. Both cover Images should update immediately (you can use Overlay Alpha / a brief peek if needed to confirm the start cover changed). Change the number again during Play: the cover Images should **not** change until you return to Intermission or reload.
3. **End → Intermission:** Advance through Play → Spotlight → End, then Advance into Intermission. The cover that comes down should be the **end** panel (`overlay_globalBlindfold_panel_end`) with that session’s end art — not the session-start explode stack. Leave it up; do not expect the start cover to return without a reload.
4. **Reload after End:** Load from the main menu again. The start cover should be back (XML default), the end cover hidden, and both Images should match the (already incremented) session number.
5. **Optional:** `lua DEBUG.resetToIntermission()` should bring back the session-start cover (for intro re-tests), not the end cover.

**Context:** Replaces the TOR-524 approach of swapping the image on the session-start panel. Session-start explode animations left that panel hard to restore cleanly.

#### TOR-539 — Memoriam configuration popup (subphase gate)

**How to verify:** Save & Play so the new scripts load. During Play, open the Phases panel and click **Memoriam**. The Memoriam popup should appear, and the Phases label should still show the subphase you were already on (Main or Downtime). Pick a character from the dropdown. The timeline bar and scene grid should fill, and the slider should sit at the right (present day). Move the slider: the date should change, the gold bar segment should follow (black gaps stay black), and that period's scene buttons should turn green. Click a scene: the NPC assignment rows should appear **without** the character you picked. Click **+** on another character, then pick a listed NPC or type a library key and OK. Click **Advance** with the slider in a black gap, or with no scene chosen: the popup should stay open and you should get a Host message. Fill those in and click **Advance**: the Host console should print a one-line summary, the popup should close, and Phases should show Memoriam. Click **Memoriam** again, fill partway, then **Cancel**: the popup should close and the subphase should stay Memoriam.

**Context:** The popup is the gate for entering Memoriam. Skybox, LUT, and overlay still wait on TOR-101. NPC names in the catalog are often still blank, so the picker list can be empty.

#### TOR-540 — Memoriam popup: reverse bar, nested periods, Just Smoke, location

**How to verify:** Save & Play so the new scripts load. During Play, open the Phases panel and click **Memoriam**, then pick **Fomórach**. The date and the location line under it should update as you move the slider; the location should match the gold period (for example Toronto, Kharkiv, or Jaffa) and go blank in a black gap. The gold bar should sit on the same side of the strip as the slider handle (present toward the left, matching the right-to-left slider). The long Toronto years should split around Kharkiv and Jaffa, and sliding onto any Toronto chunk should gold **all** of Toronto's chunks together. Click a scene button that is not green: the slider should jump into that period (not into a nested hole), that column should highlight, and the location should match. Move the slider into a different period: the old yellow button should clear. **Just Smoke** sits centered under the grid and stays green; click it, drag through a gap, and it should stay selected. **Advance** with Just Smoke in a gap should succeed and print a Host line that includes `justSmoke` and a default panel. The slider range is now 0–2400.

**Context:** Follow-up to TOR-539 after the first in-game look. The default Just Smoke panel in Lua is a placeholder for you to fill in.

#### TOR-584 — Do not rescale player dice bags or companion toggles

**How to verify:** Save & Play. Companion toggle tiles at a PC seat should keep the size they have in the workshop save (layout must not resize them). Dice-bag sizes are the TOR-589 check below.

**Context:** Companion toggles skip layout scale. The first dice-bag pass applied `{1, 1, 1}` to every bag; that was too aggressive — see TOR-589.

#### TOR-589 — Do not change player dice bag scale during layout

**How to verify:** Save & Play. Look at a PC seat on Table A, then again after Scatter.

1. Standard (normal) and Rouse bags should be scale `{1.3, 1.3, 1.3}` — clearly larger than the Hunger bag.
2. Blood Surge (Hunger) and Oblivion-Rouse bags should stay `{1, 1, 1}`.
3. Applying a scene, switching tables, or going into Scatter should not change those sizes.

If Standard or Rouse bags are still at 1 after Save & Play, the earlier TOR-584 pass already wrote that into the save. Set those two bag types to 1.3 once on the table, then Save. After that, layout will leave them alone.

**Context:** Layout no longer calls `setScale` on `DICEBAG_*` roles, and those offset rows no longer include a `scale` field. Bags keep the size authored in the save.

### Dice

#### TOR-591 — Blood Surge dice should not pile on the Standard bag every second add

**How to verify:** Save & Play so scripts reload. Sit a PC at a table and start a Standard (or Discipline) roll for that seat.

1. Left-click that seat's Hunger bag to turn Blood Surge **on**. The Blood Surge Rouse die and the bonus dice should fan out on their rings around the Standard (normal) bag.
2. Right-click the Hunger bag to turn Blood Surge **off**. Those dice should all leave the table — including the Rouse die. Nothing should stay hovering over the Standard bag.
3. Repeat on/off at least four times. Every add should fan correctly. Every remove should clear every Blood Surge die.

**Context:** Recycled preload-pool dice were restoring to their last tray pose, then a hover move to the Standard bag won over the arc layout. Claim now unhides at the staging pose; the bag does the one move into the ring.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._
