# Execution Model Correction — Remediation Instructions

**For:** An agent executing this remediation. Follow the steps **in order**. Do not skip preflight or documentation/agent-instruction rewrites — half-corrected docs are worse than freeze banners.
**Status:** **Code + docs complete 2026-07-04** (TOR-284, commit `77cac3f` + doc sync). **Not closed** until §4.1–4.2 author Save & Play + hotseat battery pass. Multiclient TOR-144/TOR-249 remains separate.
**Goal:** Remove the host-**execution**-gating layer built on an inverted premise, while **keeping** actor-identity gating and per-client UI targeting; **rewrite** all docs and agent rules that still teach the wrong model; **reconcile Linear** so superseded host-guard work is not treated as “Done as designed.” When done, the external multiplayer audit can resume against the corrected model.

**Linear anchor:** **TOR-284** — *Correct inverted TTS execution model — remove host-execution gating* (**In Progress** until §4.1–4.2 author verification; code shipped `77cac3f`).

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

**Root cause of the heuristic bug:** `U.isHostClient()` returns `false` whenever **more than one player is seated** (see `lib/util.ttslua` — multi-player path falls through to `return false`). Solo hotseat with two seats therefore blocks all host-gated paths on the only machine that runs Lua.

### 1.4 Confirmed (2026-07-04, solo hotseat battery)

- **V1** (read authoritative sources) — consistent with §1.2.
- **V2** (hotseat probe) — with two seats, the console reported **`isHostClient=false`** on the host machine.
- **V3 / live** — **none** of the host-gated actions succeeded while multiple seats were connected.

This is exactly the over-gating failure of §1.3. The finding stands; removal is safe to proceed. *(Deferred confirmation, non-blocking: a real 2-client console test whenever a second device/account is available.)*

### 1.5 Replication nuance (do NOT re-solve via host guards)

The one real multi-client subtlety is **engine replication / local-view timing** — a client that dropped the frame an object spawned may not "see" it until it moves; `Component.set()` can differ on a client viewing a stale hierarchy. These are **not** "the client re-ran your Lua." Note them for the audit; do not address them with execution gates.

### 1.6 Known gap that **stays** after remediation (P10)

Join clients may still lack **live in-memory `gameState` Lua table updates** between saves (HUD reads stale until reload). That is a **state broadcast** problem, not an execution-model problem. Do **not** reintroduce host-execution guards to paper over it; track under **TOR-144** (multiplayer E2E) / audit follow-up.

---

## 2. The corrected model (frame for every edit)

| Concept | Remove / Keep | Corrected framing |
| --- | --- | --- |
| **Execution gating** (`isHostClient`, `requireHostForWorldMutation`) | **Remove** | Lua runs only on host; no execution gating needed. |
| **Join-client `onLoad` early-return branch** | **Remove** | Joiners never run `onLoad`; branch is dead. |
| **Actor identity** (`isStorytellerSteamPlayer`) | **Keep** | "*Who* triggered this?" via the event's player param vs `C.StorytellerID`. The real, correct concern. |
| **Per-client UI** (XmlUI `visibility` = `Black`/`Admin`/`<Color>`) | **Keep** | Engine-level per-client rendering; ST panel to ST, PC HUD to its seat. Not Lua gating. |
| **`Global.call` from object scripts** | **Keep** | Routes mutations through Global for **bundle-size** isolation, not because join clients run object Lua. |
| **O(1) tag/GUID pre-gates** (TOR-197) | **Keep** | Performance and irrelevant-handler skip — unrelated to host execution. |

**Rule of thumb:** *One Lua brain (the host). Stop asking "which machine am I." Only ask "which player did this?" and "who should see this UI?"*

