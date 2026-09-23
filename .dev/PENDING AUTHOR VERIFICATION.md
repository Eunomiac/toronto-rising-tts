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

_Last populated: 2026-09-23 morning `/tr-inbox` — Play→Spotlight PC seat reactivate + Scatter objectsToHide re-hide._

### Phases / session end

#### ✅ Play→Spotlight: inactive PC seats reactivate (no new TOR — Linear quota; comment on TOR-98)

**How to verify:** Save & Play so scene/phase scripts reload. Apply a library scene, then deactivate one or two PC seats on the Scenes panel or stage control board so those piles drop (inactive, not Absent).

1. Advance **Play → Spotlight**. Under the cover, those previously inactive seats should come **back to the table** — figurine, sheet, bags, chair, and seat lights as usual.
2. A player marked **Absent** on the PCs panel should stay parked under the table (do not treat Absent as “just inactive”).
3. Optional: start Spotlight from a scene where every PC seat was already active — nothing should flicker or double-move oddly.

**Context:** Spotlight narrative clear emptied NPC seats but left PC `isPresent` from the prior scene. Now it calls `applyDefaultPcSeatPresence` (same helper as no-scene / End), skipping Absent. relatedTo **TOR-98**, **TOR-256**.

### Scatter / table layout

#### ✅ Scatter objectsToHide: Prince signet/curtain stay parked (no new TOR — Linear quota; comment on TOR-572)

**How to verify:** Save & Play so Scatter scripts reload. Start from a normal table (Table A is fine) with Red’s Prince signet, border, and curtain visible to you as Storyteller.

1. Switch to **Scatter**. Those three objects (and the chairs) should **disappear for everyone**, including you — not float in the old chair positions.
2. Optional: move a PC between scatter groups, or open/close the Scatter HUD strip — the Prince props should stay gone.
3. Switch back to **Table A**. Signet, border, and curtain should return with the usual Red-only hide (you can see them; Red cannot).

**Context:** PC pile layout was restoring any `HiddenObject` satellite after Scatter parked the hide list. `applyWorldLayout` now re-parks `objectsToHide` at the end of each pass. relatedTo **TOR-572**.

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

### Character sheets

#### UISet — batch / sequence UI attribute helper (no new TOR — Linear quota)

**How to verify:** Save & Play so Global scripts reload. Open **Execute Lua** on Global.

1. Pick any Global XmlUI element you can see change (for example a debug panel id). Run `UISet("<that_id>", { active = "true" })` then again with `active = "false"`. It should show and hide with no console error.
2. Optional object form: with a character-sheet page GUID from the Objects pane, run `UISet("<guid>", "paper_root", { padding = "50 50 110 100" })` (or another real page-2 id). Confirm no `no object for GUID` / nil UI error.
3. Optional sequence: `UISet("<guid>", "dot_rc_L_2_#", { image = "dot_yellow", active = "true" }, { ["#"] = { 1, 2, 3, 4, 5 } })` should light five dots if those ids exist on that page.

**Context:** Helper from the page-2 XML dump, shipped as `U.UISet` in `lib/util.ttslua` and Global `UISet`. Linear could not create a new issue (workspace free-issue limit).

#### ✅ TOR-595 — Dashboard PCs tab: live-only sheet (no stand-in) + Ambition from gameState

**How to verify:** Save & Play so the snapshot script reloads. Keep External Editor on. Restart the Storyteller Dashboard if it was already running.

1. **Offline notice:** On the **PCs** tab, click **Release Port** (or leave the port unclaimed). You should see a blank spread titled **No live sheet** with a short reason (for example that the dashboard is not holding the editor port). You must **not** see fake character names, Desire, Ambition, or tracker dots from a stand-in sheet.
2. **Live sheet:** Click **Claim Port**. The status should say it is live from Tabletop Simulator. Player cards and page 1 should fill from the table. Subtitles and chronology come from the live seat snapshot (PCS identity in TTS), not from a dashboard hardcode file.
3. **Ambition:** In Execute Lua / TEST BED, run something like `SetPcAmbition("aishe", "Create a legacy in Toronto that long outlasts me")` for a few seats. After Claim Port (or wait a couple of seconds for the poll), each Ambition line under the name on page 1 should match what you set. Empty `playerData.ambition` shows no quote — it must not invent text from the PCS catalog.
4. Optional: click **JSON** next to Claim/Release Port — a scrollable modal should show pretty-printed data for the seat on screen. Paste a partial patch (for example new `titles` / `convictions` arrays and a nested `attributes.charisma.base`), click **Apply**, and confirm the live sheet updates (arrays replace; nested objects merge). Escape or Close dismisses the modal. Hunger / Desire clicks still paint immediately (**TOR-595** batch apply).

**Context:** Follow-up on the live PCs bridge (**TOR-595**). Snapshot/apply live in `dashboard/pc_sheet.ttslua` (`require("dashboard.pc_sheet")`). Snapshot fields include identity + `ambition` from `playerData`. Dashboard never paints a fixture when TTS is unreachable.

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

#### Pink Tarot Consult: one delayed place at authored height (no new TOR — Linear quota; relatedTo TOR-411)

**How to verify:** Save & Play so `lib/tarot_toggle.ttslua` reloads. Put Pink’s tarot away (deck at y ≈ −200). Confirm `C.ObjectPositions.TAROT_DECK_PINK.on.height` is the height you want (currently **8.5**).

1. Click **Consult the Tarot**. The **drawer** should start opening first. The **deck** should stay invisible for about **1.5 seconds** (`on.delay`), then appear **once** on the deck anchor at height **8.5** — not flash at the drawer surface and then hop up.
2. Put it away again: park at −200. Consult again: same single delayed appear at 8.5.
3. Optional: change `height` to another value, Save & Play, Consult — the deck should land at that new height on first appearance (no earlier wrong height).

**Context:** Reveal was calling `GlobalRestoreObject` immediately (ignoring delay) and then `applyResolvedPose` again after `on.delay`, so the deck popped early at the wrong height and snapped a second time. relatedTo **TOR-512** / **TOR-411**.

#### TOR-513 — Absent hand zone, PC token stash, and Apply PC reseat

**How to verify:** Save & Play so the new scripts load. Put a few cards in Red’s hand. On the PCs panel, turn **Absent** on for Red. Red’s pile should drop under the table, the **hand zone should go with it** (Y about −200), and **those cards should move under the table too** — they should not stay floating at table height. Red’s PC token on the stage control board should disappear (locked under the board, not sitting in a park strip below the chairs). Turn Absent off: pile, hand zone, cards, and the PC token should all come back to Red’s chair.

Then, without changing any NPC tokens on the stage, drag Red’s PC token onto a different empty chair snap and click **Apply**. Red’s **live pile** on the table should move to that numbered chair, not only the token on the control board.

**Context:** Absent was hiding the pile but leaving the hand zone (and often the cards) at the table, and parking the PC token on the board. Apply that only moved PC tokens also skipped seat layout because the NPC reconciler thought nothing had changed.

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._
