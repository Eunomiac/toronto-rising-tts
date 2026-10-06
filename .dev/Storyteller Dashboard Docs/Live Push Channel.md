# Live Push Channel — TTS to Storyteller Dashboard (design draft)

## Agent Routing

Read this when:
- making the Storyteller Dashboard stay current with live play without polling TTS
- adding `sendExternalMessage` calls outside debug tooling
- adding a dashboard tab that shows live `gameState` (PCs, connection, phase, scene, rolls)

Source of truth (once built):
- Lua emitter: `dashboard/push.ttslua` (Global-only; planned)
- Subscribe handshake: `onExternalMessage` in `lib/console.lua` (planned `data.dashboard` branch)
- Dashboard server relay: `.dev/storyteller-dashboard/src/server/ttsExecuteLua.ts` (`customMessage` listener) + an SSE route in `src/server/index.ts`
- Gateway fan-out: `tts-tools/packages/tts-gateway/src/fanout/router.ts`

Verification:
- see § Verification plan below

Status:
- **design draft — awaiting author review.** Nothing in this doc is implemented yet.

---

## 1. The problem

The dashboard is becoming the Storyteller's main admin surface during play, so it needs to show what is happening at the table without the Storyteller pressing Refresh.

The obvious approach is polling: ask TTS for a fresh snapshot every few seconds. We already know that hurts. Every dashboard request is an **Execute Lua** command: TTS receives a script on port 39999, compiles it, runs it on the game's main thread, encodes the answer, and sends it back. A PCs-tab poll storm has already stalled TTS once (see the dashboard tasklist entry "PCs JSON Apply hang"). The rule stays: **the dashboard never polls TTS on a timer.**

## 2. The channel that already exists

TTS has a second, one-way path that runs the other direction. It is how the TTS Tools extension shows console output without slowing the game:

- When Lua calls `print(...)`, TTS opens a short local connection to port **39998**, writes one JSON message, and closes it. Nothing waits for a reply, and nothing is queued inside TTS.
- Lua can send its **own** messages on the same path with `sendExternalMessage({ ... })`. These arrive as "custom messages" (External Editor API `messageID` 4).

Everything after TTS is already built:

```
TTS Lua ──sendExternalMessage──▶ port 39998 ──▶ TTS Tools gateway ──▶ every registered client
                                                 (Cursor extension)      ├─ TTS Tools extension (ignores unknown types)
                                                                         └─ Storyteller Dashboard server (registered as DASHBOARD)
                                                                                   │
                                                                                   ▼  Server-Sent Events (local, cheap)
                                                                             Dashboard browser tab
```

- The gateway broadcasts custom messages to all registered clients (`fanOutEvent` in `router.ts`).
- `@tts-tools/gateway-client` already raises a `customMessage` event; the dashboard just doesn't listen for it yet.
- The TTS Tools extension only acts on custom messages whose `type` is `object` or `write`, so a `type = "dashboard"` message passes through it harmlessly.
- When the gateway is down, the dashboard binds 39998 itself (direct mode) and receives the same messages.
- TTS also announces **loading a new game** (`messageID` 1) and **game saved** (`messageID` 6) on its own. The dashboard can react to those for free.

Note on routing: the gateway's `<@TAG@>` "send only to one client" prefix only works on **text** bodies. `sendExternalMessage` sends a table, so dashboard pushes are broadcast. That's fine because other clients ignore them. A small gateway change could route on a table field later if needed.

## 3. Design

### 3.1 Subscribe handshake: no pushes unless the dashboard is listening

Lua should not send dashboard pushes when no dashboard is running. That keeps the cost at zero for sessions without the dashboard and avoids the open question of what TTS does when nothing is listening on 39998.

1. **On load:** at the end of `onLoad`, Lua sends one unconditional `{ type = "dashboard", topic = "ready", session = <id> }` message. `session` is a fresh random id each time Lua starts.
2. **Dashboard subscribes:** when the dashboard server connects to TTS, or sees `ready` or `loadingANewGame`, it sends one small custom message to TTS: `{ dashboard = { subscribe = true, topics = { ... } } }`. TTS delivers this to `onExternalMessage` as a plain table. There's no script compile, unlike Execute Lua.
3. **Lua keeps one in-memory flag** (`DashboardPush.subscribed`, with the topic list). This is runtime only, not `gameState`, and it resets naturally on reload.
4. **Unsubscribe** on **Release Port**: `{ dashboard = { subscribe = false } }`. If the dashboard crashes without unsubscribing, Lua keeps sending small messages nobody reads. That's harmless and costs about the same as a `print`.