**Event player-param reference** (needed to keep actor-identity gates correct in Step 4):
- **Full `Player` instance:** `onPlayerAction`, `onPlayerConnect/Disconnect`, `onPlayerPing`, `onPlayerTurn`, `onBlindfold`, `onChat` (`sender`), XmlUI/HUD handlers (`HUD_x(player, …)`).
- **Only a `player_color` string** (resolve `Player[color]`): `onObjectDrop`, `onObjectPickUp`, `onObjectRandomize`, `onObjectRotate`, `onObjectFlick`, `onObjectHover`, `onObjectPeek`, `onObjectNumberTyped`, `onScriptingButton*`.
- **No initiating player:** `onLoad`, `onSave`, `onUpdate`, `onObjectSpawn`, `onObjectDestroy`, `onObjectEnterContainer`, `onObjectStateChange`.

### 2.1 Corrected P1–P10 (use when rewriting docs in Step 6)

| # | Policy (corrected) | Retire / replace |
| --- | --- | --- |
| **P1** | **`gameState` is the sole authority for intent.** Mutation and reconciliation stay separate. | — |
| **P2** | **Tier C world I/O runs in mod Lua on the host** because TTS runs mod Lua on the host only — **not** because we gate with `requireHostForWorldMutation`. | Old P2 “Host client only” execution gate |
| **P3** | **Actor identity:** ST-only interaction → `U.isStorytellerSteamPlayer(playerRef)` on the event's player param. | Old P3 “separate who executes / Host machine” half |
| **P4** | **O(1) tag/GUID/color guard** before heavy work in hot handlers. | “On all clients” fan-out framing |
| **P5** | **Object-script mutations → `Global.call`** to Global entries (bundle-safe); Global may still steam-gate ST-only actions. | “Join-client Tier C via Global because non-host runs Lua” |
| **P6** | **Do not skip reconciler work** behind dead execution gates. Split Tier B state vs Tier C world in **one** Lua brain; no “all clients vs host” roll split. | Old P6 fan-out/host split for rolls |
| **P7** | **No dual apply** — one physical channel per intent; fingerprint or invalidate when needed. | — |
| **P8** | **Object scripts: no `require("core.*")`** for mutations; thin stubs + `Global.call`. **`GlobalIsStorytellerSteamPlayer` only** — no `GlobalRequireHostForWorldMutation`. | Host half of P8 |
| **P9** | **Document handlers** in Event Listener Policy (delivery + tier). | Rows that say “host guard” as requirement |
| **P10** | **Live `gameState` broadcast gap** may still affect join-client HUD reads; fix via sync bridge, not execution gates. | “Do not remove host guards to fix HUD staleness” |

---

## 3. Remediation steps

### Step 0 — Preflight (before any code edit)

- [x] **Clean working tree** — author confirmed pushed/clean 2026-07-04.
- [ ] **Linear issue filed** — see header; `relatedTo` **TOR-144** (multiplayer E2E), **TOR-221** (bootstrap/host guards — superseded), **TOR-197** (event listener policy). Label: `Bug` or `Improvement`, `module:sync`, `source:tasklist` if promoted to Focus.
- [ ] **Focus / tasklist** — add unchecked bullet under Synchronization or Foundation: *Execution model remediation — remove host-execution gating* `_(TOR-???)_`; do **not** remove **TOR-221** history — add superseded note (see Step 5).
- [ ] **Optional branch** — `fix/execution-model-remediation` if author prefers isolated review; otherwise staged commits on current branch are fine.

### Step 1 — Freeze the misleading docs and rules — **DONE 2026-07-04**

Freeze banners added to the always-applied rules (`.cursor/rules/toronto-rising-multiplayer-authority.mdc`, `toronto-rising-synchronization.mdc`) and source docs (`Bootstrap Authority.md`, `Preparing For Multiplayer.md`, `Multiplayer Performance Audit.md`). Contract during remediation: do **not** add execution guards; do **not** ad-hoc remove existing ones outside Step 3 staging; **keep** `isStorytellerSteamPlayer` + per-client `visibility`.

**Step 6 removes these banners** and replaces body text with §2.1 corrected policies.

### Step 2 — Inventory the call sites

Produce an auditable table **before** deleting anything.

**Deliverable:** [`.dev/Multiplayer Functionality/execution-model-call-site-inventory.md`](execution-model-call-site-inventory.md) with columns:

