# NPC Object Overview: Spawning, Positioning & Spotlighting

## Agent Routing

Read this when:
- changing NPC spawning, pooling, placement, spotlighting, or gameboard control behavior
- editing NPC registry shape; NPC images are covered by [`NPC Art Pipeline.md`](NPC%20Art%20Pipeline.md)
- generic NPC import/spawn (TOR-560): also read [`Generic NPCs.md`](Generic%20NPCs.md)

Source of truth:
- `core/npcs.ttslua`
- `core/npc_spawn.ttslua` (figurine + light spawn data), `lib/npc_art_urls.ttslua` (generated figurine + token links for every NPC; see [`NPC Art Pipeline.md`](NPC%20Art%20Pipeline.md))
- `core/generic_npcs.ttslua` (generic import; see [`Generic NPCs.md`](Generic%20NPCs.md))
- `core/npc_gameboard.ttslua` (+ siblings `npc_gameboard_{board,snaps,spotlight}`), `core/npc_stage_apply.ttslua` (Dashboard stage edits), `core/stage_tokens.ttslua` (spotlight tokens)
- `lib/npcs_data.ttslua`
- `lib/npcs_light_spawn_defaults.ttslua`
- [`NPC Art Pipeline.md`](NPC%20Art%20Pipeline.md) (figurine + token images)

Verification:
- `npm run build`
- Scenes tab stage edits from the Storyteller Dashboard ([Scenes-E2E](../E2E%20Playbooks/Scenes-E2E.md))
- NPC-specific step-by-step verification from `.dev/TESTING.md`

Status: current NPC system reference; verify registry fields and placement paths against code.

## NPC Data Structure: `NPCS.characters`

Data for all NPCs is contained in `NPCS.characters` (loaded from [`lib/npcs_data.ttslua`](../../lib/npcs_data.ttslua) into the runtime module). Each entry is an `npcData` table keyed by `name`: `NPCS.characters[name]`.

* `name`: Key in `NPCS.characters` and the spawned object name.
* `fullName`: Display name for UI.
* `figurine`: `scale` only (spawn `ImageScalar` + spotlight bounds math), set at load from the NPC's `cardScale` in generated [`lib/npc_overrides.ttslua`](../../lib/npc_overrides.ttslua) (the Dashboard token window), else `D.DEFAULT_FIGURINE_SCALE` (53). Front/back URLs for every NPC (named, generic, Memoriam) live in generated [`lib/npc_art_urls.ttslua`](../../lib/npc_art_urls.ttslua) ([NPC Art Pipeline](NPC%20Art%20Pipeline.md)).
* `lighting`: Optional per-mode overrides (see merge rules below).

Roster groups and group bosses are not Lua data: they live in the Dashboard's tracked `data/npc-roster.json` (`members`, `bosses`, `groupLabels`) and reach the Dashboard through `scene-catalogs.json`. NPC rules text and stats live in the chronicle Google Sheets.

### `npcData.figurine`

* `scale`: **Number** for the spawned `CustomImage.ImageScalar` and runtime spotlight bounds gating — **not** Transform `setScale`.

### `npcData.lighting`

Optional overrides per mode key (`OFF`, `STANDARD`, `SPOTLIGHT`, `OFFSPOTLIGHT` — uppercase keys in `lib/npcs_data.ttslua`). **Merge rule:** for each mode, start from `NPCS.lights[mode]` and **deep-merge** `npcData.lighting[mode]` on top when present. Then **deep-merge** optional live DEBUG overrides from `gameState.debug.npcLightModes[mode]` last (TOR-471). Unlisted modes use globals only. **`OFFSPOTLIGHT`** is a runtime companion mode (TOR-473): same-snap-family neighbors dim while another figurine is `SPOTLIGHT`; it is **not** written by token flip / placement scan.

* **Figurine cutout scale (ImageScalar):** spawns set `ImageScalar` directly (seat-bound spawns **53**, otherwise `figurine.scale`); Transform scale is always `1`. **ImageScalar** at seats is **53**; off-seat (stage, Scatter) restores `figurine.scale`. Runtime applies ImageScalar only when it differs — `setCustomObject` + `reload()` on seat ↔ off-seat transitions (TOR-223); skipped when already at target (e.g. seated at 53 when data scale is 53).

