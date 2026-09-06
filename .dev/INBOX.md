# Inbox

## Agent Routing

Read this when:
- processing quick-capture bugs, ideas, and external-work notes into Linear issues
- running or updating the `/tr-inbox` workflow

Source of truth:
- this file for raw unshaped capture
- `.cursor/skills/tr-inbox/SKILL.md`
- `.cursor/rules/toronto-rising-linear.mdc`
- `.dev/RUNNING TASKLIST.md`

Verification:
- promoted items have matching Linear issues
- processed items move out of active capture sections
- `.dev/RUNNING TASKLIST.md` and Linear stay aligned

## For Immediate Implementation
> _After registering each of these issues with Linear in the ordinary fashion, before updating the Focus Stack, briefly review the issue: If it is a quick or easy fix, implement it immediately without waiting for author confirmation. Otherwise, promote it to the top of the Focus Stack, and offer to begin work on it immediately when summarizing your work processing `INBOX.md` to the author. If multiple issues require promotion in this way, consider how best to resolve them as quickly as possible, and offer to draft an implementation plan in your response to the author._

- [Phases Panel] Add a click-again-to-confirm functionality to the "Advance ->" button, with the message "Click Again to Confirm" appearing in red text to the immediate right of the Advance button after the first click, and disappearing after the confirmation OR after the second click window closes.
- [Main & Downtime Phases] Tightly couple the Main subphase to the existence of an active scene: When a scene is applied, the subphase should be switched to "Main", and when a scene is ended (or whenever there is no established scene), the subphase should switch to "Downtime". The "Main" and "Downtime" buttons in the Phases panel should only ever switch to the appropriate subphase, regardless of which one is clicked, and if this would result in no change of phase, the button should no-op.  (E.g. clicking "Main" during a Memoriam subphase should end the Memoriam subphase, but return to "Downtime" if the Memoriam subphase was started outside of an active scene, and to "Main" if there was an active scene when Memoriam was initialized, restoring that scene as it was.)
- [Dice Bag Rescaling] Player dice bags and companion toggles should never have their scale changed at any point in the script. Please confirm scale remains unchanged — I'm not sure how it happened, but Blood Surge bags in particular were scaled up at some point by a script action.


## Active

## External Work (Set STATUS to "External To Do")

## Future Features (Set STATUS to "Future")

## Author Workspace
> _Do NOT process these items during any INBOX processing, unless explicitly instructed to by the author: They are works-in-progress, and will be moved into the processing area above when completed._

### Memoriam Phase
When the subphase is advanced to "Memoriam" in the "Phases" menu, the Memoriam modal (`memoriam_modal.xml`) is revealed to the Host to configure the Memoriam scene. The modal will return a table with the following format:

```lua
{
  assignments = {
    aishe = {
      kind = "self"
    },
    lucien = {
      key = "jesseSharp",
      kind = "library",
      label = "Jesse Sharp"
    },
    rashid = {
      key = "myleneHamelin",
      kind = "library",
      label = "Mylene 'the Puck' Hamelin"
    }
  },
  date = "September 20, 1820",
  location = "Alamut, Afghanistan",
  panel = "panelA",
  periodIndex = 4,
  skyboxKey = "rashid7",
  sliderValue = 920,
  subjectKey = "rashid"
}
```

#### `subjectKey`
Defines which of the five PCs is the subject character of the Memoriam.

#### `skyboxKey` and `panel`
Together with `subjectKey`, these values access the specific data for the Memoriam scene being displayed, via the Memoriam data helper function in `constants.ttslua`:

- `(data).[subjectKey].[skyboxKey]` -- Contains the URL for the transition blindfold image (`blindfoldURL`), and the `npcs` array containing data for NPCs specifically defined for this Memoriam time period. (Note: Full implementation of `npcs` will require placeholder figurines and tokens in the game world, stored in `guids.ttslua`, which have yet to be implemented.)
- `(data).[subjectKey].[skyboxKey].[panel]` -- Contains the data for initializing the game space for the Memoriam scene: `isOutdoors` for weather audio ducking, `weather` to define the weather audio and particles, `locationAudio` to define the key of the ambient looping audio track, and `url` to define the URL for the skybox background image. All of these should be initialized while the transition blindfold is down, following the same procedure for switching scenes. (Note: Some of the location audio tracks are not yet implemented. Location audio should default to the silent track if the indicated key cannot be found.)

#### `assignments`
Contains optional keys for the five PCs, defining whether they are present in the Memoriam as themselves, or the `key` of the NPC they have been assigned to play for the Memoriam. (PC-as-NPC assignment has yet to be implemented, but preparations should be made for its addition in the near future.) `kind` will be one of `"self"` (defining a PC who is present in the Memoriam scene as themselves), `"library"` (defining an NPC that exists in the primary NPC pool), `"generic"` (defining a generic NPC, yet to be implemented) or `"memoriam"` (defining an npc whose details are specific to this Memoriam scene, and can be found via the memoriam data return helper function in `constants.ttslua`). PCs assigned to `"self"` should have their seats remaining activated, while PCs assigned to an NPC should be assigned to play the indicated NPC (once PC-as-NPC is implemented). PCs who are not listed in this table should have their seats deactivated (not unoccupied/absent, just deactivated, as if running a scene that they are not present at). Absent PCs included in `assignments` should be ignored (i.e. they should remain absent). Note: The subject character should always be assumed to be `{kind = "self"}`, unless defined as playing an NPC in the modal return data; in this event, the player is entering Memoriam as the assigned NPC (a rare possibility in the rules, but not impossible).