| Column | Content |
| --- | --- |
| File | path + line |
| Symbol | `isHostClient` / `requireHostForWorldMutation` / … |
| Category | **(A)** execution only / **(B)** actor-identity / **(C)** mixed |
| Action | remove gate / keep / collapse to steam-only / delete dead branch |
| Step 3 stage | 3.1–3.6 (see below) |

**Grep targets:** `isHostClient`, `requireHostForWorldMutation`, `GlobalRequireHostForWorldMutation`, `requireStorytellerHostForMutation`, `onLoadJoinClient`, and the `Sync.full` non-host branch.

**Known concentrations (2026-07-04 grep — verify in inventory):**

| File | Approx. hits | Notes |
| --- | --- | --- |
| `core/global_script.ttslua` | ~100 | Bulk: ~32 `requireStorytellerHostForMutation`, ~44 `requireHostForWorldMutation`/`isHostClient`, chunk-load silence guards, join `onLoad` branch |
| `core/sync.ttslua` | 7 | `Sync.full` UI-only non-host branch + per-slice short-circuits |
| `core/scenes.ttslua` | 2 | `applyDefaultNoSceneEnvironment`, `restoreActiveSceneWorld` |
| `core/npc_gameboard.ttslua` | 2 | `requireHostForWorldMutation` (not `GlobalIsStorytellerSteamPlayer` — **keep** steam gates) |
| `lib/util.ttslua` | 3 | Definitions — delete in stage 3.6 |
| `core/main.ttslua` | 1 | `M.onLoadJoinClient` — delete function |
| `core/roll_controller.ttslua` | 1 | `RC.changeRollType` |
| `objects/dice_bag.ttslua` | 3 | `GlobalRequireHostForWorldMutation` via `Global.call` |
| `ui/ui_csheet_core.ttslua` | 1 | `GlobalRequireHostForWorldMutation` via `Global.call` |
| `lib/pc_roll_tray_lower.ttslua` | 1 | `nudgeLiveTrayWorld` |

**Classify each hit:**
- **(A) execution gate only** (guards world I/O behind "am I host") → **remove the gate, keep the body.**
- **(B) actor-identity gate** (checks who clicked/dropped, ST vs PC) → **keep**; ensure it uses `isStorytellerSteamPlayer` on the event's player param.
- **(C) mixed** (`requireStorytellerHostForMutation` = steam **and** host) → **rename and collapse** — see §3.3.

> **`C.StorytellerID` is a contrast grep, not a removal target.** Its ~40 hits are almost all **data-keying**, **identity normalization**, or **actor-identity gates**. All stay. Use this grep to *confirm* a hit is category (B) so removal doesn't strip identity/data-keying logic.

**Inventory done when:** every grep hit in `core/`, `lib/`, `objects/`, `ui/` has a row; zero unclassified hits.

### Step 3 — Remove the execution-gating layer (staged, one domain at a time)

Each substage = **one commit** (see §3.4). **After each substage:** `npm run build` if object stubs touched; **Save & Play** + smoke (§4.1 minimum; **§4.2 hotseat** after 3.3 or 3.6).

#### 3.1 — `Sync.*` non-host branches (`core/sync.ttslua`)

Delete `isHostClient` short-circuits so `Sync.full`, `Sync.npcs`, `Sync.lighting`, `Sync.soundscape`, `Sync.npcCutouts`, and `Sync.player`'s lighting reconcile always run. Remove the `Sync.full` non-host UI-only early return.

**Smoke:** `HUD_syncAll` or any path that calls `Sync.full`.

#### 3.2 — Join-client bootstrap (`core/main.ttslua`, `core/global_script.ttslua` `onLoad`)

Remove `M.onLoadJoinClient` and the `if not U.isHostClient()` early-return join branch; full host bootstrap runs unconditionally on load. Remove join-client-only log lines that imply a second Lua VM.

**Smoke:** Save & Play load — no `"Joining client: skipped Host world bootstrap."` in console; soundscape/bootstrap completes.

