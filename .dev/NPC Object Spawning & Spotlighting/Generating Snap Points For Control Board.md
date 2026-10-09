# Generating Snap Points for Control Board

## Agent Routing

Read this when:
- changing stage snap-slot geometry (`D.CONTROL_BOARD_SNAP`), ring families, figurine yaw, or stage placement ground levels
- tuning anchor-family spread or the Dashboard stage slot catalog

Source of truth:
- `lib/npc_gameboard_data.ttslua` (`D.CONTROL_BOARD_SNAP`)
- `core/npc_gameboard_snaps.ttslua` (`Snaps.buildControlBoardSnapCatalog` and lookups, re-exported by `core/npc_gameboard.ttslua`)
- Dashboard slot catalog: `npm run dashboard:scene-catalogs` parses the same table

Verification:
- `npm run build`
- `npm run dashboard:scene-catalogs` (catalog diff should match the intended geometry change)

Configurable elliptical polar slot grid in stage u/v. **No physical snap points are installed** on any board: the catalog is geometry only. The Storyteller Dashboard snaps stage drags to these slots, and Lua uses the same catalog for ground level, figurine yaw, and lerp family ordering on stage edits.

## General Considerations

Slots are generated in polar coordinates in board u/v. Several settings control ring shape, ray count, and per-ring slot families.

## Coordinate frame

- Board **u/v** are normalized **0–1**: **u = local X**, **v = local Z**, origin at the bottom-left corner of the map (Step 1).
- Placement uses `(u,v)` → `boardLocalFromUv` → `boardLocalToWorld` on STAGE_BOARD.
- Generated `(u,v)` outside the board are **skipped** — only slots with `0 ≤ u ≤ 1` and `0 ≤ v ≤ 1` are kept.

## Configuration Values

| Setting | Description |
| :--: | :-- |
| `origin` | **Master/default** center of the polar system in board u/v (also the fixed facing target for figurine yaw) |
| `innerRingMaxU` & `innerRingMaxV` | **Optional** when every `snapGroups[r]` sets `maxU`/`maxV`. Otherwise **absolute** board u/v for the **innermost** ring |
| `outerRingMaxU` & `outerRingMaxV` | **Optional** when every ring has `maxU`/`maxV`. Otherwise **absolute** board u/v for the **outermost** ring; rings without per-ring max interpolate inner → outer |
| `snapGroups` | One entry per ring (**index 1 = innermost**): `{ num, angleDelta, rays, maxU?, maxV?, origin?, snapYawOffsetDeg?, groundLevel?, radialStagger? }` — family size, angular spacing, ray count, optional **per-ring** ellipse max, optional **per-ring** position origin, optional **per-ring** yaw offset, optional **absolute world Y** for figurines, optional **STAGE world XZ** radial push per family step (see below) |
| `snapYawOffsetDeg` | Default yaw offset added to toward-master-origin yaw on each snap; rings may override via `snapGroups[ring].snapYawOffsetDeg` |

### `groundLevel` (per ring, optional)

- **Absolute world Y** for figurines placed on a stage edit (same convention as `D.areas[*].groundLevel` in `lib/npcs_data.ttslua`, e.g. `-50`, `-15`).
- **Does not** add STAGE_BOARD object Y — the board only maps u,v → world **X/Z**; `groundLevel` sets figurine **Y** directly when present.

- On a Dashboard stage edit, `StageApply.applyStageChanges` persists it in `sessionScene.npcWorld.placements[*].groundLevel`; reconcile passes it to `Gameboard.worldFromUv(u, v, { groundLevel = … })`.
- When omitted on a ring, figurine Y is STAGE_BOARD surface world Y at u,v (or `DEFAULT_STAGE_WORLD.groundY` if STAGE_BOARD is missing).
- Ring is inferred from `(u, v)` by closest matching ellipse (`Gameboard.groundLevelForSnapUv`).

### `radialStagger` (per ring, optional)

