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
- `.dev/E2E Playbooks/Multiplayer-E2E.md`
- relevant solo playbooks from `.dev/TESTING.md` before multiclient verification

Status: current multiplayer authority policy until TOR-144 passes with two real clients.

**Purpose:** Solo Host development cannot validate multiplayer behavior. This document lists what to do **before** a second client is available, and a **minimal first session script** to run with a friend when one is.

> **Agents (mandatory):** Until **TOR-144 (multiplayer E2E)** passes with two real clients, **every** change that adds or modifies event handlers, load/bootstrap hooks, `HUD_*` / object clicks, `Global.*` mutators, or world I/O must comply with **§1.1 policies P1–P10** and the **§1.4 pre-flight checklist**. Always-on Cursor rule: [`.cursor/rules/toronto-rising-multiplayer-authority.mdc`](../../.cursor/rules/toronto-rising-multiplayer-authority.mdc). Do not mark multiplayer sync work **Done** without multiclient verification.

**Related:** [Event Listener Policy](../Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md), [Reconciler Contract](../Sychronizing%20Game%20Functionality/Reconciler%20Contract.md), [Dual-apply survey](../Sychronizing%20Game%20Functionality/Dual_apply_survey.md), [Multiplayer-E2E](../E2E%20Playbooks/Multiplayer-E2E.md) (TOR-144 and TOR-284 hotseat probe), [lua-local-function-order](../../docs/solutions/lua-local-function-order.md).

**Linear:** TOR-144 (multiplayer E2E playbook) — mechanical sync is not closed until this pass runs with two real clients.

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
| **P10** | **Live `gameState` broadcast gap** may still affect join-client HUD reads; fix via sync bridge, not execution gates. | Join clients load `gameState` from save on connect but may not receive runtime Lua table updates between saves. |

### 1.2 Essential helper functions

| Function | Location | Use |
| --- | --- | --- |
| `U.isStorytellerSteamPlayer(playerRef)` | `lib/util.ttslua` | Gate ST-only **interaction**. Accept `Player` instance (preferred) or seat color string. |
| `U.isStorytellerPlayerColor(color)` | `lib/util.ttslua` | Legacy XmlUI alias: `Black` / `Host`. Prefer steam when `Player` is available. |
| `GlobalIsStorytellerSteamPlayer(params)` | `core/global_script.ttslua` | Bundle-safe steam check from object scripts (`params.player` or `params.player_color`). |
| `Sync.full(opts)` | `core/sync.ttslua` | Full reconcile (state → world). |
| `Sync.player(color)` | `core/sync.ttslua` | Per-player reconcile: lights + HUD/overlays/`UpdateUIDisplays`. |
| `Sync.npcs` / `Sync.lighting` / `Sync.soundscape` | `core/sync.ttslua` | Domain reconcilers. |
| `Sync.ui(delta)` | `core/sync.ttslua` | UI-only refresh. |

**Per-client UI (not Lua gating):** XmlUI `visibility` = `Black`/`Admin`/`<Color>` — engine-level per-client rendering; ST panel to ST, PC HUD to its seat.

**Object-script routing:** PC-initiated mutations use `Global.call("Global…")` so orchestration stays in Global (bundle-size), not because join clients run object Lua.

### 1.3 High-risk code paths (audit before inviting a friend)

When touching these areas, verify P1–P10 and run solo smoke (Apply/Clear, one roll). Full matrix: [Multiplayer-E2E](../E2E%20Playbooks/Multiplayer-E2E.md).

