# Listening to TTS — what the game broadcasts to the Storyteller Dashboard

## Agent Routing

Read this when:
- designing or building any Storyteller Dashboard view that shows live game state
- deciding whether a dashboard feature needs a new TTS push, a one-shot fetch, or neither
- adding a push topic or a field to an existing one

Source of truth:
- Lua emitters: `dashboard/push.ttslua` (`DashPush.*`), `dashboard/world_snapshot.ttslua` (world slices), `Dash.slimSeatSnapshot` in `dashboard/pc_sheet.ttslua` (seat payload)
- Server relay and cache: `.dev/storyteller-dashboard/src/server/ttsEvents.ts`, routes in `src/server/index.ts`
- Client: `src/client/ttsEvents.ts` (`subscribeTtsEvents`), `src/client/worldState.ts` (`useWorldState`, `refreshWorldSnapshot`, `clockNow`), `src/client/pcSheet/livePush.ts` (`mergeSeatPush`)
- Transport design, mark sites and guardrails: [Live Push Channel.md](Live%20Push%20Channel.md)
- Commands back to TTS (Scenes tab): `dashboard/scenes.ttslua` via `GlobalDashboardScenesApply`; client `src/client/scenesPanel/bridge.ts` + `commands.ts`, queue `src/client/applyQueue.ts`

Verification:
- `npm test` in `.dev/storyteller-dashboard/` (`ttsEvents.test.ts`, `worldState.test.ts`, `livePush.test.ts`)
- Live: Trace Sync `DashPush.seat` / `DashPush.world` rows; `GET http://127.0.0.1:8788/api/tts/cache`

Status:
- current (TOR-676, TOR-679; dashboard SD-Push, SD-Push-World)

---

## 1. The model in one paragraph

All game state lives in TTS (`gameState`). TTS pushes small one-way messages whenever something the dashboard cares about changes; the dashboard server relays them to every open tab over Server-Sent Events and keeps the latest one per topic (per seat for `pcSeat`). **The dashboard never polls TTS.** A view gets its data from (1) the pushes, (2) the server's replay of cached pushes when it connects, and (3) at most one execute-lua fetch when it opens or after a game load. Every push carries a whole seat or a whole slice, so a view simply replaces what it had — there are no deltas to apply and no ordering to track.

## 2. What TTS broadcasts

Every event reaching a tab has the shape `{ topic, color?, data?, at }`, where `at` is the server receive time in epoch milliseconds.

