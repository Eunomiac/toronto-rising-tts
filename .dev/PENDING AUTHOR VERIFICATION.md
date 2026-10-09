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

_Last populated: 2026-10-08 — /tr-inbox cleared eight author-confirmed rows: TOR-666 (Trace Sync nested costs), TOR-638 (Willpower reroll restores bumped dice), TOR-639 (Normal bag hidden during Rouse), TOR-664 (hunger smoke crash), TOR-665 (Willpower reroll highlights), TOR-673 (blue glow brightens under the cursor), TOR-526 (quick Rouse result readable for a second), TOR-640 (seat-role offset dump). Follow-ups shipped in the same pass: TOR-674 (left-click Rouse results use the short broadcast) and TOR-663 (Refresh XML no longer shows The Court to everyone). Sync speed-up rows TOR-667–672 and seat-announcer rows TOR-677 / TOR-678 / TOR-676 still need your first pass (or the remaining eye checks noted on each row). TOR-439 stays ⏰ until you can gather join testers._

### High — session / join / first-load

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

### High — sync speed-ups (one test session covers all seven)

**Context:** These six remaining rows are one plan: make the slowest sync calls cheaper (TOR-666, the nested Trace Sync lines, is already confirmed). Test them together. Turn on **Trace Sync** (Debug panel button, yellow when on) before you load, then capture the same three traces as before (a full load from the main menu, one NPC Apply on the Gameboard, and one Storyteller hunger change) into `.dev/Performance Audits/Trace Sync/`, so the agent can compare them with the old ones. The rows below list what should still *work*; the traces show whether it got faster.

#### TOR-667 — Seat layout, NPC and control-board syncs stop scanning the whole table

**How to verify:** Save & Play and change tables once. Chairs, NPC seat objects and each PC's selected Compulsion card should end up in the right places, the same as before. Then pick up an NPC token from the palette and drop it beside one of its family members on the board: the family should still spread around it as before.

**Trace check (2026-10-08):** Your traces confirm the anchor spread still works ("placed 4 token(s) for group fiveKeys") and that the seat layout's own time fell from about 1.2 s to 0.2 s, with Compulsion cards now 8 ms. Still to check by eye: change tables once and confirm chairs, NPC seat objects and Compulsion cards land in the right places.

#### TOR-668 — NPC Apply no longer forces a full seat layout when no seat changed

**How to verify:** On the Gameboard, drop an NPC token onto a seat snap and click Apply: the NPC should be seated at the table (this is the old TOR-210 check). Then move that NPC onto the stage and Apply: its home chair and seat light should behave as before while it is on stage. Finally, Apply with only stage changes (no seat moves): seats, lights and overlays should not change, and the trace should show `NPCS.commitNpcSeatLayout` as `skipped`.

**Trace check (2026-10-08):** Your stage-only Apply showed `commitNpcSeatLayout skipped` and dropped from 2.7 s to 0.9 s. Still to check: an Apply that seats an NPC from a seat snap (it should still be seated), and an NPC moved from its seat to the stage keeping its home chair and light.

#### TOR-669 — Syncs that change nothing are now actually cheap

**How to verify:** Do two NPC Applies in a row without changing anything in between. Both should leave the table exactly as it was: no NPC figurines or lights blinking, and none of the preload NPCs or preload dice bags appearing on the table. Also enter and leave Scatter once: hidden preload NPCs should stay hidden.

**Trace check (2026-10-08):** On load, 82 of the 90 preload NPCs took the new fast path (about 2 ms each instead of 13 ms), and the preload dice bags were not re-parked (0 ms). The traces don't include two back-to-back Applies or a Scatter round trip, so those checks are still open.

**Context:** A separate bug turned up while working on this: parked control-board markers creep further along the table on every full board mirror. It is filed as TOR-675 and not fixed yet.

#### TOR-670 — Startup skips a few redundant passes

**How to verify:** Load a save that is in Intermission: the table should come up dark with the Intermission theme playing. Load a save that is in Play: seat lights, overlays and occupied seats should look right once the cover lifts. On load, every player's dice drawer should be closed and nobody's seat should be stuck in the bright rolling light, even if the save was made mid-roll.