| Area | Key files / entry points | Solo check |
| --- | --- | --- |
| **Load / bootstrap** | `global_script.onLoad`, chunk `trEarlySilence*`, `SS.bootstrapSilenceStrayEmitterLoops`, `main.onLoad`, `sync.ttslua` `Sync.full` | Bootstrap completes; soundscape silence runs |
| **Gameboard Apply/Clear** | `GlobalGameboardApply`, `GlobalGameboardClear`, `core/npc_gameboard.ttslua`, `Sync.npcs` | ST-only steam on Global mutators; board `click_*` → `Global.call` |
| **Token drop / pick-up** | `onObjectDrop`, `onObjectPickUp`, `NPCS.onObjectDropped`, `Gameboard.onNpcControlTokenDropped` | Tag gates (`npc_figurine`, `npc_control_token`) **then** steam when ST-only |
| **Scene / soundscape** | `HUD_changeScene`, `HUD_scenesLibApply`, `HUD_soundscape*`, `StorytellerScenesPanel`, `Sync.full` | Eager soundscape uses `commitEagerSteadyState` / fingerprint per dual-apply survey |
| **Dice / rolls** | `HUD_roll*`, `GlobalDiceBagClick`, `GlobalSpawn*`, `GlobalReleaseBagDice`, `onObjectRandomize`, `objects/dice_bag.ttslua` `onLoad`, `core/roll_controller.ttslua` | PC roll clicks use `Global.call`; bag onLoad destroy via Global |
| **Signal candle / tarot** | `ui/ui_signal_candle.ttslua` → `GlobalToggleSignalFireState`, `ui/ui_tarot_button.ttslua` → `GlobalApplyTarotState` | Global callee steam-gates ST-only actions |
| **Character sheet** | `ui/ui_csheet_core.ttslua` → `Global.call` mutators; onLoad layout | Steam gate on ST-only mutators |
| **ST PCs / debug lights** | `HUD_pcPanel`, `HUD_debugLightActivate/Enabled/ResetRow/Slider` | ST steam gate |
| **Player connect / seat** | `onPlayerConnect`, `onPlayerChangeColor`, `M.tryAutoAssignSeatFromChronicle`, `M.assignAllConnectedSeatsFromChronicle` (load) | Steam ID → chronicle color (incl. ST Black); unregistered → White; state rows before world reconcile |

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

**Goal:** ~20–30 minutes with a friend; one linear script, minimal branching. **Pass** = no duplicate world effects, join client stays connected, console probes match expectations.

**Before the call**

