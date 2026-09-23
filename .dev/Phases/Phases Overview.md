# Phases Overview

## Agent Routing

Read this when:
- changing top-level phase sequence, Play subphases, or phase enter/exit events
- touching `core/phases.ttslua`, `panel_phases.xml`, or phase HUD handlers
- Memoriam enter/exit, catalog, or popup: also read [`Memoriam.md`](Memoriam.md)

Source of truth:
- `core/phases.ttslua` (lifecycle registries + `advanceTo` / `setPlaySubPhase`)
- `core/memoriam.ttslua` / `core/memoriam_modal.ttslua` (Memoriam enter/exit + popup; see [`Memoriam.md`](Memoriam.md))
- `core/session_explode.ttslua` (Intermission→Play stacked cover explode)
- `core/spotlight.ttslua` (Spotlight carousel, hide-list, Host strip)
- `lib/constants.ttslua` (`C.Phases`, `C.PhaseSequence`, `C.PlaySubPhases`)
- `ui/storyteller/panel_phases.xml`
- `ui/storyteller/panel_spotlight_controls.xml`

Verification:
- Save & Play → Host Phases panel → **Advance →** (first click shows red confirm; second click within 5s Advances and the panel closes) through Intermission → Play → Spotlight → End → Intermission
- Confirm Intermission enter from End: blackout fades in (`overlay_blackoutPanel`, 5s), TR_Loop fades in over 2s starting 3s after that show while other audio fades out, then the ended-session splash appears instantly under the blackout and the blackout fades out. Camera, table, and AdminDark wait until 6s after the blackout hide. Play: OutdoorDim lights and HUD arm behind the cover first, then a settle (`C.SessionStartPlayEnterSettleSec`); then the session-start splash with Music C after the authored song lead-in, or **Quick Transition** (`playAttribute(0)`, no Music C); the panel hides near the end of that session's song (or the unscalable tail), layers reset, then Main fades in and the Willpower heal overlay can appear. First Play with no live scene starts in **Downtime** (TOR-527); that first overlay is prologue copy (TOR-598).
- Play → Spotlight: staged transition cover; Table A + Spotlight skybox; Main keeps playing; in-session stand-ins on the carousel; overlay shows the session name in the diamond slot, **S P O T L I G H T** in gold, and the front character name in white. Spotlight → End: same cover; Main keeps playing; table becomes B0 (PC seats only, NPCs stay off the table); Generic skybox is selected; overlay uses the same bookend copy as session-start prologue (**TORONTO RISING** / compact roman / spaced title) with **EPILOGUE**; bags/companions/compulsion decks stay under the table until Intermission cover
- Workshop: Host console `lua DEBUG.populateSpotlightFigurines()` clones seat figures and spawns tagged lights, then prints GUIDs for `lib/guids.ttslua`. Play → Spotlight does **not** auto-spawn (duplicates if GUIDs are forgotten).
- Re-test Intermission→Play without cycling Spotlight/End: Host console `lua DEBUG.resetToIntermission()` (session cover + TR_Loop, no table/skybox move). Then **Advance →**.
- Solo Host verified only until **TOR-144** (multiplayer E2E) — multiclient connect blindfold + Advance replication: [Multiclient Session Script](../E2E%20Playbooks/Multiplayer-Session.md) (A4, B0, D1)

Status: current (TOR-143 / TOR-361 / TOR-362 / TOR-497 / TOR-516 / TOR-531 / TOR-532 / TOR-533 / TOR-534 / TOR-98 / TOR-527 / TOR-578 / TOR-580 / TOR-581 / TOR-598 / TOR-599)

## Blindfolds (do not conflate)

