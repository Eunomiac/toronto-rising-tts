# Phases Overview

## Agent Routing

Read this when:
- changing top-level phase sequence, Play subphases, or phase enter/exit events
- touching `core/phases.ttslua`, `panel_phases.xml`, or phase HUD handlers

Source of truth:
- `core/phases.ttslua` (lifecycle registries + `advanceTo` / `setPlaySubPhase`)
- `core/session_explode.ttslua` (Intermission→Play stacked cover explode)
- `core/spotlight.ttslua` (Spotlight carousel, hide-list, Host strip)
- `lib/constants.ttslua` (`C.Phases`, `C.PhaseSequence`, `C.PlaySubPhases`)
- `ui/storyteller/panel_phases.xml`
- `ui/storyteller/panel_spotlight_controls.xml`

Verification:
- Save & Play → Host Phases panel → **Advance →** (panel closes immediately) through Intermission → Play → Spotlight → End → Intermission
- Confirm Intermission: global cover comes down together with leftover-audio fade-out and TR_Loop fade-in (~2s), then no-scene table prep under cover, AdminDark. Play: OutdoorDim lights and HUD arm behind the cover first, then a 0.5s settle (`C.SessionStartPlayEnterSettleSec`, TOR-536); then TR_Loop fades ~0.5s with the stacked cover explode; Music C overture starts 0.25s later (`C.SessionStartIntroDelaySec`) so the opening drum hits with the first visible cover scale; the panel hides near the end of that session's song, layers reset, then Main fades in and the Willpower heal overlay can appear
- Play → Spotlight: staged transition cover; Table A + Spotlight skybox; Main keeps playing; in-session stand-ins on the carousel; overlay shows the session name in the diamond slot, **S P O T L I G H T** in gold, and the front character name in white. Spotlight → End: same cover; Main keeps playing; table becomes B0 (PC seats only, NPCs stay off the table); Generic skybox is selected; overlay shows the session name and **DEBRIEF**; bags/companions/compulsion decks stay under the table until Intermission cover
- Workshop: Host console `lua DEBUG.populateSpotlightFigurines()` clones seat figures and spawns tagged lights, then prints GUIDs for `lib/guids.ttslua`. Play → Spotlight does **not** auto-spawn (duplicates if GUIDs are forgotten).
- Re-test Intermission→Play without cycling Spotlight/End: Host console `lua DEBUG.resetToIntermission()` (session cover + TR_Loop, no table/skybox move). Then **Advance →**.
- Solo Host verified only until **TOR-144** (multiplayer E2E) — multiclient connect blindfold + Advance replication: [Multiclient Session Script](../E2E%20Playbooks/Multiplayer-Session.md) (A4, B0, D1)

Status: current (TOR-143 / TOR-361 / TOR-362 / TOR-497 / TOR-516 / TOR-531 / TOR-532 / TOR-533 / TOR-534 / TOR-98)

## Blindfolds (do not conflate)

| Kind | XML | Phase system |
| --- | --- | --- |
| **Global blindfold (session start)** | `ui/shared/panel_overlay_global_blindfold.xml` (`overlay_globalBlindfold_panel`, `active=true` by default; stacked splash Images inside) | **Yes** — cold load / Intermission→Play only. Images: `overlay_blindfold_session_<sessionNum>` on `overlay_globalBlindfold` (set on load + Intermission sessionNum edit). Intermission→Play runs the session-start animation with the Music C sting (TOR-516 / TOR-559); the panel hides near the end of that sequence and is **not** reused until UI refresh on load (TOR-561). Default path uses TTS `showAnimation` attrs (`SessionExplode.playAttribute`); Phases **Lerp explode** toggle uses the older `SessionExplode.play()` attribute-lerp explode. Connect during Intermission leaves the active cover up; connect elsewhere hides both covers. **No** timed onLoad auto-hide. Show/hide are idempotent (TOR-398). Parent Panel owns FadeIn/FadeOut + click-blocking (TOR-514). |
| **Global blindfold (session end)** | `ui/shared/panel_overlay_global_blindfold_end.xml` (`overlay_globalBlindfold_panel_end`, `active=false` by default; single Image `overlay_globalBlindfold_end`) | **Yes** — End → Intermission only (TOR-561). Image: `overlay_blindfold_end_session_<sessionNum>` (set on load + Intermission sessionNum edit). Shown instead of restoring the session-start panel; left up until refresh-on-load. |
| **Per-player transition blindfolds** | `ui/.templates/panel_overlay_blindfold.xml` → parent Panel `UI.show`/`UI.hide` via `core/hud_blindfold.ttslua` + `hud_overlays` (optional destination cards, TOR-425 / TOR-431) | **Play → Spotlight** and **Spotlight → End** use the same staged path as End scene / library Apply (TOR-98 / TOR-459). Destination cards stay Clear. Other phase enters still use global blindfold only. |

