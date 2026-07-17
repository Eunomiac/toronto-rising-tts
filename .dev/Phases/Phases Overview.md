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
- Confirm Intermission dark lights + theme + **global blindfold shown**; Play: Loop fades 5s → Main fades in 3s → then global blindfold lifts; no-scene overlay (blank clock, weather hidden, correct session roman) + heal broadcast when applicable
- Solo Host verified only until **TOR-144** (multiplayer E2E) — multiclient connect blindfold + Advance replication: [Multiclient Session Script](../E2E%20Playbooks/Multiplayer-Session.md) (A4, B0, D1)

Status: current (TOR-143 / TOR-361 / TOR-362)

## Blindfolds (do not conflate)

| Kind | XML | Phase system |
| --- | --- | --- |
| **Global blindfold** | `ui/shared/panel_overlay_global_blindfold.xml` (`overlay_globalBlindfold`, `active=true` by default) | **Yes** — hide on Play enter **after** Intermission→Play audio handoff (5s Loop out + 3s Main in); show on Intermission enter; connect during Intermission leaves it up; connect elsewhere hides it. **No** timed onLoad auto-hide. Show/hide are idempotent (TOR-398): no FadeIn when already up; hide sequences do not stack. |
| **Per-player transition blindfolds** | `ui/.templates/panel_overlay_blindfold.xml` → `hudBlindfold` via `core/hud_blindfold.ttslua` | **No** — scene/table transitions only |

## General Phase Structure

### Top-Level Phase Sequence

There are four top-level phases, advanced by the Storyteller **Advance** button in a loop:

1. `INTERMISSION` — Between sessions: dark lights, theme playlist, **global blindfold shown**; connect keeps global blindfold up (TOR-319).
2. `PLAY` — Session start: no-scene default, staged audio (Loop out → Main in), **then** hide global blindfold, Superficial WP heal + optional broadcast. Contains most gameplay.
3. `SPOTLIGHT` — End-of-session player vignettes: silence emitters, apply Spotlight scene (soft-fail if missing), freeze clock.
4. `END` — Remorse / session-end bookkeeping phase. Leaving End increments `sessionNum` (global blindfold restored on next Intermission enter).

Advancing from `END` returns to `INTERMISSION`.

### Subphases

Only `PLAY` has subphases. They switch freely (no top-level enter/exit):

1. _(default)_ `MAIN`
2. `DOWNTIME`
3. `MEMORIAM` (LUT/overlay deferred — **TOR-101**)

Scene library **Apply** promotes to Play via `Phases.ensurePlayPhaseForSceneApply()` (silent — does **not** re-run Play enter events).

## Starting & Ending Events

Ending events of the previous phase run before starting events of the new phase (`U.RunSequence` via `Phases.advanceTo`).

### Ending Events: `INTERMISSION`

(None)

### Starting Events: `PLAY`

* Detach any live library mirror, then apply "no scene" default (table/lights; soundscape deferred for staged handoff). Overlay: blank clock, weather hidden, session roman from `sessionNum` (TOR-362).
* **Intermission → Play audio (TOR-361):** TR Loop fades out over **5s**, then Main mood fades in over **3s** (no crossfade).
* Only after Main fade-in completes: global blindfold hidden (`overlay_globalBlindfold`). Competing auto-hide from `applyGlobalBlindfoldFromPhase` is suppressed while `Phases.isAdvancing()` (TOR-363).
* All players heal Superficial Willpower equal to max(Resolve, Composure) (temp dots included); if anyone healed, show `session_start_heal_broadcast.xml` briefly.

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

* All lights dark (`AdminDark` phase override).
* Fade out all emitters, then start Intermission theme (`C.IntermissionThemeFeaturedKey` = `TR_Loop`, looping at catalog volume 0.5).
* Global blindfold shown / restored (`overlay_globalBlindfold`).
* Countdown timer: deferred (optional TBD on **TOR-319**).

### Connect / load policy (TOR-319 / TOR-143)

* Connect during **Intermission**: leave global blindfold up.
* Connect during any other phase: hide global blindfold (`Phases.lowerBlindfoldForConnectingPlayer` → `hideGlobalBlindfold`). Shared overlay — not per-seat.
* **Load** while phase is Intermission: after startup readiness, `Phases.reconcileIntermissionAmbientOnLoad()` applies AdminDark + the same featured theme (`C.IntermissionThemeFeaturedKey` = `TR_Loop`) as Intermission enter. No timed overlay hide.
