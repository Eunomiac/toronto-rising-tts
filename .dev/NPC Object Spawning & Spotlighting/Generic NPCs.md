# Generic NPCs (Lua runtime)

## Agent Routing

Read this when:
- changing generic NPC import, spawn, destroy, or scene-library membership
- wiring the Storyteller Dashboard `genericAdd` command
- implementing remaining v1 gaps or later seating / Play-as-NPC / Memoriam `kind: "generic"`

Source of truth:
- `core/generic_npcs.ttslua` — parse, spawn, destroy, membership
- `lib/npcs_data.ttslua` — `D.initGenericNPCs()`, `D.resolveGenericNpcEntry`, `D.genericNpcs`
- `lib/generic_npcs_catalog.ttslua` — generated sheet `key` → `label` (`npm run generic-npcs:import`)
- `dashboard/scenes.ttslua` — `genericAdd` op → `GenericNpcs.importNamed(keys, labels)`
- `NPCS.registerGenericCharacter` / `unregisterGenericCharacter` in `core/npcs.ttslua`
- `sessionScene.npcWorld.genericMembership` in `core/state.ttslua`
- Spotlight tokens: `core/stage_tokens.ttslua` (same as named stage NPCs)
- Dashboard catalogue / Spawn UI: [`.dev/Storyteller Dashboard Docs/Generic NPCs.md`](../Storyteller%20Dashboard%20Docs/Generic%20NPCs.md)

Verification:
- `npm run generic-npcs:import:test`
- Dashboard Spawn → names → Send; move them onto the stage; leave scene; re-apply scene; Save & Play
- Named NPC overview: [NPC Object Overview](NPC%20Object%20Overview.md)

Status: current v1 (TOR-560; Dashboard-only import since TOR-687). Remaining / out-of-scope items are listed at the bottom — do not treat those as shipped.

---

## Intent

Generic NPCs are category/class characters (police officer, dog). They have **no** workshop-baked figurine in the save. Each catalog key (`stem_NN`, e.g. `dogGuard_03`) is a **unique** identity: at most one live instance of that key per scene. Several stems may coexist; the same exact key may not be imported twice into the same scene.

This is an intentional **runtime spawn exception** to the named-NPC preload-pool rule. Do not redesign named preload for generics.

After import, v1 supports **stage placement, lights, and spotlight tokens** like other staged NPCs (they register into `NPCS.characters` with `isGeneric = true` and use `npc_figurine` / `npc_light`). **Seating**, **Play-as-NPC**, and Memoriam `kind: "generic"` are not a supported contract.

---

## Catalog

**Key:** `stem` + `_` + two-digit index → `D.genericNpcs[stem][index]`  
Example: `academicsProfessor_02` → `D.genericNpcs.academicsProfessor[2]`. Resolver: `D.resolveGenericNpcEntry(fullKey)` (invalid shape → skip).

**Entry after `D.initGenericNPCs()`:**

```lua
{
  key = "academicsProfessor_02",
  label = "Professor", -- sheet GENERICNPCCSV via lib.generic_npcs_catalog
  figurine = { front = <Cloud URL>, back = <shared Back_00 URL> },
  token = { front = <Cloud URL>, back = <Cloud URL> }, -- spotlight token art (core.stage_tokens)
}
```

Sheet **tags** are Dashboard search only; Lua ignores them.

Cloud figurine/token URLs plus a sheet label are required. A Cloud variant with no sheet label **errors** at init (`run npm run generic-npcs:import`). Missing `Cloud.GenericNpcFigurines` skips init with a Host warning (no-op).

---

## Import

The only entry is the Storyteller Dashboard: the Spawn picker sends `{ op = "genericAdd", keys = { ... }, labels = { [key] = name } }` through `GlobalDashboardScenesApply`, which calls `GenericNpcs.importNamed(keys, labels)`. The Dashboard bridge has **no clicker**, so it is treated as Storyteller-initiated (see `DashboardTtsBridge`).

Behavior (`GenericNpcs.importNamed`):

1. Resolve keys via `GenericNpcs.parseImportKeys` / `D.resolveGenericNpcEntry`.
2. Any unknown key or key already in this scene’s `genericMembership` → return an error string (shown on the Dashboard); nothing spawns.
3. For each key, use the typed name (blank → catalog `label`), spawn, and write membership.

---

## Spawn / identity

v1 does **not** clone hidden save templates. Current spawn path:

| Piece | How |
| --- | --- |
| Figurine | `spawnObject("Figurine_Custom")` + Cloud images + `reload`. Tags `npc_figurine` + `generic_npc`. GM Notes `npcInstance:<key>`. Locked. |
| Light | `NPCS.ensureNpcInPreloadZone(..., { forceNpcLightMode = "OFF" })` adopts the figurine into the **next free** preload bay (generics do not use named-NPC sorted stable indices) and repairs/spawns the paired `npc_light`. |
| Spotlight token | Not spawned on import. Once the NPC has a stage placement, `StageTokens.reconcileFromState` spawns its token on the Stage Control board like any stage NPC. |

`NPCS.registerGenericCharacter` adds a runtime roster row (`isGeneric = true`, `figurine.scale = 53`, `fullName` = display label). Preload pool audit **skips** these keys.

Default on import (and on respawn until a stage edit says otherwise): figurine in preload, light **OFF**.

---

## Persistence (`genericMembership`)

Live table: `sessionScene.npcWorld.genericMembership[key] = { key, displayName }` (label override). Placement lives in the usual `npcWorld.placements` after a Dashboard stage edit, same as named staged NPCs.

| Event | Behavior |
| --- | --- |
| Import | Spawn objects; write membership for spawned keys |
| Save & Play / `NPCS.restoreAfterStateLoad` | `GenericNpcs.ensureLiveFromMembership()` recreates missing instances |
| Scene Apply (switch) | Destroy **live** generic objects but **keep** the outgoing membership table, write the incoming scene bundle, then `ensureLiveFromMembership` for the new row |
| Leave scene / no-scene / End Scene | `destroyAllLiveAndClearMembership` — destroy figurine + light + clear **live** membership (library rows keep their nested `sessionScene` copy for later respawn) |
| Dashboard stage **Clear** (`StageApply.applyStageChanges` with `clear = true`) | Same as leave: destroy all live generics and clear membership |
| Mid-scene remove **one** generic | **Not wired.** `GenericNpcs.destroyLiveKey` exists; no call site yet |

Named NPCs stay on the workshop preload path.

---

## Remaining / out of scope

Keep these on the record. Do not imply they shipped with TOR-560.

**Specified for v1 but not implemented:**

- Destroy a **single** generic (figurine + light) and drop its membership row when the Storyteller removes it mid-scene (`destroyLiveKey` is ready; no call site).

**Explicitly out of scope until a later issue:**

- Seating generics at the table (runtime does not special-case-block `assignNpcToSeat`; do not treat seating as a supported feature)
- Play-as-NPC assignment for generics
- Memoriam `kind: "generic"` wiring
- Per-NPC lighting / scale overrides (children, animals)
- Replacing named-NPC preload with spawn-on-demand