| Step | Who | Action |
| --- | --- | --- |
| 1 | Host (you) | `npm run build` if UI changed; Save & Play from repo on **Storyteller machine**; seat **Black**. |
| 2 | Host | Load a save with a known scene, empty or simple gameboard, at least one PC seated (friend's color). |
| 3 | Friend | Install TTS + own Steam account; you send Steam invite (they need TTS license). |
| 4 | Friend | Join **after** Host is in-game (mid-session join tests bootstrap). |
| 5 | Both | Agree: friend reports **visual/audio glitches** and **chat/console errors**; you drive ST steps. |

**Roles:** You = **Black / Host / Storyteller**. Friend = **one PC color** (e.g. Red). Friend does not need ST panel access.

---

### Phase A — Connect & authority (2 min)

| # | Host (you) | Friend (join client) | Pass if |
| --- | --- | --- | --- |
| A1 | Stay seated Black; wait for friend to connect | Accept invite; pick assigned PC color; sit | Both see same table; no kick |
| A2 | — | Watch table ~10s on join | **No** figurines sliding, lights sweeping, or audio fade on join load |
| A3 | Host console on load | — | Bootstrap completes without errors |

---

### Phase B — ST world actions (8 min)

Do these in order. Friend **watches** for double motion, stacked audio, or jitter.

| # | Host (you) | Friend | Pass if |
| --- | --- | --- | --- |
| B1 | Place one NPC control token on gameboard; **Apply** | Watch stage figurines | **Single** move to stage; no fight/jitter |
| B2 | **Clear** gameboard | Watch | Placements clear once; palette/board match Host |
| B3 | Drop one control token on palette snap (ST drag) | Watch | Token snaps once; no lag spike on friend |
| B4 | Open Scenes; **Apply** a different library scene (or change location/mood) | Watch lights/audio/HUD | Scene matches Host; **one** audio fade (not stacked) |
| B5 | Toggle **signal candle** (if in scene) | Watch fire light | **One** light transition |
| B6 | Change soundscape mood once (ST Sound panel) | Listen | **One** fade; no doubling |

---

### Phase C — PC roll from join client (5 min)

| # | Host (you) | Friend | Pass if |
| --- | --- | --- | --- |
| C1 | Ensure friend's seat has dice bag enabled; start or select roll for **friend's color** (ST can open roll UI for their seat if needed) | — | Roll UI visible for friend |
| C2 | — | Click **Roll** (or bag → roll) on **their** color | **One** set of dice on table; drawer once; no duplicate spawns |
| C3 | — | Complete roll through **Confirm** (or cancel) | UI returns sane; Host table matches |
| C4 | Host console after C2 | — | No duplicate spawn errors; single release path |

**If C2 shows double dice:** PC click path missing `Global.call` routing — file bug against roll/dice_bag.

---

### Phase D — Join HUD & known gaps (3 min)

| # | Host (you) | Friend | Pass if |
| --- | --- | --- | --- |
| D1 | Change something visible in ST HUD (phase label, scene name, or PC stat on friend's row) | Compare HUD | Friend HUD **updates** for Tier A paths |
| D2 | After B1 Apply, both run: `print(#(U.getKeys(S.getStateVal("sessionScene","npcWorld","placements") or {})))` | Same | **May differ** — document if counts differ (known live-state gap P10); world should still **look** the same |
| D3 | Friend toggles a **PC-only** panel (e.g. roll control on their seat) | — | Panel opens; **no** ST-only actions exposed |

---

### Phase E — Disconnect (1 min)

| # | Host (you) | Friend | Pass if |
| --- | --- | --- | --- |
| E1 | — | Disconnect cleanly | Host stable; no Host console spam |
| E2 | Optional: friend rejoins | Reconnect same color | Join stable; no duplicate bootstrap world I/O |

---

### Outcomes (single decision at end)

| Result | Next step |
| --- | --- |
| **All Pass rows green** | Mark TOR-144 initial pass done in Linear; schedule deeper matrix from [Multiplayer-E2E](../E2E%20Playbooks/Multiplayer-E2E.md) later |
| **Duplicate world** (double Apply, audio, dice) | Note scenario id (B1, C2, …); grep handler for dual-apply or missing `Global.call` routing |
| **Nothing happens on friend click** | Check Tier C routed via `Global.call`; check actor-identity steam gate |
| **HUD stale but world OK** | Likely live `gameState` gap (P10) — document; fix via sync bridge, not execution gates |
| **Hotseat broken (multi-seat solo)** | Regression — verify no dead execution gates blocking mutations |

**Capture for each failure:** scenario letter, Host vs friend, screenshot or console snippet, save name.

---

## 3. Additional Insights, Thoughts & Recommendations

### TTS execution model

- **All mod Lua runs on the host only.** Connected clients do not run the Global script or object scripts. Clients transmit interactions to the host; the host's Lua executes once; the engine replicates resulting world/object state to every client.
- **`Global.call` from object scripts:** routes mutations through Global for **bundle-size** isolation. Global entries may still steam-gate ST-only actions.
- **Multiple handlers per event:** Global + object scripts can all run for one drop ([TTS Events API](https://api.tabletopsimulator.com/events/)). Prefer tag-scoped Global guards and thin object scripts.
- **Replication nuance:** engine replication / local-view timing — a client that dropped the frame an object spawned may not "see" it until it moves. These are **not** "the client re-ran your Lua." Do not address with execution gates.

### What solo testing will never catch

- Live `gameState` divergence on join client (HUD reads vs Host writes) — P10 sync bridge gap
- PC-initiated Tier C without `Global.call` routing
- Race conditions on simultaneous clicks ([Scripting Odds & Ends](https://steamcommunity.com/sharedfiles/filedetails/?id=2036657795))
- Per-client UI visibility mismatches (XmlUI `visibility` targeting)
- Engine replication / local-view timing edge cases

### Hardware / setup

- **Second PC on LAN** remains the reliable way to test; same-machine two clients is fragile (see prior research). A friend's PC is sufficient for this pass.
- Host should use the **Storyteller machine** that holds the canonical save; friend joins via Steam invite — no need for friend to clone the repo.
- **Save & Play** from Host after build; friend joins live session, not a separate save file.

### Scope discipline for the first pass

- Do **not** expand into hotseat, Remote Play, or ST panel on friend's machine in v1.
- Do **not** treat HUD `gameState` count mismatches (D2) as release blockers if the **world** matches — track as broadcast follow-up under P10 live `gameState` broadcast policy.
- After first pass, promote full [Multiplayer-E2E](../E2E%20Playbooks/Multiplayer-E2E.md) matrix and domain playbooks (Gameboard, Dice, Scenes) with friend time budgeted.

### When to re-run this pass

- Any change to `onLoad`, `Sync.full`, `Sync.npcs`, event handlers, or new `Global.call` mutators
- After fixing a reported duplicate-effect or "click does nothing" multiplayer bug
- Before declaring TOR-144 or multiplayer sync work **Done**

### Friend briefing (copy-paste)

> You'll join my TTS game for ~20 minutes. Pick the color I assign. Watch for things moving twice, weird double sound fades, or errors in chat. I'll ask you to click Roll once on your seat. You don't need to learn the mod — just tell me if something looks wrong compared to my screen.
