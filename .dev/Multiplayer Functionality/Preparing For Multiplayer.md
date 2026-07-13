# Preparing For Multiplayer

## Agent Routing

Read this when:
- touching multiplayer-sensitive load, event, HUD, object, sync, or world-I/O paths
- deciding whether solo Host verification is enough
- preparing or interpreting TOR-144 multiplayer E2E work

Source of truth:
- `.cursor/rules/toronto-rising-multiplayer-authority.mdc`
- `core/global_script.ttslua`
- `core/sync.ttslua`
- object scripts under `objects/`

Verification:
- [Multiclient Session Script](../E2E%20Playbooks/Multiplayer-Session.md) (friend session)
- [Multiplayer-E2E](../E2E%20Playbooks/Multiplayer-E2E.md) (agent coverage checklist)
- relevant solo playbooks from `.dev/TESTING.md` before multiclient verification

Status: current multiplayer authority policy. **Initial multiclient E2E passed** (**TOR-144** / **TOR-249**, 2026-07-13) — host-authority scripting confirmed with real clients. P1–P10 remain standing contracts.

**Purpose:** Solo Host development still cannot fully validate join-client-only quirks (P10, XmlUI visibility). This document is the **agent policy** surface (P1–P10, audits, high-risk paths). The **friend-session runbook** lives separately for re-smokes and regressions.

**Friend session (author):** [Multiclient Session Script](../E2E%20Playbooks/Multiplayer-Session.md) — Phases A–E (initial gate **Done**; reuse for regressions).

> **Agents (mandatory):** **Every** change that adds or modifies event handlers, load/bootstrap hooks, `HUD_*` / object clicks, `Global.*` mutators, or world I/O must comply with **§1.1 policies P1–P10** and the **§1.4 pre-flight checklist**. Always-on Cursor rule: [`.cursor/rules/toronto-rising-multiplayer-authority.mdc`](../../.cursor/rules/toronto-rising-multiplayer-authority.mdc). Re-smoke Multiclient Session Script when changing join/seat/HUD visibility. Residual missing join HUD: **TOR-381** (TTS External — do not invent host-execution gates).

**Related:** [Multiclient Session Script](../E2E%20Playbooks/Multiplayer-Session.md), [Multiplayer-E2E](../E2E%20Playbooks/Multiplayer-E2E.md) (coverage checklist), [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md), [Reconciler Contract](../Sychronizing%20Game%20Functionality/Reconciler%20Contract.md), [Dual-apply survey](../Sychronizing%20Game%20Functionality/Dual_apply_survey.md), [Phases Overview](../Phases/Phases%20Overview.md) (TOR-143), [lua-local-function-order](../../docs/solutions/lua-local-function-order.md).

**Linear:** **TOR-144** / **TOR-249** Done (2026-07-13). Residual join HUD: **TOR-381**.

---

## 1. Steps to Take During Solo Development

### 1.1 Absolute policies (non-negotiable contracts)

**Execution model:** TTS runs **all mod Lua on the host only**. Connected clients do not run the Global script or object scripts — they transmit interactions (clicks, grabs/drops, randomize) to the host; the host's Lua executes once; the engine replicates resulting world/object state to every client.

**Rule of thumb:** *One Lua brain (the host). Stop asking "which machine am I." Only ask "which player did this?" and "who should see this UI?"*

