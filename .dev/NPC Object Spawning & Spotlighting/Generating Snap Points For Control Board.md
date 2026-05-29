# Generating Snap Points for Control Board

Configurable elliptical polar snap grid on the CONTROL_BOARD minimap. Implementation: `lib/npc_gameboard_data.ttslua` (`D.CONTROL_BOARD_SNAP`), `Gameboard.buildControlBoardSnapPoints` / `Gameboard.installPolarSnaps` in `core/npc_gameboard.ttslua`.

## General Considerations

Snap points are generated in polar coordinates on the control board. Several settings control ring shape, ray count, and per-ring snap families.

## Coordinate frame

- Board **u/v** are normalized **0–1** on the tile: **u = local X**, **v = local Z**, origin at the bottom-left corner of the map (Step 1).
- Placement uses `(u,v)` → `boardLocalFromUv` → `boardLocalToWorld` (same frame as tokens and minimap markers).
- Generated `(u,v)` are **not** clamped to `[0,1]` — off-board snaps are allowed.

## Configuration Values

| Setting | Description |
| :--: | :-- |
| `origin` | Center of the polar system in board u/v |
| `rings` | Number of concentric elliptical rings |
| `innerRingMaxU` & `innerRingMaxV` | **Absolute** board u/v reached by the **innermost** ring (distance along axes from the **0,0** corner — not a delta from `origin`) |
| `outerRingMaxU` & `outerRingMaxV` | **Absolute** board u/v for the **outermost** ring; intermediate rings linearly interpolate inner → outer |
| `snapGroups` | One entry per ring (**index 1 = innermost**): `{ num, angleDelta, rays, groundLevel? }` — family size, angular spacing, ray count, and optional **board-local Y** for that ring |
| `snapYawOffsetDeg` | Added to toward-origin yaw on each snap (default **0** on control board; palette uses **180**) |

### `groundLevel` (per ring, optional)

- **Board-local Y** on the map tile (same units as `D.MINIMAP_SURFACE_LOCAL_Y`, default **0.18**).
- Used for **generated snap point positions** on CONTROL_BOARD.
- On **Apply**, persisted in `sessionScene.npcWorld.placements[*].groundLevel` and applied to **STAGE_BOARD figurines** via `Gameboard.worldFromUv(u, v, { groundLevel = … })`.
- When omitted on a ring, falls back to `MINIMAP_SURFACE_LOCAL_Y`.
- Ring is inferred from `(u, v)` by closest matching ellipse (`Gameboard.resolveSnapRingIndexForUv` / `Gameboard.groundLevelForSnapUv`).

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

**Snap count:** `sum over rings r of snapGroups[r].rays * snapGroups[r].num` → default **4×1 + 12×3 + 16×5 + 20×1 = 136**.

### Ring interpolation

For ring index `r` in `1 … rings`:

```lua
t = (rings == 1) and 0 or ((r - 1) / (rings - 1))
maxU[r] = innerRingMaxU + t * (outerRingMaxU - innerRingMaxU)
maxV[r] = innerRingMaxV + t * (outerRingMaxV - innerRingMaxV)
```

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
  -- u,v, board-local position (Y = snapGroups[ringIndex].groundLevel or MINIMAP_SURFACE_LOCAL_Y), yaw toward origin
end
```

Example: ring 3, `num=5`, `angleDelta=4`, `anchorDeg=90` → **82°, 86°, 90°, 94°, 98°**.

- **Duplicates** at overlapping angles are allowed (no dedupe).
- Every snap uses `rotation_snap = true`, `tags = { "npc_control_token" }` (tagged snaps match control tokens), and board-local yaw **toward** `origin` plus `snapYawOffsetDeg`.

## Visual illustrations

Step 3 dotted circles use the **same** ring geometry as Step 2.

* **Step One: Place the Origin** — [View Image](./Snap%20Point%20Illustrations/Step%201%20-%20Origin.png)
* **Step Two: Define the Rings** — [View Image](./Snap%20Point%20Illustrations/Step%202%20-%20Rings.png)
* **Step Three: Define the Rays** — [View Image](./Snap%20Point%20Illustrations/Step%203%20-%20Rays.png)
* **Step Four: Generate Anchor Snaps** — [View Image](./Snap%20Point%20Illustrations/Step%204%20-%20Anchor%20Snaps.png)
* **Step Five: Generate Snap Point Families** — [View Image](./Snap%20Point%20Illustrations/Step%205%20-%20Snap%20Point%20Families.png)

## IDE iteration (Save & Play first)

Preview count only:

```lua
lua DEBUG.previewControlBoardSnapCount()
```

Regenerate snaps with a **full** config table (validation requires all top-level fields and `#snapGroups == rings`):

```lua
lua DEBUG.installNpcControlBoardSnaps({
  config = {
    origin = { u = 0.5, v = 0.2 },
    snapYawOffsetDeg = 0,
    rings = 4,
    innerRingMaxU = 0.6,
    innerRingMaxV = 0.3,
    outerRingMaxU = 0.9,
    outerRingMaxV = 0.9,
    snapGroups = {
      { num = 1, angleDelta = 0, rays = 4,  groundLevel = 0.18 },
      { num = 3, angleDelta = 3, rays = 12, groundLevel = 0.22 },
      { num = 5, angleDelta = 4, rays = 16, groundLevel = 0.26 },
      { num = 1, angleDelta = 0, rays = 20, groundLevel = 0.30 },
    },
  },
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
      { num = 1, angleDelta = 0, rays = 4,  groundLevel = 0.18 },
      { num = 3, angleDelta = 3, rays = 12, groundLevel = 0.22 },
      { num = 5, angleDelta = 4, rays = 16, groundLevel = 0.26 },
      { num = 1, angleDelta = 0, rays = 20, groundLevel = 0.30 },
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
