# Execution Model Correction — Remediation Plan

**Status:** Preliminary remediation (do this before the external multiplayer audit).
**Owner action required:** This document is for **you (the author)** to work through — partly hands-on in-engine, partly agent-assisted — before an external agent is asked to audit multiplayer failure points. The audit is paused until Step 0 is confirmed and the conceptual correction below is agreed.

> **Why this exists:** While preparing the audit orientation guide, a foundational assumption in this repo's multiplayer design was found to contradict the authoritative Tabletop Simulator execution model. The current host-authority subsystem (P1–P10, `U.isHostClient`, `U.requireHostForWorldMutation`, the join-client `onLoad` branch) is built to defend against a failure mode that **cannot occur** under TTS's real model, while the failure mode that **can** occur (over-gating → "nothing happens for the client") is exactly what this subsystem risks introducing.

---

## 1. The finding

### 1.1 What the repo currently assumes (unverified, author-written)

From [`Bootstrap Authority.md`](../Sychronizing%20Game%20Functionality/Bootstrap%20Authority.md) and [`Preparing For Multiplayer.md`](Preparing%20For%20Multiplayer.md):

> "When real clients join, TTS runs **Global `onLoad` and object `onLoad` on every client**." … "Fan-out handlers (`onObjectDrop`, `onLoad`, `Global.call`) can invoke logic on **every machine**; only Host may mutate the world once."

The whole P1–P10 policy set, `U.isHostClient()`, `U.requireHostForWorldMutation()`, and the join-client early-return branch exist to stop **duplicate world I/O** caused by the same Lua running in a **separate VM on each connected client**.

### 1.2 What Tabletop Simulator actually does (authoritative)

**TTS runs all mod Lua on the host/server only. Connected clients do not run the Global script or any object scripts.** Clients transmit their interactions (button clicks, object grabs/drops, randomize, etc.) to the host over TTS's networking protocol; the host's Lua executes once; the engine replicates the resulting world/object state to every client.

Evidence, in descending authority:

