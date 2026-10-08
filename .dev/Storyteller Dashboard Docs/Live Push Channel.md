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
- Dashboard server relay: `.dev/storyteller-dashboard/src/server/ttsEvents.ts` (hub + SSE), listeners in `bindSession` of `src/server/ttsExecuteLua.ts`, route `GET /api/tts/events` in `src/server/index.ts`
- Dashboard client: `src/client/ttsEvents.ts` (shared `EventSource`), `src/client/pcSheet/livePush.ts` (`mergeSeatPush`), `PcSheetTab.tsx`, `PageFive.tsx`
- Gateway fan-out: `tts-tools/packages/tts-gateway/src/fanout/router.ts`

Verification:
- § Verification below; Trace Sync shows `DashPush.seat` rows with `sent` / `skipped`
- `npm test` in `.dev/storyteller-dashboard/` (`livePush.test.ts`, `ttsEvents.test.ts`)

Status:
- current (TOR-676 Lua half; SD-Push dashboard half)

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
| `pcSeat` | `DashPush.seat(color)` from `Sync.player` | `color`, `data` = slim seat snapshot (`snapshotSeat` without `playerData`) | PCs tab replaces that seat, keeping the previous `playerData` (only full fetches carry it) |
| `projects` | `DashPush.projects()` from `Projects.refreshAfterMutation` and `PJP.onPresentDayChanged` | none | Page 5 refetches the projects snapshot (only while it is mounted) |
| `reload` | dashboard server, on gateway `loadingANewGame` | none | Server clears its cache; PCs tab runs its one-shot `refresh(true)`; page 5 refetches |

Envelope from Lua: `{ type = "dashboard", v = 1, topic = "...", color?, data? }`. The server forwards `{ topic, color?, data? }` as one SSE `data:` line.

`DashPush.seat` ignores colors outside `C.PlayerColors`, seats with no player id, and the Storyteller. It keeps the last encoded payload per color, so repeat `Sync.player` calls with no visible change send nothing. `GlobalSetPlayerDesire` with `syncText = true` (end of desire editing on the CSHEET) calls `DashPush.seat` directly, because desire keystrokes deliberately skip the full announcer.

## 4. Dashboard server and client

- **Server:** `bindSession` adds `customMessage` and `loadingANewGame` listeners next to `status`. `parseDashboardPush` keeps only `type == "dashboard"` and `v == 1`. `TtsEventHub` caches the latest event per `topic:color`, replays the cache to each new SSE client, and sends a comment heartbeat every 25 seconds (server-side only — nothing reaches TTS). Opening the SSE stream auto-connects the bridge (`getBridgeStatus`), so pushes arrive even before a tab calls execute-lua.
- **Client:** one shared `EventSource` opened by the first subscriber and closed with the last. The browser reconnects it automatically; the server replay brings the tab current.
- **Optimistic edits win:** while the PCs tab's apply queue or a modal `applyNow` is in flight, `pcSeat` pushes are dropped. TTS runs the apply (which announces the seat) before it answers, so the apply's returned snapshot already includes that state.

## 5. Guardrails

- `dashboard/push.ttslua` is **Global-only**. Object scripts never `require` it; their mutations already go through `Global.call` mutators that reach `Sync.player`.
- Push is reconciliation-side output. It never writes `gameState` and is never called from state setters.
- New per-seat data reaches the dashboard by being in `snapshotSeat` — do not add `DashPush.seat` calls at mutation sites. Call `Sync.player(color)` instead.
- A new topic must name its single Lua call site and the dashboard reaction in § 3.
- Heavy-workload rows: `sendExternalMessage` and `JSON.encode` in `TTS-API-Heavy-Workload-Catalog.md` / `TTS-API-Heavy-Workload-Usage-Inventory.md`.

## 6. Verification

1. With the dashboard PCs tab open, change a PC in TTS (damage from the in-game PCs panel, a Rouse stain from a roll, a CSHEET dot). The tab updates within about a second without pressing anything.
2. Trace Sync shows one `Sync.player` and one `DashPush.seat … sent` per change; a repeat with no visible change shows `skipped`.
3. Reload the save in TTS. The PCs tab refreshes once.
4. Edit a project in TTS (Projects panel). Page 5 on the dashboard refetches.
5. Close the dashboard server and play a few minutes. TTS should show no hitch while nothing listens on port 39998 (not yet confirmed in a live session).

## 7. Future topics (not built)

`phase`, `scene` (which library scene is live), and a `roll` event feed. Each would follow § 5: one Lua call site in the owning announcer or reconciler, a short entry in § 3.