| # | Policy | Why |
| --- | --- | --- |
| **P1** | **`gameState` is the sole authority for intent.** Mutation (`S.setStateVal`, domain APIs) and reconciliation (`Sync.*`, domain reconcilers) stay separate. | Prevents hidden world writes and "fighting" reconcilers. |
| **P2** | **Tier C world I/O runs in mod Lua on the host** because TTS runs mod Lua on the host only — **not** because we gate with execution guards. | Do not skip reconciler work behind dead execution gates. |
| **P3** | **Actor identity:** ST-only interaction → `U.isStorytellerSteamPlayer(playerRef)` on the event's player param. | "*Who* triggered this?" — the real, correct concern. |
| **P4** | **One cheap O(1) guard before any work** in hot handlers (`onObjectDrop`, `onObjectRandomize`, `onUpdate`). Tag/GUID/color compare first; then `require`, loops, `Sync.*`. | Performance and irrelevant-handler skip — unrelated to host execution. See [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md). |
| **P5** | **Object-script mutations → `Global.call`** to Global entries (bundle-safe); Global may still steam-gate ST-only actions. | Routes mutations through Global for **bundle-size** isolation, not because join clients run object Lua. |
| **P6** | **Do not skip reconciler work** behind dead execution gates. Split Tier B state vs Tier C world in **one** Lua brain; no "all clients vs host" roll split. | Over-gating breaks hotseat and legitimate mutations. |
| **P7** | **No dual apply:** one physical channel (light fade, audio fade, spawn, lerp) per intent. After eager apply, prime fingerprint (`Soundscape.markReconciledToCurrentState`) or call `Sync.invalidateReconcileCache` when world may be stale. | See [Dual-apply survey](../Sychronizing%20Game%20Functionality/Dual_apply_survey.md). |
| **P8** | **Object scripts: no `require("core.*")`** for mutations; thin stubs + `Global.call`. **`GlobalIsStorytellerSteamPlayer` only** for actor-identity gates from object scripts. | Bundled chunks are isolated; orchestration lives in Global. |
| **P9** | **Document new event handlers** in [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md) with delivery (host-executed event vs clicker) and tier (A/B/C). | Reviewers and future you need the inventory. |
| **P10** | **Live `gameState` broadcast gap** — join-client Lua/`S.getStateVal` (and some HUD labels fed from it) may lag Host after runtime mutations; **do not** “fix” with execution gates. See [§1.1a](#11a-p10--live-gamestate-broadcast-gap-known); session scoring in [Multiclient Session Script](../E2E%20Playbooks/Multiplayer-Session.md#p10-known--do-not-fail-the-pass-for-this-alone). | Join clients get engine-replicated **world** (objects, lights, audio). Host `gameState` Lua tables are **not** automatically pushed live between saves. |

### 1.1a P10 — live `gameState` broadcast gap (known)

TTS runs **all mod Lua on the Host only**. When the Host writes `gameState` (placement counts, phase string, hunger, scene fields, …), that table lives in **Host script memory**. Join clients automatically receive **physical table replication** (figurines move, lights change, dice appear). They do **not** automatically receive every in-memory `gameState` update until save/reload — or until a deliberate sync/broadcast bridge exists.

**In a friend session this looks like:**

1. Host Applies → Host console `print(#placements)` → `3`
2. Friend runs the same print → still `0` or an old count
3. Both still **see** the same three figurines on stage

**How to score it:**

| Observation | Treat as |
| --- | --- |
| Table / lights / audio / dice **match** Host; friend’s `S.getStateVal` or a HUD label fed from stale state **differs** | **Document as P10** — **not** a fail for TOR-249 / initial TOR-144 pass |
| Table **disagrees** with Host (double motion, missing figurines, wrong seat props) | **Fail** — replication / dual-apply / authority bug |
| Friend click does nothing / ST action silent | **Fail** — routing / steam gate — not P10 |

**Do not** address P10 by reintroducing `isHostClient` / `requireHostForWorldMutation` execution gates. Fix later via a live state sync bridge to join-client HUD reads.

### 1.2 Essential helper functions

| Function | Location | Use |
| --- | --- | --- |
| `U.isStorytellerSteamPlayer(playerRef)` | `lib/util.ttslua` | Gate ST-only **interaction**. Accept `Player` instance (preferred) or seat color string. |
| `U.isStorytellerPlayerColor(color)` | `lib/util.ttslua` | Legacy XmlUI alias: `Black` / `Host`. Prefer steam when `Player` is available. |
| `GlobalIsStorytellerSteamPlayer(params)` | `core/global_script.ttslua` | Bundle-safe steam check from object scripts (`params.player` or `params.player_color`). |
| `M.tryAutoAssignSeatFromChronicle(player, opts?)` | `core/main.ttslua` | Steam ID → `C.PlayerData.color` (ST → Black; unregistered → White). Called from `onPlayerConnect`. |
| `M.assignAllConnectedSeatsFromChronicle()` | `core/main.ttslua` | Load-time two-pass assign (`M.setupPlayers`); `onPlayerConnect` does not re-fire for already-connected players. |
| `Phases.advanceNext` / `advanceTo` / `setPlaySubPhase` | `core/phases.ttslua` | Top-level Advance + Play subphases (TOR-143). |
| `Phases.lowerBlindfoldForConnectingPlayer` | `core/phases.ttslua` | Connect policy when not Intermission (TOR-319). |
| `Sync.full(opts)` | `core/sync.ttslua` | Full reconcile (state → world). |
| `Sync.player(color)` | `core/sync.ttslua` | Per-player reconcile: lights + HUD/overlays/`UpdateUIDisplays`. |
| `Sync.npcs` / `Sync.lighting` / `Sync.soundscape` | `core/sync.ttslua` | Domain reconcilers. |
| `Sync.ui(delta)` | `core/sync.ttslua` | UI-only refresh. |

**Per-client UI (not Lua gating):** XmlUI `visibility` = `Black`/`Admin`/`<Color>` — engine-level per-client rendering; ST panel to ST, PC HUD to its seat.

**Object-script routing:** PC-initiated mutations use `Global.call("Global…")` so orchestration stays in Global (bundle-size), not because join clients run object Lua.

### 1.3 High-risk code paths (audit before inviting a friend)

When touching these areas, verify P1–P10 and run solo smoke (Apply/Clear, one roll). Friend-session coverage: [Multiclient Session Script](../E2E%20Playbooks/Multiplayer-Session.md). Agent checklist: [Multiplayer-E2E](../E2E%20Playbooks/Multiplayer-E2E.md).

| Area | Key files / entry points | Solo check |
| --- | --- | --- |
| **Load / bootstrap** | `global_script.onLoad`, chunk `trEarlySilence*`, `SS.bootstrapSilenceStrayEmitterLoops`, `main.onLoad` → `M.setupPlayers` / `M.assignAllConnectedSeatsFromChronicle`, `sync.ttslua` `Sync.full` | Bootstrap completes; soundscape silence runs; connected players land on chronicle seats (TOR-345) |
| **Gameboard Apply/Clear** | `GlobalGameboardApply`, `GlobalGameboardClear`, `core/npc_gameboard.ttslua`, `Sync.npcs` | ST-only steam on Global mutators; board `click_*` → `Global.call` |
| **Token drop / pick-up** | `onObjectDrop`, `onObjectPickUp`, `NPCS.onObjectDropped`, `Gameboard.onNpcControlTokenDropped` | Tag gates (`npc_figurine`, `npc_control_token`) **then** steam when ST-only |
| **Scene / soundscape** | `HUD_changeScene`, `HUD_scenesLibApply`, `HUD_soundscape*`, `StorytellerScenesPanel`, `Sync.full` | Eager soundscape uses `commitEagerSteadyState` / fingerprint per dual-apply survey |
| **Phases / session lifecycle** | `core/phases.ttslua`, `HUD_phaseAdvance`, `HUD_setPlaySubPhase`, `HUD_sessionNumInput`, Phases panel | ST Advance once (e.g. Intermission→Play): single light/theme/blindfold transition; scene Apply promotes to Play silently via `Phases.ensurePlayPhaseForSceneApply` (TOR-143) |
| **Dice / rolls** | `HUD_roll*`, `GlobalDiceBagClick`, `GlobalSpawn*`, `GlobalReleaseBagDice`, `onObjectRandomize`, `objects/dice_bag.ttslua` `onLoad`, `core/roll_controller.ttslua` | PC roll clicks use `Global.call`; bag onLoad destroy via Global |
| **Signal candle / tarot** | `ui/ui_signal_candle.ttslua` → `GlobalToggleSignalFireState`, `ui/ui_tarot_button.ttslua` → `GlobalApplyTarotState` | Global callee steam-gates ST-only actions |
| **Character sheet** | `ui/ui_csheet_core.ttslua` → `Global.call` mutators; onLoad layout | Steam gate on ST-only mutators |
| **ST PCs / debug lights** | `HUD_pcPanel`, `HUD_debugLightActivate/Enabled/ResetRow/Slider` | ST steam gate |
| **Player connect / seat** | `onPlayerConnect`, `onPlayerChangeColor`, `M.tryAutoAssignSeatFromChronicle`, `M.assignAllConnectedSeatsFromChronicle` (load via `M.setupPlayers`) | Steam ID → `C.PlayerData[steam].color` (ST → Black); unregistered → White; Intermission keeps blindfold up, other phases call `Phases.lowerBlindfoldForConnectingPlayer` (TOR-345 / TOR-319) |

### 1.4 Pre-flight checklist for every new handler

Before merging Lua that reacts to players or objects:

1. **Classify delivery:** host-executed event (`onObjectDrop`, `Global.call`, `onLoad`) vs clicker-only (`HUD_*`, `click_*`).
2. **Classify tier:** A UI / B state / C world.
3. **Guard order:** nil/object check → tag/GUID → `isStorytellerSteamPlayer` (if ST-only).
4. **Mutation shape:** write `gameState` → call narrowest `Sync.*` (not both eager world + full reconcile unless fingerprinted).
5. **Object script?** Route mutations via `Global.call`; expose actor-identity via `GlobalIsStorytellerSteamPlayer`.
6. **Lua local function order:** helpers above callers in the same chunk ([lua-local-function-order](../../docs/solutions/lua-local-function-order.md)).
7. **Update** [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md) inventory row.
8. **Solo regression:** Gameboard Apply/Clear + one dice path; `npm run build` if UI/XML touched.

### 1.5 Repo audits you can run solo (no second client)

```bash
# Global mutators (review each hit)
rg "function Global" core/global_script.ttslua

# Object scripts calling Global (should not require core mutators)
rg "Global\.call" objects/ ui/

# Hot handlers — verify O(1) guards
rg "function onObject(Drop|PickUp|Randomize|LeaveContainer)" core/global_script.ttslua

# Stale execution-gate symbols (should be zero after remediation)
rg "isHostClient|requireHostForWorldMutation|GlobalRequireHostForWorldMutation" core/ lib/ objects/ ui/
```

**Console probes (solo Host, `~` Global):**

```lua
print("isStoryteller=" .. tostring(U.isStorytellerSteamPlayer("Black")))
```

**Hotseat smoke (required before marking execution-model work Done):** Solo host with **two or more seats** occupied — ST scene apply, soundscape control, gameboard Apply, dice spawn, `HUD_syncAll` must all succeed.

### 1.6 Solo test suites to keep green

Run before scheduling multiplayer; they do **not** replace TOR-144:

- [Gameboard-E2E](../E2E%20Playbooks/Gameboard-E2E.md) — Apply/Clear smoke
- [Dice-E2E](../E2E%20Playbooks/Dice-E2E.md) — at least one roll path
- [Scenes-E2E](../E2E%20Playbooks/Scenes-E2E.md) — one scene apply if scenes work changed

---

## 2. Initial Multiclient Testing Pass

**Author runbook (Phases A–E, friend briefing, outcomes):** **[Multiclient Session Script](../E2E%20Playbooks/Multiplayer-Session.md)** — use that file during the call (**TOR-249**).

Solo prep before scheduling: §1.5–§1.6 above. Agent coverage checklist / hotseat probes: [Multiplayer-E2E](../E2E%20Playbooks/Multiplayer-E2E.md).

---

## 3. Additional Insights, Thoughts & Recommendations

### TTS execution model

- **All mod Lua runs on the host only.** Connected clients do not run the Global script or object scripts. Clients transmit interactions to the host; the host's Lua executes once; the engine replicates resulting world/object state to every client.
- **`Global.call` from object scripts:** routes mutations through Global for **bundle-size** isolation. Global entries may still steam-gate ST-only actions.
- **Multiple handlers per event:** Global + object scripts can all run for one drop ([TTS Events API](https://api.tabletopsimulator.com/events/)). Prefer tag-scoped Global guards and thin object scripts.
- **Replication nuance:** engine replication / local-view timing — a client that dropped the frame an object spawned may not "see" it until it moves. These are **not** "the client re-ran your Lua." Do not address with execution gates.

### Seat assignment (TOR-345)

- Host `onPlayerConnect` → `M.tryAutoAssignSeatFromChronicle` (Steam ID → `C.PlayerData.color`).
- Load / Save & Play → `M.setupPlayers` → `M.assignAllConnectedSeatsFromChronicle` (two-pass so ST leaving a PC seat frees it for the registered PC). `onPlayerConnect` does **not** re-fire for players already present after reload.
- Unregistered Steam IDs → **White**. Occupied target seat with a different Steam ID → assign skipped (Host console print).

### Phase connect & Advance (TOR-143 / TOR-319)

- Top-level: `Intermission` → `Play` → `Spotlight` → `End` → `Intermission` ([Phases Overview](../Phases/Phases%20Overview.md)).
- Connect during **Intermission:** keep loading/session blindfold up. Connect during any other phase: lower blindfold for that player.
- ST **Advance** mutates state + world on Host only; join clients should see a **single** replicated transition (lights, theme, blindfolds, heal broadcast when entering Play).

### P10 — live `gameState` broadcast gap (known)

Full scoring: [§1.1a](#11a-p10--live-gamestate-broadcast-gap-known). Session-facing short form: [Multiclient Session Script § P10](../E2E%20Playbooks/Multiplayer-Session.md#p10-known--do-not-fail-the-pass-for-this-alone).

- **World matches, Lua/HUD numbers don’t** → note it as P10; keep going.
- **World doesn’t match** → real fail (replication / dual-apply).
- Never “fix” P10 by gating Host Lua behind `isHostClient`.

### What solo testing will never catch

- Live `gameState` divergence on join client (HUD / `S.getStateVal` vs Host writes) — P10 sync bridge gap ([§1.1a](#11a-p10--live-gamestate-broadcast-gap-known))
- PC-initiated Tier C without `Global.call` routing
- Race conditions on simultaneous clicks ([Scripting Odds & Ends](https://steamcommunity.com/sharedfiles/filedetails/?id=2036657795))
- Per-client UI visibility mismatches (XmlUI `visibility` targeting)
- Engine replication / local-view timing edge cases
- Friend Steam auto-seat + Intermission vs Play blindfold on a **second machine** (hotseat cannot fully substitute)

### Hardware / setup

- **Second PC on LAN** remains the reliable way to test; same-machine two clients is fragile (see prior research). A friend's PC is sufficient for this pass.
- Host should use the **Storyteller machine** that holds the canonical save; friend joins via Steam invite — no need for friend to clone the repo.
- **Save & Play** from Host after build; friend joins live session, not a separate save file.

### Scope discipline for the first pass

- Do **not** expand into Remote Play or ST panel on friend's machine in v1.
- Do **not** treat D2 `placements` count mismatches as release blockers if the **world** matches — log as **P10**.
- Optional deeper follow-ups (second session): full Advance loop, Memoriam LUT (**TOR-101**), absent-player presence (**TOR-293**), live `gameState` sync bridge (P10).
- After first pass, deepen [Multiplayer-E2E](../E2E%20Playbooks/Multiplayer-E2E.md) / domain playbooks with friend time budgeted.

### When to re-run the friend session

- Any change to `onLoad`, `Sync.full`, `Sync.npcs`, event handlers, phase Advance/connect, seat auto-assign, or new `Global.call` mutators
- After fixing a reported duplicate-effect, wrong-seat, or "click does nothing" multiplayer bug
- Before declaring TOR-144 or multiplayer sync work **Done**

Re-run from: [Multiclient Session Script](../E2E%20Playbooks/Multiplayer-Session.md).
