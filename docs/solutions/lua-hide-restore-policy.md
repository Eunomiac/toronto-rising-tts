# Hide / restore objects (Toronto Rising TTS)

## Severity

**Mandatory contract for every off-table park at `y = C.HIDDEN_OBJECT_WORLD_Y` (-200).** Do not hand-roll `setPosition({ y = -200 })`, inline `setInvisibleTo({...})`, or parallel lock/interactable toggles for “hide this object from play.”

Always-on rule: [`.cursor/rules/toronto-rising-hide-restore.mdc`](../../.cursor/rules/toronto-rising-hide-restore.mdc).

## Goal

One pair of functions owns the full hide protocol and the matching restore path:

| Concern | Hide (`O.hideObject`) | Restore (`O.restoreObject`) |
| --- | --- | --- |
| World Y | Park at `C.HIDDEN_OBJECT_WORLD_Y` (default: same X/Z) | Caller `opts.position` → snapshot → stay put |
| Lock | `setLock(true)` | `opts.locked` → snapshot → catalog default |
| Interactable | `false` | `opts.interactable` → `C.LockedObjects` → snapshot → `true` |
| Visibility (parked) | All viewer colors (PC seats + White/Grey/Black) | — |
| Visibility (active) | — | Always `C.HiddenObjects[guid]` when catalogued; else snapshot / `{}` |
| Tag | Add `HiddenObject` | Remove `HiddenObject` |
| State snapshot | Write `gameState.hiddenObjects[guid]` once (fallback restore) | Clear snapshot after restore |

**Source of truth:** `core/objects.ttslua` (`O.hideObject`, `O.restoreObject`, `O.isHiddenObject`, `O.activeVisibilityForGuid`, `O.applyActiveVisibility`, `O.noteHiddenObjectWorldXZ`, `O.transferHideSnapshot`).

**Constant:** `C.HIDDEN_OBJECT_WORLD_Y` in `lib/constants.ttslua`.

## When to use (mandatory)

Use `O.hideObject` / `O.restoreObject` when code would otherwise:

- Move an object to `y = -200` (or any off-table stash Y used as a hide)
- Lock + disable + hide from players as a unit (bags, drawers, markers, absent piles, scatter hide-list, etc.)
- Apply `ObjectPositions` / CSHEET `isHidden == true` poses
- Stash gameboard control tokens or minimap markers off the board surface

## API (Global / object scripts)

### Global chunk

```lua
local O = require("core.objects")

O.hideObject(obj, {
  parkPosition = { x, y, z },      -- optional; default: live X/Z + HIDDEN_Y
  parkRotation = { x, y, z },      -- optional
  snapshotPosition = { x, y, z },  -- optional; when live Y is already parked
})

O.restoreObject(obj, {
  position = { x, y, z },          -- preferred restore authority when known
  rotation = { x, y, z },
  locked = true|false,
  interactable = true|false,
})
```

### Object-hosted scripts (bundle-safe)

**Never** `require("core.objects")` from object VMs. Route through Global:

```lua
Global.call("GlobalHideObject", { guid = obj.getGUID(), parkPosition = ... })
Global.call("GlobalRestoreObject", { guid = obj.getGUID(), position = ... })
```

Calibrated examples: `lib/csheet_pose.ttslua`, `ui/ui_csheet_core.ttslua`.

## Restore merge order

When `O.restoreObject` runs, each field resolves in this order (first win):

1. **Caller `opts`** (`position`, `rotation`, `locked`, `interactable`)
2. **Catalogs** — `C.LockedObjects` forces `interactable = false` when no explicit opts; **`C.HiddenObjects[guid]` always wins for active visibility** when the GUID is catalogued
3. **`gameState.hiddenObjects[guid].invisibleTo`** snapshot (fallback only when GUID is **not** in `C.HiddenObjects`)
4. **Defaults** — `{}` (visible to all); interactable `true` unless locked catalog says otherwise

**Position** snapshot is omitted when the object is already parked at `C.HIDDEN_OBJECT_WORLD_Y` (never store −200 as restore Y). **Visibility** is always snapshotted on first hide (active `C.HiddenObjects` entry or `{}`) so restore has a fallback when the GUID is not catalogued.

Snapshot position is **not** the primary restore authority when a catalog pose or computed slot is known — pass `opts.position` explicitly.

## Visibility rules (no inline color lists)

| Mode | Rule |
| --- | --- |
| **Parked** | All viewer colors (every PC seat + White/Grey/Black) inside `applyHideProtocol` — do not pass custom `invisibleTo` to hide |
| **Active** | Always `C.HiddenObjects[guid]` when catalogued (`O.restoreObject`, `O.applyActiveVisibility`); else snapshot `invisibleTo` → `{}`. Do not hard-code player color arrays for catalogued GUIDs |

`opts.invisibleTo` is **not** an authority override when the GUID is in `C.HiddenObjects`. Add or adjust `C.HiddenObjects[guid]` when a GUID needs persistent per-seat visibility while active.

## Helper utilities

| Function | Use |
| --- | --- |
| `O.isHiddenObject(obj)` | Guard before re-hide; detect tagged hides |
| `O.activeVisibilityForGuid(guid)` | Read active `setInvisibleTo` list from `C.HiddenObjects` |
| `O.applyActiveVisibility(obj)` | Apply catalog active visibility on an on-table (not parked) object |
| `O.noteHiddenObjectWorldXZ(obj)` | After layout moves X/Z on a still-hidden satellite — keeps snapshot position in sync |
| `O.transferHideSnapshot(fromGuid, toGuid)` | Multi-state figurines (companion toggle state swap) |

## Idempotency