#### `date`, `location` and Clock Interaction
In the game state overlay, the date element should be set to the `date` string returned in the modal data. `time` should default to a random time between midnight and 2:00 AM, or from between ~1h after dusk until midnight. The district text element should be set to the `location` string, and all other elements in that row should be hidden.

The scene clock should then be set to the displayed `time` and `date`, leaving the present-day clock unchanged (i.e. as it currently behaves). Clock controls work as normal during a Memoriam phase, including multiple-year jumps. Do not update the Memoriam time period or otherwise change the details initially returned by the Memoriam modal data when the scene clock is changed via the clock controls.

The real-time clock mode should default to active, at the default clock rate for an active present-day scene (i.e. not the accelerated 'catch-up' rate used for flashback scenes)

#### Re-selecting Memoriam
Memoriam can be re-selected by the Host from within an already-running Memoriam subphase. When this happens, the Memoriam initialization procedure should be rerun (including a blindfolded transition), allowing the Memoriam subphase to be redefined with the new data from the modal return.

#### Memoriam Initialization
- Unless otherwise indicated, transition should generally behave like a scene transition, using the blindfold image defined in the skybox data.
- **Starting PC Stats:** PCs who are playing themselves should retain the Hunger values they had when entering Memoriam, but their Health and Willpower trackers should be completely restored (saving the initial damage values, so they can be restored when Memoriam ends).
- **Default to Table B0:** A Memoriam phase should never begin with NPCs occupying seats at the table (other than NPCs assigned to PCs to play), and it should always begin at **Table B0** (i.e. **Table B** with zero seated NPCs). Additionally, the subject character of the Memoriam should begin seated at seat slot 1. Tables can be changed, PCs can be repositioned, and NPCs can be seated after a Memoriam scene has begun, but Memoriam should always start with these defaults.
- **Scenes Do Not Apply:** The Memoriam subphase is its own scene: There cannot be an active scene while the game is in the Memoriam subphase. Applying a scene from the "Scenes" panel should end the Memoriam subphase (as described below) and return the game to the "Main" subphase with the chosen scene activated, setting the time and date in accordance with the chosen application button, where "NOW" is defined as the time that was displayed just before the Memoriam subphase was initialized. Selecting "End Scene" should end the Memoriam subphase as described below.
- **Ending Memoriam:** When the Memoriam subphase is ended (by selecting "Main"/"Downtime" in the "Phases" menu, or by applying/ending a scene from the "Scenes" menu), PC-as-NPC assignments should be reversed and the game should return to "Main" (if a scene was just applied, or Memoriam was started during an active scene) or "Downtime" (if there was no active scene when Memoriam was initialized). If there was an active scene when Memoriam began and the Memoriam phase was not ended by applying a new scene, the game should be returned to the same state that it was when Memoriam was initialized: Same time, date, staged NPCs, NPCs-at-the-table, PC-as-NPC assignments, light modes, etc. Damage to Health and Willpower trackers sustained while in Memoriam should be locally stored, then the Health and Willpower trackers should be returned to what they were when entering Memoriam. Finally, the recorded Health damage sustained while in Memoriam should be converted to Willpower damage (summing with any Willpower damage suffered), and then that total Willpower damage should be applied to the character's restored Willpower tracker (looping superficial damage into aggravated damage and applying impaired status as required). Hunger should remain unchanged (i.e. Hunger and Willpower damage sustained in Memoriam remains in the present; Health damage is converted to Willpower damage in the present).  PCs who were assigned NPCs to play (yet to be implemented) should not have damage suffered by that NPC applied to the PC trackers, though.

### Generic NPCs
Generic NPCs are NPCs that represent classes or categories of character, such as "police officer" or "dog", and as such multiple copies of these NPCs can exist simultaneously in the game world.

#### Generic NPC Assets
Where named NPCs have a figurine and a token already in the game world, generic NPCs do not: When they are initialized via the Generic NPC Palette (see below), their assets need to be created by cloning two template objects (the figurine, and the control board token), and then assigning the front and back faces of both from URLs stored in the constants library.

* **Generic NPC Figurines** —


### PC-as-NPC Assignment

## Needs clarification

### Unclear Bugs

### Unclear Intents


### Unclear Ideas



---



## Processed

2026-08-30 `/tr-inbox` follow-up — overlay camera left-click default + FirstPerson face-look cycle → **TOR-538** (shipped). Replaces **TOR-521** right-click-default.

2026-08-30 `/tr-inbox` Immediate — randomized Table B seating on cover transition → **TOR-537** (shipped). PAVE ❌ **TOR-518** (PCs panel vertical spacing) follow-up shipped. PAVE ⚠️ **TOR-528** (DEBUG.resetToIntermission) print-to-file removed. Camera overlay button capture parked in Needs clarification (still being typed). PAVE ✅ cleared **TOR-247**, **TOR-531**, **TOR-532**, **TOR-533**, **TOR-534**, **TOR-535**, **TOR-536**, **TOR-519**, **TOR-520**, **TOR-521**, **TOR-522**, **TOR-523**, **TOR-525**.

