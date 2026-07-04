# Execution Model Correction — Remediation Instructions

**For:** An agent executing this remediation. Follow the steps in order.
**Status:** Finding **confirmed** (solo hotseat battery, 2026-07-04) — see §1.4. Ready to execute Steps 2–5. Step 1 (freeze banners) already done.
**Goal:** Remove the host-**execution**-gating layer built on an inverted premise, while **keeping** actor-identity gating and per-client UI targeting. When done, the external multiplayer audit can resume against the corrected model.

---

## 1. Why (the finding)

### 1.1 What the repo assumed (wrong)

The host-authority subsystem — P1–P10, `U.isHostClient()`, `U.requireHostForWorldMutation()`, the join-client `onLoad` early-return branch — was built to stop **duplicate world I/O** from the same Lua running in a **separate VM on each connected client**.

### 1.2 What TTS actually does (authoritative)

**All mod Lua runs on the host only. Connected clients do not run the Global script or any object scripts.** Clients transmit interactions (clicks, grabs/drops, randomize) to the host; the host's Lua executes **once**; the engine replicates resulting world/object state to every client.

Evidence: Berserk Games dev — scripts "are run on the server," "only the server has that capability" ([nolt.io/2769](https://tabletopsimulator.nolt.io/2769)); API host-only signals — [`print`/`log` host-only](https://api.tabletopsimulator.com/base/), [`WebRequest` "host's computer only"](https://api.tabletopsimulator.com/webrequest/manager/), [one Global script](https://api.tabletopsimulator.com/intro/).

### 1.3 Consequence

The premise is **inverted**. Because only the host runs Lua:

- **Duplicate world I/O from multi-client Lua re-execution cannot happen** — there is only one Lua writer (the host).
- **`U.isHostClient()` is only ever evaluated on the host** — any path it "protects" either always runs (fine) or is dead defensive logic.
- **The real risk is over-gating.** When the host-detection heuristic returns `false` on the machine that *is* running the code, legitimate mutations are suppressed → *"the Storyteller clicks and nothing happens."* This subsystem is a **source** of that failure, not a defense.

### 1.4 Confirmed (2026-07-04, solo hotseat battery)

- **V1** (read authoritative sources) — consistent with §1.2.
- **V2** (hotseat probe) — with two seats, the console reported **`isHostClient=false`** on the host machine.
- **V3 / live** — **none** of the host-gated actions succeeded while multiple seats were connected.

This is exactly the over-gating failure of §1.3. The finding stands; removal is safe to proceed. *(Deferred confirmation, non-blocking: a real 2-client console test whenever a second device/account is available.)*

### 1.5 Replication nuance (do NOT re-solve via host guards)

The one real multi-client subtlety is **engine replication / local-view timing** — a client that dropped the frame an object spawned may not "see" it until it moves; `Component.set()` can differ on a client viewing a stale hierarchy. These are **not** "the client re-ran your Lua." Note them for the audit; do not address them with execution gates.

---

## 2. The corrected model (frame for every edit)

| Concept | Remove / Keep | Corrected framing |
| --- | --- | --- |
| **Execution gating** (`isHostClient`, `requireHostForWorldMutation`) | **Remove** | Lua runs only on host; no execution gating needed. |
| **Join-client `onLoad` early-return branch** | **Remove** | Joiners never run `onLoad`; branch is dead. |
| **Actor identity** (`isStorytellerSteamPlayer`) | **Keep** | "*Who* triggered this?" via the event's player param vs `C.StorytellerID`. The real, correct concern. |
| **Per-client UI** (XmlUI `visibility` = `Black`/`Admin`/`<Color>`) | **Keep** | Engine-level per-client rendering; ST panel to ST, PC HUD to its seat. Not Lua gating. |

**Rule of thumb:** *One Lua brain (the host). Stop asking "which machine am I." Only ask "which player did this?" and "who should see this UI?"*

**Event player-param reference** (needed to keep actor-identity gates correct in Step 4):
- **Full `Player` instance:** `onPlayerAction`, `onPlayerConnect/Disconnect`, `onPlayerPing`, `onPlayerTurn`, `onBlindfold`, `onChat` (`sender`), XmlUI/HUD handlers (`HUD_x(player, …)`).
- **Only a `player_color` string** (resolve `Player[color]`): `onObjectDrop`, `onObjectPickUp`, `onObjectRandomize`, `onObjectRotate`, `onObjectFlick`, `onObjectHover`, `onObjectPeek`, `onObjectNumberTyped`, `onScriptingButton*`.
- **No initiating player:** `onLoad`, `onSave`, `onUpdate`, `onObjectSpawn`, `onObjectDestroy`, `onObjectEnterContainer`, `onObjectStateChange`.

---

## 3. Remediation steps

### Step 1 — Freeze the misleading docs and rules — **DONE 2026-07-04**

Freeze banners added to the always-applied rules (`.cursor/rules/toronto-rising-multiplayer-authority.mdc`, `toronto-rising-synchronization.mdc`) and source docs (`Bootstrap Authority.md`, `Preparing For Multiplayer.md`, `Multiplayer Performance Audit.md`, `audit-2026-06-25.md`). Contract: for new code, do **not** add execution guards; do **not** ad-hoc remove existing ones (removal is staged below); **keep** `isStorytellerSteamPlayer` + per-client `visibility`.

### Step 2 — Inventory the call sites

Produce a table of every use of the execution-gating primitives so removal is auditable.

**Grep targets:** `isHostClient`, `requireHostForWorldMutation`, `GlobalRequireHostForWorldMutation`, `requireStorytellerHostForMutation`, `onLoadJoinClient`, and the `Sync.full` non-host branch.

**Known concentrations:** `core/global_script.ttslua` (~100 hits — the bulk), `core/sync.ttslua` (7), `core/scenes.ttslua` (4), `core/npc_gameboard.ttslua` (3), `lib/util.ttslua` (3 = the definitions), `core/main.ttslua`, `core/roll_controller.ttslua`, `objects/dice_bag.ttslua`, `ui/ui_csheet_core.ttslua`, `lib/pc_roll_tray_lower.ttslua`.

**Classify each hit:**
- **(A) execution gate only** (guards world I/O behind "am I host") → **remove the gate, keep the body.**
- **(B) actor-identity gate** (checks who clicked/dropped, ST vs PC) → **keep**; ensure it uses `isStorytellerSteamPlayer` on the event's player param.
- **(C) mixed** (`requireStorytellerHostForMutation` = steam **and** host) → **reduce to the steam/actor check; drop the host half.**

> **`C.StorytellerID` is a contrast grep, not a removal target.** Its ~40 hits are almost all **data-keying** (`gameState.playerData` keyed by steam ID; the ST has no PC row, so `pc_stats`, `conditions`, `hud_overlays`, `ui_csheet_core`, `pc_storyteller_panel`, `effective_stats` skip it), **identity normalization** (`resolvePlayerRef`/`getStorageID` in `constants.ttslua`/`state.ttslua`), or **actor-identity gates**. All stay. Use this grep to *confirm* a hit is category (B) so removal doesn't strip identity/data-keying logic.

### Step 3 — Remove the execution-gating layer (staged, one domain at a time)

Each stage must be independently Save-&-Play testable. **After each stage: Save & Play solo, smoke the touched path.**

1. **`Sync.*` non-host branches** (`core/sync.ttslua`): delete the `isHostClient` short-circuits so `Sync.full` / `Sync.npcs` / `Sync.lighting` / etc. always run.
2. **Join-client bootstrap** (`core/main.ttslua`, `core/global_script.ttslua` `onLoad`): remove `M.onLoadJoinClient` and the early-return join branch; `onLoad` runs unconditionally.
3. **`Global.*` mutators** (`core/global_script.ttslua`): strip `requireHostForWorldMutation` from the Tier-C entries; collapse `requireStorytellerHostForMutation` to a steam-only actor check.
4. **Domain modules** (`scenes`, `npc_gameboard`, `roll_controller`): remove residual `isHostClient` gates.
5. **Object scripts** (`objects/dice_bag.ttslua`, `ui/ui_csheet_core.ttslua`): remove host-execution guards. **Keep `Global.call` routing and thin-bundle discipline** — correct for bundle-size reasons ([object-script bundling rule](../../.cursor/rules/toronto-rising-object-script-bundling.mdc)), independent of this correction.
6. **Delete the primitives** from `lib/util.ttslua` (`isHostClient`, `requireHostForWorldMutation`) and the bundle-safe `GlobalRequireHostForWorldMutation` once call sites are zero. **Keep** `isStorytellerSteamPlayer`, `isStorytellerPlayerColor`, `resolvePlayerRef`.

> **Lua local-function-order caution:** removals in `core/global_script.ttslua` move code around. Re-check helper-before-caller order per [`lua-local-function-order`](../../docs/solutions/lua-local-function-order.md) after each stage, then Save & Play. See also the [freeze banner contract](../../.cursor/rules/toronto-rising-multiplayer-authority.mdc) — this remediation is the sanctioned removal path.

### Step 4 — Verify the *real* multiplayer concerns still hold

- **Actor identity:** ST-only panels/mutators reject actions from PC seats (`isStorytellerSteamPlayer` on the player param); PC-seat actions attribute to the correct seat color.
- **Per-client UI visibility:** ST panel visible only to the ST; each PC HUD only to its seat. Audit the **XmlUI `visibility`**, not the Lua.
- **Replication/timing desyncs:** note (do not "fix" via host guards) the §1.5 caveats for the external audit.
- **Physical races:** two humans manipulating one object — engine-level; note for the audit, out of scope here.

### Step 5 — Linear + tasklist sync

- File a Linear issue in **Synchronization & State** (or **Foundation & Tooling**): *"Correct inverted TTS execution model — remove host-execution gating."* Relate to TOR-144 (multiplayer E2E), TOR-221 (bootstrap/host guards), TOR-197 (event listener policy).
- Mark the P1–P10 mechanical host-guard work (audit 2026-06-25 Waves 1–5) **superseded**, not "Done as designed."
- Update [`RUNNING TASKLIST.md`](../RUNNING%20TASKLIST.md) Focus accordingly.

---

## 4. Definition of done

- [x] Finding confirmed (solo hotseat battery, 2026-07-04 — §1.4). *(2-client console test deferred, non-blocking.)*
- [x] Superseded-premise banners on source docs + two always-applied rules (Step 1).
- [ ] Call-site inventory produced and classified (Step 2).
- [ ] Execution-gating primitives removed; `isStorytellerSteamPlayer` retained; grep for `isHostClient` / `requireHostForWorldMutation` returns **0** in `core/`, `lib/`, `objects/`, `ui/`.
- [ ] Solo Save & Play smoke green (Gameboard Apply/Clear, one roll, one scene apply).
- [ ] `npm run build` green (esp. `check:bundle-size-gate` if object stubs touched).
- [ ] Linear issue filed; tasklist reconciled.

When these are checked, return here — the external-agent audit orientation guide will be written against the **corrected** model (actor identity + per-client UI + replication timing).