#### 3.3 — `Global.*` and HUD handlers (`core/global_script.ttslua`)

Two passes in one commit **or** two commits if review size matters:

1. **Tier-C `Global.*` mutators:** strip every `U.requireHostForWorldMutation(...)` guard; keep mutation bodies and **steam** gates where present.
2. **ST XmlUI:** rename local helper **`requireStorytellerHostForMutation` → `requireStorytellerForMutation`**; implementation = **`isStorytellerSteamPlayer(player)` only** (drop `U.requireHostForWorldMutation` call). Update all ~32 `HUD_*` call sites. Update docstrings/comments that say "steam + host."
3. **Chunk-load / onLoad guards:** remove `isHostClient` checks from `trEarlySilenceSoundscapeEmitters`, deferred silence scheduling, and any other load-path skips tied to "join client."
4. **Delete `GlobalRequireHostForWorldMutation`** once object-script call sites are migrated (may defer to 3.5 if same commit is too large).

**Do not remove:** `GlobalIsStorytellerSteamPlayer`, tag/GUID pre-gates, `isStorytellerSteamPlayer` on fan-out drops.

**Smoke:** one ST panel action (scene apply or soundscape), one `GlobalGameboardApply`, one dice spawn path.

#### 3.4 — Domain modules

Remove residual execution gates in `core/scenes.ttslua`, `core/npc_gameboard.ttslua`, `core/roll_controller.ttslua`, `lib/pc_roll_tray_lower.ttslua`.

**Smoke:** scene restore or default environment; gameboard Apply; change roll type if exposed.

#### 3.5 — Object scripts

Remove `GlobalRequireHostForWorldMutation` checks from `objects/dice_bag.ttslua`, `ui/ui_csheet_core.ttslua`. **Keep `Global.call` routing.**

Run **`npm run check:bundle-size-gate`**.

**Smoke:** dice bag onLoad (no stale destroy regression); csheet layout apply if reachable.

#### 3.6 — Delete primitives (`lib/util.ttslua`)

Remove `U.isHostClient`, `U.requireHostForWorldMutation`, and `hostWorldMutationBlockLogged`. **Keep** `isStorytellerSteamPlayer`, `isStorytellerPlayerColor`, `resolvePlayerRef`, `solePlayerRefOrNil` (if still used elsewhere).

**Final grep gate:** zero matches for `isHostClient`, `requireHostForWorldMutation`, `GlobalRequireHostForWorldMutation`, `requireStorytellerHostForMutation`, `onLoadJoinClient` in `core/`, `lib/`, `objects/`, `ui/`.

> **Lua local-function-order caution:** removals in `core/global_script.ttslua` move code around. Re-check helper-before-caller order per [`lua-local-function-order`](../../docs/solutions/lua-local-function-order.md) after each substage, then Save & Play.

#### 3.7 — Commit chunking (mandatory)

| Commit | Scope | Message prefix |
| --- | --- | --- |
| 1 | Step 2 inventory file only | `docs: execution model call-site inventory` |
| 2 | 3.1 `sync.ttslua` | `fix(sync): remove host-execution gates` |
| 3 | 3.2 bootstrap | `fix(bootstrap): remove join-client onLoad branch` |
| 4 | 3.3 `global_script` | `fix(global): strip host-execution gates; rename ST helper` |
| 5 | 3.4 domain modules | `fix: remove host-execution gates from domain modules` |
| 6 | 3.5 object scripts | `fix(objects): remove GlobalRequireHostForWorldMutation` |
| 7 | 3.6 util primitives | `fix(util): delete isHostClient and requireHostForWorldMutation` |
| 8 | Step 6 docs + rules | `docs: correct TTS execution model in multiplayer guidance` |
| 9 | Step 5 tasklist | `docs: tasklist sync for execution model remediation` |

Reference **`TOR-???`** in commit bodies once the Linear id exists.

### Step 4 — Verify the *real* multiplayer concerns still hold

#### 4.1 Minimum smoke (after each Step 3 substage)