| Kind | XML | Phase system |
| --- | --- | --- |
| **Session-start overlay** | `ui/shared/panel_overlay_session_start.xml` (`overlay_sessionStart_panel`, `active=true` by default; stacked splash Images) | **Yes** — cold load / Intermission→Play splash only (TOR-565). Images: `overlay_sessionStartSplash_<N>`, `overlay_sessionNumber_<N>`, `overlay_sessionTitle_<N>` (set on load + Intermission sessionNum edit). Splash hides the panel near song end; production does not re-show until UI refresh on load. **Quick Transition** runs `playAttribute(0)` and skips Music C. HUD canary for TOR-384. |
| **Global blindfold** | `ui/shared/panel_overlay_global_blindfold.xml` (`overlay_globalBlindfold_panel`, `active=false`; SlideIn_Top / SlideOut_Top; all clients; district/site cards) | **Scene/table transitions** via `hud_blindfold` / `hud_overlays`. **End → Intermission:** image `overlay_sessionEndSplash_<N>` for the session that just ended (stashed before `sessionNum` increment; re-armed after `UI.show` — TOR-566), slide down, persistent until next load (no timed lift). |
| **Retired** | Former shared transition panel + end-only panel | Removed in TOR-565 (supersedes TOR-444 panel path + TOR-561 end panel). |

## General Phase Structure

### Top-Level Phase Sequence

There are four top-level phases, advanced by the Storyteller **Advance** button in a loop:

1. `INTERMISSION` — Between sessions: **global cover + Intermission theme handoff first**, then no-scene table/skybox/overlay under that cover, AdminDark; connect keeps global blindfold up (TOR-319 / TOR-497 / TOR-506).
2. `PLAY` — Session start: OutdoorDim lights and HUD behind the cover first, then session-start splash, Intermission Loop fades across the scaled song lead-in, Music C overture (skipped if **Quick Transition** is on), panel hide near sting end, Main playlist, Superficial WP heal + optional broadcast. Contains most gameplay.
3. `SPOTLIGHT` — End-of-session player vignettes: narrative clear (not End-scene Table B0), Table A + Spotlight skybox, Main-only music, in-session PC stand-ins on a 36° carousel, Host strip, ritual overlay.
4. `END` — Remorse / session-end bookkeeping. **Advance Spotlight → End** keeps Table A and Main, parks the carousel, and shows the prologue-style bookend overlay with **EPILOGUE** (TOR-599). Leaving End increments `sessionNum`. Intermission enter then shows the **session-end splash** on the global blindfold (`overlay_sessionEndSplash_<N>`) and applies the real no-scene table prep (TOR-565).

Advancing from `END` returns to `INTERMISSION`.

### Subphases

Only `PLAY` has subphases. They switch freely (no top-level enter/exit), except **Memoriam** is gated by the configuration popup:

1. `MAIN` when a library scene is live on the table; `DOWNTIME` when there is none (including the first Intermission → Play). Scene **Apply** switches to Main; **End scene** switches to Downtime. The Main and Downtime buttons resolve to that pairing (or no-op). Downtime copies present-day into `downtimeClock` and shows date + **DOWNTIME** on the overlay (TOR-527). The **first** Intermission → Play Downtime uses prologue overlay copy instead (`TORONTO RISING` / compact roman / spaced session title / **PROLOGUE**); later Downtime after End scene uses the standard date + **DOWNTIME** (TOR-598).
2. `DOWNTIME`
3. `MEMORIAM` — clicking Memoriam on the Phases panel opens `ui/storyteller/memoriam_modal.xml` (**TOR-539** / **TOR-540**). The Play subphase does **not** change until Advance; Cancel leaves the current subphase in place. Runtime enter/exit, payload, catalog, clock/overlay, and remaining plans: [**Memoriam.md**](Memoriam.md) (`Memoriam.applyEnter` / `applyExit`, **TOR-101**). Nested catalog years use shortest-span priority (**TOR-547**). Just Smoke remains a valid modal destination in gaps. Assignment list: subject green + NPC-assignable; other PCs present-as-self (**TOR-551**). PC-as-NPC sheet swap still **TOR-95**; LUT/sepia still **TOR-321**.

Scene library **Apply** promotes to Play via `Phases.ensurePlayPhaseForSceneApply()` (silent — does **not** re-run Play enter events).

## Starting & Ending Events

Ending events of the previous phase run before starting events of the new phase (`U.chain` via `Phases.advanceTo`).

### Ending Events: `INTERMISSION`

(None)

### Starting Events: `PLAY`