- **Unit:** **STAGE_BOARD / playfield world XZ inches**. Dashboard generation matches the Lua catalog when Transform **scale is the UV half-extent** (`u` 0–1 spans `2 × scaleX/Z`); using `scale/2` over-staggers Center/Mid neighbors. Anchor slots (`familyK == 0`) never use stagger.
- After placing a family member on its ring ellipse, non-anchor snaps (`familyK ≠ 0`) move **outward** along that snap’s STAGE world radial from `origin` by `abs(familyK) * radialStagger`, then `(u,v)` is recomputed from STAGE.
- **Anchor** (`familyK == 0`) stays on the ring ellipse unchanged.
- Example: `num = 5`, anchor 50 world inches from origin on STAGE, `radialStagger = 1` → **52, 51, 50, 51, 52** world inches along each member’s radial.
- On a ~400-unit-tall stage, `radialStagger = 1` is a subtle nudge; `5` is still modest. Tune on STAGE scale.
- **Angular spread** in each family is separate (`angleDelta`); the visible “V” is often mostly angle, with radial stagger as a fine adjustment.
- Omitted or `0` → no radial offset.
- After stagger, `(u,v)` outside `[0,1]` are **omitted** (not clamped to the board edge).

### Example Configuration (shipped default — no per-ring Y override)

```lua
D.CONTROL_BOARD_SNAP = {
  origin = { u = 0.5, v = 0.2 },
  snapYawOffsetDeg = 0,
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

**Snap count:** `sum over rings r of snapGroups[r].rays * snapGroups[r].num`, **minus** any candidate whose `(u,v)` falls outside `[0,1]`. Default config → **136** before filter (fewer after filtering when outer-ring rays dip below `v = 0`).

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
-- Even num: use k = -half .. half-1 so ±half are not both kept (same angle on a full circle).
kMin, kMax = (num % 2 == 0) and (-half, half - 1) or (-half, half)
for k = kMin, kMax do
  -- Master-origin ring: angleDeg = anchorDeg + k * angleDelta
  -- Satellite ring (ring origin ≠ master): anchor (k=0) on bearing ring→master, then spread by k
  angleDeg = towardMasterDeg + anchorDeg + k * angleDelta   -- towardMasterDeg = 0 when origins match
  -- u,v on ring ellipse; optional radialStagger pushes non-anchor snaps outward in STAGE world XZ inches
  -- figurine Y on a stage edit = optional absolute world groundLevel on ring
end
```

Example: ring 3, `num=5`, `angleDelta=4`, `anchorDeg=90` → **82°, 86°, 90°, 94°, 98°** (master-origin ring).

**Satellite rings** (per-ring `origin` ≠ master `origin`, e.g. Far Left / Far Right with `rays = 1`, `num = 6`): `towardMasterDeg` is the u/v bearing from the ring origin to the master origin; the anchor snap (`k = 0`) sits on that radial on the ellipse, facing inward — not a fixed board direction (e.g. always “rightmost”). For `num = 6` / `angleDelta = 60°`, familyK is `-3…+2` (six unique bearings); including both `±3` would stack two snaps at 180°.

- Candidates with coincident world XZ (legacy even-num full-circle) are skipped in the catalog and at anchor-spread fill (TOR-415).
- Candidates with `u` or `v` outside `[0, 1]` are omitted (not clamped).
- Every slot carries board-local yaw **toward the master/default `origin`** plus ring-level or default `snapYawOffsetDeg`.
- Per-ring `origin` sets the ellipse center for that ring; when it differs from the master origin, **family angles** rotate so the anchor faces the master (figurine yaw still faces the master origin).

## Visual illustrations

Step 3 dotted circles use the **same** ring geometry as Step 2.

* **Step One: Place the Origin** — [View Image](./Snap%20Point%20Illustrations/Step%201%20-%20Origin.png)
* **Step Two: Define the Rings** — [View Image](./Snap%20Point%20Illustrations/Step%202%20-%20Rings.png)
* **Step Three: Define the Rays** — [View Image](./Snap%20Point%20Illustrations/Step%203%20-%20Rays.png)
* **Step Four: Generate Anchor Snaps** — [View Image](./Snap%20Point%20Illustrations/Step%204%20-%20Anchor%20Snaps.png)
* **Step Five: Generate Snap Point Families** — [View Image](./Snap%20Point%20Illustrations/Step%205%20-%20Snap%20Point%20Families.png)

## Export family positions (world X/Z)

Each snap **family** spreads by `familyK` (`-2 … 0 … +2` for `num = 5`): **farLeft**, **nearLeft**, **center** (anchor), **nearRight**, **farRight**.

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

## Additional Guidelines

* Every slot carries a yaw facing the `origin`.
* Off-board candidates are dropped, not clamped.
* Rings are ellipses in board u/v (circles in warped u/v space become ellipses in local X/Z when the tile is non-square).
