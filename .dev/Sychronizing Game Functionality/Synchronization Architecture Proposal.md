# Synchronization Architecture — Proposed Implementation

> Companion to [`Speculation on Synchronization Options.md`](./Speculation%20on%20Synchronization%20Options.md). Read that first.

> **Reading order:** treat this whole document as a draft to mark up together. Everything below is a proposal, not a decision.

## TL;DR

Your core instinct is right and is supported by the existing codebase: **state should be the single source of truth, and a small, well-defined orchestration layer should drive the world toward state**. But three pieces of your specific framing are worth pushing back on before any code is written:

> **Hard boundary (non-negotiable):**
> Reconcilers are the only pipeline that may write to the live world.
> All other code paths (UI handlers, reducers, scene picks, panel actions, callbacks) must mutate `gameState` first, then call the appropriate `Sync.*` / `reconcile*` entry point.
> No hidden live-world writes in setters. No competing side pipelines.

1. **One umbrella method is the wrong granularity.** It will turn into a god-function. The right shape is a thin **orchestrator** plus per-domain **reconcilers** — most of which already exist in your code (`HO.syncAll`, `L.reconcileAllPlayers`, `Soundscape.applyContext`, `Scenes.loadScene`, `UpdateUIDisplays(delta)`). To be fully clear about terminology: when you said "umbrella method" in the speculation, the orchestrator described below **is** what you meant — a conductor, not a god-function. The pushback is purely about avoiding a name (`SyncPlayerWithGameState`) and a body shape that would invite business logic to creep in over time.
2. **"Performant enough to call constantly" is a smell, not a goal.** What you actually want is **idempotent reconcilers** with **diff-based writes**, triggered by **explicit events** (and a "full sync" entry point for load / reset / "I'm not sure"). The performance follows for free.
3. **Naming the entry point `SyncPlayerWithGameState` mixes scopes.** Several of your pseudocode branches (phase, soundscape, NPC cutouts) are not player-scoped. A clean split — `Sync.full()`, `Sync.player(color)`, `Sync.lighting()` — keeps the umbrella honest.

You also had **a hidden problem this proposal exposed**: state setters in `core/state.ttslua` used to call lighting reconcilers as side effects (e.g. `S.setPlayerVal("Red","hunger",4)` triggering lighting reconciliation directly). That was exactly the leaky pattern you were reacting against. The current architecture keeps those side effects in explicit `Sync.*` entry points.

---

> Status note: Steps 1-4 below are now implemented in the workspace. Sections explicitly labeled "historical" describe pre-refactor behavior for context.

## 1. Validating your intuition

### 1.1 You are not making this up — the problem is real

Let me make the abstract concrete. Right now, *getting hunger to update* requires the following implicit chain to all stay aligned:

| Effect | Driven by | Lives in |
|---|---|---|
| `gameState.playerData[id].stats.hunger` | `S.setPlayerVal(color, "hunger", n)` | [`core/state.ttslua`](../../core/state.ttslua) |
| Player light mode reconciliation (`ROLLING`/`OFF`/`HUNGRY`/`STANDARD`) | `Sync.player(color)` → `L.reconcileForPlayer(color)` | [`core/lighting.ttslua`](../../core/lighting.ttslua) |
| `overlay_hunger_<n>_<Color>` UI image | `HO.syncAll()` (called by `UpdateUIDisplays({overlays=true})`) | [`core/hud_overlays.ttslua`](../../core/hud_overlays.ttslua) |
| `HUNGER_SMOKE_*` prop on/off (≥4) | `syncHungerSmokeForSeat()` inside `HO.syncAll()` | same |
| `hungerVal_<Color>` text in admin HUD | `UpdateUIDisplays({playerStats=true})` | [`core/global_script.ttslua`](../../core/global_script.ttslua) |
| Hunger-pulse halo | `HUP.syncHungerPulseAll()` | [`core/hud_hunger_pulse.ttslua`](../../core/hud_hunger_pulse.ttslua) |
| Hunger dice auto-redirect on bag clicks | live read of `S.getPlayerVal(color,"hunger")` | `GlobalRollSpawnDieRequest` |

That's **seven** ripple effects from a single state write. Some happen via setter side effects, some via `UpdateUIDisplays`, some live-read on demand, some are silent. A reload mid-roll, a Storyteller manually editing state, or a `Scenes.loadScene("memoriam")` call cuts across all of them. **Yes, this is a real problem and yes, it should be centralized.**

### 1.2 You already have most of the right pieces

Your speculation says "I imagine the method will be little more than a series of conditional checks to decide which of the primary library methods to call". That is exactly the right idea, and you are roughly 70% of the way there:

- [`UpdateUIDisplays(delta)`](../../core/global_script.ttslua) — already a delta-aware orchestrator for the UI side; supports flags like `phase`, `scene`, `playerStats`, `overlays`, `pcstRows`. This is a working prototype of the umbrella you describe.
- [`Soundscape.applyContext({...})`](../../core/soundscape.ttslua) — already a great example of a **declarative** reconciler: pass a partial context (`{musicMood="combat", weather="rain", isIndoors=true}`) and it does the right thing with no orchestration plumbing.
- [`HO.syncAll()`](../../core/hud_overlays.ttslua) — already idempotent, already diffs against `lastVisible`/`lastHungerSmokeOn` caches, only fires `UI.show`/`UI.hide` when the desired state actually changes.
- [`L.SetLightMode()`](../../core/lighting.ttslua) — already enforces "epoch wins" semantics so overlapping calls don't fight each other; persists the resolved mode to `gameState.lights`.
- [`Scenes.loadScene(name)`](../../core/scenes.ttslua) — mutates selected scene state; `Scenes.reconcileFromState()` applies live scene effects through the reconciler pipeline.

The architecture below **does not** propose to replace any of this. It proposes a **thin coordinating layer on top** so they're all reachable from one place, in a known order, with consistent semantics.

### 1.3 State-as-source-of-truth is correct

Your requirement #1 ("All relevant data about what systems _should_ be doing must be stored in state") is non-negotiable and you're already enforcing it:

- `gameState.currentPhase`
- `gameState.playerData[id].stats.hunger`
- `gameState.lights[lightRef]` (mode key or sanitized inline mode)
- `gameState.soundscape.{musicMood, weather, location, isIndoors, ...}`
- `gameState.scene.{name, mood}`
- `gameState.seatLayout.{currentTableKey, occupiedNPCSlots}`
- `gameState.playerData[id].lighting.isRolling` (runtime rolling context used by lighting reconciliation)

This is already coherent. **Do not** introduce a parallel "live state" object alongside `gameState`. The world (TTS objects, lights, sounds, UI) is the live state; `gameState` says what it _should_ be.

---

## 2. Where I'd push back

### 2.1 Push back: "one umbrella method"

A function that says "if HUNGRY then ... else if rolling then ... else if scene-X then ... soundscape switch ... NPC cutouts ..." in the same body has a few well-known failure modes:

- **Cognitive load grows linearly.** Every new feature widens the function. Eventually nobody understands the priority order.
- **Implicit ordering bugs.** Today you write the lighting branch before the NPC cutout branch. Tomorrow that ordering matters and nobody knows why.
- **Hard to test.** You can't sync only lighting without dragging the whole world through the function.
- **Tempts hidden state.** When the function gets large, junior-developer instinct (mine and yours, honestly) is to add `if alreadySyncedThisTick then return end`. That works once and breaks the next time someone changes the call graph.

**Better shape:** keep the conditional logic in domain modules (`L.reconcileForPlayer`, `Scenes.reconcileWorld`, `HO.syncAll`) where it can stay short. The orchestrator is the **list of reconcilers** in the right order, nothing more.

### 2.2 Push back: "performant enough to call frequently"

This frames the question as "make it fast enough to spam" when the better question is "make it cheap enough that idempotent calls are free". Two different design moves:

| What you wrote | What I'd write instead |
|---|---|
| Call `Sync()` on every state change. | Call `Sync.<domain>()` on the change of state that domain cares about. Provide `Sync.full()` for load/reset/uncertain. |
| The function checks "what the game is doing vs what state says" and fixes drift. | Domain reconcilers compute the **desired** state from inputs and apply only the diff. They do not interrogate the world for drift; they assert it. |
| Keep it fast so it can run constantly. | Keep it idempotent so calling it twice is harmless; speed will follow because most calls are no-ops. |

