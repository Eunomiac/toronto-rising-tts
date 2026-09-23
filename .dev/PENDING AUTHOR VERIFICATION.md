# Pending Author Verification

Your TTS checklist for shipped work that still needs Save & Play / in-game confirmation. Linear **Done** alone does not mean verified.

**Marks** (prefix the `####` header):

| Mark | Who | Meaning |
| --- | --- | --- |
| **✅** | Author | Confirmed in TTS — agents remove on next inbox |
| **❌** | Author | Still broken (+ **Author Comment:**) |
| **⚠️** | Author | Bad expectations (+ **Author Comment:**) |
| **⌚** | Agent | Not ready to verify yet — fix is open in Linear / Focus; **do not** Save & Play for this row until the watch is cleared |

Unmarked = shipped (or verification gate) and waiting for your first pass. Agents add a new unmarked row whenever they ship in-game code; they process your **✅** / **❌** / **⚠️** marks on the next inbox. Agent policy: [PENDING AUTHOR VERIFICATION.agent.md](PENDING AUTHOR VERIFICATION.agent.md).

---

## Outstanding

_Last populated: 2026-09-23 — TTS Tools Epic B Claim/Release; Epic A author-confirmed._

### Tooling / TTS Tools fork

#### TTS Tools Epic B — Claim / Release editor port (no new TOR — Linear quota)

**How to verify:** Run **Update TTS Extension from VSIX** (extension **2.3.0**). Status bar should show **TTS Port: 39998** when the extension is listening.

1. Command Palette → **Release TTS Editor Port** (or click the port status item). Status should show **released**.
2. On the Storyteller Dashboard PCs tab, **Claim Port** — it should take 39998 without you restarting Cursor’s Extension Host.
3. Dashboard **Release Port**, then in Cursor **Claim TTS Editor Port** — status back to **39998**, and Save & Play / Load Objects should work again.
4. Optional: with the extension holding the port, Dashboard **Claim Port** may force-stop the extension’s listener (existing Dashboard behavior); then use extension **Claim** to take it back.

**Context:** Epic B on `tts-tools` `epic-a-fast-sync`. Power-user escape hatch before the gateway (Epic C). Epic A (fast Save & Play) was author-confirmed earlier this session (Load Objects instant; Save & Play echo live).

### Phases / session start

#### TOR-604 — Play overlay clock height after leaving prologue

**How to verify:** Save & Play so scripts reload. From Intermission with no scene, Advance to Play (prologue overlay), then Apply a library scene.

1. The center overlay should show roman session, district/site, the red date, **and the clock** (for example `8:00 PM`) inside the gold frame — not clipped off the bottom.
2. Session number and location should sit near the top of that frame, similar to a normal Play overlay that never went through prologue.
3. Optional: End the scene. Date + **DOWNTIME** should also sit in that same vertical layout, with **DOWNTIME** fully visible.

**Context:** Leaving prologue used to clear the time row height to empty, which collapsed it. relatedTo **TOR-598**.

### Character sheets

#### UISet — batch / sequence UI attribute helper (no new TOR — Linear quota)

**How to verify:** Save & Play so Global scripts reload. Open **Execute Lua** on Global.

1. Pick any Global XmlUI element you can see change (for example a debug panel id). Run `UISet("<that_id>", { active = "true" })` then again with `active = "false"`. It should show and hide with no console error.
2. Optional object form: with a character-sheet page GUID from the Objects pane, run `UISet("<guid>", "paper_root", { padding = "50 50 110 100" })` (or another real page-2 id). Confirm no `no object for GUID` / nil UI error.
3. Optional sequence: `UISet("<guid>", "dot_rc_L_2_#", { image = "dot_yellow", active = "true" }, { { char = "#", vals = { 1, 2, 3, 4, 5 } } })` should light five dots if those ids exist on that page.

**Context:** Helper from the page-2 XML dump, shipped as `U.UISet` in `lib/util.ttslua` and Global `UISet`. Linear could not create a new issue (workspace free-issue limit).

#### TOR-595 — Dashboard PCs tab: live-only sheet (no stand-in) + Ambition from gameState

**How to verify:** Save & Play so the snapshot script reloads. Keep External Editor on. Restart the Storyteller Dashboard if it was already running.

