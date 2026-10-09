# Live Push Channel — TTS to Storyteller Dashboard

## Agent Routing

Read this when:
- making the Storyteller Dashboard stay current with live play without polling TTS
- adding a `sendExternalMessage` call or a new push topic
- adding a dashboard tab that shows live `gameState`

Source of truth:
- Seat announcer: `Sync.player` in `core/sync.ttslua` (last step calls `DashPush.seat`)
- Lua emitter: `dashboard/push.ttslua` (Global-only)
- Slim seat payload: `Dash.slimSeatSnapshot` in `dashboard/pc_sheet.ttslua` (same builder as the fetched snapshot, minus `playerData`)
- World slices: `dashboard/world_snapshot.ttslua` (`W.build`, `W.snapshot`); marks at the end of `UpdateUIDisplays` in `core/global_script.ttslua` plus the bypass sites in § 3a; one-shot read `GlobalDashboardWorldSnapshot`
- Dashboard server relay: `.dev/storyteller-dashboard/src/server/ttsEvents.ts` (hub + SSE), listeners in `bindSession` of `src/server/ttsExecuteLua.ts`, routes `GET /api/tts/events` and `GET /api/tts/cache` in `src/server/index.ts`
- Dashboard client: `src/client/ttsEvents.ts` (shared `EventSource`), `src/client/pcSheet/livePush.ts` (`mergeSeatPush`), `src/client/worldState.ts` (world store, `clockNow`), `PcSheetTab.tsx`, `PageFive.tsx`
- Gateway fan-out: `tts-tools/packages/tts-gateway/src/fanout/router.ts`
- Agent guide for dashboard designers (what to listen for): [Listening to TTS.md](Listening%20to%20TTS.md)

Verification:
- § Verification below; Trace Sync shows `DashPush.seat` and `DashPush.world` rows with `sent` / `skipped`
- `npm test` in `.dev/storyteller-dashboard/` (`livePush.test.ts`, `ttsEvents.test.ts`, `worldState.test.ts`)

Status:
- current (TOR-676 seat announcer, TOR-679 world topics; SD-Push / SD-Push-World dashboard halves)

---

## 1. Why push, not poll

Every dashboard request is an **Execute Lua** command: TTS compiles a script, runs it on the game's main thread, and sends back the answer. A poll loop has stalled TTS before. The rule stays: **the dashboard never polls TTS on a timer.** It fetches once when a tab opens, after Claim Port, and after a game load; everything else arrives as a push.

## 2. The path

```
Mutation (state only)
  → Sync.player(color)                    one announcer per touched seat
      → … lights, HUD, overlays, dice bags, CSHEET slices, PCs row …
      → DashPush.seat(color)              skip if encoded payload unchanged
          → sendExternalMessage({...})    one-way, port 39998, no reply
              → TTS Tools gateway          broadcasts table custom messages to every client
                  → dashboard server       keeps type == "dashboard", caches latest per topic/seat
                      → SSE /api/tts/events → browser tab merges the seat
```

- `print` and `sendExternalMessage` use the same one-way connection the TTS Tools console already uses. Nothing in TTS waits for a reply.
- The gateway's `<@TAG@>` unicast only works on text bodies, so table pushes are broadcast. The TTS Tools extension acts only on `type` `object` / `write`, so dashboard messages pass through it harmlessly.
- When the gateway is down, the dashboard binds 39998 itself (direct mode) and receives the same messages.
- TTS's own **loading a new game** event (`messageID` 1) becomes a `reload` topic on the dashboard.

There is **no subscribe handshake, session id, sequence number or per-frame batching**. The author runs the dashboard as a co-component of every session, and pushes are small. The only guard against an absent extension is a one-time printed notice when `sendExternalMessage` is nil.

## 3. Messages