**Trace check (2026-10-08):** Your Intermission load confirms all four removals: no per-seat sync during player setup (was about 0.5 s), no third full sync for the Intermission dark, no extra drawer closes (0 trays lowered instead of 5, and the 10 stray seat-light passes are gone), and seat lights applied once during bootstrap. Still to check by eye and ear: the Intermission table came up dark with the theme playing, and a Play-phase save loads with correct seat lights and closed drawers.

#### TOR-671 — Only one full sync at startup

**Context:** The plan said to wait for a fresh trace from you before this step. It was shipped anyway so the whole plan could be finished; if startup misbehaves, this change can be undone on its own without touching the others.

**How to verify:** Load a Play-phase save from the main menu. The session-start cover should stay down for the whole load and lift only once, after the table is fully laid out (no flash of a half-built table). Chairs, NPCs, seat lights, hunger bags (hidden) and the Storyteller dice drawers (home and closed) should all be correct when it lifts. If the Gameboard was in a THERE preview when you saved, it should come back in HERE mode with the board tokens matching the live table, and no errors in the console. The load trace should show one `Sync.full` (reason `onLoad_startup_gate`) instead of two.

**Trace check (2026-10-08):** Confirmed: your load ran exactly one full sync (2.4 s, down from 5.1 s across three), and it laid out the table on its own. That load was an Intermission save, where the cover stays down anyway, so the Play-phase checks above (cover lifts once, after the table is built) are still open.

#### TOR-672 — Hunger changes refresh one seat, once

**How to verify:** From the Storyteller panel (or the dashboard PC sheet), change one player's Hunger up and then down. That seat's hunger overlay and hunger smoke should update straight away each time, and the other seats should not change. In the trace, the hunger overlay should be applied once per change, not twice.

**Trace check (2026-10-08):** Confirmed: one overlay apply per change (was two), and the seat sync fell from 57 ms to 16 ms. Still to check by eye: the overlay and hunger smoke actually changed on that seat, and no other seat changed.

### High — one refresh per seat change, and the dashboard stays live (one test session covers all three)

**Context:** One plan in three parts. Every change to a PC now ends in a single "this seat changed" refresh, which updates the lights, HUD, overlays, dice bags, character sheets, the PCs panel row and the dashboard together. Each of those skips its own work when nothing it shows has changed. Restart the dashboard (`npm run dev`) so its server picks up the new live channel.

**Trace setup for all five traces below:** Trace Sync stays on across Save & Play, so make sure its button on the Debug panel is **grey (off)** while you set up each trace's Initial Conditions. Then click it **yellow (on)**, do the Trace Actions exactly as listed, click it grey again, and copy the console output into `.dev/Performance Audits/Trace Sync/Refinement Pass 3/` under the file name given for that trace. You don't need a Save & Play between traces; one Save & Play after pulling new code is enough. The steps call the test player **Pink**; any seated PC works, as long as you use the same one throughout a trace.

#### TOR-677 — One refresh per seat change; character sheets skip pages that didn't change

**How to verify:** Save & Play. Open the Storyteller PCs panel and use each of its buttons on one player (Health and Willpower damage, Humanity stain and base, Hunger, Frenzy, Blind, Desire clear, Torpor clear): the row and that player's character sheet should both update each time. Then, from that player's seat, make rolls that cause a Rouse stain, a Remorse check, a failed Frenzy, and a Spend Willpower reroll: the sheet (and the PCs row, if the panel is open) should follow every one. Move a project stake on a Background or Merit: page 3 of the sheet should now show the change (it never did before). Change the session number on the Phases panel: page 6 (Experience Log) should follow it. Exit Memoriam once, and have a player disconnect and reconnect: the PCs row should show it. The two traces below check that each change refreshes only the sheet pages it affects.

**Trace 1 — Hunger and Health from the PCs panel** (save as `TOR-677 Trace 1.txt`)