2026-08-29 `/tr-inbox` Immediate — humidity overlay hide → **TOR-517** (shipped); PCs panel vertical trim → **TOR-518** (shipped); scene library name-only → **TOR-519** (shipped); rain particle X/Z follow table → **TOR-520** (shipped); camera-button right-click default → **TOR-521** (shipped); CSHEET strip right-click roll camera → **TOR-522** (shipped); Spotlight carousel Y −55 / Z 125 → **TOR-523** (shipped); End→Intermission `overlay_blindfold_end` → **TOR-524** (shipped); session num/title grow rates → **TOR-525** (shipped). Auto Rouse lock+1s broadcast → **TOR-526** (Focus #1). Downtime subphase spec → **TOR-527** (Focus #2). End overlay **DEBRIEF** already shipped in **TOR-98**. Session starter max volume / no fade already shipped in **TOR-497** / **TOR-515**. PAVE ✅ cleared **TOR-98**, **TOR-508**, **TOR-509**, **TOR-510**.

2026-08-26 Immediate — Memoriam skybox sheet import (`SKYBOXMEMORIAMCSV` → `SkyboxesCatalog.MemoriamSkyboxes` / `C.MemoriamSkyboxes`) → **TOR-510** (shipped)

2026-08-22 late inbox follow-up — PAVE ✅ **TOR-506** (End→Intermission audio with the cover). **TOR-439** remains the multiclient gate.

2026-08-22 late `/tr-inbox` — capture empty. PAVE ✅ cleared **TOR-503** (catalog load), **TOR-502** (End→Intermission cover settle), **TOR-504** (Play seat lights), **TOR-492** (queued roll broadcasts), **TOR-493** (concurrent idle Rouse), **TOR-505** (frenzy hides Rouse bags), **TOR-498** (rain particles). Added Outstanding **TOR-506** (End→Intermission audio with cover). Focus → **TOR-507**, **TOR-81**, **TOR-98**. **TOR-439** remains the multiclient gate.

2026-08-22 evening inbox follow-up — frenzy disables Rouse checks → **TOR-505** (shipped; pending Save & Play).

2026-08-22 evening `/tr-inbox` — capture empty. PAVE ✅ cleared **TOR-497** (Intermission→Play overture), **TOR-501** (Advance wait past 60s), **TOR-500** (idle Rouse panel hide), **TOR-499** (Hunger-5 Frenzy auto-open), **TOR-494** (featured tracks fade location), **TOR-496** (seat-role offset dump). Added Outstanding **TOR-498** (rain particles), **TOR-502** (End→Intermission cover settle), **TOR-503** (catalog load / getTracks), **TOR-504** (Play seat lights). Focus → **TOR-81**, **TOR-98**, **TOR-168**. **TOR-439** remains the multiclient gate.

2026-08-22 `/tr-inbox` Immediate — outdoor rain particles → **TOR-498** (Focus #1 High); hide player roll panel on idle auto-Rouse → **TOR-500** (shipped); Hunger-5 Frenzy auto-open D4 + no Cancel → **TOR-499** (shipped). PAVE added **TOR-492** / **TOR-493** / **TOR-494** / **TOR-496** / **TOR-497** / **TOR-501** / **TOR-499** / **TOR-500**. **TOR-439** remains the multiclient gate.

2026-08-18 Immediate — featured tracks fade location ambience (Ravenwing nightclub bed) → **TOR-494** (shipped; pending Save & Play)

2026-08-18 afternoon `/tr-inbox` Immediate — queue overlapping roll broadcasts → **TOR-492** (Focus #1 High); PAVE ✅ cleared **TOR-487** (Take Half + Rouse auto-confirm), **TOR-491** (idle Oblivion-Rouse bag), **TOR-482** (Daysleep Refresh), **TOR-486** (Clear right-click)

2026-08-18 `/tr-inbox` capture empty; PAVE ✅ cleared **TOR-488** (Apply Location full blindfold) and **TOR-489** (Compulsion variant tally); Immediate follow-ups shipped: **TOR-487** (Take Half + Rouse auto-confirm), **TOR-482** (Daysleep Refresh no live scene + overlay hide), **TOR-486** (one token scan on right-click Clear); **TOR-490** already author-confirmed; **TOR-491** added to Outstanding

2026-08-14 `/tr-inbox` Immediate — Take Half with Rouse should auto-roll → **TOR-487** (Focus #1 High); Apply Location full blindfold + district/site cards → **TOR-488** (Focus #2 High); Compulsion variant tally on first choice → **TOR-489** (Focus #4 High)

2026-08-06 PAVE-only — ✅ cleared **TOR-462** / **TOR-481** / **TOR-484** / **TOR-449** / **TOR-469**; ❌⚠️ **TOR-485** → **TOR-486** (Clear right-click no-op + palette re-snap; Focus #1)

2026-08-06 evening `/tr-inbox` — capture empty; PAVE ✅ cleared **TOR-476** / **TOR-472** / **TOR-477** / **TOR-478** / **TOR-479** / **TOR-480** / **TOR-483**; added Outstanding for **TOR-462** / **TOR-459** / **TOR-481** / **TOR-484** / **TOR-485** / **TOR-449** / **TOR-469**; canceled duplicate **TOR-474** (→ **TOR-476**); Focus → **TOR-439**, **TOR-482**, **TOR-418**, **TOR-419**

2026-08-06 INBOX Immediate + PAVE — Set present-day tint → **TOR-480** (shipped); Daysleep Refresh → **TOR-482**; ST/debug hotkeys → **TOR-481**; TOR-469 audio ❌ → **TOR-476** (Focus #1); TOR-222 dusk/dawn → **TOR-472**; Years Go → **TOR-477**; TOR-402 skybox blindfold → **TOR-478**; TOR-394 debug clock ❌ → **TOR-479**; CSHEET right-click tray seat → **TOR-483** (shipped); PAVE ✅ cleared (403/404/405/396/471/238/413/414/460/461/100/453/452/450/451)

2026-08-04 INBOX Immediate — map sidebar active chrome → **TOR-462** (Focus); Spotlight→End blindfold → **TOR-459**; CSHEET right-click diceTray → **TOR-460** (shipped); Map/Court/Coteries exclusive → **TOR-461** (shipped); Tarot Pink camera → **TOR-100** (shipped; id reused — Linear free create limit); External client settings → **TOR-88** (repurposed); External snowfall → **TOR-463**

2026-08-03 INBOX Immediate — location/camera full-alpha → **TOR-450** (shipped); sidebar tint grey/white/red → **TOR-451** (shipped); Scene Time no-selection → **TOR-453** (Focus #1 High); Compulsion+companion tray → **TOR-452** (Focus #2 High); External willpower modal → **TOR-454**; Aspects→Conditions → **TOR-456**; spotlight tune → **TOR-455**

2026-08-03 INBOX Immediate — ST tray/light before dice + match player randomize pop → **TOR-448** (Focus #1 High); Scenes preview deselect + THERE close guard → **TOR-449** (Focus #2 High; `blockedBy` **TOR-417**); Remove FirstPerson on blindfold/scene transition → **TOR-446** (shipped); Tarot shuffle on activate → **TOR-447** (shipped)

2026-07-19 Project die white past end date (skip `project_die_0`) → **TOR-421**

2026-07-19 Group flip: inconsistent family, wrong faces, Y sink, stage light without Apply → **TOR-419**

2026-07-19 Clock lerp closes panel / time unchanged (silent no-op) → **TOR-418** (validate before close; AlertGM; no Sync.full on zero delta)

2026-07-19 Far-ring overflow (num=6 ±half stack) + bee hive leader no accompany → **TOR-415**

2026-07-19 Author verify TOR-412: close-family group relocate left tokens behind → **TOR-413**; palette tokenScale on place + group flip → **TOR-414**

2026-07-19 Inbox Immediate Stage Control Board Solo/Group → **TOR-412** (hold hotkey `Group move (hold)`; revised from toolbar toggle — TTS cannot read OS Shift on drop)

2026-07-19 Inbox Immediate → **TOR-402** (skybox-only Apply Location), **TOR-403** (clock lerp parse `|`), **TOR-404** (Advance toolbar close lag), **TOR-405** (close toolbar before clock lerp), **TOR-406** (debug timestamp on open), **TOR-407** (debug offset −20 −20), **TOR-408** (occupied seat → sheet camera), **TOR-409** (signal chrome on seat buttons), **TOR-410** (stage snap tokenScale), **TOR-411** (Pink Tarot Y 7.7) — implementing this session

2026-07-17 Inbox — Immediate NOW+N travel Apply → **TOR-401** (Focus #1 High; not a one-liner — wire PresentDayClock + Apply registry); Active TOR-222 clock grids → Linear description refreshed (Focus #2 Medium; relatedTo TOR-400); TOR-400 remains estimate-only

2026-07-17 **TOR-398** (global blindfold flicker) + **TOR-395** (ST toolbar collapse on panel close) shipped — Linear Done; Focus empty (propose next); commits `3c616b6` / `cd3d7ad`

2026-07-17 Cloud agent **TOR-392** (TTS API agent/docs guardrails) reviewed complete — Linear Done; Focus already #1 **TOR-398** / #2 **TOR-395**; phases **TOR-390**/ **TOR-391**/ **TOR-392** tasklist `[x]`

2026-07-17 INBOX Immediate — debug last-load clock → **TOR-394** (shipped); ST toolbar collapse on panel close → **TOR-395** (Focus #2); debug toolbar +100px → **TOR-396** (shipped); sessionNum InputField stale after End → **TOR-397** (shipped); global blindfold flicker load/Intermission→Play → **TOR-398** (Focus #1); Focus refresh (**TOR-390**/ **TOR-391** Done → **TOR-392** unblocked)

2026-07-16 Focus refresh — **TOR-204** (Compulsions deck) removed from Focus (Done); **TOR-384** (Global HUD first load) deprioritized (No priority); **TOR-329** split → **TOR-390** / **TOR-391** / **TOR-392**; Focus quick fixes **TOR-140**, **TOR-139**, **TOR-393**, **TOR-371**

2026-07-16 INBOX Immediate — Stage NPC token Y too low on scene transition → **TOR-393** (NPC Bug, Quick Fix; Focus #4)

2026-07-16 INBOX Immediate — Seated NPCs retain seats when switching to scene without those slots → **TOR-389** (Scenes Bug, High; Focus #2; relatedTo **TOR-278**, **TOR-275**)

2026-07-16 INBOX Immediate — Compulsions revised draw/select/remove + ColorObject + one-at-a-time deck lock → **TOR-204** (Table Objects Feature, High; Focus #1)

2026-07-15 INBOX Immediate — Prince's Court stake disabled dots → **TOR-387** (Character Sheets Bug; shipped)

2026-07-15 INBOX Immediate — `sheetDisplay:false` Status overlays + Stats/Projects → **TOR-385** (Character Sheets Feature, High)

2026-07-15 INBOX Immediate — Domain ratings chasse/lien/portillon/haven in Stats + PE → **TOR-386** (Character Sheets Feature, High)

2026-07-15 INBOX Active — Global HUD missing on first save load → **TOR-384** (UI & HUD Bug, High; relatedTo **TOR-285**, **TOR-381**)

2026-07-15 INBOX Immediate — Project Editor start-date space-split parse → **TOR-383** (Character Sheets Bug; shipped)

2026-07-13 Multiclient E2E closed — **TOR-144** / **TOR-249** Done (real clients); residual join HUD → **TOR-381** (TTS External); Focus refresh + **TOR-293** unblocked

2026-07-13 INBOX Future Features — coterie sheet notes → **TOR-382** (Character Sheets Feature, Future; parent **TOR-38**)

2026-07-13 INBOX Priority Issues — Focus #1–#4: **TOR-380** (SIGNAL_FIRE Y fan-out), **TOR-377** (court tracker flash), **TOR-378** (Orange throne postCorrections), **TOR-379** (map north pin buffer)

2026-07-12 INBOX Priority Fixes — END library wipe (capture only) → **TOR-365** (Scenes Bug, High; relatedTo **TOR-145**; not in implement batch)

2026-07-12 INBOX Priority Fixes — Focus re-stack: #1 **TOR-149**, #2 **TOR-344**, #3 **TOR-369**, #4 **TOR-366**, #5 **TOR-368**, #6 **TOR-288**, #7 **TOR-367** (also created **TOR-365** capture-only)

2026-07-12 INBOX Priority Fixes — stage figurine lerp confirm → **TOR-367** (NPC Improvement, High; parent **TOR-169**)

2026-07-12 INBOX Priority Fixes — Intermission theme fade-in → **TOR-366** (Soundscape Bug, High; relatedTo **TOR-360**)

2026-07-12 INBOX Priority Fixes — camera before blindfold raise → **TOR-368** (Lighting Bug, High; parent **TOR-34**)

2026-07-12 INBOX Priority Fixes — stage spotlight long-way rotation → **TOR-369** (NPC Bug, High; parent **TOR-169**)

2026-07-12 INBOX Priority Fixes — promote **TOR-149** (ST tray lights) + **TOR-344** (ST drawer X/Z) + scoped **TOR-288** (Red/Brown famulus)

2026-07-11 INBOX Quick Fix — constants unicode-minus normalize in npm build → **TOR-342** (Foundation Improvement, Low; parent **TOR-30**; relatedTo **TOR-137**; shipped)

2026-07-11 INBOX Priority Fixes — CSHEET pages all hide (≥2 visible) → **TOR-343** (Character Sheets Bug, High; parent **TOR-38**)

2026-07-11 INBOX Priority Fixes — scene change HUD stale until Scenes panel → **TOR-346** (Scenes Bug, High; parent **TOR-33**; relatedTo **TOR-314**)

2026-07-11 INBOX Blocking TOR-249 — Steam ID auto seat colors → **TOR-345** (Players Bug, High; blocks **TOR-249**; relatedTo **TOR-94**, **TOR-293**, **TOR-144**)

2026-07-11 INBOX Blocking TOR-249 — phase sequencing → updated **TOR-143** (Intermission→Play→Spotlight→End; Play Main/Downtime/Memoriam; High; blocks **TOR-249**); **TOR-319** title/scope aligned

2026-07-11 INBOX Active — ST dice drawer absolute X/Z per table → **TOR-344** (Dice Feature, Medium; parent **TOR-31**; relatedTo **TOR-302**)

2026-07-11 Focus re-stack — #1 **TOR-343**, #2 **TOR-346**, #3 **TOR-345**, #4 **TOR-149**, #5 **TOR-328**, #6 **TOR-143** (prior **TOR-331**–**TOR-335** Done)

2026-07-10 INBOX Priority Fixes — Focus re-stacked: #1 **TOR-331**, #2 **TOR-332**, #3 **TOR-333**, #4 **TOR-334**, #5 **TOR-335** (replaces TOR-149 → TOR-328 → TOR-141 → TOR-329 → TOR-286)

2026-07-10 INBOX Priority Fixes — Hunger 4/5 Blood Surge + Rouse combo rules → **TOR-331** (Dice & Rolls Bug, High; parent **TOR-31**; relatedTo **TOR-203**)

2026-07-10 INBOX Priority Fixes — hide player Cancel on ST-initiated rolls → **TOR-332** (Dice & Rolls Improvement, Medium; parent **TOR-31**; relatedTo **TOR-328**, **TOR-306**)

2026-07-10 INBOX Priority Fixes — NPC seat buttons + control-board token sync → **TOR-333** (Scenes & Chronicle Bug, High; parent **TOR-33**; relatedTo **TOR-244**, **TOR-250**, **TOR-311**)

2026-07-10 INBOX Priority Fixes — Table B by highest occupied NPC slot → **TOR-334** (Scenes & Chronicle Bug, High; parent **TOR-33**; relatedTo **TOR-258**)

2026-07-10 INBOX Priority Fixes — ST roll dash baked-in conditions sync → **TOR-335** (Dice & Rolls Bug, High; parent **TOR-31**; relatedTo **TOR-259**, **TOR-260**, **TOR-209**)

2026-07-10 **TOR-315** (NPC stage spotlight Y) — Done; author verified NPC lights 2026-07-10

2026-07-09 INBOX Quick Fix — Blood Surge Hunger bag on Discipline rolls → **TOR-325** (Dice & Rolls Bug, High; parent **TOR-31**; shipped)

2026-07-09 INBOX Quick Fix — peer tray lower delta Y=4.77 → **TOR-326** (Dice & Rolls Bug, Medium; parent **TOR-31**; relatedTo **TOR-316**; shipped)

2026-07-09 INBOX Active — POST_ROLL confirm-only auto-broadcast → **TOR-328** (Dice & Rolls Improvement, Medium; parent **TOR-31**; relatedTo **TOR-306**)

2026-07-09 INBOX Active — TTS API heavy-workload function audit → **TOR-329** (Agent Reviews Improvement, Medium; parent **TOR-39**; relatedTo **TOR-50**, **TOR-197**)

2026-07-09 INBOX Active — Fomorach animal-form shapeshift toggle → **TOR-330** (Character Sheets Feature, Medium; parent **TOR-38**; `blockedBy` **TOR-327**)

2026-07-09 INBOX External — Fomorach Shapeshift stat deltas → **TOR-327** (Workshop External Todo; parent **TOR-38**)

2026-07-09 INBOX Quick Fix — Clear Loading Overlay resurrect after seat refresh → **TOR-323** (UI & HUD Bug, High; parent **TOR-37**; relatedTo **TOR-285**; shipped)

2026-07-09 INBOX Quick Fix — Toggle Lights ambient 0↔2 debug button → **TOR-322** (UI & HUD Improvement, Low; parent **TOR-37**; shipped)

2026-07-09 INBOX Active — reverse live-roll tray motion (lower peers, keep roller) → **TOR-316** (Dice & Rolls Bug, High; parent **TOR-31**; relatedTo **TOR-262**)

2026-07-09 INBOX Active — right-click ROLL auto-rolls for players → **TOR-317** (Dice & Rolls Feature, Medium; parent **TOR-31**; relatedTo **TOR-226**)

2026-07-09 INBOX Active — spawn above bag then smooth-move into arc → **TOR-318** (Dice & Rolls Improvement, Medium; parent **TOR-31**; `blockedBy` **TOR-310**; relatedTo **TOR-287**)

2026-07-09 INBOX Active — Intermission phase (dark lights, connect blindfold, advance to Start) → **TOR-319** (UI & HUD Feature, Medium; parent **TOR-143**; `blockedBy` **TOR-143**; relatedTo **TOR-263**, **TOR-293**)

2026-07-09 INBOX Active — scene light modes as color tones → **TOR-320** (Lighting & Camera Feature, Medium; parent **TOR-34**; `blockedBy` **TOR-81**; relatedTo **TOR-24**)

2026-07-09 INBOX Active — subtle scene LUTs (Memoriam sepia first) → **TOR-321** (Lighting & Camera Feature, Medium; parent **TOR-34**; `blockedBy` **TOR-81**; relatedTo **TOR-101**, **TOR-143**, **TOR-320**)

2026-07-08 INBOX Quick Fixes — scenes location modals (HUD until Apply, modal sort, district→site flow, site/district guard) → **TOR-314** (Scenes & Chronicle Bug, High; parent **TOR-33**; relatedTo **TOR-244**, **TOR-82**; shipped)

2026-07-08 INBOX Active — NPC stage light before imageScalar rescale → **TOR-315** (NPC & Spotlight Bug, High; parent **TOR-35**; relatedTo **TOR-266**, **TOR-234**, **TOR-178**)

2026-07-08 INBOX Quick Fix — preload pool dice destroyed instead of returned → **TOR-308** (Dice & Rolls Bug, High; parent **TOR-31**; relatedTo **TOR-287**)

2026-07-08 INBOX Quick Fix — smooth preload spawn + ST Y=8 before unlock → **TOR-310** (Dice & Rolls Improvement, Medium; parent **TOR-31**; `blockedBy` **TOR-308**)

2026-07-08 INBOX Active — Scenes panel NPC seat disable clears all seated NPCs → **TOR-311** (Scenes & Chronicle Bug, High; parent **TOR-33**; relatedTo **TOR-250**, **TOR-281**)

2026-07-08 INBOX Active — difficulty-0 roll results display → **TOR-309** (Dice & Rolls Improvement, Medium; parent **TOR-31**; relatedTo **TOR-163**, **TOR-296**)

2026-07-08 INBOX Active — roll broadcast successes for narrative roll types → **TOR-312** (Dice & Rolls Bug, Medium; parent **TOR-31**; relatedTo **TOR-296**, **TOR-309**)

2026-07-06 INBOX Quick Fix — preload pool `d10` blocked table layout → shipped (`d10Preload` tag + bag-anchored reposition on `SyncTable`; TOR-287)

2026-07-06 INBOX Quick Fix — control board Apply dice-guard retry skipped → **TOR-304** (NPC & Spotlight Bug, High; parent **TOR-169**; relatedTo **TOR-243**)

2026-07-06 INBOX Quick Fix — player dice tray open on roll initiate → **TOR-305** (Dice & Rolls Improvement, Medium; parent **TOR-31**)

2026-07-06 INBOX Quick Fix — Take Half auto-broadcast / single-button proceed → **TOR-306** (Dice & Rolls Improvement, Medium; parent **TOR-31**; relatedTo **TOR-73**, **TOR-226**)

2026-07-06 INBOX External — roll broadcast phrasing author review → **TOR-303** (External Todo; parent **TOR-31**; relatedTo **TOR-296**)

2026-07-05 INBOX Quick Fixes — Scenes panel closes on manual Table button (`closeScenesPanel` in `StorytellerScenesPanel.onHudClick`)

2026-07-05 INBOX Quick Fixes — floor/plinth XZ follow active table origin on table switch (`syncSharedFloorAndPlinthToTableOrigin` in `lib/rotational-seat-layout.ttslua`)

2026-07-05 INBOX Active — seated NPC ST roll drawer/spawn/light reposition → **TOR-302** (Dice & Rolls Feature, Medium; parent **TOR-31**)

2026-07-05 INBOX External — Clan Compulsions Influence line only on CSHEET → **TOR-299** (Workshop, Medium; parent **TOR-38** Character Sheets)

2026-07-05 INBOX External — GM review sheets for in-play Advantages → **TOR-300** (Workshop, Medium; relatedTo **TOR-38**, **TOR-279** Stats panel)

2026-07-05 INBOX Quick Fixes — Color Blitz + Jarvis Jacks coterie ref grid (`inCoterieRef`, XML grid/popups); relatedTo **TOR-190** (coterie infographics)

2026-07-05 INBOX Quick Fixes — seat-color gate player dice bags + signal candles (`objects/dice_bag.ttslua`, `ui/ui_signal_candle.ttslua`)

2026-07-05 INBOX Quick Fixes — ST roll panel click hint font 8→12 (`panel_storyteller_roll_controls.xml`)

2026-07-05 INBOX Quick Fixes — secret ST roll reveal tray dice on **B** broadcast (`core/roll_controller.ttslua`; extends **TOR-226**)

2026-07-05 INBOX Quick Fixes — roll broadcast message audit → **TOR-296** (Dice & Rolls Improvement, Medium)

2026-07-05 INBOX Active — rouse-only broadcast dice in main row → **TOR-294** (Dice & Rolls Bug, Medium)

2026-07-05 INBOX External — reference overlay typos + Compulsion XP → **TOR-295** (Workshop, Medium; relatedTo **TOR-105**)

2026-07-05 INBOX External — famulus Disciplines sheets → **TOR-297** (Workshop, Medium; relatedTo **TOR-110**)

2026-07-05 INBOX External — Black Caesar ghoul cutouts/sheets → **TOR-298** (Workshop, Medium)

2026-07-05 **TOR-285** (connect-time HUD visibility) — Done; author verified Save & Play; hotseat minor wrinkles likely hotseat-only; multiclient deferred TOR-144

2026-07-05 INBOX Quick Fixes — REMORSE roll pool lock + phase label → **TOR-289** (Dice & Rolls Improvement, Medium)

2026-07-05 INBOX Quick Fixes — ST roll dash broadcast persistence for all rolls → **TOR-292** (Dice & Rolls Improvement, Medium)

2026-07-05 INBOX Quick Fixes — stage control board Unlocked button font → **TOR-290** (NPC & Spotlight Improvement, Medium)

2026-07-05 INBOX Quick Fixes — gitignore `bundle-size-gate.json` (INBOX.md stays tracked) → **TOR-291** (Foundation & Tooling Improvement, Low)

2026-07-05 INBOX Active — absent player connect/disconnect presence override → **TOR-293** (Players & Connection Feature, High; `blockedBy` TOR-144)

2026-07-04 INBOX Active — connect-time UI missing until reload (White/unseated) → **TOR-285** (UI & HUD Bug, High; relatedTo TOR-144 multiplayer E2E)

2026-07-04 INBOX Active — centralize `setInvisibleTo` helper + Test tool visibility audit → **TOR-286** (Table Objects Improvement, Medium)

2026-07-04 INBOX Active — dice preload pool for instant spawn → **TOR-287** (Dice & Rolls Improvement, Medium)

2026-07-04 INBOX Active — player companion toggle tiles (flip, reconcile, dual-face UI) → **TOR-288** (Table Objects Feature, Medium)

2026-07-03 INBOX Active — ST dice tray ellipse spawn (drawer center + bounds rings 10/8/6, Y layers +2) → `lib/st_dice_tray_spawn.ttslua`, `GlobalRepositionStorytellerTrayDice`

2026-07-03 INBOX Active — ST token-on-bag roll type mapping + `Werewolf` tag override → **TOR-283** Done

2026-07-03 INBOX Quick Fixes — Tarot deck `interactable=false` when hidden (`lib/tarot_toggle.ttslua`, startup sync in `core/global_script.ttslua`)

2026-07-03 INBOX Active — NPC stage token Description JSON stats → **TOR-282** (created after archival freed quota)

2026-07-03 INBOX Active — Compulsions deck full pick-and-present flow → **TOR-204** (Compulsions deck) description expanded; tasklist updated

2026-07-03 INBOX Quick Fixes — Frenzy/Remorse result broadcast copy + frenzy overlay on fail (`core/roll_ui.ttslua`, `core/roll_controller.ttslua`); Table A leaf `alsoEnable` bridging (`lib/constants.ttslua`, `lib/rotational-seat-layout.ttslua`)

2026-06-27 TOR-281 — Stage Clear seat activation rules + live scene-library seat persistence (promoted; NPC & Spotlight, parent TOR-35; relatedTo TOR-250/TOR-178/TOR-265/TOR-244; Medium)

2026-06-27 Storyteller advantages panel — shipped TOR-279 (Storyteller Stats panel); removed stale Active marker

2026-06-27 Scene-switch weather fade-in regression — weather started at full volume instead of fading. Two causes: (1) staged scene Apply work-phase `Sync.full` did not pass `skipSoundscape`, letting a work-phase reconcile re-apply weather via the immediate held-volume path outside the fade window; (2) `Soundscape.reapplyWeatherNaturalVolumes` (called by `applyContext` → `setIndoors`) snapped the still-playing weather emitter to full before the layers faded in. Fix: work sync now skips soundscape (fadeIn is sole authority, matching no-scene path); `reapplyWeatherNaturalVolumes` ramps via `fadeEmitterVolume` when a transition fade window is open (TOR-280; relatedTo TOR-147, TOR-270, TOR-136)

2026-06-27 Map pins on scene change — present PCs show immediately (clock gate `< 0`); absent PCs keep prior pin across scenes (`lastActiveMapPin` moved to top-level gameState, was wiped by sessionScene replace on apply)

2026-06-27 RT clock acceleration on scene change — epoch guard in game_state_overlay ticker so stale Wait callbacks can't spawn duplicate tick chains

2026-06-27 Scene transition sound timing — new-location ambient fade-in now starts as the blindfold RISES (concurrent with lift, ~2s `TRANSITION_FADE_IN_SEC`); blindfold holds down silently for the full settle (`settleDelaySec - workSettleSec`) then lifts via `scheduleEnd(0)` in runStagedTransition (TOR-273 follow-up; supersedes earlier "deferred to end of settle" approach)

2026-06-27 Overlay management — blindfold variants 1..22 randomization (BLINDFOLD_VARIANT_COUNT was 6); removed impaired-willpower + torpor HUD overlays; added derived `stained` overlay (Humanity stains ≥ 1)

2026-06-26 INBOX Quick Fixes — TOR-268 (control-board table-only minimap), TOR-151 amend (no-scene Table B0 baseline), TOR-269 (load soundscape dual-apply), TOR-270 (weather volume-0 before playback)

2026-06-25 TOR-265 — Control-board Apply/Clear flickers off-seat NPC lights on then off (promoted; relatedTo TOR-250/TOR-178)

2026-06-25 TOR-266 — Reposition NPC figurine lights: point down, +5 above top, +3 toward table origin (promoted; relatedTo TOR-234; commit 36b0259 was doc-only despite message)

2026-06-25 TOR-264 — Double music emitters on load: dual-apply fix (`Sync.full` skipSoundscape; load helpers single soundscape authority) (shipped)

2026-06-25 TOR-255 — Blood Surge active disables Take Half (shipped)

2026-06-25 TOR-256 — PC seat deactivate/activate syncs hosted scene+location conditions (shipped)

2026-06-25 TOR-257 — NPC figurine tooltips sync with player visibility (shipped)

2026-06-25 TOR-258 — Automatic table selection by occupied NPC seat count (promoted)

2026-06-25 TOR-259 — Willpower, Discipline, Humanity, Frenzy roll types (promoted)

2026-06-25 TOR-260 — ST Roll Options dash roll-type selector rows (promoted; blockedBy TOR-259)

2026-06-25 TOR-261 — Workshop pentagonal Table B0 model (promoted; human gate)

2026-06-25 TOR-262 — Single live PC roll + lower other trays (promoted)

2026-06-25 TOR-263 — Session number + End Session button (promoted; relatedTo TOR-143)

2026-06-25 ST dice arcs — Rage dice → Hunger (inner) arc not shared w/ Werewolf; ST arc cap 7/arc (vs player 10) (shipped)

2026-06-25 TOR-252 — NPC roll broadcast figurine for duplicate fullName (shipped; authoritative `npcCharacterKey`)

2026-06-25 TOR-253 — Dice spawn-arc overflow layering (cap 10/arc; elevate + nudge extras) (shipped)

2026-06-25 TOR-251 — ST normal grid labels shift by hunger offset (shipped; `refreshStNormalStripLabels`)

2026-06-25 TOR-252 — NPC roll broadcast wrong figurine for duplicate fullName (promoted; display-name lookup root cause documented)

2026-06-25 TOR-250 — Deactivated seat when NPC on stage + scene import rules (promoted from Active)

2026-06-25 pc_control_token load invisibility — `TAG_PC_TOKEN` added to control-board component sweep (partial; toolbar Host visibility already TOR-176)

2026-06-23 TOR-240 — No Take Half player panel phase label (shipped)

2026-06-23 TOR-241 — Player dice spawn arc RING_STEP 1.5 (shipped)

2026-06-23 TOR-242 — CONTROL_BOARD seat row lower-left u/v (shipped)

2026-06-23 TOR-244 — Scene library selection preview + edit-before-apply (promoted)

2026-06-23 TOR-245 — Map pins last active location + timestamp (promoted)

2026-06-23 TOR-247 — Rotational seat index layout (promoted)

2026-06-21 Roll broadcast NPC cutout — prune ST duplicate-roll label suffix " (N)" before cutout lookup (`roll_ui.resolveRollFigureAssetKey`)

2026-06-21 Clear off-world tokens — Y-aware board/palette surface checks; confirmed Clear parks fallen tokens

2026-06-21 Clear first-click lag — arm confirm only (no stray recovery scan on first click)

2026-06-21 TOR-235 — Figurine backs fixed in save (generic transparent back URL; Done)

2026-06-21 TOR-234 — NPC spotlight Y wrong when seat moves to lit stage placement

2026-06-21 TOR-233 — PCs panel HP/WP/Hum tracker row width (shipped)

2026-06-21 TOR-227 — Palette parking snap Z offset (+0.1 board-local) for group labels beneath tokens

2026-06-21 TOR-228 — Design ST Projects panel + modal XML partials (External In Progress)

2026-06-21 TOR-229 — Design coterieData state schema (External In Progress)

2026-06-21 TOR-230 — Design Coterie sidebar sheet XML (External In Progress)

2026-06-21 TOR-231 — Finish Projects planning in Project System Overview.md (External In Progress)

2026-06-21 TOR-232 — Implement Projects system; blockedBy TOR-228–231 (Backlog, High)