The "asks the world what it's doing and corrects drift" model exists (it's how Kubernetes works), and it is **dramatically more complex** than what you actually need for a six-player TTS module. State is small; the world is small. Just **always assert** desired-from-state and let the diff cache (`HO.lastVisible`, `L.transitionEpoch`, `S.getStateVal("lights",ref)`) absorb redundant calls.

### 2.3 Push back: scope of the entry point

`SyncPlayerWithGameState(playerRef)` is a misnomer for the body you wrote — soundscape, scene, NPCs, and phase aren't player-scoped. There are real reasons to want **both** scopes:

- **Per-player triggers** (Hunger 3 → 4 for Red): only Red's lights and Red's HUD are affected.
- **Game-wide triggers** (phase change, scene change, table-reassign, load/reset): everyone needs to be reconciled, plus shared assets (soundscape, ambient lighting, NPC cutouts).

Folding both into one function means every per-player trigger pays the cost of reconciling the soundscape. A two-level entry surface (`Sync.player(color)` and `Sync.full()`) is honest about the scope difference and lets you keep per-player triggers cheap.

### 2.4 Push back (with caution): "encapsulation will save us"

You wrote: "Scripts should only be able to modify game systems with established methods... if code were to directly modify the settings of a light component without using `L.SetLightMode`, that could easily bypass the synchronization step entirely."

Two things:

1. **Lua doesn't enforce private members.** You cannot make this an invariant the compiler will check. You can only make it a convention.
2. **You don't actually need the invariant if reconcilers are idempotent.** Even if some rogue code calls `lightComp.set("enabled", false)`, the next time `L.reconcileForPlayer(color)` runs (or `Sync.full()` runs on load), the world snaps back to what state says. The "reconcile" pattern is what makes occasional bypasses survivable.

What's worth doing:

- Keep [`lib/util.ttslua → U.Val`](../../lib/util.ttslua) assertions on the established setters so the library entry points stay strict.
- Add `grep`-able naming conventions (`L.<verb>` for state-modifying, `L.<noun>` for read-only) so reviewers can spot bypasses.
- Document a "no direct `lightComp.set()` calls outside `core/lighting.ttslua`" rule in `.cursorrules`.

Do **not** spend effort fighting Lua's lack of private members.

### 2.5 Push back: state setters should not call reconcilers

This is exactly where the boundary above matters: setters are for state mutation only; reconcilers are for world application only.

Right now, [`core/state.ttslua`](../../core/state.ttslua) lines 1054–1064 do this:

```lua
if key == "hunger" then
    S.setStateVal(value, "playerData", playerID, "stats", "hunger")
    -- ... look up color ...
    local L = require("core.lighting")
    if type(L.syncHungryModeForPlayer) == "function" then
        L.syncHungryModeForPlayer(playerColor)
    end
    return
end
```

This is the **exact pattern your speculation correctly worries about**: a write to one field in state quietly fires off a domain-specific reconciler. It works, but it has problems:

- `S.setPlayerVal` now imports `core.lighting`. State has knowledge of lighting that it didn't ask for.
- Every new "hunger ripple" (smoke, overlay, hunger pulse) is either added to this setter or sprinkled at every call site.
- Calling `S.setPlayerVal` ten times in a tight loop fires the lighting reconciler ten times.
- A reload that re-merges state from the save will *not* fire the setter, so this code path is incidentally bypassed on the most important sync moment of all.

**Move these reconciler calls out of the setter** and into a `Sync.player(color, {hunger=true})` (or a fully un-flagged `Sync.player(color)` that's cheap because it's idempotent). State should write state. That's its only job.

### 2.6 Push back: `modeRestore` is a smell

The current "stacked context" pattern in [`core/lighting.ttslua`](../../core/lighting.ttslua) (`gameState.playerData[id].lighting.modeRestore.hungry`, `.rolling`, etc.) implements override priority by **pushing and popping** restore-state per context. That works for two contexts, but as the picture grows (a DARK scene happens while the player is HUNGRY and a ROLL drawer opens) the bookkeeping fights you:

- What's the priority order between HUNGRY and ROLLING?
- If HUNGRY activates while ROLLING is active, do you stack? Replace? Skip?
- If save/load happens mid-stack, can the saved restore-state survive?

**Better pattern: derive the desired mode from inputs every time, by priority.** No stacks, no "what was I before". The priority order (locked in with you):

> **`ROLLING` > `DARK` / not-in-current-scene > `HUNGRY` > `STANDARD`** — with one future-facing exception for "player has assumed an NPC role for this scene", which leaves their light alone (sits *above* the absence check, since an absent player playing an NPC who is present should follow the NPC's lighting). Memoriam is **not** in this list — it's a global LUT change plus an HUD overlay, not a per-player light tier.

```pseudocode
desiredMode =
  if isRolling AND lData.ROLLING                      then "ROLLING"   -- ST is letting them roll; they need to see
  elsif assumesNpcRole(color) for current scene       then nil          -- leave the seat light alone (future-facing)
  elsif Scenes.isAdminDarkActive()
        OR not Scenes.playerInCurrentScene(color)     then "OFF"        -- DARK and "absent" collapse here
  elsif hunger >= 4 AND lData.HUNGRY                  then "HUNGRY"
  else                                                     lData.default or "STANDARD"
```

Because the function is a pure read of state, it's trivially correct on load, on stat change, on scene change, on roll start/end. The `modeRestore` table can be deleted. This is the single biggest *architectural* simplification I'd suggest.

### 2.7 Push back: don't conflate "sync on load" with "sync on every change"

These are two different problems with two different cost profiles:

- **On load / reset / table reassign / "panic":** call **everything**. Cost doesn't matter; the player is staring at a loading screen.
- **On a single state change:** call only the reconcilers whose inputs that change can affect.

The second one is where the "performance" worry shows up. Your speculation conflates them ("performant enough to run frequently"). Once you separate them, it stops being a perf question and becomes a routing question — exactly what `UpdateUIDisplays(delta)` already models.

---

## 3. Proposed architecture

### 3.1 Three things to build

**A. A new module: `core/sync.ttslua`** — the orchestrator. ~150 lines. No business logic. Just calls the domain reconcilers in a documented order.

**B. A `<Module>.reconcile<Scope>` convention** in each domain module. Most of these already exist with slightly different names; rename them and document the contract. They take **no arguments other than scope** (player color, or nothing for "everything") and read everything they need from state.

**C. Two state setters with optional sync:** `S.setPlayerVal` and `S.setStateVal` lose their lighting side-effect; the call sites that change state explicitly choose whether to call `Sync.player(color)` or `Sync.full()` afterwards. Most call sites already follow up with `UpdateUIDisplays(...)` — that call becomes `Sync.player(color)` or stays as a thin wrapper around it.

### 3.2 The orchestrator

```lua
-- core/sync.ttslua
--[[
    Synchronization Orchestrator (core/sync.ttslua)

    Drives the world toward `gameState`. Read-only on state — never writes.
    Idempotent: calling Sync.full() twice in a row should produce zero observable change.

    Public API:
        Sync.full()           -- full reconcile (load, reset, table reassign, scene change, "panic")
        Sync.player(color)    -- per-player reconcile (hunger change, roll start/end, frenzy, conditions)
        Sync.lighting()       -- shared-light reconcile (ambient + non-player lights, after scene change)
        Sync.soundscape()     -- soundscape reconcile (after scene/weather/location/mood change)
        Sync.ui(delta?)       -- UI-only reconcile (thin wrapper around UpdateUIDisplays)
        Sync.npcCutouts()     -- NPC cutout presence reconcile (after scene change, occupiedNPCSlots change)

    Sync.full() = lighting + soundscape + npcCutouts + (player(c) for c in seated) + ui()

    Order matters: lighting runs before UI so HUD overlays fire after the world is right.
]]

local Sync = {}

local C  = require("lib.constants")
local S  = require("core.state")
local L  = require("core.lighting")
local Scenes    = require("core.scenes")
local Soundscape = require("core.soundscape")
local NPCS = require("core.npcs")
local HO   = require("core.hud_overlays")
local HUP  = require("core.hud_hunger_pulse")
local HUDP = require("core.hud_player")

--- Reconcile every player's lights, overlays, HUD, hunger smoke, hunger pulse.
--- @param color string  Seat color (e.g. "Red"); skipped silently for unseated colors.
function Sync.player(color)
    if type(color) ~= "string" then return end
    if not Player[color] then return end

    L.reconcileForPlayer(color)              -- lights: derives HUNGRY/ROLLING/STANDARD/OFF from state
    HUDP.reconcileForPlayer(color)           -- right-sidebar HUD, panel visibility
    HO.reconcileForPlayer(color)             -- overlays + hunger smoke
    HUP.reconcileForPlayer(color)            -- hunger pulse halo
    -- (Per-player roll panel is handled by RC.onRollStateChanged callbacks; not here.)
end

--- Shared (non-player-scoped) lighting: ambient, GM, scene-defined non-player lights.
function Sync.lighting()
    L.reconcileShared()                      -- ambient, gmLight, mainLight*, district/site cards, NPC cutout lights
end

--- Soundscape: music mood/featured/location, weather, indoor ducking.
function Sync.soundscape()
    Soundscape.reconcile()                   -- thin wrapper around current applyContext-from-state
end

--- NPC cutouts: spawn/despawn matches `occupiedNPCSlots`; spotlights match scene presence.
function Sync.npcCutouts()
    NPCS.reconcileFromState()
end

--- Full reconcile. Cheap if everything is already in sync (idempotent reconcilers).
function Sync.full()
    Sync.lighting()
    Sync.soundscape()
    Sync.npcCutouts()
    for _, color in ipairs(C.PlayerColors) do
        if Player[color] then
            Sync.player(color)
        end
    end
    Sync.ui()
end

--- UI-only refresh. Currently a thin wrapper around `UpdateUIDisplays`.
--- @param delta table|nil  same delta flags as UpdateUIDisplays
function Sync.ui(delta)
    UpdateUIDisplays(delta)
end

return Sync
```

**Read this carefully — the orchestrator has zero business logic.** It is six function bodies, none more than five lines. That's the test for "did I get this right": if `core/sync.ttslua` ever grows a conditional branch about *what* to sync (vs *which scope* to sync), I've been seduced by the god-function and need to push the logic back down into the domain.

### 3.3 The reconciler contract

Every `<Module>.reconcile<Scope>(...)` function obeys these rules:

1. **Reads `gameState` only.** Does not write to `gameState`.
2. **Idempotent.** Calling it twice in a row produces zero observable difference on the second call.
3. **Diffs at the boundary.** Compares desired state to applied/cached state; only emits world calls (UI, light component, sound emitter) on diff.
4. **Pure derivation, then apply.** Internally split into `compute<Scope>Desired(...)` (pure) and `apply<Scope>Desired(desired)` (effects). This makes them testable from the console without touching the world.
5. **Fails loudly.** Per `.cursorrules`, no `pcall` masking; missing GUIDs → explicit error.
6. **Knows nothing about other domains.** `L.reconcileForPlayer` does not call `HO.syncAll`. The orchestrator is the only thing that fans out across domains.

Existing functions that already fit (sometimes need renaming for consistency):

| Previous name | Current direction |
|---|---|
| `HO.syncAll()` | `HO.reconcileAll()` (or new `HO.reconcileForPlayer(color)`) |
| `L.syncHungryModesForAllPlayers()` | replaced by `L.reconcileAllPlayers()` / `L.reconcileForPlayer(color)` |
| `Scenes.loadScene(name, transitionTime)` | stays as the **mutation** API; new `Scenes.reconcileFromState()` reapplies the saved scene without mutating it |
| Scene stage application (`lightStages`) | applies ambient/non-player lights; player-seat lights are reconciler-owned |
| `Soundscape.reconcileFromState()` | reconciles audio playback from persisted state during sync/load |
| `Sync.full({ force = true })` vs incremental | **Storyteller debug “Sync All (force)”** bypasses scene/soundscape fingerprints and runs full UI; **Sync (incremental)** uses fingerprints + narrow `UpdateUIDisplays` delta |
| `UpdateUIDisplays(delta)` | stays; the orchestrator just calls it |

### 3.4 Pure-derivation example: lighting priority

Replace the stacked `modeRestore` mechanism with a pure function. This is the single most important code-level change in the proposal.

```lua
-- core/lighting.ttslua

--- Returns the mode key a player-scoped light should currently be in,
--- derived purely from current `gameState`. No side effects.
--- Priority (locked in with project owner):
---   ROLLING > NPC-role-leave-alone > DARK/absent > HUNGRY > STANDARD
--- @param lightRef string   e.g. "playerLight1Red"
--- @param color string      e.g. "Red"
--- @return string|nil       mode key in L.LIGHTMODES[lightRef], or nil if light shouldn't be touched
local function computeDesiredPlayerLightMode(lightRef, color)
    local lData = L.LIGHTMODES[lightRef]
    if type(lData) ~= "table" or lData.isPlayerLight ~= true then return nil end

    -- Highest priority first. Each branch must explicitly return.

    -- 1. ROLLING wins over everything else: if the ST is letting the player roll,
    --    they need to be able to see what they're doing.
    if S.isPlayerRolling(color) and lData.ROLLING ~= nil then return "ROLLING" end

    -- 2. NPC-role-leave-alone (future-facing; not yet implemented). When a player
    --    has assumed an NPC role for the current scene, the seat light follows the
    --    NPC's lighting handler, not this one. Returning nil tells the caller
    --    "do not touch this light".
    if Scenes.assumesNpcRole(color) then return nil end

    -- 3. DARK and "player not in current scene" collapse to the same outcome: OFF.
    --    (`Scenes.playerInCurrentScene` returning false includes both "scene is DARK"
    --    and "player isn't part of the current ST-active scene".)
    if Scenes.isAdminDarkActive()
        or not Scenes.playerInCurrentScene(color) then return "OFF" end

    -- 4. HUNGRY tier when the light defines it.
    local hunger = tonumber(S.getPlayerVal(color, "hunger")) or 0
    if hunger >= 4 and lData.HUNGRY ~= nil then return "HUNGRY" end

    -- 5. Default (typically STANDARD).
    return lData.default or "STANDARD"
end

--- Apply the desired mode for every player-scoped light belonging to `color`.
--- Idempotent: re-resolves S.getStateVal("lights", ref) and skips if the desired mode
--- is already the persisted mode (L.SetLightMode itself short-circuits on stale epochs).
--- @param color string
function L.reconcileForPlayer(color)
    if type(color) ~= "string" then return end
    for lightRef, lData in pairs(L.LIGHTMODES or {}) do
        if type(lightRef) == "string"
            and type(lData) == "table"
            and lData.isPlayerLight == true
            and string.sub(lightRef, -#color) == color
        then
            local desired = computeDesiredPlayerLightMode(lightRef, color)
            if desired ~= nil and S.getStateVal("lights", lightRef) ~= desired then
                L.SetLightMode(lightRef, desired, color, 0.25)
            end
        end
    end
end
```

What this buys you:

- The priority order is in **one place**, in plain reading order, with each branch explicit. New override (frenzy? memoriam?) = one new branch.
- No stack, no `modeRestore`, no "what did I push last".
- Save/load works trivially: `gameState.lights[ref]` may be stale on load; the next `Sync.full()` re-derives and snaps.
- It's the **single function** you read when asking "why is Red's light HUNGRY?". No archaeology.

### 3.5 Wiring: when does `Sync.<x>` actually run?

Treat these as the **only** rules:

| Trigger | Run |
|---|---|
| `Global.onLoad()` (after state restored) | `Sync.full()` (replaces today's hand-rolled fan-out at the bottom of `onLoad`) |
| Scene change (`Scenes.loadScene(name)`) | mutate scene state, then call `Sync.full()` (or scoped `Sync.*` reconcilers) |
| Phase change (`M.advancePhase`) | `Sync.full()` (phase touches almost everything) |
| Hunger change (`S.setPlayerVal(c,"hunger",n)`) | caller follows with `Sync.player(c)` |
| Frenzy / condition change | caller follows with `Sync.player(c)` |
| Roll start / Roll end | `RC.onRollStateChanged` callback already fires; add `Sync.player(c)` to it |
| Table reassignment (`R.SyncTable`) | `Sync.full()` |
| Storyteller toggles weather / mood | `Sync.soundscape()` only |
| Storyteller toggles a single overlay (map domain) | `Sync.ui({overlays=true})` or domain-specific |
| Random TTS console poke | `Sync.full()` is always safe |

Every one of these is a **named, explicit** event with a known cost. No hidden cascades. No "sync runs on every state change". Idempotency makes "I'm not sure" cheap: just call `Sync.full()`.

### 3.6 Read-side invariant: `gameState` is authoritative

Adopt this rule for review:

> Any code that asks "what mode is this light in?" / "is this overlay showing?" / "is the soundscape's mood combat?" must read **state**, not the live world.

Reading the live world is allowed only inside the apply-step of a reconciler, and only to compare-and-skip-if-equal. Everywhere else (UI, decision logic, conditions, dice trigger maps) reads `S.getStateVal(...)`. This is already true 95% of the time — the cleanup is small and worth it.

---

## 4. Worked example: HUNGRY lighting end-to-end

Walk this once with the proposed architecture and the existing one side by side.

**Trigger:** Storyteller drags Red's hunger from 3 to 4 via the PC storyteller panel.

### Before Refactor (historical)

1. `pc_storyteller_panel.ttslua` calls `S.setPlayerVal("Red", "hunger", 4)`.
2. `S.setPlayerVal` writes `gameState.playerData[id].stats.hunger = 4` and **also** imports `core.lighting` and calls `L.syncHungryModeForPlayer("Red")`.
3. `L.syncHungryModeForPlayer` calls `setContextualPlayerLightMode("Red", "HUNGRY", "hungry", true)` which writes a `modeRestore.hungry` entry into state, then calls `L.SetLightMode` for each Red player-light.
4. `pc_storyteller_panel.ttslua` then calls `UpdateUIDisplays(...)` which reaches `HO.syncAll()` for overlays and hunger smoke, and (in some call sites) also `HUP.syncHungerPulseAll()`.
5. Hunger pulse, hunger smoke, and HUD value text catch up.

What goes wrong if we drag from 4 → 3?

- `setContextualPlayerLightMode("Red", "HUNGRY", "hungry", false)` looks up `modeRestore.hungry.<lightRef>` and uses it.
- If save/load happened in between, or another override (DARK, ROLLING) modified the mode while HUNGRY was active, the restore mode might be stale. Symptoms: light snaps back to `OFF` from a dead scene; or HUNGRY persists silently.

### Proposed

1. Same setter call: `S.setPlayerVal("Red", "hunger", 4)`. **State only.** No imports, no side effects.
2. Caller (the panel handler) calls `Sync.player("Red")`.
3. `Sync.player` calls `L.reconcileForPlayer("Red")`, `HUDP.reconcileForPlayer("Red")`, `HO.reconcileForPlayer("Red")`, `HUP.reconcileForPlayer("Red")` — in that order, ~4 cheap calls.
4. `L.reconcileForPlayer` for each of Red's three player lights calls `computeDesiredPlayerLightMode` → returns `"HUNGRY"`. Compares to `gameState.lights[ref]`; differs; calls `L.SetLightMode(ref, "HUNGRY", "Red", 0.25)`. The other lights' desired modes haven't changed; loop short-circuits.
5. `HO.reconcileForPlayer("Red")` computes desired overlay set (now includes `overlay_hunger_4_Red`, hunger smoke ON), diffs against `lastVisible`, and applies.
6. Roll-back from 4 → 3? Same flow. `computeDesiredPlayerLightMode` now returns `"STANDARD"` (or `"ROLLING"` if a roll happens to be live). No `modeRestore` lookup, no "what was I before".

### What the audit trail looks like

Console output for hunger 3→4:

```
State: setting playerData/<id>/stats/hunger = 4
Sync.player Red
  L.reconcile Red: playerLight1Red HUNGRY (was STANDARD)
  L.reconcile Red: playerLight2Red HUNGRY (was STANDARD)
  L.reconcile Red: playerLight3Red HUNGRY (was STANDARD)
  HO.reconcile Red: +overlay_hunger_4_Red, -overlay_hunger_3_Red, +hunger_smoke
  HUP.reconcile Red: pulse on
  HUDP.reconcile Red: stat panel hunger=4
```

That's **the entire** debugging surface for "why didn't Red's light go HUNGRY?". Compare to today's grep through three modules and a side-effecting setter.

---

## 5. Migration path

A big rewrite would be unwise. Here's a small-step path. Each step is independently shippable and leaves the tree better than it found it.

### Step 1 — Add `core/sync.ttslua` as a thin shell over what exists

Pure refactor. The body of every method **delegates to existing functions**:

```lua
function Sync.full()
    Scenes.onLoad()                  -- existing: replays current scene
    Soundscape.reconcileFromState()  -- existing: replays current soundscape
    NPCS.restoreAfterStateLoad()     -- existing
    L.InitLights()                   -- existing
    HO.syncAll()                     -- existing
    UpdateUIDisplays()               -- existing
end
function Sync.player(color)
    L.reconcileForPlayer(color)      -- existing consolidated reconciler
    HUP.syncHungerPulseAll()         -- existing (refine to per-player later)
    HO.syncAll()                     -- existing
    UpdateUIDisplays({playerStats=true, playerHud=true, overlays=true})
end
```

Wire `Global.onLoad()` to call `Sync.full()` at the bottom (replacing the hand-rolled fan-out). Keep the rest of the codebase calling whatever it calls today; both work.

**Deliverable:** one new file, ~80 lines, zero behavioral changes.

### Step 2 — Move the lighting side effect out of `S.setPlayerVal`

Delete the `if key == "hunger"` branch from `S.setPlayerVal` (lines 1054–1064 of `core/state.ttslua`). Audit every call site of `S.setPlayerVal(c, "hunger", ...)` — there are only 4 today (`core/roll_controller.ttslua:1191`, `core/pc_storyteller_panel.ttslua:264`, plus a few in `core/debug.ttslua`). Each gets a follow-up `Sync.player(color)`.

**Deliverable:** state module loses its dependency on lighting. Every hunger write is followed by a clear, greppable `Sync.player(color)`.

### Step 3 — Replace `modeRestore` with pure derivation

Implement `computeDesiredPlayerLightMode` and `L.reconcileForPlayer` as in §3.4. Delete `setContextualPlayerLightMode`, `getStoredModeRestore`, `setStoredModeRestore`, and `resolveCurrentModeOrFallback`. Keep `L.onDiceDrawerStateChanged` as a thin trigger that sets rolling context and calls `L.reconcileForPlayer(color)`. Clear `gameState.playerData[*].lighting.modeRestore` from saves on next state validation.

**Deliverable:** a meaningful chunk of `core/lighting.ttslua` deleted (low hundreds of lines). Lighting priority lives in one function. Saves no longer carry restore stacks.

### Step 4 — Add `<Module>.reconcileForPlayer(color)` / `reconcileFromState()`

Now the orchestrator's bodies stop delegating to legacy names. Each domain gets a properly-named, idempotent reconciler. Old names become aliases or get deleted depending on usage.

**Deliverable:** the orchestrator is the only call site for the per-domain reconcilers. Naming is consistent across modules.

### Step 5 — Document and lock the convention

- Add a `.cursor/rules/toronto-rising-synchronization.mdc` rule that states: "world-side state is read from `gameState` only; reconcilers are idempotent and read-only on state; new domains expose `reconcileFromState()` and (if player-scoped) `reconcileForPlayer(color)`; the `Sync` module is the only fan-out point".
- Add an entry to `.dev/AVAILABLE_FUNCTIONS.md`.
- Add a short test in `core/debug.ttslua`: corrupt the world (e.g. `getObjectFromGUID(SEAT_LIGHT_1_RED).getChildren()[1]....setEnabled(false)`), call `Sync.full()`, assert it snaps back.

**Deliverable:** the rule survives turnover (yours and any agent's).

### Step 6 (optional, later) — Phase- and scene-derived behaviors

This is where the **planned** work in your speculation becomes additive instead of a rewrite:

- Memoriam phase / Memoriam scene: scene-level LUT/ambient setting in the relevant `Scenes.SCENES` entry (or a new `MEMORIAM` ambient preset in `C.LightModes`), plus `overlay_memoriam_<color>` images added to `computeDesiredVisibility` in `core/hud_overlays.ttslua`. **Does not touch** `computeDesiredPlayerLightMode` — Memoriam is a global mood, not a per-player light tier. Two small isolated edits.
- Storyteller switching scenes when the party splits: a single `gameState.scene` follows the ST's currently-active scene. Players not in that scene drop to OFF via the `Scenes.playerInCurrentScene(color)` check that already exists in the priority function. The orchestrator doesn't change.
- Phase-dependent buttons (Humanity vs Remorse): already done correctly in `GlobalInitiateRoll`'s trigger map; keep that pattern.

Each is a single PR-sized change in a single domain — exactly because the orchestrator and the reconciler contract are already in place.

---

## 6. Antipatterns and pitfalls (specific to junior-developer me-and-you)

### 6.1 The "tick-based polling" trap

> "Let's just call `Sync.full()` every 0.5 seconds with `Wait.time` as a safety net."

**Don't.** Even if the reconcilers are idempotent, this creates a load floor that competes with TTS's own scripting heartbeat, and it hides the actual triggers — when something goes wrong, "what made it sync just now?" has no answer. Synchronous, named triggers only.

### 6.2 The "I'll reconcile inside the setter" trap

> "I'll just have `S.setStateVal` notice when `currentPhase` changes and fire `Sync.full()`."

Tempting. Don't. Setters that fire reconcilers create the exact hidden coupling we just removed from `S.setPlayerVal`. The mutation site **explicitly** calls `Sync.<x>` afterwards. It's two lines instead of one; that's fine; the coupling stays visible.

### 6.3 The "let's also write to state from the reconciler" trap

> "While I'm syncing the soundscape, I should also update `gameState.soundscape.activeMusicChannel` to whichever channel I picked."

Reconcilers must not write to state. When reconcilers write state, you create read-after-write loops where saves no longer faithfully describe what's running.

**The soundscape currently violates this — and the violation is not load-bearing, despite my earlier hedge.** [`playBackgroundPlaylist`](../../core/soundscape.ttslua) currently does two things in one call: it picks the new active channel (a state mutation), then drives the emitters to play it (apply). The crossfade between `musicA` and `musicB` looks state-bound but is actually just an animation — exactly like `L.SetLightMode`'s `transitionEpoch` lerp. The desired *steady* state is "channel B plays X at volume Y; channel A is silent"; the crossfade is the journey, not the destination.

So we keep the principle, no exception. The cleanup is:

- `Soundscape.setMusicMood(moodKey)` becomes pure mutation: writes `gameState.soundscape.musicMood = moodKey`, **also** writes the new `activeMusicChannel` (state, since A/B alternation must survive save/load), then calls `Soundscape.reconcile()`.
- `Soundscape.reconcile()` reads state, ensures `activeMusicChannel` is playing the saved track at saved volume, and ensures the inactive channel is silent. If the active channel was just switched, it crossfades; if it wasn't, the diff cache short-circuits and nothing happens.

This is a real refactor — bigger than the other reconciler renames in step 4, but smaller than the lighting `modeRestore` deletion in step 3. Slot it into **step 4** as its own sub-step with a "review carefully" flag. The catalog (`lib/soundscape_catalog.ttslua`) doesn't change.

### 6.4 The "let's add a `force` flag" trap

> "Add a `forceFull` argument so we can re-apply even when the diff cache says it's a no-op."

Almost always means the diff cache is wrong, not that the caller needed a flag. Find the bug. The one legitimate use is "wipe the cache after a UI XML reload" — and the right shape is `HO.invalidateCacheForSeat(color)` (which already exists) followed by `Sync.player(color)`, not a `force` parameter on the orchestrator.

### 6.5 The "let's emit an event bus" trap

> "We should publish `state.changed` events with the path that changed and let domains subscribe."

You don't need a pub/sub system. Six explicit triggers (load, phase change, scene change, hunger change, roll change, table reassign) fan out to one of three orchestrator entry points. That's not enough complexity to deserve a bus, and the bus would mostly hide the same coupling we just removed.

### 6.6 The "make it generic for things we haven't built yet" trap

This proposal already does some of that (`Sync.npcCutouts()` even though `NPCS.reconcileFromState()` doesn't exist yet). That's the limit. Resist generalizing the orchestrator further until two domains actually disagree about how it should work. Premature generalization is the more common failure mode than under-design here.

---

## 7. Locked-in decisions

Confirmed in chat after the first draft of this proposal:

| Decision | Outcome |
|---|---|
| **Mutation/reconciler split** | Lock it in. `setState` + `Sync.<scope>()` is the standard pattern for live updates whenever state is involved. Reconcilers never write state. |
| **Lighting priority order** | `ROLLING > NPC-role-leave-alone > DARK/absent > HUNGRY > STANDARD`. "DARK" and "absent from current scene" collapse to the same OFF outcome. ROLLING is highest because the ST permitting a roll implies the player must be able to see. |
| **Memoriam** | Implemented as a **global LUT setting** plus an **HUD overlay image** (smoky/hazy border). **Not** a per-player light tier — does not appear in `computeDesiredPlayerLightMode`. Soundscape mood may follow Memoriam scenes; that's a soundscape catalog detail, not an architectural concern. |
| **Multiple scenes / party splits** | The Storyteller drives a **single active scene at any moment**. Lighting, soundscape, NPC cutouts, and player lights all follow that one active scene. Players who aren't present in the active scene get their lights set to OFF. (Future "player has assumed an NPC role" exception is reserved with the `Scenes.assumesNpcRole(color)` hook in §3.4 — returns `nil` so the seat light is left alone, since NPC role isn't implemented yet.) |
| **Soundscape exception** | No exception. The soundscape currently writes state during apply, but the violation is not load-bearing (see §6.3). The channel-A/B alternation is state, but the crossfade itself is animation. The soundscape mutation API is refactored so writes happen up-front, then `Soundscape.reconcile()` is read-only. This adds an item to step 4 of the migration. |
| **Sync lives in its own file** | `core/sync.ttslua`, kept deliberately tiny so it's easy to find and audit. Not part of `core/main.ttslua`. |
| **Roll lifecycle wiring** | I'll let the implementation decide between "controller calls `Sync.player` directly" vs "callback wraps `Sync.player`". Designed to be flexible enough to absorb planned additions (NPC rolls, varied ST confirmation cadence) without churning the orchestrator. |
| **Scene loading** | `Scenes.loadScene(name)` becomes mutation-then-`Sync.full()` internally. Same one-call ergonomics; cleaner separation underneath. |
| **Idempotency unit tests** | Yes, write them. TTS-side test harness is constrained, but every reconciler that can be tested *should* be tested — call twice, assert second pass made zero world calls. |

---

## 8. Summary of recommended changes

In order, smallest-first:

1. **New file:** `core/sync.ttslua` — orchestrator, ~150 lines, delegates to existing functions on day one.
2. **Edit:** `Global.onLoad()` calls `Sync.full()` at the end instead of hand-rolling the fan-out.
3. **Edit:** `S.setPlayerVal` loses the lighting side effect; the 4 call sites call `Sync.player(color)` after the write.
4. **Replace:** `modeRestore`-stack lighting → pure `computeDesiredPlayerLightMode` priority function in `core/lighting.ttslua`.
5. **Rename:** existing reconcilers to `<Module>.reconcileForPlayer` / `<Module>.reconcileFromState`; remove old aliases when nothing references them. **Sub-step:** soundscape mutation/reconcile split (the §6.3 refactor).
6. **Document:** `.cursor/rules/toronto-rising-synchronization.mdc` codifies the contract so agents reading the workspace pick it up automatically.
7. **Test:** `DEBUG.test_sync_idempotent()` in `core/debug.ttslua` proves the second `Sync.full()` is a no-op; per-domain `DEBUG.test_<domain>_idempotent()` follow as each reconciler is renamed.

The proposal is conservative on purpose: every step is a small, reversible refactor that makes the next step easier. Nothing forces you to commit to "one big architectural change" — at every step you can stop and the codebase is in a strictly-better shape than before.
