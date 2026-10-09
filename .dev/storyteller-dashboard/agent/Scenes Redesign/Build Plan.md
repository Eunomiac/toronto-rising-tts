# Scenes Redesign — Build Plan (layout B → the real Scenes tab)

## Agent Routing

Read this when:

- building, wiring, or retiring anything in the new dashboard **Scenes** tab (Lab layout B promoted)
- adding a dashboard → TTS scene command, or a dashboard-owned scene file

Source of truth:

- design decisions: [Job Inventory.md](Job%20Inventory.md) (author marks + pin passes)
- what TTS broadcasts: [Listening to TTS.md](../../../Storyteller%20Dashboard%20Docs/Listening%20to%20TTS.md)
- panels: `src/client/lab/glance.tsx`, `labNotes.tsx`, `labPreview.tsx`, `sketch.tsx` (`WideBoard`), styles `_lab-glance.scss`
- live tab: `src/client/scenesPanel/` (new)

Status: current — build in progress (started 2026-10-08)

## Author decisions for the build (2026-10-08)

- The mockup becomes the **default** Scenes control panel.
- **Live scenes (on deck) and scene notes** are stored by the dashboard in JSON files under `data/` (git-ignored, the repo is public), with local backups. They survive any TTS reload. TTS still decides which scene is on the table; a live scene TTS reports that the list lacks is added to it.
- **Hunt roll broadcasts** are not built yet. The hunt roller stays a dashboard-side preview.
- **Commands** use the standard path: execute-lua into a `GlobalDashboard…Apply` entry point, behind the serial apply queue (the PCs tab pattern).
- **Scene editing** moves entirely to the dashboard. Scene editing in TTS is retired afterwards (Lua clean-up with its own Linear issue).

## Phases

Each phase ends usable and committed. Dashboard-only phases need no Linear / PAV; any Lua phase gets a Linear issue and a Pending Author Verification row.

### Phase 1 — Live read-only tab (dashboard only)

- New React tab **Scenes** (default tab) rendering layout B at 1920×1042 from live data. The old vanilla Scenes tab stays reachable as **Scenes (old)** until Phase 6.
- `scenesPanel/liveScene.ts`: pure adapters from `WorldState` to panel inputs (phase, live title, clock → `Date`s, weather axes, sound lanes, location keys, seats, stage tokens, spotlight order). Unit-tested.
- Panels take their values as props; the Lab keeps feeding them mock values.
- Missing slices show a quiet "waiting for TTS" state and call `refreshWorldSnapshot()` once.
- Clock: scene time animates locally with `clockNow`; an empty Lua table (`[]`) for a datetime means "none".

### Phase 2 — Dashboard-owned files

- Server store `data/scene-deck.json` (git-ignored): live (on-deck) scene list, scene notes (tabbed documents per scene), roster categories / group colours / leaders.
- Routes `GET/PUT /api/scene-deck`; atomic writes (tmp + rename), as `labNotes.ts`.
- Backups: timestamped copy to `<backupDir>/Dashboard Data` at most every 10 minutes, keep the last 50 plus one per day (Job Inventory "Settled in the last round").

### Phase 3 — Commands (Lua + dashboard; Linear + PAV)

- `dashboard/scenes.ttslua` + `GlobalDashboardScenesApply(json)`: one op list, each op calls the existing mutation + sync path (no re-implementation), returns `{ ok, error? }`. Pushes arrive through the existing world slices.
- Client `scenesPanel/bridge.ts` + the generic apply queue (extracted from `pcSheet/applyQueue.ts`).
- Ops, in order of value: phase advance / subphase, spotlight rotate / bring to front, play library scene, end scene, clock set / present day / real time + speed, sound (music lane, volumes live + throttled, featured play / stop, ambience, mute), seat present / absent, table layout, location / skybox / fog / lighting.
- Slice additions TTS lacks today: weather temperature (°C) and tonight's dusk / dawn on the clock slice.
- Queue semantics (Job Inventory): small changes queue (Send / Live toggle); multi-step actions (Play Scene, End Scene, table switch, location change, clock jumps, Clear Stage) fire at once after flushing the queue; volumes always live, throttled.

