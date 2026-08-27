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

_Last populated: 2026-08-27 — added **TOR-514** (global blindfold stacked panel). Linear Done-without-confirm sweep on 2026-08-26 added **TOR-507**, **TOR-508**, **TOR-509**, and **TOR-510**. Author confirmed **TOR-506** (End→Intermission audio with the cover) on 2026-08-22. **TOR-439** remains a multiclient gate (not a solo Save & Play)._

### High — session / join / first-load

#### ⌚ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**. Deferred from Focus until you can gather testers.

#### TOR-514 — Global blindfold is a stacked panel

**How to verify:** Save & Play so the new scripts and HUD load. You should be in Intermission with the session cover up — the stacked splash art should appear as one full-screen cover, and you should not be able to click through it. Click **Overlay Alpha** on the Storyteller debug column: the cover should go translucent (you can see the table through all of the stacked images) and clicks should pass through; click again and it should go fully opaque and block clicks again. Click **Clear Loading Overlay**: the whole cover (every stacked image) should fade out together, not leave a splash layer behind. Advance Intermission → Play: after the overture hold, the whole stacked cover should lift together.

**Context:** The global cover is now a panel with several splash images stacked inside it. Show, hide, and click-blocking run on that panel so FadeIn/FadeOut apply to the whole stack.

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

### Medium — load console / Scenes picker

#### TOR-98 — Spotlight phase (carousel, overlay, Host strip)

**How to verify:** In the Host console run `lua DEBUG.populateSpotlightFigurines()`. Five Spotlight figurines and five stage lights should appear in the preload zone (world Y about −200), tagged `spotlight_figurine` / `spotlight_light` (not `npc_figurine`). The console should print paste-ready GUID lines. Copy those into `lib/guids.ttslua` (`SPOTLIGHT_FIGURE_*` and `SPOTLIGHT_LIGHT_*` for Brown, Orange, Pink, Purple, Red), save the table, then Save & Play. Do **not** run the helper twice without deleting the previous copies — it will duplicate objects. Advancing into Spotlight does **not** spawn them automatically.

From Play, click **Advance →**. A scene-style cover should come down. When it lifts: the table should be Table A with the Spotlight skybox; Main music should still be playing (location/weather faded out, Main not restarted); seat figures should be hidden from player colors; bags, companions, and compulsion decks should be under the table; in-session stand-ins should sit on a ring in front of the table (one person at the front if only one is in session), **facing away from the ring’s center** (the front person looks toward the table / Host). The overlay should show the **session name** where the red diamond usually sits (normal weight, not bold), **S P O T L I G H T** in gold italic on the date line, and the front character's name in white on the time line (smaller than the Play clock). A seven-button strip at the bottom of the Host view should rotate the ring over about two seconds (arrows do nothing at the ends; clicking the current color does nothing).

Type a session name next to the session number on the Phases panel. Advance to End: Main should keep playing, the table should become **B0** (room for the five PCs only — NPCs should not come back onto seats), the Scenes skybox picker should show **Generic**, the carousel should go away, **seat figures** should be visible again, but **dice bags, companions, and compulsion decks should stay under the table**. Overlay: session name plus **DEBRIEF**. Advance again into Intermission: after the global cover comes down, those bags / companions / decks should return to the table. If the workshop objects are missing on Spotlight enter, Advance should still lift the cover and show a clear error instead of hanging.

**Context:** Spotlight is no longer “silence everything and hope a library scene exists.” It is its own phase ritual. Memoriam LUT (**TOR-101**) and a future Downtime clock are not reversed yet — comments are in the narrative-clear path.

#### ✅ TOR-508 — Rain particles no longer print a missing GUID on load

**How to verify:** Save & Play. On load you should **not** see `[Soundscape] Rain particles: No object found ... (bootstrap silence)` in the console. Outdoor rain and weather should still switch the rain-particle visual while the scene cover is down, the same way they did after the outdoor-rain work.

**Context:** The rain-particle object was always in the save. During load the script asked for it before Tabletop Simulator had objects ready, and printed a missing-GUID error. Audio emitters already skipped that quietly; rain particles now do the same. A later weather apply still prints if the GUID is truly gone after objects exist.

#### ✅ TOR-509 — Hidden skyboxes stay out of the Scenes picker

**How to verify:** Save & Play, open the Storyteller Scenes panel, and click Skyboxes. Spotlight should not appear in the list. Other skyboxes should still be there. A scene or site that already uses Spotlight should still apply that skybox.

**Context:** The sheet now has an `isShown` column. Hidden rows stay in the catalog so existing overrides still work; they are only omitted from the picker. Live import had 95 catalog skyboxes, 94 in the picker plus Generic, and 1 hidden (Spotlight).

#### ✅ TOR-510 — Memoriam skybox catalog import

**How to verify:** This does not change anything you click in the Scenes panel yet. After Save & Play, the game should still load normally. To inspect the data, open `lib/skyboxes_catalog.ttslua` and look at `SkyboxesCatalog.MemoriamSkyboxes` — for example `aishe.aishe2`, and `lucien14` under both `lucien` and `fomorach`. After you add Keys or URLs on the sheet, run `npm run skyboxes:import` again (or the usual build pipeline) to refresh.

**Context:** Catalog import only. Draft rows without a Key or panel labels are skipped so they do not block the import. Live import wrote 51 Memoriam entries across five characters.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._
