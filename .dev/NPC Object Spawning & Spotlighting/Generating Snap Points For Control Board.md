# Generating Snap Points for Control Board

Configurable elliptical polar snap grid on the CONTROL_BOARD minimap. Implementation: `lib/npc_gameboard_data.ttslua` (`D.CONTROL_BOARD_SNAP`), `Gameboard.buildControlBoardSnapPoints` / `Gameboard.installPolarSnaps` in `core/npc_gameboard.ttslua`.

## General Considerations

Snap points are generated in polar coordinates on the control board. Several settings control ring shape, ray count, and per-ring snap families.

## Coordinate frame

- Board **u/v** are normalized **0–1** on the tile: **u = local X**, **v = local Z**, origin at the bottom-left corner of the map (Step 1).
- Placement uses `(u,v)` → `boardLocalFromUv` → `boardLocalToWorld` (same frame as tokens and minimap markers).
- Generated `(u,v)` outside the board are **skipped** — only snaps with `0 ≤ u ≤ 1` and `0 ≤ v ≤ 1` are installed.

## Configuration Values

| Setting | Description |
| :--: | :-- |
| `origin` | Center of the polar system in board u/v |
| `rings` | Number of concentric elliptical rings |
| `innerRingMaxU` & `innerRingMaxV` | **Optional** when every `snapGroups[r]` sets `maxU`/`maxV`. Otherwise **absolute** board u/v for the **innermost** ring |
| `outerRingMaxU` & `outerRingMaxV` | **Optional** when every ring has `maxU`/`maxV`. Otherwise **absolute** board u/v for the **outermost** ring; rings without per-ring max interpolate inner → outer |
| `snapGroups` | One entry per ring (**index 1 = innermost**): `{ num, angleDelta, rays, maxU?, maxV?, groundLevel?, radialStagger? }` — family size, angular spacing, ray count, optional **per-ring** ellipse max (overrides interpolation), optional **absolute world Y** for figurines, optional **STAGE world XZ** radial push per family step (see below) |
| `snapYawOffsetDeg` | Added to toward-origin yaw on each snap (default **0** on control board; palette uses **180**) |

### `groundLevel` (per ring, optional)

- **Absolute world Y** for figurines placed on Apply (same convention as `D.areas[*].groundLevel` in `lib/npcs_data.ttslua`, e.g. `-50`, `-15`).
- **Does not** affect CONTROL_BOARD snap points — snaps always sit at `D.MINIMAP_SURFACE_LOCAL_Y` on the minimap tile.
- **Does not** add STAGE_BOARD or CONTROL_BOARD object Y — boards only map u,v → world **X/Z**; `groundLevel` sets figurine **Y** directly when present.
- On **Apply**, persisted in `sessionScene.npcWorld.placements[*].groundLevel` and passed to `Gameboard.worldFromUv(u, v, { groundLevel = … })`.
- When omitted on a ring, figurine Y is STAGE_BOARD surface world Y at u,v (or `DEFAULT_STAGE_WORLD.groundY` if STAGE_BOARD is missing).
- Ring is inferred from `(u, v)` by closest matching ellipse (`Gameboard.resolveSnapRingIndexForUv` / `Gameboard.groundLevelForSnapUv`).

### `radialStagger` (per ring, optional)

- **Unit:** **STAGE_BOARD / playfield world XZ inches** — the same ~400-unit frame as `STAGE_BOARD` bounds, **not** CONTROL_BOARD minimap world inches. Shared `(u,v)` is derived from STAGE for playfield mapping; staggering on the smaller minimap world space inflated u/v by roughly the stage÷control scale (~40× with default `MINIMAP_SCALE_DIVISOR`).
- After placing a family member on its ring ellipse, non-anchor snaps (`familyK ≠ 0`) move **outward** along that snap’s STAGE world radial from `origin` by `abs(familyK) * radialStagger`, then `(u,v)` is recomputed from STAGE.
- **Anchor** (`familyK == 0`) stays on the ring ellipse unchanged.
- Example: `num = 5`, anchor 50 world inches from origin on STAGE, `radialStagger = 1` → **52, 51, 50, 51, 52** world inches along each member’s radial.
- On a ~400-unit-tall stage, `radialStagger = 1` is a subtle nudge; `5` is still modest. Tune on STAGE scale, not minimap tile size.
- **Angular spread** in each family is separate (`angleDelta`); the visible “V” is often mostly angle, with radial stagger as a fine adjustment.
- Omitted or `0` → no radial offset.
- After stagger, `(u,v)` outside `[0,1]` are **omitted** (not clamped to the board edge).

### Example Configuration (shipped default — no per-ring Y override)

