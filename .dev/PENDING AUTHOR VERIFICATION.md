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

**How to verify:** Restart the dashboard server (`npm run dev`), then Save & Play into a live scene with at least one NPC on the stage, and open the dashboard's **Scenes** tab.

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

**Context:** The stage drawing on the dashboard's Scenes tab is now where you arrange NPCs. In TTS, a seated NPC you put on the stage has their seat go dark, and taking them off brings the seat back. Stage edits wait in a small queue pop-up at the bottom left of the stage drawing until you press **Send**; everything sent together reaches TTS as one change, so the figurines glide into place together. Scatter groups can be rearranged the same way, and generic NPCs are added from the roster's new **Generic** view (you type the name the players will see; there is no in-game naming pop-up). The in-game control board no longer edits the stage (see TOR-687 below).

**How to verify:** Save & Play into a live scene and open the dashboard's **Scenes** tab.

1. **Move:** drag an NPC token somewhere else on the stage and let go. A queue pop-up should appear at the bottom left of the stage with that move listed; press **Send** and the figurine should glide there in TTS, and the pop-up should disappear. (Every step below that changes the stage goes through the same pop-up.) Dropping right on top of a small slot circle snaps the token onto it; dropping on a slot that someone else is on swaps the two.
2. **Light:** double-click a token. Its gold halo should go away and the figurine's light should go out in TTS. Double-click again to light it.
3. **Off the stage:** drag a token below the stage (onto the seat row) or outside the drawing. The NPC should leave the stage in TTS. If they hold a seat at the table, their seat should light back up.
4. **Seated NPC onto the stage:** open the roster on the left, find an NPC who is sitting at the table, and drag their headshot onto the stage. Their seat should go dark and their figurine should appear on the stage. Now right-click their seat on the dashboard and make them present again: their stage figurine should leave the stage and the seat should light up.
5. **Group spread:** drag a whole group from the roster onto a pack (for example Far Left). The group's leader should stand on the pack's middle slot and the rest spread out beside them; anyone already on that pack should step over, unlit, to the nearest free spots.
6. **Pack move:** grab the empty space around a pack's slot circles (a dashed outline shows when you hover it) and drop it on another pack. Everyone on the first pack should move across together.
7. **Queued moves together:** move three or four tokens; they move on the drawing and each appears in the queue pop-up. Press **Send**: all the figurines should glide at the same time. Queue a couple more and press **Clear** instead: the tokens should go back and the pop-up should disappear.
8. **Clear and Reset:** right-click empty stage. **Clear Stage** (click it twice) should take everyone off the stage and remove any generic NPCs. **Reset to Library** should put the stage back the way the scene's library row has it.
9. **Scatter:** right-click empty stage and choose **Placement** to switch to Scatter. Six group circles appear. Drag a PC or an NPC from one circle into another: in TTS they should move to that group. Drag an NPC out of every circle: they should leave the stage. Switch Placement back afterwards.
10. **Generic NPCs:** open the roster on the left and press **Generic**, open a group and click a figurine. It goes into the queue on the stage; press **Send** and it should spawn in TTS and appear under **In this scene**; drag it around the stage like anyone else. (Adding and renaming generics changed again — see **TOR-692** below.)

#### TOR-686 — Run every Storyteller roll from the dashboard

**Context:** The Rolls column on the right of the dashboard's Scenes tab (under the new Conditions box) now does what the in-game Storyteller roll dashboard and the Storyteller roll pop-up did. Dice still roll physically in TTS, and the players' own roll controls are unchanged. A roll's state shows as colour, not words: a red glow is waiting for your approval, steady gold is ready to roll, pulsing gold is rolling (blue instead of gold during a Willpower reroll), and plain red is rolled. Hover anything for its name.

**How to verify:** Save & Play into a live scene with at least one player seated, and open the dashboard's **Scenes** tab.