| Source | Statement |
| --- | --- |
| Berserk Games dev response, [tabletopsimulator.nolt.io/2769](https://tabletopsimulator.nolt.io/2769) | Scripts "are **run on the server**." "Since the **game server player runs the game**, they're **trusted host for all**." "Clients **cannot** pretend to perform actions on behalf of other clients. **Only the server has that capability.**" |
| Official API — [Base](https://api.tabletopsimulator.com/base/) | `print` → "into chat that **only the host** is able to see." `log` → "the **host's** System Console." |
| Official API — [Web Request](https://api.tabletopsimulator.com/webrequest/manager/) | "allows you to send HTTP web request, **from the game host's computer only**." |
| Official API — [Intro](https://api.tabletopsimulator.com/intro/) | "There is **only one** Global script, and it is always present." (Game-level, not per-client.) |
| Community consensus (TTS Scripting Odds & Ends; multiple guides) | Clients do not have Global/Object Lua execution; only the host runs authoritative scripts. Clients receive networked object-state updates. |

**Note on the one real nuance (do not conflate it with Lua execution):** The community "Scripting Odds & Ends" guide documents *replication/rendering* desyncs — e.g. a client that dropped the frame an object spawned won't "see" it until it moves; `Component.set()` results can differ on a client viewing a stale object hierarchy; "same frame" for transform-order races means the *client's* frame. These are **engine replication and local-view timing** issues. They are **not** "the client re-ran your Lua." No mod Lua runs on the client to duplicate world mutations.

### 1.3 Consequence

The premise in §1.1 is **inverted**. Because only the host runs Lua:

- **Duplicate world I/O from multi-client Lua re-execution cannot happen.** There is only ever one Lua writer (the host). The primary thing P2/P7 guard against is not a real hazard.
- **`U.isHostClient()` is evaluated only ever on the host.** There is no non-host Lua context in which it could return `false` at runtime. Any code path it "protects" either always runs (fine) or is dead defensive logic.
- **The genuine risk is over-gating.** If the host-detection heuristic ever returns `false` on the machine that *is* running the code (e.g. its seated-player-count heuristics misfire when 2+ humans are connected), legitimate world mutations get suppressed and the symptom is *"the Storyteller clicks and nothing happens."* That is the failure mode you were worried about — and this subsystem is a source of it, not a defense against it.

---

## 2. Direct answers to your questions

**Q: "Which player is the host?"** — Correct and easy: the host is the player whose `steam_id == C.StorytellerID`. Iterate `Player.getPlayers()` (or resolve via seat color) and compare `steam_id`. This is already implemented correctly in `U.isStorytellerSteamPlayer`.

**Q: "Can a connected client programmatically check its own seat color to learn whether it is the host?"** — Under the correct model this question is **moot for Lua**, because **the connected client never runs your Lua at all.** There is no client-side script asking "am I the host?" Every `isHostClient()` call executes on the host. So:
- You do **not** need a client-side self-identification mechanism.
- You do **not** need the "host is always Black" fallback for execution gating.
- (For completeness: within host Lua you *can* read any seat's `Player[color].steam_id`, `.host`, `.admin`, `.promoted` — see [Player Instance](https://api.tabletopsimulator.com/player/instance/) — but that's identifying *other players*, not "which machine am I.")

**Q: "Is the initiating player sent to event handlers?"** — Depends on the event (this stays important because *actor identity* is the real multiplayer concern):
- **Full `Player` instance:** `onPlayerAction`, `onPlayerConnect/Disconnect`, `onPlayerPing`, `onPlayerTurn`, `onBlindfold`, `onChat` (as `sender`), and **XmlUI/HUD button handlers** (`function HUD_x(player, …)`).
- **Only a `player_color` string** (resolve `Player[color]` yourself): `onObjectDrop`, `onObjectPickUp`, `onObjectRandomize`, `onObjectRotate`, `onObjectFlick`, `onObjectHover`, `onObjectPeek`, `onObjectNumberTyped`, `onScriptingButton*`.
- **No initiating player:** `onLoad`, `onSave`, `onUpdate`, `onObjectSpawn`, `onObjectDestroy`, `onObjectEnterContainer`, `onObjectStateChange`.

---

## 3. Reframed model (what "correct" looks like)

| Concept | Old (inverted) framing | Corrected framing |
| --- | --- | --- |
| **Execution** | Lua runs on every client; guard so only host mutates. | Lua runs **only** on host. No execution gating needed. |
| **`U.isHostClient()` / `requireHostForWorldMutation`** | Distinguish "which machine executes." | Redundant at runtime (always host). Remove, or collapse to a constant, then delete call sites. |
| **Join-client `onLoad` early-return branch** | Prevent joiners from re-running world bootstrap. | Joiners never run `onLoad`; branch is dead. Remove. |
| **Actor identity (`isStorytellerSteamPlayer`)** | ST-only interaction gate. | **Keep — this is the real and correct concern.** "Who triggered this action?" via the event's player param vs `C.StorytellerID`. |
| **Per-client UI** | (Under-modeled.) | Genuinely per-client: XmlUI is rendered per client; use `visibility` targeting (`Black`/`Admin`/color) so the ST panel shows only to the ST and PC HUD to the right seat. This is engine-level, not Lua-execution. |
| **Desync risks** | "Duplicate reconcile from two VMs." | Replication/local-view timing (dropped-frame object visibility, stale hierarchy on `set()`), and physical races (two humans grabbing one object). Different mitigations. |

**Rule of thumb after correction:** *There is exactly one Lua brain (the host). Stop asking "which machine am I." Only ask "which player did this?" and "who should see this UI?"*

---

## 4. Remediation steps

### Step 0 — Verify the premise in-engine before removing anything (REQUIRED, ~15 min, needs a second client)

Do not refactor on my say-so alone. Prove it with your own eyes so the rest of the plan rests on observed behavior.

1. Add a temporary probe to `core/global_script.ttslua`:
   - In `onLoad`: `print("ONLOAD_RAN steam=" .. tostring((Player.getPlayers()[1] or {}).steam_id))` and `broadcastToAll("ONLOAD fired")`.
   - In `onObjectDrop(color, obj)`: `print("ONDROP color=" .. tostring(color))`.
2. Save & Play as host (seated Black). Have the friend join.
3. Friend opens console (`~`) and watches. **Host** drops a tagged object; **friend** drops a tagged object.

**Expected under the corrected model:**
- Only the **host** console ever prints `ONLOAD_RAN` / `ONDROP`. The **friend's** console shows **nothing** from these prints (because `print` is host-only *and* the client isn't running the Lua).
- When the **friend** drops an object, the **host** console prints `ONDROP color=<friend>` — i.e. the friend's action was routed to the host and handled once, on the host.
- Nothing prints twice.

If that is what you observe, §1.2 is confirmed and Steps 1–4 are safe. If you observe the friend's console independently printing `ONLOAD_RAN`, **stop and tell me** — the model would be more nuanced than the sources indicate and the plan changes.

> Optional stronger probe: set a module-level counter incremented in `onLoad`, and a Global function `GlobalEcho` that `print`s the counter; have the friend trigger it via a button. It should reflect the host's single execution, not a per-client count.

### Step 0-solo — Validations when a second client is unavailable

A single account **cannot** directly observe a join client's console (the definitive proof), but it **can** do three things that together give high confidence: confirm the authority, reproduce the over-gating failure live, and prove removal is regression-safe. Do all three.

**Honest limit:** none of these prove "clients never run Lua" by direct observation — only a real 2-client join can do that. But (V1) grounds the claim in the vendor's own words, (V2) shows the current gating is already broken the moment >1 player exists, and (V3) shows removal changes nothing solo. Convergent, not deferred-blocking. Keep the 2-client console check (original Step 0) as a **deferred confirmation** for whenever any second device/account is available — it should not block remediation.

#### V1 — Confirm the authority yourself (5 min, read)

Read the primary sources directly rather than trusting this doc:
- Berserk Games dev statement: [tabletopsimulator.nolt.io/2769](https://tabletopsimulator.nolt.io/2769) — "run on the server," "only the server has that capability."
- API host-only signals: [`print`/`log`](https://api.tabletopsimulator.com/base/), [`WebRequest` "host's computer only"](https://api.tabletopsimulator.com/webrequest/manager/), [one Global script](https://api.tabletopsimulator.com/intro/).

#### V2 — Reproduce the over-gating failure solo via hotseat (the decisive solo test)

`U.isHostClient()` returns `false` whenever **two or more players are seated and none is the "sole" human** — regardless of Steam identity. You can force that condition on one account with **hotseat**, which seats multiple colors on your single machine (the host).

**Probe (no code edit — preferred):** In `core/global_script.ttslua` the modules are bound as **globals** (`U = require("lib.util")`, also `C`, `S`, `NPCS` — no `local`), so the extension's **Execute Code** command can call them directly. Select and Execute this snippet (do **not** `require()` inside it — the bundle's `require` isn't in the executed chunk's scope; and note `Sync` **is** `local`, so it is *not* reachable this way — wrap it in a Global function if needed):

```lua
local ps = Player.getPlayers()
print("=== HOST PROBE ===  seatedPlayers=" .. #ps .. "  isHostClient=" .. tostring(U.isHostClient()))
for _, p in ipairs(ps) do
  print("  seat=" .. tostring(p.color) ..
        " steam_id=" .. tostring(p.steam_id) ..
        " host=" .. tostring(p.host) ..
        " admin=" .. tostring(p.admin))
end
```

1. Save & Play **solo** (only Black seated). Execute the snippet → expect `seatedPlayers=1 isHostClient=true`.
2. Start a **hotseat** game (Menu → Create → Hotseat, or enable hotseat on the current table) and **seat a second color** (e.g. Black + Red) so two players are seated on your one machine.
3. Execute the snippet again → **expect `seatedPlayers=2 isHostClient=false`** (the bug: the host machine now believes it is not the host). The per-seat `steam_id` dump resolves the one hotseat unknown: if the second seat shares your `steam_id` or has a distinct non-empty one, `solePlayerRefOrNil()` returns `nil` and `isHostClient()` flips to `false` (bug reproduced); if the extra seat has an **empty** `steam_id` it is filtered and the value may stay `true`. The dump shows which case occurred, so the result is interpretable. (`p.host` is TTS's authoritative host field — the API-blessed host check if it ever mattered — versus the seated-count heuristic.)
4. With two seats still active, trigger a host-gated action (Gameboard **Apply**/**Clear**, a scene change, a soundscape mood change). **Expected (when step 3 showed `false`):** it does nothing or partially fails, because `requireHostForWorldMutation` is now blocking the only machine that runs Lua.

If V2 behaves as described, you have demonstrated — on one account — that the execution-gating layer is not a safety net but a live liability that activates as soon as a real second player is seated. (Hotseat shares one `steam_id` across seats, so it does **not** represent real per-account play or the identity layer — it is used here only to force `#getPlayers() >= 2` and expose the `isHostClient` heuristic.)

> Complementary probe: temporarily set `U.isHostClient` to `return false` at its top, Save & Play solo, and watch world actions go dead; revert. This shows exactly what a non-host machine would experience *if* it ran Lua — i.e. the suppression the gates perform.

#### V3 — Prove removal is regression-safe solo

On a throwaway branch, perform the Step 3 removals for **one domain at a time**, Save & Play solo, and confirm behavior is byte-for-behavior identical to before:
- Gameboard Apply/Clear ([Gameboard-E2E](../E2E%20Playbooks/Gameboard-E2E.md))
- One dice roll path ([Dice-E2E](../E2E%20Playbooks/Dice-E2E.md))
- One scene apply ([Scenes-E2E](../E2E%20Playbooks/Scenes-E2E.md))

Because the gates can only alter behavior on a *non-host Lua VM* (which the sources say does not exist), **solo-identical behavior after removal ⇒ removal is safe.** Also re-run V2's hotseat action *after* removal: the previously-dead Apply/Clear should now work with two seats.

### Step 1 — Freeze the misleading docs and always-applied rules — **DONE 2026-07-04**

Done immediately (ahead of Step 0 validation) because a freeze banner only stops *new* inverted-model gating and is safe regardless of the validation outcome. This was **required now**, not deferrable: the always-applied rules (`alwaysApply: true`) auto-override this plan for every agent, so leaving them unbannered meant agents would keep adding `U.requireHostForWorldMutation` / `U.isHostClient()` guards while remediation was "planned."

Freeze banners added to:
- **Always-applied Cursor rules** (highest priority — these override docs): `.cursor/rules/toronto-rising-multiplayer-authority.mdc`, `.cursor/rules/toronto-rising-synchronization.mdc` (§ Multiplayer host authority).
- **Source docs:** [`Bootstrap Authority.md`](../Sychronizing%20Game%20Functionality/Bootstrap%20Authority.md), [`Preparing For Multiplayer.md`](Preparing%20For%20Multiplayer.md), [`Multiplayer Performance Audit.md`](Multiplayer%20Performance%20Audit.md), [`audit-2026-06-25.md`](audit-2026-06-25.md).

Banner contract (consistent across all): **for new code, do NOT add** `U.isHostClient` / `U.requireHostForWorldMutation` / `GlobalRequireHostForWorldMutation` / `requireStorytellerHostForMutation` execution guards; **do NOT ad-hoc remove** existing ones (removal is staged in Step 3); **keep** `U.isStorytellerSteamPlayer` actor-identity gating and per-client XmlUI `visibility` targeting — those are unaffected by the correction.

### Step 2 — Inventory the call sites (agent-assistable)

Produce a table of every use of the execution-gating primitives so removal is auditable. Known concentrations:

- `core/global_script.ttslua` (~100 hits — the bulk), `core/sync.ttslua` (7), `core/scenes.ttslua` (4), `core/npc_gameboard.ttslua` (3), `lib/util.ttslua` (3 = the definitions), `core/main.ttslua`, `core/roll_controller.ttslua`, `objects/dice_bag.ttslua`, `ui/ui_csheet_core.ttslua`, `lib/pc_roll_tray_lower.ttslua`.
- Grep targets: `isHostClient`, `requireHostForWorldMutation`, `GlobalRequireHostForWorldMutation`, `requireStorytellerHostForMutation`, `onLoadJoinClient`, and the `Sync.full` non-host branch.

For each hit classify:
- **(A) execution gate only** (guards world I/O behind "am I host") → remove the gate, keep the body.
- **(B) actor-identity gate** (checks who clicked / dropped, ST vs PC) → keep; ensure it uses `isStorytellerSteamPlayer` on the event's player param.
- **(C) mixed** (`requireStorytellerHostForMutation` = steam AND host) → reduce to the steam/actor check; drop the host half.

> **`C.StorytellerID` is a contrast grep, not a removal target.** Grepping `C.StorytellerID` surfaces the layer to **keep**, not the gating to remove. Its ~40 hits are almost all either **data-keying** (`gameState.playerData` is keyed by steam ID; the Storyteller has no player-character row, so `pc_stats`, `conditions`, `hud_overlays`, `ui_csheet_core`, `pc_storyteller_panel`, `effective_stats` skip it), **identity normalization** (`constants.ttslua`/`state.ttslua` `resolvePlayerRef`/`getStorageID`), or **actor-identity gates** (`global_script.ttslua` "activating player is Storyteller"). None of these are execution gating; all stay. Use the grep to *confirm* a hit is category (B), so the execution-gate removal (A/C) doesn't accidentally strip identity or data-keying logic. The actual removal targets are the `isHostClient` / `requireHostForWorldMutation` / `requireStorytellerHostForMutation` hits.

### Step 3 — Remove the execution-gating layer (staged, one domain at a time)

Order chosen to keep each stage independently Save-&-Play testable:

1. **`Sync.*` non-host branches** (`core/sync.ttslua`): delete the `isHostClient` short-circuits so `Sync.full` / `Sync.npcs` / `Sync.lighting` / etc. always run. (They only ever run on host anyway.)
2. **Join-client bootstrap** (`core/main.ttslua`, `core/global_script.ttslua` `onLoad`): remove `M.onLoadJoinClient` and the early-return join branch; `onLoad` runs on host, full stop.
3. **`Global.*` mutators** (`core/global_script.ttslua`): strip `requireHostForWorldMutation` from the ~Tier-C entries; collapse `requireStorytellerHostForMutation` to a steam-only actor check.
4. **Domain modules** (`scenes`, `npc_gameboard`, `roll_controller`): remove residual `isHostClient` gates.
5. **Object scripts** (`objects/dice_bag.ttslua`, `ui/ui_csheet_core.ttslua`): remove the host-execution guards. **Keep the `Global.call` routing and the thin-bundle discipline** — those are correct for bundle-size reasons ([object-script bundling rule](../../.cursor/rules/toronto-rising-object-script-bundling.mdc)), independent of this correction.
6. **Delete the primitives** from `lib/util.ttslua` (`isHostClient`, `requireHostForWorldMutation`) and the bundle-safe `GlobalRequireHostForWorldMutation` once call sites are zero. Keep `isStorytellerSteamPlayer`, `isStorytellerPlayerColor`, and `resolvePlayerRef`.

> **Lua local-function-order caution:** removals in `core/global_script.ttslua` will move code around. Re-check helper-before-caller order per [`lua-local-function-order`](../../docs/solutions/lua-local-function-order.md) after each stage, then Save & Play.

### Step 4 — Verify the *real* multiplayer concerns are still handled

After the execution layer is gone, confirm the concerns that actually matter under host-only Lua:

- **Actor identity:** ST-only panels/mutators reject actions from PC seats (check `isStorytellerSteamPlayer` on the player param). PC-seat actions attribute to the correct seat color.
- **Per-client UI visibility:** ST panel is visible only to the Storyteller; each PC HUD only to its seat. This is XmlUI `visibility` targeting (`Black`/`Admin`/`<Color>`), not Lua gating — audit the XML, not the Lua.
- **Replication/timing desyncs:** note (do not "fix" via host guards) the dropped-frame object-visibility and stale-hierarchy `set()` caveats for the external audit's attention.
- **Physical races:** two humans manipulating the same object — engine-level; out of scope for this correction but worth a note.

### Step 5 — Linear + tasklist sync

- Create a Linear issue in **Synchronization & State** (or **Foundation & Tooling**): *"Correct inverted TTS execution model — remove host-execution gating."* Relate it to TOR-144 (multiplayer E2E), TOR-221 (bootstrap/host guards), TOR-197 (event listener policy).
- Mark the P1–P10 mechanical host-guard work (audit 2026-06-25 Waves 1–5) as **superseded**, not "Done as designed."
- Update [`RUNNING TASKLIST.md`](../RUNNING%20TASKLIST.md) Focus accordingly.

---

## 5. Definition of done (before resuming the audit)

- [ ] Step 0 confirmed — either the 2-client console test (preferred) **or** the solo battery (V1 read + V2 hotseat `isHostClient=false` reproduction + V3 regression-safe removal). Record results. Leave the 2-client console check as a deferred confirmation; it does not block remediation.
- [x] Superseded-premise banners added to the source docs + two always-applied rules (Step 1 — done 2026-07-04).
- [ ] Execution-gating primitives removed; `isStorytellerSteamPlayer` retained; grep for `isHostClient` / `requireHostForWorldMutation` returns **0** in `core/`, `lib/`, `objects/`, `ui/`.
- [ ] Solo Save & Play smoke green (Gameboard Apply/Clear, one roll, one scene apply).
- [ ] `npm run build` green (esp. `check:bundle-size-gate` if object stubs touched).
- [ ] Linear issue filed; tasklist reconciled.

When these are checked, return here and I will write the external-agent audit orientation guide — reframed around the **correct** model (actor identity + per-client UI + replication timing) instead of the inverted execution premise.

---

## 6. Open question worth confirming during Step 0

One thing the sources do **not** fully specify and that your 2-client test can settle definitively: **do object-script `onLoad` handlers or `Global.call` targets ever execute in any client-local context** (vs. always host)? All evidence says host-only, but confirming it empirically (Step 0, plus a `Global.call`-from-friend-button probe) removes the last bit of uncertainty before you delete the guards. Capture the console output from both machines and paste it back here if anything is surprising.