## General Phase Structure

### Top-Level Phase Sequence

There are four top-level phases, advanced by the Storyteller **Advance** button in a loop:

1. `INTERMISSION` — Between sessions: **global cover + Intermission theme handoff first**, then no-scene table/skybox/overlay under that cover, AdminDark; connect keeps global blindfold up (TOR-319 / TOR-497 / TOR-506).
2. `PLAY` — Session start: OutdoorDim lights and HUD behind the cover first, then stacked cover explode, Intermission Loop fades 0.5s, Music C overture (opening drum delayed 0.25s to match the first visible cover scale), panel hide near sting end, Main playlist, Superficial WP heal + optional broadcast. Contains most gameplay.
3. `SPOTLIGHT` — End-of-session player vignettes: narrative clear (not End-scene Table B0), Table A + Spotlight skybox, Main-only music, in-session PC stand-ins on a 36° carousel, Host strip, ritual overlay.
4. `END` — Remorse / session-end bookkeeping. **Advance Spotlight → End** keeps Table A and Main, parks the carousel, and shows the session name + **END** on the overlay. Leaving End increments `sessionNum`. Intermission enter then shows the **session-end** global cover (`overlay_globalBlindfold_panel_end`) and applies the real no-scene table prep (TOR-561).

Advancing from `END` returns to `INTERMISSION`.

### Subphases

Only `PLAY` has subphases. They switch freely (no top-level enter/exit), except **Memoriam** is gated by the configuration popup:

1. _(default)_ `MAIN`
2. `DOWNTIME`
3. `MEMORIAM` — clicking Memoriam on the Phases panel opens `ui/storyteller/memoriam_modal.xml` (**TOR-539** / **TOR-540**). The Play subphase does **not** change until Advance; Cancel (or switching to Main / Downtime) leaves the current subphase in place. Nested catalog years use shortest-span priority; periods that only share a boundary year sit next to each other, not inside each other (**TOR-547**). Just Smoke is a valid destination in gaps. The period strip uses four greys (two for base periods, two for nested/overlapping shorter periods) so adjacent panels in each set do not match (**TOR-545**). The assignment list shows all five PCs: the subject's name is green and they can be assigned an NPC; other PCs can be marked present as themselves (**TOR-551**). LUT/overlay when Memoriam is active is still deferred — **TOR-101**.

Scene library **Apply** promotes to Play via `Phases.ensurePlayPhaseForSceneApply()` (silent — does **not** re-run Play enter events).

## Starting & Ending Events

Ending events of the previous phase run before starting events of the new phase (`U.chain` via `Phases.advanceTo`).

### Ending Events: `INTERMISSION`

(None)

### Starting Events: `PLAY`