* **Initial Conditions:** Save & Play into a Play-phase save. Pink is seated, has Hunger between 1 and 4, and has at least one empty Health box. No roll is in progress. Open the Storyteller **PCs** panel. As a warm-up (so the sheet has a starting point to compare against), click Pink's **Hg ▲**, then Pink's Hunger **Apply**, then **Hg ▼**, then Hunger **Apply** again. Pink's Hunger should be back where it started.
* **Trace Actions:**
  1. On Pink's row, click **Hg ▲** once, then the Hunger **Apply** button.
  2. Click **Hg ▼** once, then the Hunger **Apply** button.
  3. On Pink's **HP** row, click the **superficial ▲** (the second ▲ on that row, beside the plain `+0`) once, then the HP **Apply** button (the last button on the HP row).
  4. Click the HP **superficial ▼** once, then the HP **Apply** button.

  Steps 1–2 should show `PCST.refreshCharacterSheetsForColor skipped … pages=none` (Hunger isn't printed on the sheet pages). Steps 3–4 should list `pages=1,2` and `PCST.refreshRow ran`, with no `HO.syncAll` anywhere.

**Trace 2 — a trait edit from the dashboard** (save as `TOR-677 Trace 2.txt`)

* **Initial Conditions:** Save & Play, with the dashboard running and its **PCs** tab showing Pink on pages **III · IV**. Pink has at least one Merit or Background. The in-game Storyteller panels can be open or closed.
* **Trace Actions:**
  1. On dashboard page III, click the dots beside the name of Pink's first Merit (or Background) to open the ring menu.
  2. **Left-click Temp** once (adds a temporary dot).
  3. **Right-click Temp** once (removes it again).
  4. Click empty space on the page to close the ring.

  Each of steps 2 and 3 should show one `Sync.player` block whose `PCST.refreshCharacterSheetsForColor` line lists `pages=3` only.

**Trace check (2026-10-08, Refinement Pass 2):** Trace 1 passed as written: Hunger changes refreshed no sheet pages, Health changes refreshed pages 1 and 2 only, the PCs row repainted, and no all-seat overlay pass ran. Trace 2 refreshed pages 1, 2 **and** 3, because the page 1–2 check also looked at the Merit, Background and Flaw lists that only page 3 draws. That is fixed now; please re-run **Trace 2 only**.

#### TOR-678 — Backup Storyteller panels only refresh while they're open

**How to verify:** Save & Play. Open each panel in turn (PCs, Scenes, Stats, Projects): each should show current values the moment it opens. Make a change while a panel is open: it should update live as before. Close the whole Storyteller toolbar with its hotkey, change something, then bring the toolbar back with the hotkey: the open panel should show the change straight away. Clicking a panel's own tab to close it should not cause a flicker or error. The Scenes panel clock should still be right after it was closed while the clock moved. The two traces below check that closed panels do no work.

**Trace 1 — everything closed** (save as `TOR-678 Trace 1.txt`)

* **Initial Conditions:** Save & Play into a Play-phase save. Close every Storyteller toolbar panel: if any tab is lit, click it again so the toolbar collapses. Open the **Debug panel** (its hotkey), which is separate from the toolbar. The dashboard is running with its **PCs** tab showing Pink on pages **I · II**.
* **Trace Actions:**
  1. On dashboard page I, click Pink's **Health** tracker (bottom of the page) to open the ring menu, and **left-click Superficial** once.
  2. **Right-click Superficial** once, then click empty space to close the ring.
  3. On the Debug panel, click **Sync All (force)** and wait about five seconds for it to finish.

  Steps 1–2 should show `PCST.refreshRow skipped reason=hidden`. Step 3 should show the PCs, Scenes, Stats and Projects refreshes (`PCST.refreshAllRows`, `StorytellerScenesPanel.refresh`, `ST.refresh`, `PJP.refresh`) as `skipped reason=hidden`.

**Trace 2 — toolbar hotkey and closing a tab** (save as `TOR-678 Trace 2.txt`)

* **Initial Conditions:** Save & Play. Open the Storyteller **PCs** panel and leave it open. The **Storyteller toolbar (toggle)** hotkey is bound in Options → Game Keys. Open the Debug panel. The dashboard **PCs** tab shows Pink on pages **I · II**.
* **Trace Actions:**
  1. Press the **Storyteller toolbar (toggle)** hotkey. The toolbar disappears.
  2. On dashboard page I, click Pink's **Health** tracker (bottom of the page), **left-click Superficial** once, then click empty space to close the ring.
  3. Press the hotkey again. The toolbar comes back, and Pink's PCs row should already show the new damage.
  4. On dashboard page I, open the Health ring again and **right-click Superficial** once, then close the ring. The PCs row should update live.
  5. Click the lit **PCs** tab on the toolbar to close the panel.

  Step 2 should show `PCST.refreshRow skipped reason=hidden`. Step 3 should show `PCST.refreshAllRows ran`. Step 4 should show `PCST.refreshRow ran`. Step 5 should show no `PCST.refreshAllRows` after the close.

**Trace check (2026-10-08, Refinement Pass 2):** Trace 1 passed: dashboard damage skipped the closed PCs row, and Sync All skipped all four closed panels. Trace 2 showed the open/close logic backwards. TTS reports a panel's old open/closed state until the next frame, so the hotkey refreshed the panel when hiding it and not when showing it, and closing a tab queued a refresh. The same bug meant **opening a panel by its tab did not repaint it**. All of these now read the state before toggling. Please re-run **Trace 2**, and also open each panel by its tab once to confirm it shows current values. (Trace 2 had no entry for step 4, the second dashboard change; if you skipped it, that's fine.)

