# NPC Object Overview: Spawning, Positioning & Spotlighting

## Agent Routing

Read this when:
- changing NPC spawning, pooling, placement, spotlighting, or gameboard control behavior
- editing NPC registry shape or custom UI asset injection for NPC images

Source of truth:
- `core/npcs.ttslua`
- `core/npc_gameboard.ttslua`
- `lib/npcs_data.ttslua`
- `lib/npcs_light_spawn_defaults.ttslua`
- `.dev/custom-ui-assets/README.md`

Verification:
- `npm run build`
- `.dev/E2E Playbooks/Gameboard-E2E.md`
- NPC-specific step-by-step verification from `.dev/TESTING.md`

Status: current NPC system reference; verify registry fields and placement paths against code.

## NPC Data Structure: `NPCS.characters`

Data for all NPCs is contained in `NPCS.characters` (loaded from [`lib/npcs_data.ttslua`](../../lib/npcs_data.ttslua) into the runtime module). Each entry is an `npcData` table keyed by `name`: `NPCS.characters[name]`.

* `name`: Key in `NPCS.characters` and the spawned object name.
* `fullName`: Display name for UI.
* `figurine`: `scale` only (spotlight bounds math + save inject `ImageScalar`). Front/back URLs live on workshop `npc_figurine` objects, not in this registry.
* `stats`: Arbitrary nested data; rendered by `NPCS.displayStats(npcName)`.
* `lighting`: Optional per-mode overrides (see merge rules below).
* `groups`: Map of group id → slot index within that group (used when spawning a whole group into an area).

### `npcData.figurine`

* `scale`: **Number** for save inject `CustomImage.ImageScalar` and runtime spotlight bounds gating — **not** Transform `setScale`. Images are set once on workshop figurines via `npm run custom-ui-assets:inject-npc-world`.

### `npcData.stats`

Flexible tree for Storyteller-readable output only.

### `npcData.lighting`

Optional overrides per mode key (`off`, `standard`, `spotlight`). **Merge rule:** for each mode, start from `NPCS.lights[mode]` and **deep-merge** `npcData.lighting[mode]` on top when present. When the instance’s `areaKey` is **`__stage_board__`** (gameboard STAGE_BOARD placements, not legacy table-side areas), **deep-merge** `NPCS.stageLights[mode]` after that. Unlisted modes use globals only.

* **Figurine cutout scale (ImageScalar):** `figurine.scale` is baked into save `ImageScalar` at inject time. **Transform** scale is preload `0.12` vs active `1` via `setScale`. **ImageScalar** at seats is **53**; off-seat (stage, preload, areas) restores registry `figurine.scale`. Runtime applies ImageScalar only when it differs — `setCustomObject` + `reload()` on seat ↔ off-seat transitions (TOR-223); skipped when already at target (e.g. seated at 53 when data scale is 53).

---

## NPC Data Structure: `NPCS.lights`

Default mode definitions: `off`, `standard`, `spotlight`.

Shared fields (same meaning as [`core/lighting.ttslua`](../../core/lighting.ttslua)):

* `enabled`, `color`, `range`, `angle`, `intensity`

NPC-specific placement is resolved at runtime in `NPCS.buildResolvedLightModeTable` from a per-mode **`positioning`** block. The block's presence means "this mode moves/aims the light"; absence (e.g. `OFF`) leaves the light's position and rotation untouched.

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

Whenever the figurine **moves or rotates**, this pipeline is re-run (UI moves, `onObjectDrop`, stage Apply, and defer align hooks) so the paired light stays aligned.

**Stage placement timing (palette parity):** Step Two **skips preload park** when a homeland seat is stage-bound (figurine stays at the chair until Step Five). Step Five runs **`ensureNpcInPreloadZone` only when the figurine is not already on `STAGE_BOARD`** (seat/preload → stage; same presentation path as palette→stage adopt). Stage→stage Apply keeps `areaKey == STAGE_BOARD` so TOR-173 lerp eligibility can pass. When `ImageScalar` already reads registry scale but `getBounds` still reflects seat scalar **53**, `buildResolvedLightModeTable` projects bounds height from the seat→registry ratio so spotlight Y is correct without waiting on mesh reload. `deferNpcSpotlightAlignedToFigurine` still polls and refines when reload is in flight. Stage wake uses inline `SetLightMode` (pose-aware fingerprint). **`RSL.SyncTable`** skips pooled-light reconcile for `__stage_board__` NPCs and during the NPC orchestrator.