- Save & Play load completes without join-client skip message.
- Gameboard **Apply** and **Clear**.
- One **roll** path (ST or PC).
- One **scene** apply or soundscape toggle.

#### 4.2 Primary regression — hotseat battery (required before marking Done)

Reproduce §1.4 **in reverse** — this is the bug that confirmed the finding:

1. Solo host, **two or more seats** occupied (hotseat).
2. Console must **not** show spurious `[HostAuthority] blocked non-host` (verbose DEBUG) or silent no-ops.
3. Exercise host-gated paths that **failed in V3**: ST scene apply, soundscape control, gameboard Apply, dice spawn, `HUD_syncAll`.
4. Optional: log probe confirming removed helpers are gone (grep confirms; no runtime `isHostClient`).

*(Deferred, non-blocking: real two-machine / two-account session per **TOR-144** / **TOR-249**.)*

#### 4.3 Concerns audit (document in Linear Done comment)

- **Actor identity:** ST-only panels/mutators reject PC seat actions (`isStorytellerSteamPlayer` on player param).
- **Per-client UI visibility:** ST panel → ST only; PC HUD → seat color — audit **XmlUI `visibility`**, not Lua execution gates.
- **Replication/timing:** note §1.5 for external audit; no new execution gates.
- **P10 gameState broadcast:** note §1.6; still open under TOR-144.

### Step 5 — Linear + tasklist sync

**At kickoff (Step 0):** file issue, set **In Progress**, add tasklist bullet.

**At completion:**

| Item | Action |
| --- | --- |
| **Remediation issue `TOR-???`** | **Done** with comment: inventory path, substages completed, hotseat §4.2 result, `npm run build`, multiclient deferred |
| **TOR-221** (Non-Host onLoad guard audit) | Add **Done comment** — premise superseded; guards removed per remediation plan; do **not** reopen as Todo. Optionally label `superseded` in comment. Tasklist `[x]` bullet gets footnote: *superseded 2026-07 — execution model correction* |
| **TOR-144** (multiplayer E2E) | `relatedTo` remediation issue; audit can resume on corrected model |
| **TOR-197** (event listener policy) | Inventory rows updated in Step 6 — note in comment |
| **`RUNNING TASKLIST.md`** | Mark remediation `[x]`; adjust **Focus** if this was stack-ranked; gate-close survey if anything was `blockedBy` this work |

**Do not** mark TOR-144 Done — multiclient pass remains **TOR-249** human gate.

### Step 6 — Documentation and agent instructions (same remediation — not deferred)

Remove freeze banners and rewrite bodies to §2 / §2.1. **Grep each file after edit** for stale `isHostClient`, `requireHostForWorldMutation`, `GlobalRequireHostForWorldMutation`, `requireStorytellerHostForMutation`, "every client runs", "join client runs onLoad", "fan-out … all clients" (execution sense).

