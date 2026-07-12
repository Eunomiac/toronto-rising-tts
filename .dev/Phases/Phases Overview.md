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
- Save & Play → Host Phases panel → **Advance →** through Intermission → Play → Spotlight → End → Intermission
- Confirm Intermission dark lights + theme; Play heal broadcast when applicable; End raises blindfolds + increments sessionNum
- Solo Host verified only until **TOR-144** (multiplayer E2E) — multiclient connect blindfold + Advance replication: [Multiclient Session Script](../E2E%20Playbooks/Multiplayer-Session.md) (A4, B0, D1)

Status: current (TOR-143)

## General Phase Structure

### Top-Level Phase Sequence

There are four top-level phases, advanced by the Storyteller **Advance** button in a loop:

1. `INTERMISSION` — Between sessions: dark lights, theme playlist, connect keeps loading/session blindfold up (TOR-319).
2. `PLAY` — Session start: no-scene default, lower blindfolds, Superficial WP heal + optional broadcast. Contains most gameplay.
3. `SPOTLIGHT` — End-of-session player vignettes: silence emitters, apply Spotlight scene (soft-fail if missing), freeze clock.
4. `END` — Remorse / session-end bookkeeping phase. Leaving End increments `sessionNum` and raises blindfolds.

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

* Game state set to the "no scene" default.
* Player blindfolds come down (startup loading overlay cleared).
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
* Raise player blindfolds.

### Starting Events: `INTERMISSION`

* All lights dark (`AdminDark` phase override).
* Fade out all emitters, then start Intermission theme playlist (`C.IntermissionThemeFeaturedKey` = `TR_Intro` → Loop).
* Countdown timer: deferred (optional TBD on **TOR-319**).

### Connect policy (TOR-319)

* Connect during **Intermission**: leave startup/session blindfold up.
* Connect during any other phase: lower blindfold for that player (`Phases.lowerBlindfoldForConnectingPlayer`).