### Spawn source

* **Figurine:** Workshop `npc_figurine` objects in the TTS save (`npcInstance:<characterKey>` GM notes). Runtime **does not** spawn figurines; `NPCS.auditPreloadPoolFigurines` errors if any registry key is missing. Figurines are **always** TTS-locked via `ensureNpcFigurinePhysicsLocked`. **`rec.locked`** is the Storyteller panel “pin in place” (blocks script moves only). **Tooltips** off in the preload pool; on when active in a stage area or at a seat.
* **Light:** `spawnObjectData` for missing `npc_light` only (spotlight repair). Existing pooled lights are adopted by nickname `NPC Light <characterKey>`.

---

## Preload staging area (`preload`)

The `preload` entry in [`lib/npcs_data.ttslua`](../../lib/npcs_data.ttslua) `D.areas` is an **off-table** grid at **world Y = -200** (`groundLevel`). It is omitted from the Storyteller NPC panel (`excludeFromNpcPanel = true`). **`autoLight = false`** so parked pool lights default **OFF** (under-table pool).

**Global pool:** `NPCS.auditPreloadPoolFigurines` (called from `NPCS.restoreAfterStateLoad`) verifies every `NPCS.characters` key has an in-world `npc_figurine`. `ensureNpcInPreloadZone` **adopts** orphaned workshop figurines into preload slots and **repairs** missing spotlights only — it does not create figurines. Activating on stage (`moveNpcToArea`) or at table seats (`assignNpcToSeat`) **moves** the pooled figurine + light; missing figurines **error** (`npcPoolPolicyError` / audit `error()` on load).

**Load audit:** `NPCS.restoreAfterStateLoad` runs `NPCS.auditDuplicatePooledSpotlights` after register and again after preload audit; duplicates log `[NPCS] ERROR load-after-preload: duplicate pooled npc_light` and raise a Storyteller alert. Manual audit: `lua DEBUG.auditDuplicatePooledSpotlights({ alert = true })`. **Dedupe (opt-in):** `lua DEBUG.auditDuplicatePooledSpotlights({ destroyDuplicates = true, phase = "manual-dedupe" })`.

**Table seats:** The pooled figurine receives the seat `*Object` tag (e.g. `NPC1Object`), GM Notes **`SEAT_FIGURE_<seatKey>`** (same identity model as PC figurines), and is moved as role **`SEAT_FIGURE`** by `lib.rotational-seat-layout`. `C.TableSourceObjects.postCorrectionsBySeatRole` applies per-seat Y correction (PC and NPC share the table). Display **Name** stays the NPC **full name** (tooltip). Unseating restores `npcInstance:` GM Notes. The paired **area spotlight** is moved to the character’s **preload slot** (OFF, hidden, small scale) while seated; workshop **`SEAT_LIGHT_1/2_NPC*`** lights (virtual hand-zone rig) are reconciled via `L.reconcileForPlayer`.

`gameState.sessionScene.npcWorld` carries **`byArea` only** for Scene Constructor intent. **`Sync.full`** → **`NPCS.reconcileAllFromState`** resolves placement intent (Step Zero), clears stale area/seat placements, seats allowed NPCs synchronously via rotational layout, applies narrative presence visibility, then populates stage areas — without wholesale stash-all before every `byArea` apply.

---

## NPC Data Structure: `NPCS.areas`

Each area key maps to:

```lua
{
  rotation = 0,       -- degrees: azimuth of area center around table origin (XZ)
  distance = 100,     -- distance from (0,0,0) in XZ to area center
  groundLevel = -40,  -- world Y for figurine position (Figurine_Custom anchor is at the bottom)
  autoLight = false,  -- optional: when true, new spawns default to STANDARD light; when false, OFF
  excludeFromNpcPanel = false, -- optional: when true, area is hidden from Storyteller NPC panel row logic
  positions = {       -- 1-based slot offsets in area-local XZ (before rotation)
    { x = 0, z = 0 },
    { x = 10, z = 5 },
  },
}
```

World slot center:

* `areaCenter = (sin(rot)*distance, 0, cos(rot)*distance)` using the same convention as your scripting (match `core/npcs.ttslua`).
* Rotate each `{x,z}` by `area.rotation`, add to `areaCenter`.
* Figurine `posY` = `groundLevel` (bottom-anchored custom figurine; no bounds half-height offset).
* Figurine `rotY` = yaw toward table center **plus** `AREA_NPC_FIGURINE_YAW_OFFSET_DEG` (180°) in `core/npcs.ttslua` so `Figurine_Custom` front/back images match the intended facing; this applies only to **area** placement (`applyFigurinePlacement`). Table seats use rotational layout **`SEAT_FIGURE`** frames (no area yaw offset).

### Area eligibility (spawn menus)

* **Spawn group:** area must be **completely empty** (no spawned NPCs in any slot).
* **Spawn individual:** area is valid if **at least one slot is free** (partial occupancy allowed). If the NPC already exists, they are **moved** to the next free slot in the chosen area.

---

## Storyteller UI (summary)

* **CONTROL_BOARD** (`ui/objects/npc_control_board.xml`) is the Storyteller surface for NPC seat assignment, stage placements, Apply/Clear, and dice-bag rolls — see [Storyteller Gameboard Control.md](Storyteller%20Gameboard%20Control.md).
* Legacy **`panel_npcs`** toolbar tab removed (TOR-181); area spawn/move/clear flows use scene `byArea` + reconciler or gameboard only.
* **Manual drags:** dropping a tagged NPC figurine refreshes its paired light from the same math as above.
* **Admin scene transitions:** switching from admin `DARK` to `STANDARD`/`BRIGHT` re-applies each spawned NPC's current light mode after staged scene lighting completes.

---

## Example Data (valid Lua)

### `NPCS.characters`

```lua
MyleneHamelin = {
  name = "MyleneHamelin",
  fullName = "Mylene Hamelin",
  figurine = {
    images = {
      front = "https://example.com/mylene_front.png",
      back = "https://example.com/mylene_back.png",
    },
    scale = 15,
  },
  groups = {
    fiveKeys = 1,
    princesCourt = 4,
  },
  lighting = {
    off = {
      color = Color(1, 0.55, 0),
    },
    standard = {
      color = Color(1, 0.55, 0),
      positioning = { deltaUp = 5, deltaInward = 3, lookAtYShift = 0.2 },
    },
    spotlight = {
      color = Color(1, 0.55, 0),
      positioning = { positionYShift = 0.3, distance = -20, lookAtYShift = 0.2 },
    },
  },
  stats = {
    title = "Ventrue Primogen",
    clan = "Ventrue",
    generation = "9th",
    bloodPotency = 3,
    humanity = 6,
    health = 8,
    willpower = 7,
    dicePools = {
      standard = { physical = 5, social = 4, mental = 4 },
      exceptional = {
        ["Animal Ken"] = 9,
        Athletics = 8,
        Awareness = 7,
        Brawl = 8,
        Firearms = 9,
        Melee = 8,
        Dominate = 10,
        Presence = 11,
      },
    },
    disciplines = {
      Dominate = {
        value = 3,
        powers = { "Compel", "Mesmerize", "The Forgetful Mind" },
      },
      Presence = {
        value = 1,
        powers = { "Awe" },
      },
      ["Blood Sorcery"] = {
        value = 1,
        powers = { "Taste of Blood" },
        rituals = {
          [1] = { "Summon Arnu" },
        },
      },
    },
    special = {
      "Mylene can wield her Dominate powers without eye-contact against anyone who is subject to her Awe.",
    },
    notes = {
      "Mylene still holds a grudge against Lord Lucien for his betrayal during the fight for Praxis.",
    },
  },
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

### `NPCS.areas`

```lua
NPCS.areas = {
  centerForward = {
    rotation = 0,
    distance = 100,
    groundLevel = -40,
    positions = {
      { x = 0, z = 0 },
      { x = 10, z = 5 },
      { x = -10, z = 5 },
      { x = 20, z = 10 },
      { x = -20, z = 10 },
      { x = 30, z = 15 },
      { x = -30, z = 15 },
    },
  },
  nearLeft = {
    rotation = 80,
    distance = 80,
    groundLevel = -40,
    positions = {
      { x = 0, z = 0 },
      { x = 10, z = 5 },
      { x = -10, z = 5 },
      { x = 20, z = 10 },
      { x = -20, z = 10 },
      { x = 30, z = 15 },
      { x = -30, z = 15 },
    },
  },
}
```
