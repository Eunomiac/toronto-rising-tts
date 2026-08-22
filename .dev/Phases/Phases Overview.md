# Phases Overview

## Agent Routing

Read this when:
- changing top-level phase sequence, Play subphases, or phase enter/exit events
- touching `core/phases.ttslua`, `panel_phases.xml`, or phase HUD handlers

Source of truth:
- `core/phases.ttslua` (lifecycle registries + `advanceTo` / `setPlaySubPhase`)
- `lib/constants.ttslua` (`C.Phases`, `C.PhaseSequence`, `C.PlaySubPhases`)
- `ui/storyteller/panel_phases.xml`

Verification:
- Save & Play → Host Phases panel → **Advance →** (panel closes immediately) through Intermission → Play → Spotlight → End → Intermission
- Confirm Intermission: global blindfold first, then no-scene table prep under cover, AdminDark, TR_Loop. Play: TR_Loop fades ~0.5s, Music C overture starts immediately at full volume, global blindfold lifts ~2s before the 71s sting ends, then Main fades in and the Willpower heal overlay can appear
- Solo Host verified only until **TOR-144** (multiplayer E2E) — multiclient connect blindfold + Advance replication: [Multiclient Session Script](../E2E%20Playbooks/Multiplayer-Session.md) (A4, B0, D1)

Status: current (TOR-143 / TOR-361 / TOR-362 / TOR-497)

## Blindfolds (do not conflate)

| Kind | XML | Phase system |
| --- | --- | --- |
| **Global blindfold** | `ui/shared/panel_overlay_global_blindfold.xml` (`overlay_globalBlindfold`, `active=true` by default) | **Yes** — hide on Play enter **after** Intermission→Play overture hold (~69s of the 71s Music C sting, TOR-497); show on Intermission enter **before** no-scene table prep; connect during Intermission leaves it up; connect elsewhere hides it. **No** timed onLoad auto-hide. Show/hide are idempotent (TOR-398): no FadeIn when already up; hide sequences do not stack. |
| **Per-player transition blindfolds** | `ui/.templates/panel_overlay_blindfold.xml` → parent Panel `UI.show`/`UI.hide` via `core/hud_blindfold.ttslua` + `hud_overlays` (optional destination cards, TOR-425 / TOR-431) | **Spotlight → End Advance** uses the same staged path as End scene / library Apply (TOR-459). Other phase enters still use global blindfold only. |

## General Phase Structure

### Top-Level Phase Sequence

There are four top-level phases, advanced by the Storyteller **Advance** button in a loop:

1. `INTERMISSION` — Between sessions: **global blindfold shown first**, then no-scene table/skybox/overlay under that cover, AdminDark, theme playlist; connect keeps global blindfold up (TOR-319 / TOR-497).
2. `PLAY` — Session start: Music C overture (TR_Loop 0.5s fade + immediate sting), OutdoorDim lights under cover, **then** hide global blindfold ~2s before the sting ends, Main playlist, Superficial WP heal + optional broadcast. Contains most gameplay.
3. `SPOTLIGHT` — End-of-session player vignettes: silence emitters, apply Spotlight scene (soft-fail if missing), freeze clock.
4. `END` — Remorse / session-end bookkeeping phase. **Advance Spotlight → End** runs a staged transition blindfold while applying the default no-scene environment (TOR-459), then enters End. Leaving End increments `sessionNum` (global blindfold restored on next Intermission enter).

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
* **Intermission → Play audio (TOR-497):** TR Loop fades out over **0.5s** and the Music C session-start overture (`C.SessionStartIntroKey`, 71s) starts **immediately** at full volume with no fade-in. Main mood is **not** started under the sting (`sessionIntroActive` holds reconcile).
* Switch lights AdminDark → OutdoorDim under the cover (no `SetTableTo`; table/skybox already applied on Intermission enter).
* After **~69s** (71 minus 2): global blindfold hidden (`overlay_globalBlindfold`). Competing auto-hide from `applyGlobalBlindfoldFromPhase` is suppressed while `Phases.isAdvancing()` (TOR-363).
* After the remaining **2s** (sting end): fade in Main mood, then all players heal Superficial Willpower equal to max(Resolve, Composure) (temp dots included); if anyone healed, show `session_start_heal_broadcast.xml` briefly.

### Ending Events: `PLAY`

(None)

### Starting Events: `SPOTLIGHT`

* Silence all soundscape emitters.
* Apply hardcoded Spotlight scene (`C.SpotlightSceneLibraryKey`); if missing, ST broadcast + AlertGM, Advance still completes.
* Freeze the narrative clock.

### Ending Events: `SPOTLIGHT`

* Apply "no scene" default.

### Starting Events: `END`

(None)

### Ending Events: `END`

* Increment `sessionNum` by one (roman overlay via `gameStateOverlay_sesionNumber`).

### Starting Events: `INTERMISSION`

* **Show the global blindfold first** (`overlay_globalBlindfold`) so table work is not visible.
* Apply the no-scene default environment under that cover (table, seats, generic skybox, overlay; soundscape skipped) so next week's session start does not reshuffle the table (TOR-497).
* All lights dark (`AdminDark` phase override).
* Fade out all emitters, then start Intermission theme (`C.IntermissionThemeFeaturedKey` = `TR_Loop`, looping at catalog volume 0.5).
* Countdown timer: deferred (optional TBD on **TOR-319**).

### Connect / load policy (TOR-319 / TOR-143)

* Connect during **Intermission**: leave global blindfold up.
* Connect during any other phase: hide global blindfold (`Phases.lowerBlindfoldForConnectingPlayer` → `hideGlobalBlindfold`). Shared overlay — not per-seat.
* **Load** while phase is Intermission: after startup readiness, `Phases.reconcileIntermissionAmbientOnLoad()` applies AdminDark + the same featured theme (`C.IntermissionThemeFeaturedKey` = `TR_Loop`) as Intermission enter. No timed overlay hide.