1. **Offline notice:** On the **PCs** tab, click **Release Port** (or leave the port unclaimed). You should see a blank spread titled **No live sheet** with a short reason (for example that the dashboard is not holding the editor port). You must **not** see fake character names, Desire, Ambition, or tracker dots from a stand-in sheet.
2. **Live sheet:** Click **Claim Port**. The status should say it is live from Tabletop Simulator. Player cards and page 1 should fill from the table. Subtitles and chronology come from the live seat snapshot (PCS identity in TTS), not from a dashboard hardcode file.
3. **Ambition:** In Execute Lua / TEST BED, run something like `SetPcAmbition("aishe", "Create a legacy in Toronto that long outlasts me")` for a few seats. After Claim Port (or wait a couple of seconds for the poll), each Ambition line under the name on page 1 should match what you set. Empty `playerData.ambition` shows no quote — it must not invent text from the PCS catalog.
4. Optional: click **JSON** next to Claim/Release Port — a scrollable modal should show pretty-printed data for the seat on screen. Paste a partial patch (for example new `titles` / `convictions` arrays and a nested `attributes.charisma.base`), click **Apply**, and confirm the live sheet updates (arrays replace; nested objects merge). Escape or Close dismisses the modal. Hunger / Desire clicks still paint immediately (**TOR-595** batch apply).

**Context:** Follow-up on the live PCs bridge (**TOR-595**). Snapshot/apply live in `dashboard/pc_sheet.ttslua` (`require("dashboard.pc_sheet")`). Snapshot fields include identity + `ambition` from `playerData`. Dashboard never paints a fixture when TTS is unreachable.

### Scatter / table layout

#### TOR-590 — Hand zone and cards move together (incl. square yaw)

**How to verify:** Save & Play so the instant-move scripts load. Put a few cards in at least two hands. Start in **Play** on Table B.

1. Advance **Play → Spotlight**. After the cover lifts you should **not** hear a long swoop of cards flying, and you should **not** see white cards stranded on figurines, sheets, or mid-table. Each colored hand-zone box on Table A should have its own fan sitting in that hand, grabbable.
2. Those cards should sit **square** in the fan — not tilted a few degrees relative to the hand-zone box. (Follow-up from your ⚠️ note: card Y is now snapped to hand-zone Y + 180°.)
3. Advance **Spotlight → End** (Table B0). Same checks: boxes and fans arrive together; cards stay square in the new hand.
4. Optional: turn **Absent** on and off for one seat. Those cards should bury under the table with that hand zone and come back with it.

**Context:** Unified `U.movePlayerHand` teleports the zone and cards together. Inbox 2026-09-23 also snaps card yaw after the move. Linear quota blocked a new follow-up Bug id — tracked on **TOR-590**. relatedTo **TOR-513** and **TOR-572**.

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

**Context:** Occupancy stash at Y=−200 was keeping satellites buried. relatedTo **TOR-507**.

#### Pink Tarot Consult snaps to live deck anchor (no new TOR — Linear quota; relatedTo TOR-512 / TOR-411)

**How to verify:** Save & Play so scripts reload. Put Pink’s tarot away if it is out. Confirm the deck is parked at y = −200 (invisible). Click **Consult the Tarot**. The deck should appear on the **tarot deck anchor** (same X/Z as that anchor object, height about 7.7) — not at some leftover park X/Z under the table. Put it away again: park at −200. Change table / Scatter and Consult again: still snaps to the live anchor.

**Context:** Reveal was only restoring Y ≈ 7.7 onto the parked stash X/Z. `C.ObjectPositions.TAROT_DECK_PINK.on` now uses `TAROT_DECK_ANCHOR_PINK` + height, and restore passes that resolved pose. Split out of the TOR-512 PAVE row on 2026-09-23 (header had been lost).

#### TOR-513 — Absent hand zone, PC token stash, and Apply PC reseat

**How to verify:** Save & Play so the new scripts load. Put a few cards in Red’s hand. On the PCs panel, turn **Absent** on for Red. Red’s pile should drop under the table, the **hand zone should go with it** (Y about −200), and **those cards should move under the table too** — they should not stay floating at table height. Red’s PC token on the stage control board should disappear (locked under the board, not sitting in a park strip below the chairs). Turn Absent off: pile, hand zone, cards, and the PC token should all come back to Red’s chair.

Then, without changing any NPC tokens on the stage, drag Red’s PC token onto a different empty chair snap and click **Apply**. Red’s **live pile** on the table should move to that numbered chair, not only the token on the control board.

**Context:** Absent was hiding the pile but leaving the hand zone (and often the cards) at the table, and parking the PC token on the board. Apply that only moved PC tokens also skipped seat layout because the NPC reconciler thought nothing had changed.

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._
