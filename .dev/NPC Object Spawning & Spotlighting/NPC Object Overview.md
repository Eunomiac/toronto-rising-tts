# NPC Object Overview: Spawning, Positioning & Spotlighting

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

* **Figurine cutout scale:** `figurine.scale` in `npcs_data` drives save inject `ImageScalar` and runtime **Transform** scale for seated and stage/active placements (`applyNpcPairPhysicalPresentation`). Preload pool uses small Transform scale (`0.12`); seat and stage restore per-character `figurine.scale` (typically 53). No `setCustomObject` / `reload()` on placement.

---

## NPC Data Structure: `NPCS.lights`

Default mode definitions: `off`, `standard`, `spotlight`.

Shared fields (same meaning as [`core/lighting.ttslua`](../../core/lighting.ttslua)):

* `enabled`, `color`, `range`, `angle`, `intensity`

NPC-specific (no fixed `position` / `rotation` in data):

* `lookAtYShift`: Fraction of bounding-box height measured **down from the top** of the figurine bounds to the aim point (face).
* `positionYShift`: Same vertical reference: used to set the light’s **world Y** as `topOfBounds - positionYShift * bboxHeight`.
* `distance`: Horizontal offset length in world units along the **outward radial** direction (see below).

### Light position and rotation (implementation pipeline)

Do **not** split rotation into manual `rotX` / `rotY` / `rotZ` in data. The script:

1. Reads figurine **axis-aligned bounds** (`getBounds()`).
2. Computes **face target** in world space: horizontal center of bounds, Y = `topY - lookAtYShift * height`.
3. Computes **light Y** = `topY - positionYShift * height`.
4. **Horizontal placement:** from the figurine’s **position** `(px, pz)` (table center in XZ), let `dir = normalize(px, pz)` in the XZ plane (direction from table center `(0,0,0)` toward the NPC). Place the light at `(px + dir.x * distance, lightY, pz + dir.z * distance)` so it sits **outward** from the table center relative to the figure (consistent with figures facing the center).
5. **Rotation:** `U.lookAtRotation(lightPosition, faceTarget)` → full pitch/yaw for the spotlight object.

Whenever the figurine **moves or rotates**, this pipeline is re-run (UI moves, `onObjectDrop`, and optional future hooks) so the paired light stays aligned.

**Stage placement timing:** `moveNpcToStagePlacement` applies spotlight mode **immediately** (`applyStageNpcSpotlightNow`), then schedules a deferred bounds pass to refine Y after figurine mesh load (`loading_custom` / `getBounds`).

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
      lookAtYShift = 0.7,
    },
    standard = {
      color = Color(1, 0.55, 0),
      lookAtYShift = 0.2,
      positionYShift = 0.3,
    },
    spotlight = {
      color = Color(1, 0.55, 0),
      lookAtYShift = 0.2,
      positionYShift = 0.3,
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
    lookAtYShift = 0.6,
    positionYShift = 0.2,
    distance = 20,
  },
  standard = {
    enabled = true,
    color = Color(1, 1, 1),
    range = 10,
    intensity = 3,
    angle = 40,
    lookAtYShift = 0.1,
    positionYShift = 0.4,
    distance = 15,
  },
  spotlight = {
    enabled = true,
    color = Color(1, 1, 1),
    range = 10,
    intensity = 8,
    angle = 35,
    lookAtYShift = 0.2,
    positionYShift = 0.3,
    distance = 15,
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