| Surface | Required changes |
| --- | --- |
| [`.dev/Multiplayer Functionality/Preparing For Multiplayer.md`](Preparing%20For%20Multiplayer.md) | Remove banner; rewrite §1.1 P1–P10 to §2.1; delete join-bootstrap / `Sync.full` non-host table rows; update §1.2 helper table (drop host helpers; keep steam + `Global.call`); fix §1.3 high-risk checklist; update §1.4 pre-flight (drop host guard order); fix solo-dev myth ("`isHostClient()` always true when alone") |
| [`.dev/Sychronizing Game Functionality/Bootstrap Authority.md`](../../.dev/Sychronizing%20Game%20Functionality/Bootstrap%20Authority.md) | Remove banner; rewrite authority model — **one Lua brain**; drop "Storyteller machine (execution)" axis and join-client bootstrap table; keep actor-identity axis + tiers A/B/C; fix event delivery table (handlers run on host; clients send events) |
| [`.dev/Sychronizing Game Functionality/Event Listener Policy.md`](../../.dev/Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md) | Remove "GM vs Host client" execution paragraph; update Global.call inventory (drop host-guard column/requirement); fix handler rows that say `requireHostForWorldMutation`; add remediation note under TOR-221 / host audit checklist |
| [`.dev/Multiplayer Functionality/Multiplayer Performance Audit.md`](Multiplayer%20Performance%20Audit.md) | Remove banner; reorient audit checklist to actor identity + UI visibility + replication timing; remove `GlobalRequireHostForWorldMutation` / host-guard pass criteria |
| [`.cursor/rules/toronto-rising-multiplayer-authority.mdc`](../../.cursor/rules/toronto-rising-multiplayer-authority.mdc) | Remove banner; replace body with corrected P1–P10; agent checklist = actor identity + Sync discipline + Event Listener Policy + hotseat smoke note; drop host-execution mandates |
| [`.cursor/rules/toronto-rising-synchronization.mdc`](../../.cursor/rules/toronto-rising-synchronization.mdc) | Remove banner; delete "Multiplayer host authority" execution subsection; keep mutation/reconcile separation + dual-apply + `isStorytellerSteamPlayer` where relevant |
| [`.cursor/rules/toronto-rising-object-script-bundling.mdc`](../../.cursor/rules/toronto-rising-object-script-bundling.mdc) | Approved patterns table: Tier C row → `Global.call("Global…")` mutator with **steam gate if ST-only**, not `GlobalRequireHostForWorldMutation` |
| [`.cursor/rules/toronto-rising-development.mdc`](../../.cursor/rules/toronto-rising-development.mdc) | Update multiplayer bullet if it still cites host-execution guards — point to corrected Preparing §1 |
| [`.cursor/skills/tr-start/SKILL.md`](../../.cursor/skills/tr-start/SKILL.md) | Multiplayer authority row → corrected model (actor identity + `Global.call` bundle pattern) |
| [`.dev/E2E Playbooks/Multiplayer-E2E.md`](../E2E%20Playbooks/Multiplayer-E2E.md) | Remove/adjust steps that assert join-client Lua execution or host-guard pass/fail |
| [`.dev/DEVELOPMENT_WORKFLOW.md`](../DEVELOPMENT%20WORKFLOW.md) | If host-guard workflow mentioned — one-line pointer to corrected Preparing |
| **This plan** | Check Definition of done §4; set Status to **Complete** with date |

**Optional follow-up (out of scope for Done):** external-agent audit orientation guide (mentioned in original §4 footer) — file as separate doc or TOR-144 sub-task after this remediation closes.

---

## 4. Definition of done

- [x] Finding confirmed (solo hotseat battery, 2026-07-04 — §1.4). *(2-client console test deferred, non-blocking.)*
- [x] Superseded-premise banners on source docs + two always-applied rules (Step 1).
- [x] Preflight git clean (Step 0).
- [x] Linear issue **TOR-284** filed; agent work **Done** slice (Steps 0–3, 5–6, commit `77cac3f`). Issue stays **In Progress** until §4.1–4.2 author verification.
- [x] Call-site inventory at [`execution-model-call-site-inventory.md`](execution-model-call-site-inventory.md) complete and classified (Step 2).
- [x] Step 3 substages 3.1–3.6 complete (commit **`77cac3f`** — 13 Lua paths under `core/`, `lib/`, `objects/`, `ui/`; see [`execution-model-call-site-inventory.md`](execution-model-call-site-inventory.md)).
- [x] Execution-gating primitives removed; grep returns **0** for removed symbols in `core/`, `lib/`, `objects/`, `ui/`.
- [x] **`npm run check:bundle-size-gate`** green. *(Full `npm run build` blocked by pre-existing tts-object-stub-guids gate.)*
- [ ] **§4.1–4.2** Save & Play + hotseat battery — **author verification required**.
- [x] **Step 6** doc + agent rule rewrites complete.
- [x] **Step 5** tasklist + Linear reconciliation (TOR-221 footnote on tasklist).

When all boxes are checked, the codebase and agent instructions describe **one host Lua brain**, **actor-identity gates**, and **per-client UI** — not dual-VM execution gating.