#### TOR-676 — TTS pushes seat changes to the dashboard

**How to verify:** Start the dashboard and Save & Play, then open the dashboard's PCs tab. In TTS, change a player in ways the dashboard didn't cause: damage from the in-game PCs panel, a Rouse stain from a roll, a roll started from the character sheet, typing a new Desire on the sheet (it updates when you finish editing). The dashboard tab should update within about a second without you pressing anything. Edit a project in TTS: the dashboard's page 5 should refresh. Reload the save in TTS: the dashboard should refresh once on its own. Last, close the dashboard server and play for a few minutes: TTS should not stutter while nothing is listening. The trace below checks that a push goes out only when the seat actually changed.

**Trace 1 — pushes from in-game changes** (save as `TOR-676 Trace 1.txt`)

* **Initial Conditions:** Restart the dashboard (`npm run dev`), then Save & Play into a Play-phase save. Open the dashboard's **PCs** tab on Pink, pages **I · II**. In TTS, open the Storyteller **PCs** panel. Pink has at least one empty Health box. Do the same warm-up as TOR-677 Trace 1 (Hunger up, Apply, down, Apply).
* **Trace Actions:**
  1. On Pink's PCs row in TTS, click the HP **superficial ▲** once, then the HP **Apply** button. The dashboard should show the new damage within about a second.
  2. With both HP buffers back at `+0`, click the HP **Apply** button again. Nothing changes.
  3. Click the HP **superficial ▼** once, then the HP **Apply** button. The dashboard should show the damage gone.
  4. On Pink's in-game character sheet, click into the **Desire** field, add the word ` TEST` at the end, then click outside the field. The dashboard should show the new Desire.
  5. Click into the Desire field again, delete ` TEST`, and click outside the field.

  Steps 1, 3, 4 and 5 should each show one `DashPush.seat … sent`. Step 2 should show `DashPush.seat … skipped` (and `pages=none`). While you type in steps 4 and 5, each keystroke should show only a small `PCST.refreshRow` line, with no `Sync.player` block; the `DashPush.seat` line appears once, when you click outside the field.

**Trace check (2026-10-08, Refinement Pass 2):** You reported the dashboard only showed PCs-panel changes after a page refresh, even though TTS logged `DashPush.seat sent`. Live tests found the cause: TTS silently drops any `sendExternalMessage` table that contains another table, and the seat data is one. Flat messages arrive fine. Seat pushes now travel as a JSON string, which a 7 KB test confirmed arrives intact. Your trace confirms the TTS side is right: real changes each sent one push, the empty Apply was skipped, and Desire typing sent one push per edit with no seat refresh per keystroke. **No trace re-run needed.** Restart the dashboard server (`npm run dev`) so it can read the new format, Save & Play, then repeat steps 1, 3 and 4 by eye. The dashboard should follow each change within about a second without a page refresh.