Commands into TTS happen only on connect, reload, and release. There is no keep-alive ping.

### 3.2 Message envelope

```lua
sendExternalMessage({
  type = "dashboard",   -- lets the extension and other clients ignore it
  v = 1,                -- envelope version
  session = "<id>",     -- changes on every Lua start; dashboard resyncs when it changes
  seq = 1234,           -- increases by one per push within a session; a gap means a lost message
  topic = "pcSeat",
  data = { ... },
})
```

### 3.3 Batch changes into one push per frame

Hot paths only **mark something dirty**. They never build or send a payload directly.

```lua
DashboardPush.markDirty("pcSeat", color)   -- cheap: one table write, no-op when not subscribed
```

The first `markDirty` in a burst schedules one flush on the next frame with `U.await(flush, 0)`. The flush builds one payload per dirty topic and key, sends it, and clears the dirty set. Twenty rapid character-sheet clicks on Red therefore send **one** Red push, not twenty.

Rules:

- `markDirty` returns immediately when not subscribed or when the topic is not subscribed.
- Payload builders read `gameState` only. No `getObjects`, `getObjectsWithTag`, casts, or UI reads.
- `DashboardPush` never writes `gameState`. It is a reconciliation-side output, like a HUD refresh.

### 3.4 Where Lua marks things dirty

The dashboard is one more **presentation surface**, so it should be told at the same points where the in-game presentation is told. It should not hook state setters, because the sync contract forbids hidden side effects there.

Important finding: **PC sheet changes do not all pass through `Sync.player`.** For example, dashboard dot and damage edits call `afterTrackerChange` → `PCST.refreshCharacterSheetsForColor` + `PCST.refreshRow`, never `Sync.player`. The candidate hook points for the `pcSeat` topic are therefore:

| Hook point | File | Why |
| --- | --- | --- |
| `UpdateUIDisplays` when `playerStats` is set with `colors` | `core/global_script.ttslua` | `Sync.player(color)` ends here |
| `PCST.refreshRow(color)` | `core/pc_storyteller_panel.ttslua` | in-game Storyteller PCs row; tracker, hunger, desire, connection changes |
| `PCST.refreshCharacterSheetsForColor(color)` | `core/pc_storyteller_panel.ttslua` | every path that must repaint the CSHEET pages |

**Audit required before building:** trace each way PC data changes in play (CSHEET clicks, roll outcomes such as hunger, Rouse, and willpower damage, conditions, XP log, Storyteller panel buttons, dashboard apply). Confirm every one reaches at least one hook point above. Any path that reaches none is also a stale in-game panel bug and should be filed separately.

### 3.5 Topics (proposed)

| Topic | Key | Payload | Hook | Phase |
| --- | --- | --- | --- | --- |
| `ready` | — | `session` only | end of `onLoad` | 1 |
| `pcSeat` | seat color | **slim** seat snapshot (below) | § 3.4 | 1 |
| `connection` | seat color | `connected`, `absentFromSession` | player connect/disconnect handlers + blindfold checkpoint | 1 (can fold into `pcSeat`) |
| `phase` | — | current phase key | phase advance | 2 |
| `scene` | — | active library scene key, applied/linked flag | scene Apply / library link | 2 |
| `roll` | roll id | roller, type, pool, outcome | roll resolve | 3 (optional event feed) |

**Slim seat snapshot:** the same shape `dashboard/pc_sheet.ttslua` `snapshotSeat` returns today, **minus `playerData`**. `playerData` is a deep copy of the whole player record, used only by the JSON debug modal. That modal keeps fetching on demand with the existing one-shot call. Pull the shared parts of `snapshotSeat` into a function both paths use, so the pushed shape and the fetched shape never drift.

**Size budget:** aim for under ~8 KB per message, and measure real sizes during the first slice. If a future topic can't fit, push a short "changed" notice instead (`{ topic = "x", key = k, changed = true }`). The dashboard then fetches once, and only if that tab is visible.

### 3.6 Dashboard server and client