### Phase 4 — Library owned by the dashboard

- Scene library JSON on disk (git-ignored, backed up), seeded once from TTS `sceneLibrary`.
- Preview panels edit the dashboard copy (Save / On deck / Play Scene / Discard). Play Scene = import the row into TTS (`GlobalImportSceneJson`) then apply it.
- Default names from District — Site, numbered on repeat.

### Phase 5 — Stage editing

- WideBoard tokens from the `seats.stage` slice (u, v, lightMode) on the control-board UV frame (`data/control-board-snaps.json`, `scenes/boardDrag.ts`).
- Drag to place / move, double-click to light, group drop on packs, Clear Stage — through the existing NPC gameboard Apply path.
- Generic NPC quick-add (Stage NPCs tab merged in).

### Phase 6 — Retire

- Remove the old vanilla Scenes tab and the Stage NPCs tab once their jobs live in the new tab.
- Lua: retire scene editing in the in-game Scenes panel (Linear issue, PAV row).
- Move shared panels out of `lab/` into `scenesPanel/`; the Lab keeps only what it still sketches.

## Gaps and risks

- **Library scale:** TTS shows 40 library rows; the dashboard has no limit.
- **Echoes while dragging sliders:** ignore `soundscape` pushes for a lane while its slider is being dragged (Listening to TTS § 4.5).
- **Weather override storage** belongs to the timeline (until next dawn), not the scene — new Lua state; Phase 3 or later.
- **Snow** stays hidden until TTS supports it.

## Progress log

