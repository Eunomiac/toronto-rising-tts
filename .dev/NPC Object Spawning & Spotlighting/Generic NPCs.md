# Generic NPCs (Lua runtime)

## Agent Routing

Read this when:
- changing generic NPC import, spawn, destroy, or scene-library membership
- wiring the Storyteller Dashboard `genericAdd` command
- implementing remaining v1 gaps or later seating / Play-as-NPC / Memoriam `kind: "generic"`

Source of truth:
- `core/generic_npcs.ttslua` — parse, register, destroy, membership
- `core/npc_spawn.ttslua` — figurine + light spawner shared with named NPCs (art from `lib/npc_art_urls.ttslua`; see [NPC Art Pipeline](NPC%20Art%20Pipeline.md))
- `lib/npcs_data.ttslua` — `D.initGenericNPCs()`, `D.resolveGenericNpcEntry`, `D.genericNpcs`
- `lib/npc_art_urls.ttslua` — generated; each generic row carries its sheet `genericLabel` (`npm run npc-art:generate`, from `.dev/storyteller-dashboard/data/generic-npcs.json`)
- `dashboard/scenes.ttslua` — `genericAdd` op → `GenericNpcs.importNamed(keys, labels, tiers)`; `genericRename` op → `GenericNpcs.rename(key, name)`; `genericTier` op → `GenericNpcs.setTier(key, tier)`
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

Named and generic NPCs share one spawn path (TOR-707): both spawn on demand through `core/npc_spawn.ttslua` and are destroyed when no longer targeted. Both read their art from `lib/npc_art_urls.ttslua`; the differences are the `generic_npc` tag and the scene membership table below.

After import, v1 supports **stage placement, lights, and spotlight tokens** like other staged NPCs (they register into `NPCS.characters` with `isGeneric = true` and use `npc_figurine` / `npc_light`). **Seating**, **Play-as-NPC**, and Memoriam `kind: "generic"` are not a supported contract.

---

## Catalog

**Key:** `stem` + `_` + two-digit index, e.g. `academicsProfessor_02` → `D.genericNpcs.academicsProfessor_02`. Resolver: `D.resolveGenericNpcEntry(fullKey)` (unknown key → `nil`).

**Entry after `D.initGenericNPCs()`:**

```lua
{
  key = "academicsProfessor_02",
  label = "Professor", -- sheet GENERICNPCCSV via lib.npc_art_urls genericLabel
}
```

Figurine and token art come from `lib/npc_art_urls.ttslua` under the same key ([NPC Art Pipeline](NPC%20Art%20Pipeline.md)). Sheet **tags** are Dashboard search only; Lua ignores them.

`D.initGenericNPCs()` registers every `lib/npc_art_urls.ttslua` row that has a `genericLabel`, so only sheet rows with art exist in TTS (`npm run npc-art:generate` lists sheet rows without a figurine). No generic rows at all **errors** at init.

---

## Import

The only entry is the Storyteller Dashboard: a roster click queues (and Send delivers) `{ op = "genericAdd", keys = { ... }, labels = { [key] = name }, tiers = { [key] = tier }? }` through `GlobalDashboardScenesApply`, which calls `GenericNpcs.importNamed(keys, labels, tiers)`. `tier` (`weak` / `average` / `gifted` / `deadly`) names which of the type's dashboard stat blocks (`npc-stats.json` `generic:<label>`) the figurine rolls from; the dashboard picks it (tier picker when the type has several blocks). An unknown tier fails the whole import. The Dashboard bridge has **no clicker**, so it is treated as Storyteller-initiated (see `DashboardTtsBridge`).

Behavior (`GenericNpcs.importNamed`):

1. Resolve keys via `GenericNpcs.parseImportKeys` / `D.resolveGenericNpcEntry`.
2. Any unknown key or key already in this scene’s `genericMembership` → return an error string (shown on the Dashboard); nothing spawns.
3. For each key, use the typed name (blank → catalog `label`), register the roster row (`NPCS.registerGenericCharacter`), and write membership. Nothing spawns on import — the figurine and light spawn when the NPC is placed on the stage (see below).

**Rename** (`GenericNpcs.rename(key, name)`, Dashboard op `genericRename`): the key must be in this scene's membership and the trimmed name non-blank, else an error string. Writes membership `displayName`, the roster row's `fullName`, the figurine's name, and the spotlight token's name (`StageTokens.refreshName`), then marks the seats push dirty.

**Tier** (`GenericNpcs.setTier(key, tier)`, Dashboard op `genericTier`, from the in-scene generic's token settings window): writes membership `tier` (no `tier` clears it) and marks the seats push dirty. The push carries it as `generics[].tier`.

---

## Spawn / identity

Generics spawn through the same path as named NPCs (`NPCS.ensureLiveNpcInstance` → `core/npc_spawn.ttslua`):

| Piece | How |
| --- | --- |
| Figurine | `spawnObjectData` `Figurine_Custom` with the `lib/npc_art_urls.ttslua` images in the spawn data (no `reload`). Tags `npc_figurine` + `generic_npc`. GM Notes `npcInstance:<key>`. Locked. Spawned hidden under the table, then moved onto the stage once its image has loaded (`NPCS.prewarmNpcs` for mid-scene Dashboard placements). |
| Light | `npc_light` spawned with the stage placement (`ensureNpcLight`). |
| Spotlight token | Not spawned on import. Once the NPC has a stage placement, `StageTokens.reconcileFromState` spawns its token on the Stage Control board like any stage NPC. |

`NPCS.registerGenericCharacter` adds a runtime roster row (`isGeneric = true`, `figurine.scale = 53`, `fullName` = display label).

An imported generic with no stage placement is a roster/membership entry only — nothing is in the world until a stage edit places it.

---

## Persistence (`genericMembership`)

Live table: `sessionScene.npcWorld.genericMembership[key] = { key, displayName, tier? }` (label override, stat tier). Placement lives in the usual `npcWorld.placements` after a Dashboard stage edit, same as named staged NPCs.

| Event | Behavior |
| --- | --- |
| Import | Register roster rows; write membership (no spawn) |
| Save & Play / `NPCS.restoreAfterStateLoad` | `GenericNpcs.registerFromMembership()` re-registers roster rows; the reconciler respawns any placed generic whose figurine is missing |
| Scene Apply (switch) | Destroy **live** generic objects but **keep** the outgoing membership table, write the incoming scene bundle, then `registerFromMembership` for the new row; the reconciler spawns placed generics |
| Leave scene / no-scene / End Scene | `destroyAllLiveAndClearMembership` — destroy figurine + light + clear **live** membership (library rows keep their nested `sessionScene` copy for later respawn) |
| Dashboard stage **Clear** (`StageApply.applyStageChanges` with `clear = true`) | Same as leave: destroy all live generics and clear membership |
| Mid-scene remove **one** generic | **Not wired.** `GenericNpcs.destroyLiveKey` exists; no call site yet |

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