* When advancing from Intermission with exactly one connected player who is the Host, auto-enable DEBUG **Assume Players Connected** (TOR-429 / TOR-293).
* Re-assert the global blindfold (already up from Intermission).
* **Arm Play HUD behind the cover (TOR-532):** `Phases.armPlayHudBehindCover` runs `UpdateUIDisplays` for phase, game-state overlay, player HUD, and overlays while the cover is still up. Overlay visibility is Play-gated; waiting until Advance `onComplete` used to paint it after the explode hide. Overlay `active` writes skip when unchanged so that later `syncPhaseUi` does not retrigger a blink.
* Switch lights AdminDark → OutdoorDim under the cover **before** explode/sting (no `SetTableTo`; table/skybox already applied on Intermission enter). Then run player/NPC seat-light reconcile so OutdoorDim STANDARD actually reaches the `playerLight*` objects (preset apply only stores the seat map; TOR-504). Seat lights snap instantly (`transitionTime = 0`). Then wait `C.SessionStartPlayEnterSettleSec` (0.5s) so TTS can finish those applies before fade/explode (TOR-536).
* **Cover animation + intro sting (TOR-516 / TOR-531 / TOR-533 / TOR-534 / TOR-535 / TOR-559):** After lighting, Play enter chooses a path from the Phases **Lerp explode** toggle (default off):
  * **Attribute path (default):** `SessionExplode.playAttribute()` — TTS Grow/FadeIn attrs on splash panels. The Intermission Loop fades and Music C starts at the designed mid-sequence beat (pair 2), not at the first frame.
  * **Lerp path (toggle on):** `SessionExplode.play()` then `C.SessionStartIntroDelaySec` then `Phases.fireSessionIntro` — cover scale-and-fade first; Loop fade starts with the explode; sting timed to the first visible cover scale.
  Catalog key and song length come from `C.SessionStartAnimationData` for the current `sessionNum` (missing index uses `[1]`). Gain is set to catalog volume **before** `playTriggerEffect`; looping silent-arm is skipped. Main mood is **not** started under the sting (`sessionIntroActive` holds reconcile). Lerp pair spacing multiplies by `songDuration / C.SessionStartBaseDuration`; attribute path scales by `songDuration / 115`. No heavy Play-enter lighting or HUD work runs during the animation.
* Play-enter waits the active path's duration (`sequenceDurationSec` or `attributeSequenceDurationSec`). The sequence hides `overlay_globalBlindfold_panel` near the end and resets layer attrs for the next Intermission. Competing auto-hide from `applyGlobalBlindfoldFromPhase` is suppressed while `Phases.isAdvancing()` (TOR-363). Advance `U.chain` `maxWait` uses `maxPlayEnterWaitSec()` plus 15s so either path is not killed by the default 60s cap (TOR-501 / TOR-531 / TOR-559).
* After that wait (sting end): fade in Main mood, then all players heal Superficial Willpower equal to max(Resolve, Composure) (temp dots included); if anyone healed, show `session_start_heal_broadcast.xml` briefly.

### Ending Events: `PLAY`

* Cancel any in-flight session explode and hide the global cover (`SessionExplode.cancel` + `hideGlobalBlindfold`) so Spotlight does not inherit leftover splash layers.

### Starting Events: `SPOTLIGHT`