| Topic | Sent by | Payload | Dashboard reaction |
| --- | --- | --- | --- |
| `pcSeat` | `DashPush.seat(color)` from `Sync.player` | `color`, `json` = slim seat snapshot (`snapshotSeat` without `playerData`) as a JSON string | PCs tab replaces that seat, keeping the previous `playerData` (only full fetches carry it) |
| `projects` | `DashPush.projects()` from `Projects.refreshAfterMutation` and `PJP.onPresentDayChanged` | none | Page 5 refetches the projects snapshot (only while it is mounted) |
| `reload` | dashboard server, on gateway `loadingANewGame` | none | Server clears its cache; PCs tab runs its one-shot `refresh(true)`; page 5 refetches; world store clears |
| `phase` | world flush (§ 3a) | phase, Play subphase, session number/name, first-Downtime flag, Memoriam active | world store replaces the slice (no UI yet) |
| `scene` | world flush | live library scene key/title/linked flag, district/site/table keys, placement mode, lighting preset, skybox override, top fog, weather layers | same |
| `clock` | world flush | clock **anchor** (§ 3b) | same; read through `clockNow` |
| `soundscape` | world flush | music mode/mood/enabled, location bed, featured track, session intro, per-lane volumes | same |
| `seats` | world flush | PC and NPC seat rows (table slot, `isPresent`, PC `absentFromSession`), stage NPCs with board position, spotlight order and front index | same |
| `rolls` | world flush | each PC's live or held roll, the Storyteller drawers and live NPC roll, Werewolf-tagged NPCs, Oblivion-Rouse seats ([Listening to TTS](Listening%20to%20TTS.md) § 2) | Scenes tab Rolls cell redraws |

Envelope from Lua: `{ type = "dashboard", v = 1, topic = "...", color?, json? }`. The server parses `json` into `data`, stamps `at` (server receive time, epoch ms) and forwards `{ topic, color?, data?, at }` as one SSE `data:` line.

### 3a. World topics — coalesced flush

The six world topics share one mechanism in `dashboard/push.ttslua`:

- `DashPush.markWorldDirty({ slice = true, … })` only records the slice names (O(1)). The first mark schedules one `U.await` flush **0.25 s** later, so a burst of syncs (scene Apply, phase change) sends each slice at most once.
- The flush builds each dirty slice (`W.build`), encodes it, and skips it when the string equals the last one sent. Each slice reports `DashPush.world` with `slice`, `outcome` (`sent` / `skipped`) and `bytes` to Trace Sync.
- Mark sites:

| Site | Slices |
| --- | --- |
| End of `UpdateUIDisplays(delta)` | no delta (full refresh): all. `phase` or `gameStateOverlay`: phase + clock. `scenesPanel`: scene + seats + clock. `scene` or `adminLighting`: scene. `soundscape`: soundscape |
| `Sync.npcs` | seats |
| Spotlight shuffle and rotation (`core/spotlight.ttslua`) | seats |
| Real-time ticker `GameStateOverlay.tickRealTimeClock` | clock (+ scene outside Downtime), **only** on an hour/day rollover or when present-day catch-up ends — never per minute |
| `Phases.freezeClock` | clock |
| `syncSoundscapeControls` (Sound panel repaint, including volume sliders) | soundscape |
| `Scenes.applyActiveSceneSoundscapeFromSession` | soundscape + scene |
| Global `onRollStateChanged` (every roll controller state change) | rolls |
| Storyteller drawer save (`saveRoot` in `core/storyteller_rolls.ttslua`) | rolls |
| Each dashboard roll command (`Rolls.apply`) | rolls |

Not pushed: Scenes library row selection, pickers and other Storyteller-panel-only UI state, the scene library contents (fetch on demand), and NPC records beyond seat/stage placement.

### 3b. Clock anchor

TTS does not stream the ticking clock. The `clock` slice is an anchor: `scene`, `downtime` (Downtime only) and `presentDay` datetimes, `activeClock` (`scene` / `downtime`), `running`, `speed` (narrative minutes per real minute, same unit as the TTS ticker), `catchUpToPresentDay`, `isPresentDay`. It also carries tonight's `dusk` / `dawn` datetimes (`NarrativeClockLerp.resolveDawnDuskTarget`, before sunrise: last night's) and the scheduled `temperatureC` (`ChronicleWeather.resolveForClock`) for the running clock; both only change at hour rollovers, which already re-anchor. The dashboard computes the current time with `clockNow(anchor, Date.now())`: base + `floor(speed × elapsed real minutes since at)`, with calendar rollover, stopping at `presentDay` during catch-up. TTS re-anchors on jumps (clock Apply, scene Apply), pause/resume, speed changes, and each hour rollover, which also corrects drift.