---

## NPC Data Structure: `NPCS.lights`

Default mode definitions: `OFF`, `STANDARD`, `SPOTLIGHT`, `OFFSPOTLIGHT` (see `lib/npcs_data.ttslua` `D.lights`).

Shared fields (same meaning as [`core/lighting.ttslua`](../../core/lighting.ttslua)):

* `enabled`, `color`, `range`, `angle`, `intensity`

### Family OFFSPOTLIGHT (TOR-473)

When a stage figurine is effectively **SPOTLIGHT** (placement / hold / Apply), other figurines in the **same snap `familyId`** whose steady mode is **not OFF** apply **OFFSPOTLIGHT** (slightly dimmer STANDARD) for the same transition duration. When SPOTLIGHT lifts, those companions return to their steady mode (normally STANDARD). Hold-preview (TOR-238) uses the same companion dim via transient apply (`NPCS.syncFamilyOffSpotlightPreview`) without persisting OFFSPOTLIGHT into placements.

NPC-specific placement is resolved at runtime in `NPCS.buildResolvedLightModeTable` from a per-mode **`positioning`** block. The block's presence means "this mode moves/aims the light"; absence (e.g. `OFF`) leaves the light's position and rotation untouched.

### Live DEBUG overrides (TOR-471)

Tune shared mode templates from the TTS console without editing `npcs_data` mid-session. Overrides live in **`gameState.debug.npcLightModes`** (persist across Save & Play) and win last in `NPCS.getMergedModeDefinition`.

| Console | Behavior |
| --- | --- |
| `lua DEBUG.npcLightModeShow()` / `lua npcLightModeShow("SPOTLIGHT")` | Print baked defaults, state override, and effective global merge |
| `lua DEBUG.npcLightModeSet("SPOTLIGHT", { intensity = 8, angle = 45, color = { r = 1, g = 0.95, b = 0.85 }, positioning = { deltaUp = 7, deltaInward = 2 } })` | Deep-merge patch into state; force-reapply all current NPC lights |
| `lua DEBUG.npcLightModeReset("SPOTLIGHT")` / `lua DEBUG.npcLightModeReset()` | Clear one mode or all overrides; reapply |
| `lua DEBUG.npcLightModeExport()` | Print a copy-pasteable `D.lights = { ... }` fragment for baking into `lib/npcs_data.ttslua` |

`color` in patches must be save-safe `{ r, g, b }` (or a TTS `Color`, which is normalized on write). This is separate from the Storyteller **Debug Light** HUD panel (per-GUID component sliders).

**Position** is defined by one of two field pairs:

* **New placement** — `deltaUp` + `deltaInward`: light sits `deltaUp` world units **above** the figurine bounds **top** (`center.y + size.y/2`), offset `deltaInward` units **toward origin** in XZ (`normalize(-cx, -cz) * deltaInward`). Missing values fall back to `NPC_FIGURINE_LIGHT_ABOVE_TOP_Y` (5) / `NPC_FIGURINE_LIGHT_INWARD_XZ` (3).
* **Legacy placement** — `positionYShift` + `distance`: light Y = `topY - positionYShift * height`; XZ offset radially **outward** by `distance` (`normalize(cx, cz) * distance`, so a **negative** `distance` pulls the light inward toward origin).

**Rotation** is always a **look-at** toward the figurine (in both placement methods):

* Target XZ = bounds center `(cx, cz)`.
* Target Y = `topY - lookAtYShift * height` when **`lookAtYShift`** is present (fraction of figurine height below the bounds top; e.g. `0.1` aims near the top), else the figurine **bounds center** (`cy`).
* `rotation = U.lookAtRotation(lightPos, target)` — tilts the cone toward the figure.
* Ephemeral **`lookAtTarget`** is also returned so `L.SetLightMode` can couple position→look-at during transitions (avoids long-way Euler Y spins between STANDARD and SPOTLIGHT; TOR-369). Not persisted into `gameState.lights`.