| Topic | `data` | Sent when | How often |
| --- | --- | --- | --- |
| `pcSeat` (with `color`) | Slim seat snapshot: identity, Desire/Ambition, attributes, skills, specialties, trackers, Hunger, Blood Potency and derived values, badges, conditions, connection flags, plus sheet-extension fields (disciplines, advantages, XP, relationships). Same shape as one seat of `GlobalDashboardPcSheetSnapshot`, minus `playerData` | End of every `Sync.player(color)` (any per-seat change), and once at the end of a CSHEET Desire edit | Once per changed seat; unchanged seats are skipped |
| `projects` | none | Any project mutation; present-day clock change | Per mutation. Refetch with `GlobalDashboardProjectsSnapshot` if the view is showing projects |
| `reload` | none | TTS starts loading a game (server-generated) | Per load. Drop everything and refetch once |
| `phase` | `phase`, `subPhase`, `sessionNum`, `sessionName`, `sessionStartDowntime`, `memoriamActive` | Phase or subphase change, Memoriam enter/leave, full UI refresh (session number and name ride along) | Rare |
| `scene` | `liveKey`, `liveTitle`, `liveLinked` (library row receives live writes), `library { districtKey, siteKey }` (the live library row's own location), `districtKey`, `siteKey`, `tableKey`, `placementMode`, `lightingPresetKey`, `skyboxOverride`, `topFog`, `conditions` (scene condition ids; an empty list arrives as `{}`), `weatherOverride { rain, wind, thunder, untilDatetime }` (only while the Storyteller's weather is held), `weather { weather, rain, wind, thunder, indoors }` | Scene Apply, location/table/lighting/skybox/fog edits, weather changes, hour rollover (scheduled weather) | Low; bursts coalesce into one |
| `clock` | Anchor: `activeClock` (`scene`/`downtime`), `running`, `speed`, `catchUpToPresentDay`, `isPresentDay`, `scene`, `downtime`, `presentDay` datetimes; tonight's `dusk` / `dawn` datetimes (before sunrise: last night's) and the chronicle-scheduled `temperatureC` for the running clock's hour | Clock Apply or jump, pause/resume, speed change, scene Apply, phase change, **each hour rollover** | About once per narrative hour while running, plus edits |
| `soundscape` | `musicMode`, `musicMood`, `musicEnabled`, `musicSuppressed`, `locationMusic`, `location`, `siteSilent`, `featuredKey`, `featuredActive`, `sessionIntroKey`, `sessionIntroActive`, `lanes[] { id, volume, naturalVolume, ducked, active }` (ids `music`, `location`, `featured`, `rain`, `wind`, `thunder`; thunder's volume is a scale on each hit, active while thunder is on) | Any Sound panel change (including volume drags), scene soundscape apply | Several per second at most while dragging a slider |
| `seats` | `seats[]` (five PC rows then four NPC rows: `seat`, `kind`, `tableSlot`, `isPresent`; PC: `playerId`, `charKey`, `absentFromSession`, `playingNpcKey`; NPC: `characterKey`, `slotEmpty`), `stage[] { characterKey, u, v, lightMode }`, `spotlightOrder`, `spotlightFrontIndex` | Scene/table/seat changes through the Scenes panel, control board Apply/Clear (`Sync.npcs`), Spotlight shuffle and rotation | Low |

World topics (`phase` … `seats`) are built by `dashboard/world_snapshot.ttslua` and sent together about 0.25 s after the first change in a burst. Optional fields are omitted when TTS holds no value (Lua `nil`).

### Seat words — keep them apart

`isPresent` is **narrative** presence: a connected player who is seated but out of the scene. `absentFromSession` is **connection** state: the PC's client was not connected at the last blindfold checkpoint. Label them differently in any UI ("Not in scene" vs "Disconnected"). See `docs/solutions/seat-occupancy-and-connection.md`.

### Not broadcast

- **Clock minutes.** Run the clock locally with `clockNow(clock, Date.now())`; it advances `speed` narrative minutes per real minute from the anchor and stops at the present day during catch-up.
- **Storyteller-panel UI state:** library row selection, pickers, drafts, which TTS panel is open.
- **Catalog and library contents:** scene library rows, site/district/table catalogs, NPC records beyond seat and stage placement. Fetch these on demand (catalog JSON routes, execute-lua) when the view opens.
- **Raw `playerData`** — only in the full `GlobalDashboardPcSheetSnapshot`.
- **Roll events** — not built yet (see Live Push Channel § 7).

## 3. How to listen

| Need | Use |
| --- | --- |
| World slices in a React view | `const world = useWorldState()`. On mount, if a slice you need is `undefined`, call `refreshWorldSnapshot()` once (it fills only missing slices) |
| The current narrative time | `clockNow(world.clock, now)` on your own animation or minute timer — browser-side only, never a TTS call |
| Seat data | Follow `PcSheetTab.tsx`: fetch the full snapshot once, then merge `pcSeat` pushes with `mergeSeatPush` |
| Any other topic | `subscribeTtsEvents(listener)` in a `useEffect`; return its unsubscribe |
| A notice-only topic (`projects`) | Refetch that domain's snapshot, and only while the view is mounted |
| `reload` | Clear local copies and refetch once (the world store clears itself) |

All subscribers share one `EventSource`; the browser reconnects it on its own and the server replays its cache, so a reconnect needs no special handling.

## 3a. Sending commands

Commands use execute-lua into a `GlobalDashboard…Apply` entry, behind the shared serial queue (`createApplyQueue` in `src/client/applyQueue.ts`): one call in flight, clicks made meanwhile go in the next batch. Every entry starts with the load guard and replies `{ ok, error? }`.

- **PCs tab:** `GlobalDashboardPcSheetApply` replies with a fresh sheet snapshot.
- **Scenes tab:** `GlobalDashboardScenesApply` (`dashboard/scenes.ttslua`) replies only `{ ok, error? }`; the world push brings the new state back. Panels read the sender from `ScenesCommandContext`; without one (the Lab) they keep their mock behaviour. `coalesceCommands` drops superseded lane volumes and real-time settings from a batch, and dragged sliders hold their local value for 1.5 s so the echo does not jump under the pointer. Ops are listed at the top of `dashboard/scenes.ttslua`. Before the apply queue, the tab's Send / Live mode (`scenesPanel/queue.ts`, remembered in local storage, Live by default) decides when a command leaves: in Queued mode the small changes `commandKind` marks `queue` wait for Send (one entry per target, labelled from the pushed world by `queueLabels.ts`); `flush` commands (scene play / end, clock, phase) send the queue first in the same batch; `direct` ones (volumes, real time, spotlight, stop all) always go at once.
- **Scene edits from the Scenes tab:** `location`, `skybox` (`"none"` = the Site's sky), `topFog`, `lighting` (Admin Dark / Standard / Bright), `table` (including `"Scatter"` and the `"Table B"` family) and `conditions` go through the `StorytellerScenesPanel.setLive*` setters the in-game panel uses. `weatherOverride` holds rain / wind / thunder in `gameState.weatherOverride` until the next dawn (`ChronicleWeather.applyScheduledWeather` plays it instead of the schedule and clears it once the scene clock passes dawn); `{ release = true }` returns to the schedule. `memoriam` hands the dashboard-built payload (same shape as the in-game Memoriam modal; the panel list comes from `data/scene-catalogs.json` `memoriamPeriods`, generated from `lib/skyboxes_catalog.ttslua`) to `Memoriam.applyEnter`; `playSubPhase` `Main` while a Memoriam runs calls `Memoriam.applyExit({ mode = "restore" })`.

## 4. Design checklist for a new dashboard view

1. **List the data the view shows** and find each item in § 2. If everything is there, build on the existing topics.
2. **Never add a timer that calls execute-lua.** One fetch on open is the ceiling. If a value must move continuously (like the clock), push an anchor and animate it in the browser.
3. **Handle missing slices.** After a dashboard server restart the cache is empty until each slice next changes; show a quiet loading state and call `refreshWorldSnapshot()`.
4. **Handle `reload`.** TTS reloads during play (Save & Play, loading a save). The view must recover without a page refresh.
5. **Your own writes:** if the view sends a command and gets a fresh snapshot back, it may ignore pushes for that domain while the command is in flight (the PCs tab does this), because TTS pushes before it answers.
6. **Keep words honest:** occupied vs present vs disconnected (above).

## 5. When the data you need is not broadcast

Prefer, in order:

1. **Add a field to an existing slice or the seat snapshot.** Seat data goes in `snapshotSeat` (or a sheet extension's `snapshotFields`); it rides `Sync.player` automatically. World data goes in the matching `world_snapshot` builder. Check that the mutation path already marks that slice (Live Push Channel § 3a); add a `DashPush.markWorldDirty` call only where it bypasses `UpdateUIDisplays`.
2. **Add a world slice** when the data is a separate concern with its own triggers: add the builder and its name to `W.SLICES`, mark it at its mutation/reconcile sites, add the client type and topic to `worldState.ts`, and add tests.
3. **Fetch on demand** when the data is large, rarely changes, or is only needed while one view is open.

Rules for any change on the TTS side: Global-only modules (never `require("dashboard.*")` from object scripts); no marks in per-frame or per-tick paths; payloads stay flat with structured data as the `json` string field; update this guide, Live Push Channel § 3, and the Lua half's Linear issue plus a Pending Author Verification row.

## 6. Checking it live

- **What did TTS last send?** Open `http://127.0.0.1:8788/api/tts/cache`.
- **Is TTS sending at all?** Turn on Trace Sync in TTS: each send logs `DashPush.seat` or `DashPush.world` with `sent` / `skipped` and the byte count.
- **Server changes need a restart** (`npm run dev` in `.dev/storyteller-dashboard/`); Lua changes need Save & Play.
- If Trace Sync says `sent` but nothing arrives, suspect a nested table in the message (TTS drops those silently) or the server not connected to the gateway (`GET /api/tts-bridge-status`).