* Staged HUDBF cover (same lead-in as a scene Apply; destination cards stay Clear). Default cameras snap at work start (HUDBF).
* Under the cover: **narrative clear** (`Scenes.clearLiveNarrativeForPhaseTransition`) — detach the live library, flush the library clock if a scene was live, empty NPC world/seats, clear live location/weather extras, freeze the overlay ticker. Does **not** call `Scenes.applyDefaultNoSceneEnvironment` (that is Table B0 + random generic skybox).
* TOR-101: when Memoriam LUT/overlay exists, reverse it in that same narrative-clear cover. Downtime clock/overlay (**TOR-527**) must reverse here as well once it ships.
* Table A if not already A; skybox `Spotlight`; fade location/weather out on the way in; **do not** restart Main if it is already playing; **do not** silence all emitters.
* Hide-list while `currentPhase == Spotlight` (reconciler after seat layout in `Sync.full`): seat figurines invisible to PC colors + White/Grey; dice bags, companion toggles/figurines (including Purple’s three companion tiles), and compulsion decks parked at `y = -200`. Bags/companions/decks stay parked through End; they restore on Intermission enter after the global cover is down.
* Shuffle in-session PCs (`absentFromSession ~= true`) once; snap dedicated workshop stand-ins onto a 36° carousel (origin `(0, 125)`, radius `100`, figurine `y = -55`, front at 180°), facing **outward** from the ring (not toward the origin). Create those stand-ins with `lua DEBUG.populateSpotlightFigurines()` (paste GUIDs into `lib/guids.ttslua`, save the table, Save & Play). Missing stand-in GUIDs fail loudly and lift the cover; Advance never auto-spawns.
* Overlay: location diamond slot shows `sessionName` (normal weight); datetime `S P O T L I G H T` in gold italic-bold; time = front character's `charName` in white at 29pt. Host strip (`Black|Host`, bottom center) for prev / color chips / next. Play/End restore the red diamond, red date/time, and 42pt clock.

### Ending Events: `SPOTLIGHT`

* Staged HUDBF cover. Park stand-ins/lights in the preload zone, hide the Host strip. Seat figurines return to normal visibility. Dice bags, companions, and compulsion decks stay parked (not restored on End).
* Keep Main audio (do **not** fade Main or restart it). Apply no-scene table prep under the cover: Table B0 (dynamic Table B, zero NPC seats — NPCs are not restored after Spotlight), OutdoorDim, Generic skybox selected (`skyboxOverride` Generic; one random generic URL). `Scenes.applyDefaultNoSceneEnvironment({ skipSoundscape = true, skipTransitionBlindfold = true, activateGenericSkybox = true })`.

### Starting Events: `END`

* Overlay: datetime = `sessionName` (blank until the Storyteller types one in the Phases panel), time = `DEBRIEF`, location row empty, weather hidden. Session roman stays.

### Ending Events: `END`

* Increment `sessionNum` by one (roman overlay via `gameStateOverlay_sesionNumber`).

### Starting Events: `INTERMISSION`

* **Show the session-end global cover and start the audio handoff together** (`overlay_globalBlindfold_panel_end` + leftover session audio fading out while Intermission theme `TR_Loop` fades in over ~2s) — TOR-561 / TOR-502 / TOR-506. Do **not** restore `overlay_globalBlindfold_panel` here (session-start explode leaves that panel unrestorable until UI refresh on load). Table work must not start until this settle finishes.
* Apply the no-scene default environment under that cover (table, seats, generic skybox, overlay; soundscape skipped) so next week's session start does not reshuffle the table (TOR-497). Spotlight-parked dice bags, companions, and compulsion decks restore here (after the cover is down), not during End.
* All lights dark (`AdminDark` phase override).
* Countdown timer: deferred (optional TBD on **TOR-319**).

### Connect / load policy (TOR-319 / TOR-143 / TOR-561)

* Connect during **Intermission**: leave the active global cover up (session-start or session-end).
* Connect during any other phase: hide both global covers (`Phases.lowerBlindfoldForConnectingPlayer` → `hideGlobalBlindfold`). Shared overlay — not per-seat.
* **Load:** set `overlay_globalBlindfold` → `overlay_blindfold_session_<sessionNum>` and `overlay_globalBlindfold_end` → `overlay_blindfold_end_session_<sessionNum>`. While phase is Intermission, after startup readiness, `Phases.reconcileIntermissionAmbientOnLoad()` applies AdminDark + the same featured theme (`C.IntermissionThemeFeaturedKey` = `TR_Loop`) as Intermission enter. Session-start panel is XML-default visible; end panel stays inactive. No timed overlay hide.
* **Phases panel `sessionNum` edit during Intermission:** rewrite both cover Images immediately. Other phases: leave Images unchanged.