- 2026-10-08 — plan written; Phase 1 started.
- 2026-10-08 — Phase 1 shipped: **Scenes** is the default tab (the old tab stays as **Scenes (old)**). Live: phase, subphase, session, spotlight order, scene / present-day clocks (ticking locally), TTS weather with calendar temperature, sound lanes and playing state, location card / aspects / hunt odds, seats by chair, stage tokens. Read-only: every control that would change TTS. Dusk / dawn are still the Lab's fixed sample times. Lab panels take an optional `live` prop; without it they keep their mock behaviour.
- 2026-10-08 — Phase 3 first slice (TOR-680, Lua needs Save & Play): `GlobalDashboardScenesApply` + `scenesPanel/bridge.ts` / `commands.ts`; the apply queue moved to `src/client/applyQueue.ts` (generic). Panels read the sender from `ScenesCommandContext`. Wired: phase advance (Spotlight from the Play ring), End Scene (two clicks), spotlight ‹ › and headshot, real time on/off (2× when turned on) and speed ring, moon-drag clock move, calendar draft + Move button, present day both ways, music mood / Silent, lane volumes (held locally 1.5 s against echoes; superseded volumes dropped from a batch), featured play / stop / switch, ambience grid, mute = stop all, right-click seat presence. Dusk / dawn and temperature come from the clock slice. Errors show in the right column. **Still read-only / not wired:** weather overrides, location / skybox / fog / lighting, table switch, session number and title, Play subphase picker, Memoriam, library play (needs Phase 4's library list), the Send / Live queue toggle (commands send at once), NightSky still maps the moon drag on the Lab's fixed night length.
- 2026-10-08 — Phase 2 shipped (needs a dashboard server restart): `data/scene-deck.json` (git-ignored) via `src/server/sceneDeck.ts` and `/api/scene-deck` (`GET`; `PUT` replaces whole sections: `deck`, `notes`, `roster`, `seeded`). Shared types / parser `src/shared/sceneDeck.ts`. Backups go to `<backupDir>/Dashboard Data` (`backupDir` from the repo's `tts-assets.config.json`; none when it is missing). Client store `src/client/sceneDeck.ts` (fetch once, save 600 ms after the last edit, edits ignored until loaded). On first load the file is seeded once from the browser's old Lab local storage (`tr-lab-scene-docs`, `tr-lab-roster-categories`), which is left in place. Scene notes and the roster layout (Lab and Scenes tab) now use it. The on-deck list: TTS's table scene joins it (`scenesPanel/deck.ts`), a deck chip sends `playScene` with its key, End Scene removes the scene from the deck.
- 2026-10-08 — Session number and title (Intermission) send `sessionNum` / `sessionName` on Enter or blur (TOR-680; the ops call the in-game `HUD_sessionNumInput` / `HUD_sessionNameInput` for the Storyteller).
- 2026-10-08 — Lab pins 3 and 5: the clock panel works on scene time only while a scene is live (`activeClock` scene and a table scene); otherwise it shows present day, and the moon, calendar and Move button send `presentDay`. The Scenes tab shows present day as the later of the pushed present day and the locally ticked scene time, so a running scene never appears to pass present day between hourly pushes. The Lab sketch passes `presentOnly` when no scene is live. The 15-minute snap to present day is Lua (TOR-682).
- 2026-10-08 — Lab pin 2: every scene switch from the dashboard opens `SceneTimingRing` first (Scene Time / ×5 To Now / Set Now / NOW / Now +15 / +30 / +60 / +120) — deck chips, the Advance › Scene picker's Play, and the preview's Play Scene. The Scenes tab sends the pick as `playScene.clockMode` (`SceneClockMode` in `commands.ts`). `RingMenu` gained a `wide` variant for eight spokes.
- 2026-10-08 — Lab pin 4 (TOR-680, Lua needs Save & Play): the music list groups the moods (Main / Combat / Intrigue) and the site playlists (Casa Loma, Giovanni Estate, Giovanni Catacombs — `LOCATION_MUSIC_LABEL` in `liveScene.ts`), then Silent. A site pick sends the new `locationMusic{key}` op (`Soundscape.setLocationMusic`); the live readout names the site playlist when TTS's music mode is `locationMusic`.
- 2026-10-08 — Full-build plan phase 1 (pins + live leftovers). Pin 1: hunt margin defaults to 0. Pin 3: `scenesPanel/stageFrame.ts` owns the one board-to-stage transform (fitted to the polar snap extents) and `stagePacks` builds the stage packs and slots from `/api/control-board-snaps`; `WideBoard` draws them and live tokens use the same transform. The push now keeps stage `u`/`v` to four places (TOR-683). The clock panel's sky, moon drag and corner labels use TTS's dusk/dawn (`SunTimes`). The thunder group is live: Lua adds a `thunder` lane (`soundscape.thunderVolume`, a scale on each hit; in-game Sound panel row too). The ambient grid marks the site's own `locationTrack`. The roster's search box filters every named NPC.
- 2026-10-08 — Full-build plan phase 2: the Send / Live queue is real. `scenesPanel/queue.ts` classifies commands (`queue` / `flush` / `direct`), collapses one entry per target and drops entries that would change nothing; `queueLabels.ts` writes each line as "subject: now → queued" from the pushed world. `QueuePanel` (live view prop; the Lab keeps its sample) sits at the bottom of the live tab's right column. Send and flushes go through the apply queue's new `enqueueAll`, so they reach TTS as one batch. Switching to Live sends what is queued. Stage entries join in phase 5.
- 2026-10-08 — Full-build plan phase 3 (TOR-683, Lua needs Save & Play): the scene controls are live. The location card opens the picker and sends `location`; Release appears on unlinked scenes whose location differs from the library row (`scene.library`). A **≋ Fog** toggle on the card sends `topFog`. Above the stage, three drop-downs send `table`, `skybox` (Site sky = `none`) and `lighting`; the stage ring's Placement switches Scatter / Table B. The aspects row ends with a conditions column (District / Site conditions fixed, scene ones removable, `+ condition` from `catalogs.conditions`) that sends `conditions`. The weather rings send `weatherOverride` (held until the next dawn; snow hidden live because TTS has no snow layer) and Release sends `{ release: true }`. The Advance ring's **Memoriam…** opens `lab/memoriamModal.tsx`, which reads `memoriamPeriods` (new in `data/scene-catalogs.json`, generated from `lib/skyboxes_catalog.ttslua`) with the TTS modal's columns and sends `memoriam{payload}`; **Main ▸** sends `playSubPhase` Main, which leaves a Memoriam with a restore.