- `O.hideObject` **always** re-applies lock, non-interactable, parked visibility, and `HiddenObject` tag — even when the object is already at `y = -200` or already tagged.
- Repeat calls merge into the existing `gameState.hiddenObjects` row: **position** and **invisibleTo** are captured once; **locked** / **interactable** refresh from live pre-hide state each call.
- When live Y is already parked, **omit** a position move when X/Z matches the target; visibility and lock still apply.
- Safe for preload reconcilers, dice pool repark, and Spotlight re-park — second call refreshes invisibility instead of skipping.

## Documented exceptions (do **not** use hide/restore)

| Case | Why | Use instead |
| --- | --- | --- |
| **Startup `C.HiddenObjects` catalog** | Visibility-only registry; objects stay at authored Y while **present** | `O.ApplyHiddenObjectsFromConstants` |
| **Secret ST roll dice** | Temporary invisibility mid-roll; not off-table park | `GlobalApplySecretRollDiceInvisibility` / `GlobalRestoreSecretRollDiceVisibility` |
| **Spotlight seat figurines (visibility only)** | Stay at seat Y; active visibility from `C.HiddenObjects` only — not off-table park | `O.applyActiveVisibility` / `O.restoreObject` via `applySeatFigurineSpotlightVisibility` in `core/spotlight.ttslua` |
| **Scatter floor / plinth** | Stay at playfield Y; PC+spectator invisibility only while Scatter is active | `ScatterMode` `applyScatterPlayfieldVisibility` (`setInvisibleTo` via `C.HideFromPcSeatsAndSpectators`) |
| **BOTTOM_FOG emitter** | Authored at y ≈ −350 (below park threshold); Scatter plays AssetBundle Looping Effect 2/1 | `Scenes.applyFogEmitterLooping` via ScatterMode; `O.hideObject` refuses this GUID |

**Preload pool (in scope):** NPC figurines + paired lights at `preload` and dice under bags use `O.hideObject` / `O.restoreObject` via `applyNpcPairPhysicalPresentation` and `core/dice_preload_pool.ttslua` (`parkDie` / `claim`).

**Character sheet pages:** World Y selects on/off; **`GlobalHideObject` / `GlobalRestoreObject` only** for lock, invisibility, tag, and interactable (`ui/ui_csheet_core.ttslua` → `applyCsheetHideOrRestore`). XmlUI nav/root `active` is separate (`applyCsheetXmlUiActive`). Pose apply (`lib/csheet_pose.ttslua`) moves geometry only.

**Tarot (object script):** `lib/tarot_toggle.ttslua` → `lib/object_positions_object.ttslua` — `pose.isHidden` routes through **`GlobalHideObject` / `GlobalRestoreObject`**. Reveal (`isHidden == false`) must pass the **ObjectPositions-resolved** position/rotation (Pink deck: `TAROT_DECK_ANCHOR_PINK` + height), not the hide snapshot alone.

**NPC pooled spotlights (`npc_light`):** `applyPooledSpotlightHideOrRestore` in `core/npcs.ttslua` — seated/preload park and stage reveal use **`O.hideObject` / `O.restoreObject`** (full invisibility incl. Storyteller). Gameboard spotlight preview: `core/npc_gameboard_spotlight.ttslua`.

**Spotlight phase (carousel):** `core/spotlight.ttslua` — seat `SEAT_FIGURE_*` stay at table seats with **`C.HiddenObjects` active visibility** (`O.applyActiveVisibility` / `O.restoreObject`); they are **not** parked via `O.hideObject`. Dice bags / companions / compulsion decks and off-carousel workshop stand-ins use `O.hideObject` / `O.restoreObject`.

**PC seat absent (`C.HiddenObjects` catalog):** `O.applyPcSeatHiddenObjectPresence` / `O.reconcilePcSeatHiddenObjectsFromState` — when a PC seat is narratively absent or disconnected, every matching catalog GUID and `<Color>Object` tag entry uses **`O.hideObject`** (not on-table `setInvisibleTo`). When present again, **`O.restoreObject`** when tagged `HiddenObject`, else active catalog visibility via `O.activeVisibilityForGuid`.

When adding a **new** exception, document it here and in the cursor rule — do not silently reintroduce inline `-200` hides.

## Agent pre-flight checklist

- [ ] Grep touched files for `y = -200`, `setPosition.*-200`, and hide-pattern `setInvisibleTo({` — migrate to `O.hideObject` / `O.restoreObject` or document an exception above.
- [ ] Object scripts use `GlobalHideObject` / `GlobalRestoreObject`, not `require("core.objects")`.
- [ ] Restore paths pass explicit `opts.position` when authority is a catalog pose, table home, or board UV — not snapshot alone.
- [ ] No new inline player-color lists on hide/restore paths; use `C.HiddenObjects`.
- [ ] After layout moves hidden satellites, call `O.noteHiddenObjectWorldXZ` when X/Z changes but object stays hidden.
- [ ] Register new `Global.call` hide/restore entry points in [Event Listener Policy](../../.dev/Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md).

## Related docs

- [Reconciler Contract](../../.dev/Sychronizing%20Game%20Functionality/Reconciler%20Contract.md) — mutation vs world apply
- [Object-script bundling](../../.cursor/rules/toronto-rising-object-script-bundling.mdc) — Global.call from object VMs
- [Revision of Player Positioning Proposal](../../.dev/Revision%20of%20Player%20Positioning/Revision%20of%20Player%20Positioning%20Proposal.md) — default Y vs deactivation override
- [PENDING AUTHOR VERIFICATION — Unified hide/restore](../../.dev/PENDING%20AUTHOR%20VERIFICATION.md) — Save & Play smoke steps
