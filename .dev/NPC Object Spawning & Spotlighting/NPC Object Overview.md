# NPC Object Overview: Spawning, Positioning & Spotlighting

## NPC Data Structure: `NPCS.characters`

Data for all NPCs is contained in `NPCS.characters` (loaded from [`lib/npcs_data.ttslua`](../../lib/npcs_data.ttslua) into the runtime module). Each entry is an `npcData` table keyed by `name`: `NPCS.characters[name]`.

* `name`: Key in `NPCS.characters` and the spawned object name.
* `fullName`: Display name for UI.
* `figurine`: Front/back image URLs and `scale` (see below).
* `stats`: Arbitrary nested data; rendered by `NPCS.displayStats(npcName)`.
* `lighting`: Optional per-mode overrides (see merge rules below).
* `groups`: Map of group id → slot index within that group (used when spawning a whole group into an area).

### `npcData.figurine`

* `images.front` / `images.back`: URLs for `Figurine_Custom` (`image` / `image_secondary`).
* `scale`: **Number** passed to `setCustomObject` as **`image_scalar`** (save JSON: `CustomImage.ImageScalar`; import dialog **Card Scale**) — **not** Transform `setScale`.

### `npcData.stats`

Flexible tree for Storyteller-readable output only.

### `npcData.lighting`

Optional overrides per mode key (`off`, `standard`, `spotlight`). **Merge rule:** for each mode, start from `NPCS.lights[mode]` and **deep-merge** `npcData.lighting[mode]` on top when present. Unlisted modes use globals only.

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

### Spawn source

* **Figurine:** `spawnObject` with type `Figurine_Custom` (TTS internal name; not `Custom_Figurine`), then `setCustomObject` with `image`, `image_secondary`, **`image_scalar`** (save: `CustomImage.ImageScalar`), and **`use_minimal_collider = true`** (save: `CustomFigurine.UseMinimalCollider`). Figurine is **`setLock(true)`** immediately after configuration so physics does not drop it before placement.
* **Light:** `clone()` from a **template object** in the save whose hierarchy matches `getLightComponent` in `core/lighting.ttslua` (child name matching `^spotlight`). Set GUID constant in [`lib/guids.ttslua`](../../lib/guids.ttslua) (`NPC_LIGHT_CLONE_TEMPLATE`).

---

## NPC Data Structure: `NPCS.areas`

Each area key maps to:

```lua
{
  rotation = 0,       -- degrees: azimuth of area center around table origin (XZ)
  distance = 100,     -- distance from (0,0,0) in XZ to area center
  groundLevel = -40,  -- world Y for figurine position (Figurine_Custom anchor is at the bottom)
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
* Figurine `rotY` = yaw so the figure faces `(0, posY, 0)`.

### Area eligibility (spawn menus)

* **Spawn group:** area must be **completely empty** (no spawned NPCs in any slot).
* **Spawn individual:** area is valid if **at least one slot is free** (partial occupancy allowed). If the NPC already exists, they are **moved** to the next free slot in the chosen area.

---

## Storyteller UI (summary)

* **NPCs** toggle on the storyteller tool bar opens `panel_npcs` (see [`ui/storyteller/panel_storyteller_toolbar.xml`](../../ui/storyteller/panel_storyteller_toolbar.xml)).
* Spawn groups / individuals, move, clear area, remove, light toggle (`off` / `standard`), **hold name** for `spotlight` (mouse up restores previous mode).
* **Manual drags:** dropping a tagged NPC figurine refreshes its paired light from the same math as above.

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
