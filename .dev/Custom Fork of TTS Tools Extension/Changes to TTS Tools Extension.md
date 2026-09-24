# Changes to TTS Tools Extension

Working notes for the Toronto Rising fork of [tts-tools](https://github.com/Eunomiac/tts-tools).
Code lives in `D:\Projects\.CODING\tts-tools`. VSIX build/install tasks live in toronto-rising-tts `.vscode/tasks.json`.

**Related drafts:**
- [GATEWAY-INTEGRATION-DRAFT.md](./GATEWAY-INTEGRATION-DRAFT.md) — third-party gateway README (not implemented yet)
- [MARKETPLACE-AUTHOR-CHECKLIST.md](./MARKETPLACE-AUTHOR-CHECKLIST.md) — steps only you can complete for a public Marketplace release
- [UPSTREAM-FENCES.md](./UPSTREAM-FENCES.md) — Chesterton’s-fence oddities to ask Sebastian about before ripping them out

---

## Problem 1 — Slow Save & Play re-import

**Symptom:** After Save & Play, `.tts` is wiped and every object is re-imported (often 3–4 minutes on Toronto Rising).

**Cause:** Save & Play only sends scripts. TTS replies with `loadingANewGame`. The extension then deletes `.tts/*` and, for each non-Global object, runs a separate Lua `getJSON` round-trip. That N-times TTS traffic is the cost — not bundling itself.

### Locked decisions (Save & Play / sync)

| Decision | Choice |
| --- | --- |
| Sync engine | Fingerprint-based incremental writes (`#3`): hash Lua/XML (optional data later); write only diffs; prune vanished GUIDs; **no blind wipe** |
| Speed for script/UI | Prefer `scriptStates` already in `loadingANewGame` (`#2`); do **not** `getJSON` just to refresh `.lua`/`.xml` |
| Default Save & Play | Fast path (`#1`): after *our* Save & Play, skip full sync on the echo (keep disk); still refresh `.tts/bundled` for what we sent so Go to Error stays correct |
| Escape hatch | New command **Save & Play (Full Resync)** (`#4`); optional setting `ttsEditor.resyncAfterSaveAndPlay` (default `false`) |
| `getJSON` | Only for missing/forced `data.json`, Full Resync, or missing script/UI in the message |

---

## Problem 2 — Port 39998 shared by Dashboard and extension

**Symptom:** Only one listener on TTS editor port **39998**. Dashboard Claim Port is easy; reclaiming for the extension today means Extension Host restart (and often another full import).

### Locked decisions (gateway + dual-mode)

| Decision | Choice |
| --- | --- |
| Product shape | Gateway is a **feature of tts-tools**: shipped with the extension, started by the extension when needed, marketed as “other local apps can register” |
| Process shape | Small helper process launched by the extension; **stops when Cursor/extension deactivates (C4=B)**. Reload flap absorbed by `gateway-client` auto-rejoin |
| Extension role | Extension does **not** bind 39998 itself; it starts/finds the gateway and **registers as client #0** |
| Without gateway | Clients (Dashboard, or extension fallback) bind **39998 directly** — seamless, invisible when Cursor/gateway is absent (play sessions) |
| With gateway | Clients use `gateway-client` → register; library releases direct bind if it held it |
| Gateway down | Library **auto-fallback** to direct + quiet status; **auto-rejoin** when gateway returns. In-flight proxied `executeLua` may timeout — clear error, retry |
| Claim/Release | Power-user escape hatch only; normal apps rely on `gateway-client` state machine. Extension still ships Claim/Release early (Epic B) before gateway exists |
| Commands to TTS (**39999**) | Fire-and-forget may go direct; **anything expecting a return is proxied through the gateway (C1 = A)** |
| Inbound fan-out (**39998**) | Default: **broadcast** print / error / loadingANewGame / customMessage to all registered clients; **unicast** `returnMessage` to the client that owns that `returnID` |
| Status without hitching TTS | Dashboard must **not** probe 39998/39999 on a timer; gateway can answer “who holds the editor port” without opening connections to TTS |
| Optional tags | Optional, easy; agent owns v1 design (see C3 below) |
| Dashboard TTS access | **One** shared Dashboard bridge for all features (PC sheet, Lua tab, Scenes, etc.) — either the whole Dashboard is on gateway/direct, or none. Prefer **all features work** in emergency |
| Third-party DX (Marketplace) | **Agreed — three layers** (see below) |
| Discovery | **Control-port primary** for clients; gateway **force-claims** 39998 on start (never kills TTS); migration handled inside `gateway-client` |
| Helper lifetime | **Shut down when Cursor/extension fully stops (C4 = B)**; client library auto-fallback/rejoin absorbs reload flap |
| Integrator principle | **Complexity lives in gateway + `gateway-client`.** Third-party apps should not implement port politics, returnID demux, or fan-out rules themselves. |

#### Third-party integration (locked)

Author agreed to ship all three layers for Marketplace / other apps:

| Layer | What | Who it’s for |
| --- | --- | --- |
| **1. npm client** | `@tts-tools/gateway-client` — connect, events, executeLua, **built-in** direct↔gateway failover | Node / JS apps — **primary** path; almost all integrator logic lives here |
| **2. Protocol doc** | Stable register / fan-out / tags / failure-mode spec | Any language |
| **3. Copy-paste appendix** | Short raw TCP/control example in README | Hobby one-offs; not the main story |

Pitch line: *Install the TTS Tools extension (starts the local gateway). Other apps attach with `@tts-tools/gateway-client`, or speak the documented register protocol.*

The extension is client #0 on the same protocol — not a special snowflake API.

### Author Q&A (resolved from conversation + replies)

- **Q1 Process model:** Extension owns/ships gateway; auto-starts helper if not running; Dashboard uses gateway when present else direct. Not a separate always-on Windows service for v1.
- **Q2 Mid-play attach:** Open Cursor → extension starts gateway → Dashboard auto-detects, releases direct if needed, registers. Prefer minimal clicks; auto-reconnect through gateway when it appears.
- **Q3 Fan-out:** Agree broadcast + unicast returns; plus optional `<@CLIENTTAG@>` filtering as above.
- **Q4 Commands:** Returns go through gateway (C1=A); pure fire-and-forget can stay on 39999.
- **Q5 Discovery:** Control-port primary for clients; gateway **force-claims** 39998 on start (never TTS); all migration/failover lives in `gateway-client`.
- **Q6 Failure:** Auto-fallback + auto-rejoin as discussed (not “stay dark,” not “fight forever”).
- **Q7 Dashboard scope:** Single TTS path; all features or none; target all.
- **Q8 Home:** Under **tts-tools** as an extension feature (package + helper), not toronto-rising `.dev` alone.

---

## Implementation plan

Work order is intentional. **Epic A is the first implementation step** — its job is to kill the multi-minute “Get Objects” / wipe-and-reimport after every Save & Play. Claim/Release and gateway come after that daily pain is gone.

**Author status (2026-09-23):** Fence email sent to Stern. C3 tag syntax accepted. Marketplace publish **deferred** until the fork is solid in daily TR use; still design/implement with eventual publication in mind (clean attribution, three-layer DX, no TR-only hacks in the public surface).

### Epic A — Fast Save & Play / incremental sync  ← **first build**
**Repo:** `tts-tools/packages/tts-editor`
**Primary success:** After a normal Save & Play on Toronto Rising, disk sync finishes in **seconds**, not minutes — no blind wipe, no N× `getJSON` for every object just to refresh scripts.

**Status (2026-09-23):** Implemented and **author-verified** on branch `epic-a-fast-sync` (extension **2.3.1** includes Epic B + Global stub fix). Load Objects instantaneous; Save & Play fingerprint/echo path confirmed live.

1. [x] Add `objectSync` (fingerprint + reconcile; no blind wipe).
2. [x] Drive `loadingANewGame`, Get Objects, and `pushingNewObject` through it.
3. [x] Prefer `scriptStates` for Lua/XML; limited `getJSON` for data / Full Resync only.
4. [x] Default Save & Play: send + expect-echo short-circuit; **write sent bundles to `.tts/bundled`** so Go to Error works.
5. [x] Fix import scramble early: match `returnID` on Lua returns; single-flight / mutex around import so overlapping Get Objects / push don’t interleave.
6. [x] Add **Save & Play (Full Resync)** command (+ optional setting).
7. [x] Verify on Toronto Rising: cold load once; **edit → Save & Play is fast**; manual Get Objects / Full Resync still correct when needed.
8. [x] Package VSIX via existing tasks.
9. [x] **Global Include/require stubs (2.3.1):** Bundled Save & Play still rebundles Global from `.tts/objects` when those files are thin stubs; echo flushes sent scripts to `.tts/bundled` without replacing the objects stubs.

### Epic B — Extension port Claim/Release (no gateway yet)
**Repo:** `tts-tools/packages/tts-editor`
**Status (2026-09-23):** Implemented and **author-verified** (port swap with other local tools works without Extension Host restart). Superseded for steady-state by Epic C gateway, but Claim/Release remain the power-user escape hatch.

1. [x] Expose **Claim TTS Editor Port** / **Release TTS Editor Port** (listen/close on current direct API).
2. [x] `deactivate` closes cleanly (or documents helper handoff once Epic C exists).
3. [x] Status bar: holding 39998 / released / error.
4. [x] Verify: Extension Release → other tool Claim → Extension Claim without Extension Host restart.

### Epic C — Gateway helper + register protocol
**Repo:** `tts-tools` (`packages/tts-gateway` + `packages/gateway-client` + wire from `tts-editor`)
**Status (2026-09-24):** Implemented on **main** / extension **2.4.3**. Control port **39997** (NDJSON). **Author-verified** on the Cursor/IDE side (gateway working).

1. [x] Helper process: sole binder of **39998** (force-claim reclaimable holders; never TTS); control/register API on **39997**.
2. [x] Extension on activate: if gateway not up → spawn helper; register as client via **same** `gateway-client` as everyone else (`TTSTOOLS` tag).
3. [x] Fan-out + returnID tracking for proxied executeLua; optional `<@TAG@>` filter/strip.
4. [x] Heartbeat so clients detect death quickly.
5. [x] On extension deactivate / Cursor quit: stop helper (C4=B). Clients fall back via library (**Epic D** failover).

### Epic D — `gateway-client` + docs (three layers)
**Repo:** `tts-tools` (`packages/gateway-client`)
**Status (2026-09-24):** Implemented on **main** — `@tts-tools/gateway-client` **0.2.0**, extension **2.5.0**.

1. [x] **Layer 1 — npm package:** `connectGateway()` with **direct↔gateway** failover (port stolen → register; gateway down → direct; gateway up → rejoin). Extension uses `failover: false` (owns helper).
2. [x] **Layer 2 — protocol markdown:** [`packages/gateway-client/PROTOCOL.md`](../../../tts-tools/packages/gateway-client/PROTOCOL.md) (also mirrored in GATEWAY draft).
3. [x] **Layer 3 — README appendix:** copy-paste stub in package README; “use Layer 1 if you can.”
4. [x] Marketplace / package README leads with ~10-line Layer 1 quickstart.

### Epic E — Dashboard single TTS bridge
**Repo:** `toronto-rising-tts/.dev/storyteller-dashboard`

1. One module all features use — ideally thin wrapper over `@tts-tools/gateway-client` (no bespoke port politics).
2. Library handles probe/register/direct/fallback/rejoin.
3. Emergency: Cursor up → gateway force-claims → library migrates Dashboard automatically.
4. Keep Claim/Release UI only as power-user escape hatch if still useful.

### Epic F — Polish / Marketplace readiness (later)

1. Local auth token for register (user-local file) so random processes can’t silently attach.
2. Extension settings: control port, enable gateway, tag name.
3. Public docs for third-party apps.

---

## C1–C4 decisions (author answers + agent review)

### C1 — Return demux → **(A) locked**

**Author:** Agree with (A).
**Agent:** Good call. This is the correct elegant fix; (B) is race-prone and (C) is fragile under concurrent Dashboard + extension Lua.
**v1 rule:** Any API that expects a TTS return (executeLua, etc.) goes through the gateway; fire-and-forget may remain direct to 39999.

### C2 — Discovery / “gateway masters the port” → **forceful claim locked; recovery in the client library**

**Author:** Gateway on startup should become master of 39998 and forcefully claim it.
**Agent (revised for Marketplace DX):** Agree with forceful claim — and withdraw the “politely ask each app to Release first” idea.

**Why:** Requiring every third-party app to implement a custom “please release the port” handshake **compounds integrator work**. Prefer: the **gateway** takes the port; **`@tts-tools/gateway-client`** handles being kicked off a direct bind and migrating to register. App authors write as little as possible.

| Situation on gateway start | Behavior |
| --- | --- |
| 39998 free | Bind it; publish control port |
| 39998 held by reclaimable process (prior gateway, editor, Dashboard, etc.) | **Force claim** (same family of tooling as Dashboard Claim Port today) |
| 39998 held by **Tabletop Simulator** itself | **Never** kill |

**Client library responsibilities (not each app):**

1. Prefer control-port ping → register with gateway when present
2. Else bind 39998 directly
3. If direct listen is killed / errors because gateway claimed the port → auto probe control port → register
4. If gateway dies → auto-fallback to direct + quiet status
5. If gateway returns → auto-rejoin

App code ideally: `connectGateway({ routeTag: "MYAPP" })` and subscribe to events — not a bespoke port-politics protocol.

**Still true:** Mid-play “open Cursor → gateway starts → Dashboard keeps working” relies on that library state machine (or the Dashboard’s single bridge using it), not on manual Release clicks — though keeping Claim/Release as a **power-user escape hatch** in both UIs is fine.

### C3 — Tagged routing → **locked (author accepted agent v1 syntax)**

**Author:** Leave how/extent to the agent; must stay optional and easy. **Accepted** the agent v1 proposal below (2026-09-23).
**Agent v1 (locked unless implement-time snag):**

- Optional register field: `routeTag` (e.g. `TTSTOOLS`, `DASHBOARD`) — uppercase `[A-Z][A-Z0-9_]{0,31}`.
- Only applies to **string bodies** of print / error / customMessage (not binary/JSON object custom payloads unless a string field is designated later).
- If the body begins with `<@TAG@>` and `TAG` matches a registered client’s `routeTag`, deliver **only** to that client and **strip** the prefix.
- If tag present but no matching client → drop or broadcast? **v1: broadcast unstripped to all** (safer while debugging; avoids silent loss).
- Untagged → broadcast as today.
- No tag required for normal use; docs show one example.

If tags prove awkward in practice, we can ship gateway v1 **without** tags and add them in a fast follow — optional means we are allowed to defer implementation if Epic C is already large.

### C4 — Helper lifetime → **(B) locked for quit/disable; note host-reload flap**

**Author:** Prefer (B) — no invisible process after exiting Cursor; other Marketplace users would not expect that either.
**Agent:** Agree for **quit Cursor** and **disable extension**. That pairs cleanly with Dashboard auto-fallback to direct 39998 when the gateway vanishes.

**Caveat (not a disagreement):** Extension Host **reload** (VSIX install task) also runs deactivate→activate. If we kill the gateway on every deactivate, Dashboard will flap to direct and back during reloads. That is acceptable if auto-rejoin is solid; we should not fight (B) with orphan processes. Optional nicety later: detect “reload” vs “quit” only if the API makes it reliable — do not depend on it for v1.

**Locked:** On extension deactivate / Cursor exit → stop the gateway helper. Explicit **Stop Gateway** is unnecessary if deactivate always stops it; optional **Start Gateway** remains via activate/Claim.

---

## Out of scope (for now)

- Changing toronto-rising Lua layout / bundling rules beyond what sync needs
- Rewriting luabundle/xmlbundle algorithms
- Always-on Windows service installer for v1
- **Publishing** to Marketplace until Epics A–E feel solid in daily TR use (still build as if we will publish later)