1. **Start a PC roll:** right-click a PC's seat on the dashboard. A ring of roll types appears (one per dice bag). Pick **Standard**. A row for that PC appears in the Rolls column with a red glow, and in TTS the roll waits for you.
2. **Approve it:** click a difficulty number on the row. The glow turns steady gold and the player's roll opens in TTS. (There is no separate Open button any more.)
3. **Options:** click the gear icon on the row. The pop-up should open with the same toggles as the TTS options window. Change one and press **Apply**; the TTS options window should show the change.
4. **After the roll:** have the player roll. While the dice tumble the row pulses gold; once they settle it turns plain red and shows the dice as coffin faces with the result. Click the diamonds: a small ring with a red and a white die appears. Left-click the white die to add a normal die, right-click to remove one; the pool in TTS should follow. Try **Override…** and pick a different result.
5. **Finished roll:** have the player confirm the roll. The row stays, in the darker "done" colour, with its result and dice. The megaphone icon broadcasts it to the table again; the cancel icon dismisses it. (See **TOR-689** below.)
6. **NPC roll:** right-click an NPC on the stage and pick a roll type. The NPC panel appears under the drawer list. Click the diamonds (or the **+**) and build a pool with the dice ring: click several times quickly. Every click should count straight away on the ring and the diamonds, and TTS should end with the same pool once it catches up. Pick a difficulty, then press the dice icon to roll (right-click it for secret dice the players cannot see). The dice should spawn in the drawer and roll. Afterwards click a die to pick it, press the circular-arrows icon to reroll it, and press the tick to confirm (right-click the tick to hold the result instead of broadcasting it).
7. **Willpower reroll:** have a player spend Willpower on a rolled PC roll (or press the Willpower icon on a rolled NPC roll). The row should turn blue and pulse while the reroll is under way, then go back to plain red.
8. **Hunt:** in the hunt panel under the location card, click a resonance flavor and pick the hunting PC from the ring (the flavor gets an outline in that PC's seat colour), press the circling-arrows button to roll, then press the broadcast (loudspeaker) button. TTS should show the resonance on the roll result banner, and the hunt bar should go back to its starting state. (If no flavor was picked, the broadcast button asks for the PC with the same ring.)

#### TOR-687 — The Stage Control board only holds spotlight tokens now

**Context:** The dashboard is now the only place to arrange the stage. The in-game board lost its Apply / Load / Clear buttons, the THERE preview, Lock next scene, the token palette, PC tokens, the generic NPC import box, and token-on-dice-bag rolls. Instead, every NPC standing on the stage gets one large token on the Stage Control board, placed by script at the NPC's spot. Its only job is the "Spotlight NPC (hold)" hotkey. Scatter is moved from the dashboard only. Werewolf NPCs are marked in the NPC data instead of by a token tag. The in-game Storyteller roll pop-ups only work while the **In-game ST Rolls** button (debug row of the Storyteller HUD) is on; it starts off. The in-game Scenes panel still works as a fallback, without THERE.

**Before you test:** in the save, delete the token palette board and everything on it, any PC tokens, the old NPC control tokens, and any minimap markers left on the Stage Control board. You can give the board plain art if you like. Then Save & Play.

**How to verify:** load a live scene that has NPCs on the stage, with the dashboard's **Scenes** tab open.

1. **Spotlight tokens:** each stage NPC should have exactly one large token on the Stage Control board, face down if their light is off. Move an NPC on the dashboard's stage: their token should move on the board too. Take them off the stage: the token should disappear. If the tokens look too big or too small, tell me and I will change their size.
2. **Hold hotkey:** hover one of those tokens and hold the "Spotlight NPC (hold)" key. That NPC's figurine should be spotlit until you let go.
3. **Werewolf rolls:** on the dashboard, right-click a Werewolf NPC on the stage. The roll ring should offer the Werewolf roll.
4. **Scatter:** switch the table to Scatter, then move a PC and an NPC to other groups on the dashboard. Their figurines should move in TTS.
5. **Roll fallback:** with **In-game ST Rolls** off, the in-game Storyteller roll dashboard and roll panel should stay hidden, even while an NPC roll is live. Turn the button on: they should appear and work as before. (Starting a roll by clicking a Storyteller dice bag is gone — see **TOR-688** below.)
6. **Scenes panel fallback:** in the in-game Scenes panel, apply a scene, then close the panel. Both should work normally, and there should be no THERE button.

#### TOR-688 — Storyteller dice spawn without bags

**Context:** The Storyteller no longer has dice bags. When you roll for an NPC, each die is created straight onto the drawer tray, then unlocked and tossed as before. The 72 spare Storyteller dice that used to be parked under the table are removed automatically the first time you load. Clicking a Storyteller dice bag to start a roll, and its roll-name pop-up, are gone. If the six Storyteller dice bags are still anywhere in your save, you can delete them.

**How to verify:** Save & Play into a live scene.

1. **Spares removed:** loading should finish with no errors in the console. If you want to check the count, run `print(#getObjectsWithTag("d10Preload"))` in Execute Code: it should print 192 (only the player bags' spares) instead of 264.
2. **NPC roll:** on the dashboard, right-click an NPC on the stage, pick **Standard**, build a pool with some normal and hunger dice, set a difficulty and press the dice icon. The drawer should rise, the tray light come on, and the dice appear on the tray in rings, then tumble. The result should match the dice on the tray. The first roll of a session may show grey dice for a moment while the textures load; tell me if that bothers you.
3. **Other dice kinds:** repeat with a Rouse roll, and with a Werewolf roll on a Werewolf NPC (Werewolf and Rage dice). Each kind should look right.
4. **Clear:** cancel a finished NPC roll from its drawer slot on the dashboard. Its dice should disappear from the table and the drawer should close.

#### TOR-689 — Finished player rolls keep their result on the dashboard

**Context:** After a player confirmed a roll, the dashboard's Rolls column showed the result for a moment and then turned the card into a dim dashed "held" box with no result. That card is really the player's last finished roll, which has already been shown to the table. It now keeps its result and dice.

**How to verify:** Save & Play, then restart the dashboard (or reload its page). Have a player make an ordinary roll and confirm it. On the dashboard, that player's card should stay in the Rolls column with the result text (for example "WIN +2"), the difficulty and the dice faces, in the darker "done" colour. It should not turn into a dashed empty box. Hover its right edge: **Broadcast again** should show the result on the table a second time, and the close button should remove the card. A Rouse check should show only its diamonds and its outcome, with no dice pictures.

#### TOR-690 — Sound volume changes stick to the track, in every scene

**Context:** Moving a Music, Location, Featured, Rain or Wind volume slider only changed the volume until the next track change; the next time that track played, it was back at its catalog volume. Now the level you set is saved against the track itself, and that track plays at your level wherever and whenever it plays again. Nothing is saved per scene.

**How to verify:** Save & Play. Start a scene whose music you know, then on the dashboard's Sound panel (or the in-game Sound panel) drag the **Music** slider to roughly a quarter and let go. Play a different scene with different music, then go back to the first scene: its music should come back at your quarter level, not at its old volume. Try the same with a location ambience (Location slider) if you like. Thunder is unchanged: its slider still scales every thunder hit.

#### TOR-691 — Real-time clock only during Play's Main and Memoriam

**Context:** The real-time clock could be switched on at any time, including Downtime, which had its own running clock. Real time now only runs during Play's Main and Memoriam subphases; everywhere else it stays off, and the dashboard hides its real-time button.

**How to verify:** Save & Play and restart the dashboard. During a live scene (Play, Main), the clock button at the top right of the dashboard's date-and-time panel should be there and should turn real time on and off as before. End the scene so the game goes to Downtime: the button should disappear and the clock should stop moving. In the in-game Scenes panel, pressing the real-time toggle during Downtime should show a message that real time only runs during Main and Memoriam. Start a Memoriam: the button should come back.

#### TOR-692 — Add generic NPCs in a batch and rename them from their stage token

**Context:** Clicking a generic NPC in the dashboard roster used to ask for a name and spawn it straight away. Now each click puts it in the stage queue on a free spot near the stage's top-left corner (so several clicks gather in that corner), named after its catalogue entry. Nothing spawns until you press **Send**, so you can drag them where you want first. To give one a name, right-click its token on the stage and choose **Rename…**. Hovering a generic in the roster also shows its full figurine beside the roster.

**How to verify:** Save & Play into a live scene and open the dashboard's **Scenes** tab.

1. **Batch add:** open the roster, press **Generic**, open a group (for example Bartender) and click two or three figurines. Each should vanish from the roster and appear on the dashboard stage near the top-left corner, with lines in the stage queue. Nothing should spawn in TTS yet.
2. **Rename before sending:** right-click one of those tokens on the stage, choose **Rename…**, type a name and press **Rename**. The token and its queue line should show the new name.
3. **Send:** drag one somewhere else, then press **Send**. The figurines should spawn in TTS and go to their spots; the renamed one should have its new name (hover the figurine in TTS).
4. **Rename after spawning:** right-click a spawned generic's token, rename it and press **Send**. The figurine's name in TTS and its spotlight token on the Stage Control board should both change.
5. **Remove before sending:** click a generic again, then press the × on its queue line. It should leave the stage drawing and come back in the roster.
6. **In a preview:** open a scene's preview (right-click it on deck, or Edit in the scene picker). The roster sits in the preview's left column. Click a generic: it should appear on the preview's stage only. Press **Play Scene**: the generic should spawn in TTS when the scene plays.

#### TOR-693 — Scene edits stay when you switch to another scene and back

**Context:** When you changed a scene while it was on the table, then played a different scene and came back, some changes were gone, most clearly NPCs you had moved on the stage. TTS now copies the scene into its library entry one last time whenever it leaves the table (playing another scene, End Scene, or a phase change), so nothing you did is dropped. The weather override is not part of this: it covers the whole table until dawn, whatever scene is playing.

**How to verify:** Save & Play, then play scene A from the dashboard. Move two or three NPCs on the dashboard stage and press **Send**, change the music, and change the sky or the lighting. Play scene B. Once B is on the table, play scene A again: the NPCs should stand where you left them, and the music and sky or lighting should be as you set them. Then move an NPC, press **End Scene**, and play A again: that move should still be there.

#### TOR-694 — Finished Storyteller drawer rolls stay on the dashboard like player rolls

**Context:** Once you confirmed an NPC roll, the dashboard only showed a small drawer chip with a name. Now a confirmed drawer stays in the Rolls column as a full card (pool, difficulty, result and dice), just like a player's finished roll. You can fold it to one line, broadcast it again, or dismiss it.

**How to verify:** Save & Play, then open the dashboard's **Scenes** tab.

1. Start an NPC roll (right-click a stage token or NPC seat and pick a roll type), roll it and press Confirm. The drawer should become a card with the NPC's name, a "Drawer N" tag, the pool, the difficulty, the result and the dice. It should stay after the result is broadcast.
2. Click the NPC's name on the card: it folds to one line showing the result, with the broadcast icon still there. Click the name again to unfold it.
3. Click the broadcast icon: the result banner should show again in TTS.
4. Do another NPC roll, but right-click Confirm (hold the result). Its card should carry a "Held" tag, and its broadcast icon should read "Broadcast to the table". Click it and the banner should show in TTS.
5. Hover a card and click its close (X) button: the card should go away and that drawer in TTS should clear.

#### TOR-695 — The dashboard tells you why a scene change did not happen

**Context:** When TTS refused a scene change (most often because dice were still on the table), the only warning was a TTS broadcast, which tends to hide behind the overlay graphics. TTS now also sends the reason to the dashboard, which shows it as a red banner over the stage until you click OK. The same banner appears if a scene transition fails partway under the blindfold.

**How to verify:** Save & Play, then open the dashboard's **Scenes** tab. Start any roll so dice are on the table, and leave it unconfirmed. Play a different scene from the dashboard. The scene should not change, and a red **Not done in TTS** banner should appear over the top of the stage saying the scene cannot be applied while dice are on the table. Click **OK** to close it. Then finish or cancel the roll and play the scene again: it should play normally with no banner.

#### TOR-696 — The dashboard makes a lit signal fire impossible to miss, and can put it out

**Context:** When a player lights their signal fire, the dashboard now pulses an amber glow round the whole screen, shows a banner over the stage naming the player, pulses their seat with a small flame button, and plays a short chime (again every minute while it stays lit). **Put it out** on the banner, or the flame on the seat, puts the fire out in TTS. Browsers only play sound after you have clicked somewhere on the dashboard page since opening it.

**How to verify:** Save & Play, then open the dashboard's **Scenes** tab and click anywhere on the page once.

1. In TTS, click a player's signal candle to light their fire. Within a second the dashboard should show the amber edge glow, the banner with that player's name and **Put it out**, the pulsing seat with a flame button, and play a three-note chime.
2. Leave it lit for a minute: the chime should play again.
3. Click **Put it out** (or the flame on the seat). The fire in TTS should go out and every dashboard alert should disappear.
4. Light it again, then put it out from TTS by clicking the candle. The dashboard alerts should clear too.

#### TOR-697 — The dashboard's scene timing menu: Scene Time + and Now + strips, ×2 or ×5 to Now

**Context:** Switching scenes from the dashboard now opens a menu showing the scene's own time and present day ("Now"), each with a row of coloured buttons that start the scene that much later (hovering previews the time). Real time runs at ×2, or at ×5 until it reaches Now; ×5 to Now is picked for you when the scene starts earlier on the same night as Now. Set Now is gone from this menu.

**How to verify:** Save & Play, then open the dashboard's **Scenes** tab.

1. Click a scene on deck in the phase bar. The menu should show the scene's time and date on top, Now below, a row of coloured buttons under each, and a Real time row with ×2 and ×5 to Now. There is no Set Now.
2. Hover the top row from left to right: the scene time should move on by 0, 15, 30 and 45 minutes, then 1 h, 1 h 30, 2, 3 and 4 hours. The Now block always shows present day; if the preview passes it, Now gets a small "moves to …" tag with that time.
3. With a scene whose time is earlier tonight than Now, ×5 to Now should be lit. Click the leftmost top button: the scene plays at its own time and the clock runs fast until it reaches Now, then at ×2.
4. Switch scenes again and click the third button on the Now row (+30 min): the scene should start 30 minutes after Now, Now should move on by 30 minutes, and the clock should run at ×2.

#### TOR-698 — Storyteller dice drawers show up, and NPC-seat dice roll inside the tray

**Context:** Storyteller drawers were rising invisibly (the "park" hid them from everyone and opening never un-hid them). When the roll belonged to an NPC seated at the table, the dice also spawned underneath that drawer's tray, so they dropped to the table and could only wiggle when rolled or rerolled. Drawers now un-hide as they open, and the dice spawn on the tray floor at whatever height the drawer is rising to.

**How to verify:** Save & Play, then use the dashboard's **Scenes** tab.

1. Start a Storyteller roll for an NPC who is not seated (right-click a stage token), add a few dice, and press Roll. The drawer should rise into view and the dice should tumble inside it.
2. Pick one or two dice and press Reroll. They should toss again properly, not just wiggle.
3. Cancel, seat an NPC at the table, and start a roll for them (right-click their seat). The drawer should rise visibly in front of that seat, the dice should sit on its red tray floor rather than the table, and Roll and Reroll should both tumble them.
4. Cancel or confirm the roll. The drawer should sink out of sight again.

#### TOR-703 — Drag characters between seats and the stage on the dashboard

**Context:** The seat row on the dashboard's Scenes tab is now drag and drop. It works on the live table only, not in scene previews and not while Scatter is on. You can swap seated characters between chairs, seat NPCs from the roster or the stage, and drag a seated NPC onto the stage. Whenever an NPC leaves the stage, their seat now lights up again. Before, it stayed dark if they had been dark on the stage. Seat drags are refused while dice are on the table, just like switching tables.

**How to verify:** Save & Play, load a scene with at least one NPC seated and one empty chair, and open the dashboard's Scenes tab.

1. Drag a PC's seat onto another PC's seat. The two should swap chairs in TTS (figurine, sheet, hand and lights all move together) and on the dashboard.
2. Drag a PC onto an empty chair. They should move there and leave their old chair empty.
3. Drag an NPC from the roster on the left onto an empty chair. They should sit there, lit.
4. Drag a seated NPC onto the stage. Their seat should go dark on the board at once. After **Send** they should stand on the stage in TTS with their seat dark.
5. Drag that NPC's stage token back onto their own chair, or any empty chair. They should sit down there, lit, and leave the stage.
6. Put a seated NPC on the stage, double-click their token to darken them, and Send. Then take them off the stage (drag them off, or use Clear Stage). Their seat should light up again even though they were dark on the stage.

#### TOR-702 — End → Intermission keeps the TR Loop playing

**Context:** Going from End to Intermission started the TR Loop, but a few seconds later the regular Main theme cut in and replaced it. Main's playlist still had a "play the next track" timer running, and nothing told it the TR Loop had taken over. Starting the TR Loop now formally pauses Main, so that timer does nothing.

**How to verify:** Save & Play, get to the **End** phase, then advance to **Intermission**.

1. The TR Loop should fade in after the blackout and keep playing. Wait at least a minute, longer than a Main track would normally run, and confirm Main never starts.
2. Advance from Intermission to Play: the session intro should play and Main should come back afterwards as usual.

#### TOR-701 — Switching scenes clears finished rolls instead of refusing

**Context:** Switching scenes (or table layouts) with dice on the table used to be refused outright. Now, if every roll on the table is finished and has been shown to the players, TTS clears those dice and carries on. It still refuses while a roll is in progress, while a Storyteller drawer is holding a result back, or when loose dice belong to no roll. Broadcasting a held drawer result now also stops it counting as held (it used to stay marked "Held" after the broadcast).

**How to verify:** Save & Play, then open the dashboard's **Scenes** tab with a scene on the table.

1. Start a Storyteller roll, roll it and Confirm normally (left-click). While its drawer card is still showing, play another scene: the switch should go ahead and the drawer should sink away.
2. Start a Storyteller roll and leave it unconfirmed. Play another scene: it should refuse with the red **Not done in TTS** notice.
3. Roll and right-click Confirm (hold the result). Play another scene: it should still refuse. Broadcast the held result, then play the scene again: it should go ahead and clear the drawer.
4. Have a player finish a roll, and while their result banner is still up, play another scene: it should go ahead and their dice should disappear.

#### TOR-700 — Picking Storyteller reroll dice happens on the dashboard only

**Context:** Clicking a die to pick it for a Storyteller reroll used to send a command to TTS on every click. The picks now just light up on the dashboard, and only pressing Reroll sends them. The same change gives roll cards a slightly thicker frame: a Storyteller result the table has not seen yet has a dashed, softly pulsing orange frame, and a roll that is finished and broadcast has no frame at all.

**How to verify:** Save & Play, then open the dashboard's **Scenes** tab.

1. Start a Storyteller roll (right-click a stage token), add a few dice and press Roll. Once the dice settle, the card's frame should be dashed and pulsing.
2. Click two dice. They should highlight at once with no "Sending to TTS" line, and nothing should change on the in-game Storyteller roll panel. Click one again to unpick it.
3. Press Reroll. Only the picked dice should toss in the tray; afterwards no dice are picked and the frame is still dashed and pulsing.
4. Right-click Confirm to hold the result: the drawer card stays dashed and pulsing. Press its Broadcast button: the frame disappears.
5. A PC roll that has finished and been broadcast should also have no frame, while a PC roll still in progress keeps its coloured frame.

#### TOR-699 — New default figurine heights on the inner stage rings

**Context:** Figurines placed on the stage's Center ring (Center, Center Left, Center Right) now stand at -60, and on the Mid Center ring (Mid Center, Mid Left, Mid Right) at -57. NPCs already standing in saved scenes keep their old height until they are moved.

**How to verify:** Save & Play, then open the dashboard's **Scenes** tab. Drag an NPC from the roster onto the Center spot and press Send: the figurine should stand lower than before. Do the same on Mid Center (a little higher than Center). Then move an NPC who was already standing on the stage onto one of those spots: it should take the new height too.

### Medium — Prince's Court sheet

#### TOR-663 — Refresh XML keeps The Court on the people who had it open

**Context:** The first pass restored Haven merits after Refresh XML, but it also showed The Court to everyone until you toggled it on and off. Refresh XML now reapplies who may see the panel without using TTS's Show/Hide commands, which were wiping that audience.

**How to verify:** Save & Play. Open The Court and go to the second spread so your Haven Merits are showing. On the Storyteller Phases panel, press **Refresh XML**. The Court should still be open on that same spread, with the same merits, dots, and text, and only the people who had it open should see it — it must not pop up for every seat. Then close The Court and press Refresh XML again: it should stay closed for everyone, and opening it afterwards should still show the current merits rather than the original blank page.

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