`transitionTime` is **not** part of `positioning`; the move/transition duration is owned by the caller (`applyCurrentLightMode`, hover-preview, stage lerp), as with all `L.SetLightMode` callers. Mode-only stage lerps bake a light pos path and per-frame look-at rotations (figurine stays put).

### Light position and rotation (implementation pipeline)

Do **not** split rotation into manual `rotX` / `rotY` / `rotZ` in data. The script:

1. Reads figurine **axis-aligned bounds** (`getBounds()`).
2. If the resolved mode has no `positioning`, returns the merged mode unchanged (no move/aim).
3. Computes `lightPos` from the `positioning` field pair (new `deltaUp`/`deltaInward` or legacy `positionYShift`/`distance`).
4. Computes `rotation` as a look-at toward the figurine, shifted by optional `lookAtYShift`.

Whenever the figurine **moves or rotates**, this pipeline is re-run (UI moves, `onObjectDrop`, Dashboard stage edits, and defer align hooks) so the paired light stays aligned.

**Stage placement timing:** a homeland seat that is stage-bound keeps its figurine at the chair until Step Five moves it (seat → stage clears seat identity and spawns the stage light). Stage→stage Apply keeps `areaKey == STAGE_BOARD` so TOR-173 lerp eligibility can pass. When `ImageScalar` already reads registry scale but `getBounds` still reflects seat scalar **53**, `buildResolvedLightModeTable` projects bounds height from the seat→registry ratio so spotlight Y is correct without waiting on mesh reload. `deferNpcSpotlightAlignedToFigurine` still polls and refines when reload is in flight. Stage wake uses inline `SetLightMode` (pose-aware fingerprint). **`RSL.SyncTable`** skips pooled-light reconcile for `__stage_board__` NPCs and during the NPC orchestrator.

### Spawn source

* **Figurine:** spawned on demand by [`core/npc_spawn.ttslua`](../../core/npc_spawn.ttslua) (`NpcSpawn.spawnFigurine`): a full `Figurine_Custom` (Nickname = full name, Minimal Collider off) built from the URL catalog, tagged `npc_figurine` (+ `generic_npc` for generics), GM notes `npcInstance:<characterKey>`, parked hidden under the table with `O.hideObject` until the reconciler moves it (TOR-707). Named and generic NPCs share this path ([Generic NPCs.md](Generic%20NPCs.md)). Figurines are **always** TTS-locked via `ensureNpcFigurinePhysicsLocked`. **`rec.locked`** is the Storyteller panel “pin in place” (blocks script moves only).
* **Light:** `NpcSpawn.spawnLight` clones [`lib/npcs_light_spawn_defaults.ttslua`](../../lib/npcs_light_spawn_defaults.ttslua) (nickname `NPC Light <characterKey>`, tag `npc_light`). Only stage / Scatter NPCs carry a light; a seated NPC's light is destroyed (`dropNpcLightForSeat`) and a fresh one spawns when they return to the stage.

---

## Spawn and despawn lifecycle (TOR-707)

There is no under-table pool. `gameState.npcs.instances[name]` exists only while the NPC is in the world.

* **Scene transitions** (behind the blindfold): the reconciler resolves each NPC's target (stage, seat, Scatter, or `none`). Stage / seat / Scatter moves call `ensureLiveNpcInstance`, which spawns a hidden pair when the record or its figurine is missing; the move then restores it at its pose. NPCs whose target is `none` are destroyed (Step One for stage / Scatter rows, Step Five (b) for everything else). A fresh spawn snaps into place (not lerp-eligible).
* **Mid-scene adds** (Dashboard stage edit, seat NPC, Scatter placement): `NPCS.prewarmNpcs` spawns the missing figurine hidden at `areaKey = "__spawnPark__"`, holds it from the Step Five (b) despawn, waits until the image has loaded (`spawning` / `loading_custom` false, 15 s cap), then runs the deferred edit. `StageApply` keeps one pending edit; a newer edit absorbs it (newer wins per NPC).
* **Load:** `NPCS.restoreAfterStateLoad` re-registers generic roster rows, and registers restored instances (figurine required, light optional). A record whose figurine is gone is respawned at the next reconcile; a record with no target (including a legacy `areaKey = "preload"` row) is despawned by Step Five (b). One-shot cleanup for a save that still holds the retired pools: `lua DEBUG.retirePreloadPools()` (preload records, unreferenced `npc_figurine` / `npc_light`, `d10Preload` dice, old `CB_` board pieces), then File → Save.