#### TOR-679 — TTS pushes phase, scene, clock, sound and seat changes to the dashboard

**Context:** This is plumbing only. TTS now sends five more kinds of update to the dashboard server (phase, scene, clock, soundscape, seats), but no dashboard screen shows them yet, so you check them in Trace Sync and on a plain JSON page the server provides. Changes that land close together are sent once, about a quarter of a second later, and anything that didn't actually change is not sent. The clock is not sent every minute: TTS sends the time and speed, and the dashboard will run the clock itself. TTS sends the clock again only when it jumps, pauses, changes speed, or reaches a new hour.

**How to verify:** Restart the dashboard server, then Save & Play. Do the trace below. Afterwards, open `http://127.0.0.1:8788/api/tts/cache` in any browser tab. It should list entries for `phase`, `scene`, `clock`, `soundscape` and `seats`, and they should match the table (for example, the Play subphase reads `Downtime` after the last trace step). Play normally for a few minutes with the clock running: TTS should not stutter.

**Trace 1 — world pushes** (save as `TOR-679 Trace 1.txt`)

* **Initial Conditions:** Restart the dashboard (`npm run dev`), then Save & Play into a Play-phase save in the **Main** subphase. A library scene is live on the table and its clock runs in real time. At least one NPC token is on the control board. Open the Storyteller **Scenes** panel.
* **Trace Actions:**
  1. Wait one full minute without touching anything while the clock runs.
  2. In the Scenes panel, set the clock one hour later and click **Apply clock**.
  3. On the control board, move one NPC token to a different spot on the stage, then click the board's **Apply**.
  4. Open the Storyteller **Sound** panel and drag the **Music** volume slider about halfway along, then let go.
  5. On the Storyteller **Phases** panel, switch the Play subphase to **Downtime**.

  Step 1 should show no `DashPush.world` lines (unless the clock happened to reach a new hour, which shows one `clock` and one `scene` line). Each of steps 2 to 5 should show `DashPush.world … sent` once for each kind of update that changed: `clock` in step 2, `seats` in step 3, `soundscape` in step 4 (a few lines while you drag is fine), `phase` and `clock` in step 5. Anything that did not change in that step shows `skipped` or nothing at all.

#### TOR-680 — The dashboard's new Scenes tab can drive TTS

**Context:** The dashboard's first tab is now **Scenes**, the Lab layout you designed, drawn from what TTS broadcasts. It can now also send commands back: advance the phase, turn the spotlight carousel, switch real time on or off and pick its speed, move the scene clock, set present day, change music, featured track, ambience and volumes, stop all sound, take a seated character out of the scene or bring them back, and end the scene. Each one calls the same TTS code as the in-game button. The dusk and dawn times in the clock panel and the temperature in the weather panel now come from TTS too. Two small in-game changes ride along: the in-game Scenes panel's seat toggle and real-time toggle now share their code with the dashboard, so please also click each of them once in TTS.

**How to verify:** Restart the dashboard server (`npm run dev`), then Save & Play, and sit at the Storyteller seat. Open the dashboard's **Scenes** tab. Then try each of these and watch both TTS and the dashboard:

1. **Sound:** drag the Music slider. TTS's music volume should follow, and the slider should not jump back while you drag. Pick **Combat** in the music list; the music should change and the list should stay on Combat. Then pick **Casa Loma** (under Location in the same list); TTS should switch to the Casa Loma site music and the list should stay on Casa Loma. Pick a featured track and press ▶, then ■. Click the Ambient button and choose another loop.
2. **Clock:** click the small clock button at the top right of the clock panel. Real time should start in TTS at 2×. Right-click it and pick 5×. Click it again to stop. Then drag the moon to another time tonight and press the ▶ that appears: the TTS clock should animate to that time and the dashboard should follow. The dusk and dawn times in the bottom corners should look right for the date.
3. **Seats:** right-click a seated PC on the stage drawing. That PC should go dark in TTS (out of the scene) and look absent on the dashboard. Right-click again to bring them back.
4. **Phase:** during Intermission, change the session number or title in the phase bar and press Enter; TTS's session number and title (in-game panel and overlay) should change to match. Then click the Advance button twice. TTS should move to Play. In the Spotlight phase, click › and then a headshot; the TTS spotlight carousel should turn each time.
5. **Switching live scenes:** play one library scene from the in-game panel, then another. Both titles should appear in the dashboard's phase bar (the first as a button). Click the first one's button: a ring of clock choices should open around the click. Pick **Scene Time**; TTS should switch the table back to it with its own scene time. Switch again and pick **NOW**; the scene should open on present day. Click **End Scene** twice: the scene should end in TTS and leave the dashboard's list.
6. **In TTS itself:** open the Storyteller Scenes panel, click a seat's presence toggle and the real-time clock toggle once each. Both should work as before.

