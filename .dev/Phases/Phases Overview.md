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
- Confirm Intermission: global cover comes down together with leftover-audio fade-out and TR_Loop fade-in (~2s), then no-scene table prep under cover, AdminDark. Play: TR_Loop fades ~0.5s, Music C overture **and** the stacked cover explode start together; the panel hides near the end of the sting (~68.5s), layers reset, then Main fades in and the Willpower heal overlay can appear
- Play → Spotlight: staged transition cover; Table A + Spotlight skybox; Main keeps playing; in-session stand-ins on the carousel; overlay shows the session name in the diamond slot, **S P O T L I G H T** in gold, and the front character name in white. Spotlight → End: same cover; Main keeps playing; table becomes B0 (PC seats only, NPCs stay off the table); Generic skybox is selected; overlay shows the session name and **DEBRIEF**; bags/companions/compulsion decks stay under the table until Intermission cover
- Workshop: Host console `lua DEBUG.populateSpotlightFigurines()` clones seat figures and spawns tagged lights, then prints GUIDs for `lib/guids.ttslua`. Play → Spotlight does **not** auto-spawn (duplicates if GUIDs are forgotten).
- Solo Host verified only until **TOR-144** (multiplayer E2E) — multiclient connect blindfold + Advance replication: [Multiclient Session Script](../E2E%20Playbooks/Multiplayer-Session.md) (A4, B0, D1)

Status: current (TOR-143 / TOR-361 / TOR-362 / TOR-497 / TOR-516 / TOR-98)

## Blindfolds (do not conflate)

| Kind | XML | Phase system |
| --- | --- | --- |
| **Global blindfold** | `ui/shared/panel_overlay_global_blindfold.xml` (`overlay_globalBlindfold_panel`, `active=true` by default; stacked splash Images inside) | **Yes** — Intermission→Play runs `SessionExplode.play()` with the Music C sting (TOR-516); the panel hides near the end of that sequence instead of one FadeOut of the whole stack. Show on Intermission enter **before** no-scene table prep; connect during Intermission leaves it up; connect elsewhere hides it. **No** timed onLoad auto-hide. Show/hide are idempotent (TOR-398): no FadeIn when already up; hide sequences do not stack. Parent Panel owns FadeIn/FadeOut + click-blocking (TOR-514). |
| **Per-player transition blindfolds** | `ui/.templates/panel_overlay_blindfold.xml` → parent Panel `UI.show`/`UI.hide` via `core/hud_blindfold.ttslua` + `hud_overlays` (optional destination cards, TOR-425 / TOR-431) | **Play → Spotlight** and **Spotlight → End** use the same staged path as End scene / library Apply (TOR-98 / TOR-459). Destination cards stay Clear. Other phase enters still use global blindfold only. |

## General Phase Structure

### Top-Level Phase Sequence

There are four top-level phases, advanced by the Storyteller **Advance** button in a loop:

1. `INTERMISSION` — Between sessions: **global cover + Intermission theme handoff first**, then no-scene table/skybox/overlay under that cover, AdminDark; connect keeps global blindfold up (TOR-319 / TOR-497 / TOR-506).
2. `PLAY` — Session start: Music C overture (TR_Loop 0.5s fade + immediate sting) together with the stacked cover explode, OutdoorDim lights under cover, panel hide near sting end, Main playlist, Superficial WP heal + optional broadcast. Contains most gameplay.
3. `SPOTLIGHT` — End-of-session player vignettes: narrative clear (not End-scene Table B0), Table A + Spotlight skybox, Main-only music, in-session PC stand-ins on a 36° carousel, Host strip, ritual overlay.
4. `END` — Remorse / session-end bookkeeping. **Advance Spotlight → End** keeps Table A and Main, parks the carousel, and shows the session name + **END** on the overlay. Leaving End increments `sessionNum` (global blindfold restored on next Intermission enter). Intermission enter then applies the real no-scene table prep.

Advancing from `END` returns to `INTERMISSION`.

### Subphases

Only `PLAY` has subphases. They switch freely (no top-level enter/exit):

1. _(default)_ `MAIN`
2. `DOWNTIME`
3. `MEMORIAM` (LUT/overlay deferred — **TOR-101**)

Scene library **Apply** promotes to Play via `Phases.ensurePlayPhaseForSceneApply()` (silent — does **not** re-run Play enter events).

## Starting & Ending Events

Ending events of the previous phase run before starting events of the new phase (`U.chain` via `Phases.advanceTo`).

### Ending Events: `INTERMISSION`

(None)

### Starting Events: `PLAY`

* When advancing from Intermission with exactly one connected player who is the Host, auto-enable DEBUG **Assume Players Connected** (TOR-429 / TOR-293).
* Re-assert the global blindfold (already up from Intermission).
* **Intermission → Play audio (TOR-497 / TOR-515):** TR Loop fades out over **0.5s** and the Music C session-start overture (`C.SessionStartIntroKey`, 71s) starts **immediately** at full volume with no fade-in (gain is set to catalog volume **before** `playTriggerEffect`; looping silent-arm is skipped). Main mood is **not** started under the sting (`sessionIntroActive` holds reconcile).
* **Cover explode (TOR-516):** the same Play-enter step starts `SessionExplode.play()` so the stacked splash images explode in the author-tuned stagger (cover first, then five still-text / wavering-art pairs on 12s, then session number and title). Lighting still applies under the cover while this runs.
* Switch lights AdminDark → OutdoorDim under the cover (no `SetTableTo`; table/skybox already applied on Intermission enter). Then run player/NPC seat-light reconcile so OutdoorDim STANDARD actually reaches the `playerLight*` objects (preset apply only stores the seat map; TOR-504).
* Play-enter waits `SessionExplode.sequenceDurationSec()` (~71.5s). The explode sequence hides `overlay_globalBlindfold_panel` itself near the end (~68.5s) and resets layer attrs for the next Intermission. Competing auto-hide from `applyGlobalBlindfoldFromPhase` is suppressed while `Phases.isAdvancing()` (TOR-363). Advance `U.chain` `maxWait` is overture duration + 15s so this wait is not killed by the default 60s cap (TOR-501).
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

* **Show the global blindfold and start the audio handoff together** (`overlay_globalBlindfold_panel` + leftover session audio fading out while Intermission theme `TR_Loop` fades in over ~2s). Table work must not start until this settle finishes (TOR-502 / TOR-506).
* Apply the no-scene default environment under that cover (table, seats, generic skybox, overlay; soundscape skipped) so next week's session start does not reshuffle the table (TOR-497). Spotlight-parked dice bags, companions, and compulsion decks restore here (after the cover is down), not during End.
* All lights dark (`AdminDark` phase override).
* Countdown timer: deferred (optional TBD on **TOR-319**).

### Connect / load policy (TOR-319 / TOR-143)

* Connect during **Intermission**: leave global blindfold up.
* Connect during any other phase: hide global blindfold (`Phases.lowerBlindfoldForConnectingPlayer` → `hideGlobalBlindfold`). Shared overlay — not per-seat.
* **Load** while phase is Intermission: after startup readiness, `Phases.reconcileIntermissionAmbientOnLoad()` applies AdminDark + the same featured theme (`C.IntermissionThemeFeaturedKey` = `TR_Loop`) as Intermission enter. No timed overlay hide.