**Table seats:** The figurine receives the seat `*Object` tag (e.g. `NPC1Object`), GM Notes **`SEAT_FIGURE_<seatKey>`** (same identity model as PC figurines), and is placed at its numbered table slot by the figurine seat layout (`lib/figurine_seat_layout.ttslua`); seat furniture follows from `C.SeatRoleOffsets`. Display **Name** stays the NPC **full name** (tooltip). Unseating restores `npcInstance:` GM Notes.

**Tooltip:** a seated NPC's tooltip follows seat presence (`reconcileSeatNarrativePresenceFromIntent`). Off the seats (stage, Scatter) the tooltip is on only while the figurine is lit — `applyNpcFigureTooltip` sets `tooltip = (effectiveAppliedLightModeKey ~= "OFF")`, so a spotlight hold or preview lights it. It runs wherever the light mode is applied: `applyNpcPairPhysicalPresentation`, `applyStageNpcSpotlightNow`, `applyNpcSpotlightAlignedToFigurine`, and `NPCS.applyCurrentLightMode`. Stage tokens (`core/stage_tokens.ttslua`) always show their tooltip (full name). Workshop **`SEAT_LIGHT_1/2_NPC*`** lights (virtual hand-zone rig) are reconciled via `L.reconcileForPlayer`.

`gameState.sessionScene.npcWorld.placements` carries stage intent (gameboard u, v, yaw, light mode). **`Sync.full`** → **`NPCS.reconcileAllFromState`** resolves placement intent (Step Zero), clears stale stage/seat placements, seats allowed NPCs synchronously via rotational layout, applies narrative presence visibility, places stage NPCs, then despawns untargeted NPCs.

---

## Storyteller UI (summary)

* **Storyteller Dashboard** (Scenes tab) is the Storyteller surface for NPC stage placements and stage Clear; it sends `GlobalDashboardScenesApply` → `StageApply.applyStageChanges`. The **Stage Control board** only holds spotlight tokens for the hold hotkey - see [Storyteller Gameboard Control.md](Storyteller%20Gameboard%20Control.md).
* Legacy **`panel_npcs`** toolbar tab removed (TOR-181); NPC spawn/move/clear flows go through scene placements + the reconciler or Dashboard stage edits only.
* **Manual drags:** dropping a tagged NPC figurine refreshes its paired light from the same math as above.
* **Admin scene transitions:** switching from admin `DARK` to `STANDARD`/`BRIGHT` re-applies each spawned NPC's current light mode after staged scene lighting completes.

---

## Example Data (valid Lua)

### `NPCS.characters`

```lua
myleneHamelin = {
  name = "Mylene",
  fullName = "Mylene Hamelin",
  lighting = {
    STANDARD = {
      color = Color(1, 0.55, 0),
      positioning = { deltaUp = 5, deltaInward = 3, lookAtYShift = 0.2 },
    },
  },
  -- added at load: figurine = { scale = <cardScale override or 53> }
},
```

### `NPCS.lights`

```lua
NPCS.lights = {
  off = {
    enabled = false,
    color = Color(1, 1, 1),
    range = 10,
    intensity = 0,
    angle = 0,
    -- No `positioning`: OFF does not move or re-aim the light.
  },
  standard = {
    enabled = true,
    color = Color(1, 1, 1),
    range = 10,
    intensity = 3,
    angle = 40,
    -- New placement: 5 above bounds top, 3 inward, aim near top.
    positioning = { deltaUp = 5, deltaInward = 3, lookAtYShift = 0.1 },
  },
  spotlight = {
    enabled = true,
    color = Color(1, 1, 1),
    range = 10,
    intensity = 8,
    angle = 35,
    -- Legacy placement: 0.3 of height below top, 20 units inward (negative distance), aim mid-figure.
    positioning = { positionYShift = 0.3, distance = -20, lookAtYShift = 0.2 },
  },
}
```