* When advancing from Intermission with exactly one connected player who is the Host, auto-enable DEBUG **Assume Players Connected** (TOR-429 / TOR-293).
* Re-assert the global blindfold (already up from Intermission).
* **Arm Play HUD behind the cover (TOR-532):** `Phases.armPlayHudBehindCover` runs `UpdateUIDisplays` for phase, game-state overlay, player HUD, and overlays while the cover is still up. Overlay visibility is Play-gated; waiting until Advance `onComplete` used to paint it after the explode hide. Overlay `active` writes skip when unchanged so that later `syncPhaseUi` does not retrigger a blink. First Intermission→Play with no live scene is Downtime with prologue overlay copy (TOR-598).
* Switch lights AdminDark → OutdoorDim under the cover **before** explode/sting (no `SetTableTo`; table/skybox already applied on Intermission enter). Then run player/NPC seat-light reconcile so OutdoorDim STANDARD actually reaches the `playerLight*` objects (preset apply only stores the seat map; TOR-504). Seat lights snap instantly (`transitionTime = 0`). Then wait `C.SessionStartPlayEnterSettleSec` (0.5s) so TTS can finish those applies before fade/explode (TOR-536).
* **Cover animation + intro sting:** After lighting, `SessionExplode.playAttribute()` runs the character splash, then the session number, then the session title. Number/title art is `overlay_sessionNumber_<sessionNum>` / `overlay_sessionTitle_<sessionNum>` from `gameState.sessionNum`. Song length and `introKey` come from `C.SessionStartAnimationData` (session 1 is 71 seconds; missing index uses `[1]`). TR_Loop starts fading as soon as the splash starts. The fade is longer than the scaled song lead-in so Music C begins when the loop is about three-quarters gone (about 25% volume left) and finishes fading during the opening of that track. Phases **Quick Transition** (default off) calls `playAttribute(0)` instead: timeRatio 0 and no Music C. Gain is set to catalog volume **before** `playTriggerEffect`; looping silent-arm is skipped. Main mood is **not** started under the sting (`sessionIntroActive` holds reconcile). The title ends on a blackout, then the session-start panel is turned off and the blackout fades. The rest of the HUD is left as it is (no XML remount). Host camera strip and seat-color buttons hide for the splash and return after the blackout (or on cancel).
* Play-enter waits `attributeSequenceDurationSec` (song-aligned splash plus the blackout tail, or the short tail when Quick Transition is on). Competing auto-hide from `applyGlobalBlindfoldFromPhase` is suppressed while `Phases.isAdvancing()` (TOR-363). Advance `U.chain` `maxWait` uses `maxPlayEnterWaitSec()` plus 15s so the catalog-length splash is not killed by the default 60s cap (TOR-501 / TOR-531).
* After that wait (sting end): fade in Main mood, then all players heal Superficial Willpower equal to max(Resolve, Composure) (temp dots included); if anyone healed, show `session_start_heal_broadcast.xml` briefly.

### Ending Events: `PLAY`

* Cancel any in-flight session explode and hide the global cover (`SessionExplode.cancel` + `hideGlobalBlindfold`) so Spotlight does not inherit leftover splash layers.

### Starting Events: `SPOTLIGHT`

* Staged HUDBF cover (same lead-in as a scene Apply; destination cards stay Clear). Default cameras snap at work start (HUDBF).
* Under the cover: **narrative clear** (`Scenes.clearLiveNarrativeForPhaseTransition`) — detach the live library, flush the library clock if a scene was live, empty NPC world/seats and Scatter orbit rows, clear live location/weather extras, freeze the overlay ticker. Switching to Table A does **not** restore the pre-Scatter stage layout (`skipScatterRestore`). While the phase is Spotlight (or End), NPC reconcile parks stage and Scatter figurines in the preload pool even if a placement row is still present. Does **not** call `Scenes.applyDefaultNoSceneEnvironment` (that is Table B0 + random generic skybox).
* TOR-101: Memoriam enter clears live narrative under cover (same helper). When a Memoriam LUT ships (**TOR-321**), reverse it here. Downtime clock/overlay (**TOR-527**) must reverse here as well once it ships.
* Table A if not already A; skybox `Spotlight`; fade location/weather out on the way in; **do not** restart Main if it is already playing; **do not** silence all emitters.
* Hide-list while `currentPhase == Spotlight` (reconciler after seat layout in `Sync.full`): seat figurines stay at seat Y with **`C.HiddenObjects` active visibility** (owner-color hide only — via `O.applyActiveVisibility` / `O.restoreObject`); dice bags, companion toggles/figurines (including Purple’s three companion tiles), and compulsion decks parked via `O.hideObject` at `C.HIDDEN_OBJECT_WORLD_Y`. Bags/companions/decks stay parked through End; they restore on Intermission enter after the global cover is down (bags via `lib/dice_bag_visibility`, companions via toggle state, etc.).
* Shuffle in-session PCs (`absentFromSession ~= true`) once; snap dedicated workshop stand-ins onto a 36° carousel (origin `(0, 125)`, radius `100`, figurine `y = -55`, front at 180°), facing **outward** from the ring (not toward the origin). Create those stand-ins with `lua DEBUG.populateSpotlightFigurines()` (paste GUIDs into `lib/guids.ttslua`, save the table, Save & Play). Missing stand-in GUIDs fail loudly and lift the cover; Advance never auto-spawns.
* Overlay: location diamond slot shows `sessionName` (normal weight); datetime `S P O T L I G H T` in gold italic-bold; time = front character's `charName` in white at 29pt. Host strip (`Black|Host`, bottom center) for prev / color chips / next. Play/End restore the red diamond, red date/time, and 42pt clock.