If something fails, the dashboard shows TTS's message in the right-hand column with an **OK** button.

### High — dice and rolls

#### TOR-674 — Rouse checks open without waiting, and the result is as short as a quick Rouse

**Context:** A Rouse check has nothing for the Storyteller to set (difficulty is always 1), so it no longer waits for the ST to click Open. You confirmed that part. Your follow-up: the fullscreen result for a left-click Rouse was lingering for the usual six seconds; it now uses the same two-second hold as a right-click quick Rouse (about one second fully visible after the fade-in). That applies to every dedicated Rouse / Oblivion Rouse, including ones the Storyteller starts.

**How to verify:** Save & Play. At a player seat with no roll in progress, left-click the Rouse bag. The roll panel should appear straight away with the **Roll** button usable, not greyed out with "Awaiting Storyteller". Add one or two more Rouse dice if you like, then click Roll. After the result fades in, it should stay fully visible for about a second, then fade out — the same timing as a right-click quick Rouse, not the long six-second ordinary-roll result. Do the same with the Oblivion Rouse bag. A normal roll (left-click the Normal bag) should still wait for the Storyteller, and its result should still last about six seconds.

### High — hunger overlay

#### TOR-681 — Hunger overlays stop flickering while the real-time clock runs

**Context:** You noticed the hunger overlays flickering slightly about once a minute while idling in a live scene. With the real-time clock running, every narrative minute moved present day forward, and every present-day move refreshed all five player seats in full so project dates on sheet page 5 stayed current. Each of those refreshes re-showed the hunger overlay, which replays its fade-in and briefly shows the empty picture. Now the overlay is only re-shown when hunger actually changes, and a present-day move only refreshes a seat whose page 5 projects actually changed (for example, a project's countdown die ticking down).

**How to verify:** Save & Play. Play a scene with at least one PC whose Hunger is above zero, and turn on the real-time clock (any speed). Watch that player's hunger overlay for two or three minutes: it should stay perfectly still. Then change that PC's Hunger from the PCs panel or with a Rouse check: the overlay should switch to the new level straight away. Finally, if a PC has a project in progress, open sheet page 5 and move present day forward a whole day from the clock: the project's countdown die should still update.

### High — scene clock

#### TOR-682 — A scene less than fifteen minutes behind present day runs on present day

**Context:** Your Lab pin: whenever a scene's time is within fifteen minutes behind the present-day clock, the scene should simply use present day. TTS now snaps the scene clock onto present day in that case — when you apply a scene, when the time animation finishes, when you set the time on the Scenes panel, and on each real-time clock tick. A scene more than fifteen minutes in the past (a flashback) keeps its own time.

**How to verify:** Save & Play. Note the present-day time on the game-state overlay. Set a live scene's clock to ten minutes before present day (from the dashboard calendar or the backup Scenes panel). The scene clock should jump straight to present day instead of staying ten minutes behind. Then set it to an hour before present day: it should stay an hour behind. With the real-time clock on and the scene catching up with ×5, the scene should land exactly on present day and then follow it, never stopping a few minutes short.

#### TOR-683 — The dashboard's Scenes tab: thunder volume, exact stage positions, and the scene controls

**Context:** TTS changes for the dashboard's Scenes tab. Thunder now has its own volume: a new **Thunder** slider in the in-game Storyteller Sound panel (under Wind) and the thunder slider on the dashboard both scale how loud each thunder clap is, starting from the next clap. TTS sends NPC stage positions precisely, so the dashboard's NPC tokens sit exactly on the snap circles. The dashboard can now also change the live scene's location, sky, top fog, lighting and table (including Scatter), start and end a Memoriam, add or remove scene conditions, and hold weather of your choosing until the next dawn. Each of these goes through the same TTS code the in-game Scenes panel uses.

**How to verify:** Restart the dashboard server (`npm run dev`), then Save & Play into a live scene with at least one NPC on the stage, and open the dashboard's **Scenes** tab (Live mode, the light at the bottom right green).

1. **Stage positions:** each NPC token on the stage drawing should sit right on one of the small snap circles, in the same pack as on the in-game control board.
2. **Thunder:** turn on a thunderstorm. The dashboard's thunder group should light up. Drag its slider low and the next clap should be quieter; the in-game Thunder slider should show the same level.
3. **Location:** click the location card (top left), pick another Site and press **Use this location**. TTS should move the scene there (site card, sky, ambience). On a scene that is not linked to its library row, a Release button appears; pressing it should put the library's location back.
4. **Top fog:** click the small **≋ Fog** button at the top of the location card. The fog over the table should roll in; click again and it should clear.
5. **Sky, lighting and table:** above the stage drawing there are three drop-downs. Pick **Generic sky**, then **Site sky**: the in-game skybox should follow. Pick **Dark**, **Standard** and **Bright** lighting: the room lights should change. Pick another table from the first drop-down: the chairs should move. Right-click empty stage and choose **Placement**: the table should switch to Scatter, and choosing it again should bring the table back.
6. **Conditions:** at the right end of the aspects row, use **+ condition** to add one. It should appear in the in-game scene's conditions. Click its × and it should go away again. Conditions carried by the District or Site show greyed and cannot be removed.
7. **Weather until dawn:** click the weather panel's rain or wind icon and pick something different from the schedule (say heavy rain). TTS should switch to it, and a Release button should appear on the weather panel. Move the scene clock past the next dawn: the weather should return to the schedule by itself. Pick a weather again and press Release instead: the scheduled weather should come back straight away.
8. **Memoriam:** on the phase bar, open the **Advance** ring and choose **Memoriam…**. Pick a character, slide to a year, pick a panel (or Just Smoke), tick who is present and press **Advance**. TTS should enter the Memoriam just as the in-game Memoriam modal does (sky panel, date and place). Then open the Advance ring again and choose **Main ▸**: TTS should leave the Memoriam and restore the scene it interrupted.

#### TOR-684 — The dashboard keeps the scene library and sends scenes to TTS when you play them

**Context:** The dashboard now holds the master copy of your scene library, in its own file beside the dashboard (not in the public repo, and backed up with the scene deck). The first time it starts it copies TTS's library in. Playing a scene from the dashboard first sends that scene to TTS, then plays it. While a linked scene is on the table, TTS keeps writing it into its library row and the dashboard reads it back. The dashboard can also delete, unlink and fork scenes in TTS.

**How to verify:** Restart the dashboard server (`npm run dev`), Save & Play, and open the dashboard's **Scenes** tab during Play.

1. **Copied in:** open the **Advance** ring and choose **Scene…**. Every scene from the in-game scene library should be listed, with its District and Site under the title. Typing in the search box should narrow the list.
2. **Play:** press **Play** on a scene that is not on the table and pick a clock choice. TTS should switch to that scene, and the phase bar should show its title.
3. **Prepare a new scene:** in the same picker press **+ Prepare a new scene…**, pick a location and press **Prepare this scene**. A blue Preview opens named after the District and Site. Change its weather, sky or conditions: nothing should change in TTS. Press **Play Scene**, pick a clock choice: TTS should play the new scene with those settings, and it should appear in the in-game scene library too.
4. **Edit and Discard:** press **Edit** on a scene, change something, and press **Discard** twice. Open the picker again: the scene should be unchanged.
5. **Right-click a deck scene:** with a second scene on deck (the button beside the table's title), right-click it. Its preview should open.
6. **Write-back:** with a linked scene on the table, change its location or weather from the dashboard, wait a couple of seconds, then press **Edit** on that scene in the picker. The preview should show the new location or weather.
7. **Unlink and Fork:** click the table's scene title on the phase bar. Choose **Unlink from the library**: an **unlinked** tag should appear next to the title, and the in-game library row should show as unlinked. Click the title again, choose **Fork…**, give the new and old names and press **Fork**: the phase bar should now show the new name, and the in-game library should list both scenes.
8. **Delete:** in the picker, press **Delete** twice on a scene that is not on the table. It should disappear from the dashboard's list and from the in-game scene library.

#### TOR-685 — Move, light, spread and clear stage NPCs from the dashboard

**Context:** The stage drawing on the dashboard's Scenes tab is now where you arrange NPCs. Every edit uses the same TTS code as the control board's Apply button: a seated NPC you put on the stage has their seat go dark, and taking them off brings the seat back. In Queued mode, several stage edits sent together reach TTS as one change, so the figurines glide into place together. Scatter groups can be rearranged the same way, and generic NPCs are added from the roster's new **Generic** view (you type the name the players will see; there is no in-game naming pop-up). The in-game control board still works as before; turning it into a plain mirror of the dashboard comes later, with the clean-up of in-game scene editing.

**How to verify:** Save & Play into a live scene and open the dashboard's **Scenes** tab.

1. **Move:** drag an NPC token somewhere else on the stage and let go. In Live mode (the light at the bottom right is green) the figurine should glide there in TTS. Dropping right on top of a small slot circle snaps the token onto it; dropping on a slot that someone else is on swaps the two.
2. **Light:** double-click a token. Its gold halo should go away and the figurine's light should go out in TTS. Double-click again to light it.
3. **Off the stage:** drag a token below the stage (onto the seat row) or outside the drawing. The NPC should leave the stage in TTS. If they hold a seat at the table, their seat should light back up.
4. **Seated NPC onto the stage:** open the roster on the left, find an NPC who is sitting at the table, and drag their headshot onto the stage. Their seat should go dark and their figurine should appear on the stage. Now right-click their seat on the dashboard and make them present again: their stage figurine should leave the stage and the seat should light up.
5. **Group spread:** drag a whole group from the roster onto a pack (for example Far Left). The group's leader should stand on the pack's middle slot and the rest spread out beside them; anyone already on that pack should step over, unlit, to the nearest free spots.
6. **Pack move:** drag a pack's name (for example **Mid Left**) onto another pack. Everyone on the first pack should move across together.
7. **Queued moves together:** click the light at the bottom right to switch to Queued mode. Move three or four tokens; they move on the drawing and appear in the queue list. Press **Send**: all the figurines should glide at the same time.
8. **Clear and Reset:** right-click empty stage. **Clear Stage** (click it twice) should take everyone off the stage and remove any generic NPCs. **Reset to Library** should put the stage back the way the scene's library row has it.
9. **Scatter:** right-click empty stage and choose **Placement** to switch to Scatter. Six group circles appear. Drag a PC or an NPC from one circle into another: in TTS they should move to that group. Drag an NPC out of every circle: they should leave the stage. Switch Placement back afterwards.
10. **Generic NPCs:** hover the roster on the left and press **Generic**. Find a figurine in **Add from the catalog**, press **+ Add**, type a name and press **Add**. A generic NPC should spawn in TTS and appear under **In this scene**; drag it onto the stage like anyone else.

### Medium — Prince's Court sheet

#### TOR-663 — Refresh XML keeps The Court on the people who had it open

**Context:** The first pass restored Haven merits after Refresh XML, but it also showed The Court to everyone until you toggled it on and off. Refresh XML now reapplies who may see the panel without using TTS's Show/Hide commands, which were wiping that audience.

**How to verify:** Save & Play. Open The Court and go to the second spread so your Haven Merits are showing. On the Storyteller Phases panel, press **Refresh XML**. The Court should still be open on that same spread, with the same merits, dots, and text, and only the people who had it open should see it — it must not pop up for every seat. Then close The Court and press Refresh XML again: it should stay closed for everyone, and opening it afterwards should still show the current merits rather than the original blank page.

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