```lua
D.CONTROL_BOARD_SNAP = {
  origin = { u = 0.5, v = 0.2 },
  snapYawOffsetDeg = 0,
  rings = 4,
  innerRingMaxU = 0.6,
  innerRingMaxV = 0.3,
  outerRingMaxU = 0.9,
  outerRingMaxV = 0.9,
  snapGroups = {
    { num = 1, angleDelta = 0, rays = 4 },
    { num = 3, angleDelta = 3, rays = 12 },
    { num = 5, angleDelta = 4, rays = 16 },
    { num = 1, angleDelta = 0, rays = 20 },
  },
}
```

**Snap count:** `sum over rings r of snapGroups[r].rays * snapGroups[r].num`, **minus** any candidate whose `(u,v)` falls outside `[0,1]`. Default config → **136** before filter; run `DEBUG.previewControlBoardSnapCount()` for the installed count (typically fewer when outer-ring rays dip below `v = 0`).

### Ring max u/v (per ring or interpolated)

Each ring’s ellipse uses **`snapGroups[ringIndex].maxU` and `.maxV`** when both are set. Otherwise, when top-level `innerRingMaxU/V` and `outerRingMaxU/V` are present, ring `r` interpolates:

```lua
t = (rings == 1) and 0 or ((r - 1) / (rings - 1))
maxU[r] = innerRingMaxU + t * (outerRingMaxU - innerRingMaxU)
maxV[r] = innerRingMaxV + t * (outerRingMaxV - innerRingMaxV)
```

Per-ring max is preferred for hand-tuned layouts (e.g. outer `maxV = 0.7` without changing inner rings). Validation requires either **all rings** to define `maxU`/`maxV` **or** top-level inner/outer max for fallback interpolation.

### Ellipse (axis-aligned in board u/v)

At angle `angleDeg` (0° = +u, 90° = +v):

```lua
theta = math.rad(angleDeg)
u = origin.u + math.cos(theta) * (maxU - origin.u)
v = origin.v + math.sin(theta) * (maxV - origin.v)
```

Sanity (example inner ring `maxU=0.6`, `maxV=0.3`, `origin={0.5,0.2}`): 0° → `(0.6, 0.2)`; 90° → `(0.5, 0.3)`.

### Rays + families (single loop)

Anchor snaps and family members are generated together (no separate anchor pass):

```lua
rays = snapGroups[ringIndex].rays
anchorDeg = (rayIndex / rays) * 360   -- rayIndex = 0 .. rays-1
half = math.floor(num / 2)
for k = -half, half do
  angleDeg = anchorDeg + k * angleDelta
  -- u,v on ring ellipse; optional radialStagger pushes non-anchor snaps outward in STAGE world XZ inches
  -- board-local snap position (Y = MINIMAP_SURFACE_LOCAL_Y on tile); figurine Y on Apply = optional absolute world groundLevel on ring
end
```

Example: ring 3, `num=5`, `angleDelta=4`, `anchorDeg=90` → **82°, 86°, 90°, 94°, 98°**.

- **Duplicates** at overlapping angles are allowed (no dedupe).
- Candidates with `u` or `v` outside `[0, 1]` are omitted (not clamped).
- Every snap uses `rotation_snap = true`, `tags = { "npc_control_token" }` (tagged snaps match control tokens), and board-local yaw **toward** `origin` plus `snapYawOffsetDeg`.

## Visual illustrations

Step 3 dotted circles use the **same** ring geometry as Step 2.

* **Step One: Place the Origin** — [View Image](./Snap%20Point%20Illustrations/Step%201%20-%20Origin.png)
* **Step Two: Define the Rings** — [View Image](./Snap%20Point%20Illustrations/Step%202%20-%20Rings.png)
* **Step Three: Define the Rays** — [View Image](./Snap%20Point%20Illustrations/Step%203%20-%20Rays.png)
* **Step Four: Generate Anchor Snaps** — [View Image](./Snap%20Point%20Illustrations/Step%204%20-%20Anchor%20Snaps.png)
* **Step Five: Generate Snap Point Families** — [View Image](./Snap%20Point%20Illustrations/Step%205%20-%20Snap%20Point%20Families.png)

## Export family positions (world X/Z)

Each snap **family** spreads by `familyK` (`-2 … 0 … +2` for `num = 5`): **farLeft**, **nearLeft**, **center** (anchor), **nearRight**, **farRight**.

**In-game** (uses live STAGE_BOARD when present):

```lua
lua DEBUG.exportControlBoardSnapFamilies()
lua DEBUG.exportControlBoardSnapFamilies(nil, { useInterpolatedRings = true })
```