### Ending Events: `SPOTLIGHT`

* Staged HUDBF cover. Park stand-ins/lights in the preload zone, hide the Host strip. Seat figurines return to normal visibility. Dice bags, companions, and compulsion decks stay parked (not restored on End).
* Keep Main audio (do **not** fade Main or restart it). Apply no-scene table prep under the cover: Table B0 (dynamic Table B, zero NPC seats — NPCs are not restored after Spotlight), OutdoorDim, Generic skybox selected (`skyboxOverride` Generic; one random generic URL). `Scenes.applyDefaultNoSceneEnvironment({ skipSoundscape = true, skipTransitionBlindfold = true, activateGenericSkybox = true })`.

### Starting Events: `END`

* Overlay: same bookend copy as session-start prologue — **T O R O N T O   R I S I N G**, compact roman session, spaced uppercase session title, time = **EPILOGUE**. Weather hidden (TOR-599).

### Ending Events: `END`

* Increment `sessionNum` by one (roman overlay via `gameStateOverlay_sessionNumber`).

### Starting Events: `INTERMISSION`

* **Blackout, then the session-end splash.** `UI.show("overlay_blackoutPanel")` (5s FadeIn). Three seconds later, `TR_Loop` fades in over 2s while music, location, weather, thunder scheduling, and Music C fade out — when that fade finishes, the theme loop is the only thing still playing. Six seconds after the blackout show, set `overlay_sessionEndSplash_<ended session>` on the global cover with no slide (the blackout is opaque), then `UI.hide("overlay_blackoutPanel")`. Wait another six seconds before camera snap, no-scene table prep, or AdminDark so that work cannot hitch either fade. Do **not** use `HUDBF.runStagedTransition` here — that would lift the cover, and Intermission's end splash must stay up.
* Apply the no-scene default environment under that cover (table, seats, generic skybox, overlay; soundscape skipped) so next week's session start does not reshuffle the table (TOR-497). Spotlight-parked dice bags, companions, and compulsion decks restore here (after the cover is down), not during End.
* All lights dark (`AdminDark` phase override).
* Rain particle emitter is parked off Play (`O.hideObject`) unless Scatter already owns that hide (TOR-581).
* Countdown timer: deferred (optional TBD on **TOR-319**).

### Connect / load policy (TOR-319 / TOR-143 / TOR-561)

* Connect during **Intermission**: leave the active global cover up (session-start or session-end).
* Connect during any other phase: hide both global covers (`Phases.lowerBlindfoldForConnectingPlayer` → `hideGlobalBlindfold`). Shared overlay — not per-seat.
* **Load:** set `overlay_globalBlindfold` → `overlay_blindfold_session_<sessionNum>` and `overlay_globalBlindfold_end` → `overlay_blindfold_end_session_<sessionNum>`. While phase is Intermission, after startup readiness, `Phases.reconcileIntermissionAmbientOnLoad()` applies AdminDark + the same featured theme (`C.IntermissionThemeFeaturedKey` = `TR_Loop`) as Intermission enter. Session-start panel is XML-default visible; end panel stays inactive. No timed overlay hide.
* **Phases panel `sessionNum` edit during Intermission:** rewrite both cover Images immediately. Other phases: leave Images unchanged.
