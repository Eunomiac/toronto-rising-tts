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

## Quick Fixes

- [Bug] Any dice objects on the table during the loading sequence should be destroyed (and dice trays stowed) before table sync, to prevent blocking the table setup. (Be sure not to destroy dice in the preload pool, of course)
- [Dice Spawning] Dice should be moved from the preload pool via smooth movement (not lerping, just not instant teleportation) so they appear a bit more dynamic during play.  Additionally, the spawn locations of dice for storyteller rolls should be raised to y = 8 before they are unlocked and randomized.
- [Bug] Dice are not being returned to the preload pool after being used, but are instead being destroyed. Expected behavior: 12 dice per dice bag (for a total of 264 preload dice) should be maintained at all times.  Only excess dice that had to be spawned in because the preload pool ran out should be destroyed on roll resolution, maintaining the same number of preload dice at all times.

## Active

- [Bug] Upon disabling the "NPC3" seat via the Scenes panel, _all_ seated NPCs were _completely_ cleared from the table and the Stage Control Board, and returned to the preload area. Expected Behavior: Only the NPC seated at the NPC3 slot should be affected at all, and even then, their seat should merely be disabled -- they should not be unassigned from the seat entirely.
- [Results Display] A roll opened with no Difficulty should be treated exactly the same as a roll opened with a Difficulty of 0 (the latter is really just the Storyteller's way of confirming they intended no Difficulty be set).  When broadcasting the results of these Difficulty-0 rolls, the results broadcast should not display the Difficulty number, nor should it display a margin. The results display should present as follows:
  - 0 successes -- "Failure" (styled as a normal, non-Total, Failure)
  - 0 successes AND a Hunger die showing 1 -- "Bestial Failure" (styled as a Bestial Failure)
  - 1 or more successes, but not a critical -- "[X] Successes" (styled as a Win)
  - 1 or more successes, clean critical -- "[X] Crit Successes" (styled as a Critical Win)
  - 1 or more successes, messy critical -- "[X] Messy Successes" (styled as a Messy Critical)
  **Important:** This should be the behavior for all roll types except Rouse Checks, Oblivion Rouse Checks, and Simple Checks: Without a Difficulty of at least 1, the focus is on the number of successes rolled (as this is how we will be handling opposed rolls and extended contests).
  **Important:** This is how the roll results for Difficulty-0 rolls should be displayed both in the results broadcast, and on the roll control panels shown to the players / Storyteller
- [Results Display Broadcast] The total number of successes rolled should always be displayed, except for Rouse Checks, Oblivion Rouse Checks, and Simple Rouse Checks.  Currently, Frenzy rolls (as one example) only display the result message and the dice images, but not the number of successes rolled nor the Difficulty of the Frenzy roll.

## External Work (Set STATUS to "External To Do")

## Needs clarification

### Unclear Bugs

### Unclear Intents

### Unclear Ideas

---

## Processed

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
2026-07-04 INBOX Active — centralize `setInvisibleTo` helper + Text tool visibility audit → **TOR-286** (Table Objects Improvement, Medium)
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