**Offline** (DEFAULT_STAGE_WORLD X/Z projection; update `DEFAULT_CONFIG` in script when defaults change):

```bash
node .dev/scripts/export_control_board_snap_families.mjs --csv --out .dev/plans/control-board-snap-families.csv
node .dev/scripts/export_control_board_snap_families.mjs --interpolated --csv --out .dev/plans/control-board-snap-families-interpolated.csv
node .dev/scripts/export_control_board_snap_families.mjs --out .dev/plans/control-board-snap-families.lua
```

CSV columns: **area** (family role: `farLeft`, `nearLeft`, `center`, `nearRight`, `farRight`), **slot** (1-based index within area), **x**, **z** (STAGE world).

Output shape (Lua):

```lua
return {
  farLeft = {
    [1] = { x = ..., z = ... },
    ...
  },
  center = { ... },
}
```

## IDE iteration (Save & Play first)

Preview count only:

```lua
lua DEBUG.previewControlBoardSnapCount()
```

Regenerate snaps with a **full** config table (validation requires all top-level fields and `#snapGroups == rings`). Pass fields **directly** or wrapped in `{ config = { … } }`:

```lua
lua DEBUG.installNpcControlBoardSnaps({
  origin = { u = 0.5, v = 0.2 },
  snapYawOffsetDeg = 0,
  rings = 4,
  innerRingMaxU = 0.6,
  innerRingMaxV = 0.3,
  outerRingMaxU = 0.9,
  outerRingMaxV = 0.9,
  snapGroups = {
    { num = 1, angleDelta = 0, rays = 4,  groundLevel = -15 },
    { num = 3, angleDelta = 3, rays = 12, groundLevel = -15 },
    { num = 5, angleDelta = 4, rays = 16, groundLevel = -40 },
    { num = 1, angleDelta = 0, rays = 20, groundLevel = -40 },
  },
})
```

**Note:** `groundLevel` on a ring is **absolute world Y** for figurines on Apply — CONTROL_BOARD snap XZ/Y on the tile are unchanged (`MINIMAP_SURFACE_LOCAL_Y`). **`Sync.npcs` / `Sync.full`** calls `reconcileControlBoardFromState` → `installPolarSnaps` with **`lib/npc_gameboard_data` defaults**, which overwrites a debug install unless you edit `D.CONTROL_BOARD_SNAP` or re-run `DEBUG.installNpcControlBoardSnaps` after sync.

Install **and remap existing tokens/placements** to the new layout (same ring + closest spread offset, removed rings → palette):

```lua
lua DEBUG.installAndRemapNpcControlBoardSnaps({
  origin = { u = 0.5, v = 0.2 },
  snapYawOffsetDeg = 0,
  rings = 4,
  snapGroups = {
    { num = 1, angleDelta = 0, rays = 4,  maxU = 0.6, maxV = 0.3, groundLevel = -15 },
    { num = 3, angleDelta = 3, rays = 12, maxU = 0.7, maxV = 0.4, groundLevel = -15 },
    { num = 5, angleDelta = 4, rays = 16, maxU = 0.8, maxV = 0.6, groundLevel = -40 },
    { num = 1, angleDelta = 0, rays = 20, maxU = 0.9, maxV = 0.9, groundLevel = -40 },
  },
  -- oldConfig = { ... }, -- optional: defaults to lib/npc_gameboard_data CONTROL_BOARD_SNAP
})
```

Or call the gameboard API directly:

```lua
lua require("core.npc_gameboard").installPolarSnaps(nil, {
  force = true,
  config = {
    origin = { u = 0.5, v = 0.2 },
    snapYawOffsetDeg = 0,
    rings = 4,
    innerRingMaxU = 0.6,
    innerRingMaxV = 0.3,
    outerRingMaxU = 0.9,
    outerRingMaxV = 0.9,
    snapGroups = {
      { num = 1, angleDelta = 0, rays = 4,  groundLevel = -15 },
      { num = 3, angleDelta = 3, rays = 12, groundLevel = -15 },
      { num = 5, angleDelta = 4, rays = 16, groundLevel = -40 },
      { num = 1, angleDelta = 0, rays = 20, groundLevel = -40 },
    },
  },
})
```

Inspect ring resolution for a token u/v:

```lua
lua local G = require("core.npc_gameboard"); print(G.resolveSnapRingIndexForUv(0.72, 0.55)); print(G.groundLevelForSnapUv(0.72, 0.55))
```

Pass a **full** config when overriding — partial tables fail validation.

## Additional Guidelines

* All snap points are rotational snaps oriented to face the `origin`.
* Off-board snaps are acceptable.
* Rings are ellipses in board u/v (circles in warped u/v space become ellipses in local X/Z when the tile is non-square).