- **Server:** register one `customMessage` listener on the gateway session, separate from the per-call print and error listeners in `runExecute`. Drop anything without `type == "dashboard"`. Keep the **latest payload per topic and key** in memory. Relay to browsers over **Server-Sent Events** (`GET /api/tts/events`, a one-way stream from server to browser).
- **New browser tab or reload:** the server replays its cached latest payloads first. A browser reload then costs TTS nothing.
- **Client:** one shared `EventSource`. Each tab handles its own topics. The PCs tab merges incoming `pcSeat` payloads into its seat list.
- **Optimistic edits:** the PCs tab paints clicks immediately and queues `GlobalDashboardPcSheetApply`. While an apply is pending for a seat, keep the local overlay on top of incoming pushes for that seat. Drop the overlay when the apply returns. The push that follows reflects the applied state.

### 3.7 When the dashboard still asks TTS directly (one-shot, never on a timer)

- When a tab first opens, or after the bridge connects (existing PCs behavior).
- When `session` changes (TTS reloaded) or `seq` has a gap (a message was lost).
- When the author opens the JSON debug modal (full `playerData`).

## 4. Performance guardrails

- No pushes while unsubscribed (§ 3.1).
- One flush per frame at most, one message per dirty topic and key (§ 3.3).
- Builders read `gameState` only, with no world scans.
- Nothing calls `sendExternalMessage` directly from hot handlers (`onObjectDrop`, `onObjectPickUp`, timers). They call `markDirty` only.
- A debug toggle (`DashboardPush.setEnabled(false)`) for A/B hitch testing.
- Optional counters (messages and bytes per minute) reported through the existing `Sync.setMetricsEnabled` metrics path.

## 5. Repo rules this touches

- **Bundling:** `dashboard/push.ttslua` is **Global-only**. Object scripts never `require` it. If an object-script path changes PC data, it already goes through a `Global.call` mutator, which reaches the hook points.
- **Sync contract:** push is reconciliation-side output. It never writes state and is never called from `S.setStateVal` / `S.setPlayerVal`.
- **Heavy-workload docs:** reclassify `sendExternalMessage` from "debug-only" to "sanctioned for dashboard push with subscribe gate + per-frame coalescing" in `TTS-API-Heavy-Workload-Catalog.md` and `TTS-API-Heavy-Workload-Usage-Inventory.md`.
- **Event Listener Policy:** add a row for the `onExternalMessage` `data.dashboard` subscribe branch (host-executed, Tier A runtime flag).
- **Multiplayer:** all mod Lua runs on the host, and the dashboard runs on the host machine. No per-client concerns.
- **Tracking:** the Lua side is TTS-observable (in-game emitter + subscribe branch), so it needs a Linear issue and a Pending Author Verification row when it ships. Dashboard-only parts stay on the dashboard tasklist.

## 6. Rollout

1. **Phase 1 — PCs live.** Subscribe handshake, `ready`, `pcSeat` (with connection fields), server SSE relay, PCs tab merge. Includes the § 3.4 hook audit and a size and hitch measurement.
2. **Phase 2 — table context.** `phase` and `scene` topics; Scenes tab shows which library scene is live.
3. **Phase 3 — optional event feed.** `roll` and similar events as a scrolling log on the dashboard.

## 7. Verification plan (Phase 1)

1. **No dashboard running:** Save & Play, play normally. Lua sends only the single `ready` message, with no other dashboard traffic.
2. **Dashboard connected:** the server log shows subscribe sent, then `pcSeat` pushes as you click a character sheet in TTS. The dashboard PCs tab updates within about a second, without pressing anything.
3. **Burst test:** click one seat's character sheet about 20 times quickly. The server log shows a handful of pushes (one per frame at most), and TTS shows no visible hitch compared with the same test with `DashboardPush.setEnabled(false)`.
4. **Reload test:** reload the save in TTS. The dashboard sees a new `session`, resubscribes, and fetches one fresh snapshot.
5. **Release test:** press Release Port. Pushes stop (unsubscribe sent) and TTS Tools keeps working.

## 8. Open decisions for the author

1. **Phase 1 scope:** PCs tab only (recommended), or also connection and phase in the first slice?
2. **Inline payloads vs "changed" notices:** recommended inline slim seat snapshots for `pcSeat`, with "changed" notices only for large future topics.
3. **Event feed:** do you want a running log of rolls and connections on the dashboard eventually (Phase 3), or just current state?
4. **Missing-refresh paths:** if the § 3.4 audit finds PC changes that don't refresh the in-game Storyteller panel either, fix them as part of Phase 1 or file them separately?