### 3c. Cache and mid-session tabs

- `GET /api/tts/cache` returns the server's cached latest events (`[{ topic, color?, data?, at }]`). Use it to eyeball what TTS last pushed.
- A new SSE client is replayed the cache. If the dashboard server restarted mid-session, the cache is empty until each slice next changes; `refreshWorldSnapshot()` (client) calls `GlobalDashboardWorldSnapshot` once and fills only slices no push has delivered.

**The envelope must stay flat.** A `sendExternalMessage` table that contains a nested table never reaches any gateway client (tested 2026-10-08: a flat message and a flat message with a 7 KB JSON string field both arrived; `{ data = { hunger = 2 } }` did not). Any structured payload travels as a JSON string field. `DashPush.seat` already encodes the seat for its unchanged-payload check, so it sends that string.

`DashPush.seat` ignores colors outside `C.PlayerColors`, seats with no player id, and the Storyteller. It keeps the last encoded payload per color, so repeat `Sync.player` calls with no visible change send nothing. `GlobalSetPlayerDesire` with `syncText = true` (end of desire editing on the CSHEET) calls `DashPush.seat` directly, because desire keystrokes deliberately skip the full announcer.

## 4. Dashboard server and client

- **Server:** `bindSession` adds `customMessage` and `loadingANewGame` listeners next to `status`. `parseDashboardPush` keeps only `type == "dashboard"` and `v == 1`. `TtsEventHub` caches the latest event per `topic:color`, replays the cache to each new SSE client, and sends a comment heartbeat every 25 seconds (server-side only — nothing reaches TTS). Opening the SSE stream auto-connects the bridge (`getBridgeStatus`), so pushes arrive even before a tab calls execute-lua.
- **Client:** one shared `EventSource` opened by the first subscriber and closed with the last. The browser reconnects it automatically; the server replay brings the tab current.
- **Optimistic edits win:** while the PCs tab's apply queue or a modal `applyNow` is in flight, `pcSeat` pushes are dropped. TTS runs the apply (which announces the seat) before it answers, so the apply's returned snapshot already includes that state.

## 5. Guardrails

- `dashboard/push.ttslua` is **Global-only**. Object scripts never `require` it; their mutations already go through `Global.call` mutators that reach `Sync.player`.
- Push is reconciliation-side output. It never writes `gameState` and is never called from state setters.
- New per-seat data reaches the dashboard by being in `snapshotSeat` — do not add `DashPush.seat` calls at mutation sites. Call `Sync.player(color)` instead.
- New world data reaches the dashboard by being in a `world_snapshot` builder. Add a `markWorldDirty` call only where a mutation bypasses `UpdateUIDisplays`, and never on a per-frame or per-tick path.
- A new topic must name its Lua call site(s) and the dashboard reaction in § 3, and its entry in [Listening to TTS.md](Listening%20to%20TTS.md).
- Heavy-workload rows: `sendExternalMessage` and `JSON.encode` in `TTS-API-Heavy-Workload-Catalog.md` / `TTS-API-Heavy-Workload-Usage-Inventory.md`.

## 6. Verification

1. With the dashboard PCs tab open, change a PC in TTS (damage from the in-game PCs panel, a Rouse stain from a roll, a CSHEET dot). The tab updates within about a second without pressing anything.
2. Trace Sync shows one `Sync.player` and one `DashPush.seat … sent` per change; a repeat with no visible change shows `skipped`.
3. Reload the save in TTS. The PCs tab refreshes once.
4. Edit a project in TTS (Projects panel). Page 5 on the dashboard refetches.
5. Close the dashboard server and play a few minutes. TTS should show no hitch while nothing listens on port 39998 (not yet confirmed in a live session).
6. Advance the Play subphase, apply a clock change, Apply on the control board, and drag a Sound volume slider. Trace Sync shows `DashPush.world` rows (one `sent` per changed slice per burst), and `http://127.0.0.1:8788/api/tts/cache` shows the matching `phase` / `clock` / `seats` / `soundscape` entries.
