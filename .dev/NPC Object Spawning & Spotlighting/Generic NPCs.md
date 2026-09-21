# Generic NPCs (Lua runtime)

## Agent Routing

Read this when:
- changing generic NPC import, spawn, destroy, scene-library membership, or CONTROL_BOARD paste
- wiring Dashboard Spawn-to-TTS or the label modal
- implementing remaining v1 gaps or later seating / Play-as-NPC / Memoriam `kind: "generic"`

Source of truth:
- `core/generic_npcs.ttslua` — parse, modal, spawn, destroy, membership
- `lib/npcs_data.ttslua` — `D.initGenericNPCs()`, `D.resolveGenericNpcEntry`, `D.genericNpcs`
- `lib/generic_npcs_catalog.ttslua` — generated sheet `key` → `label` (`npm run generic-npcs:import`)
- `GlobalImportGenericNpcs` / `GlobalImportGenericNpcsFromString` in `core/global_script.ttslua`
- `objects/npc_control_board.ttslua` + `ui/objects/npc_control_board.xml` — ST paste field
- `ui/storyteller/generic_npc_import_modal.xml` — label override modal
- `NPCS.registerGenericCharacter` / `unregisterGenericCharacter` in `core/npcs.ttslua`
- `sessionScene.npcWorld.genericMembership` in `core/state.ttslua`
- Dashboard catalogue / Spawn UI: [`.dev/Storyteller Dashboard Docs/Generic NPCs.md`](../Storyteller%20Dashboard%20Docs/Generic%20NPCs.md)

Verification:
- `npm run generic-npcs:import:test`
- CONTROL_BOARD paste or Dashboard Spawn → label modal → Confirm
- Apply / Clear / token flip on those tokens; leave scene; re-apply scene; Save & Play
- Named NPC overview: [NPC Object Overview](NPC%20Object%20Overview.md)

Status: current v1 (TOR-560). Remaining / out-of-scope items are listed at the bottom — do not treat those as shipped.

---

## Intent

Generic NPCs are category/class characters (police officer, dog). They have **no** workshop-baked figurine or token in the save. Each catalog key (`stem_NN`, e.g. `dogGuard_03`) is a **unique** identity: at most one live instance of that key per scene. Several stems may coexist; the same exact key may not be imported twice into the same scene.

This is an intentional **runtime spawn exception** to the named-NPC preload-pool rule. Do not redesign named preload for generics.

After import, v1 supports **token flips, stage placement, and lights** like other staged NPCs (they register into `NPCS.characters` with `isGeneric = true` and use `npc_control_token` / `npc_figurine` / `npc_light`). **Seating**, **Play-as-NPC**, and Memoriam `kind: "generic"` are not a supported contract.

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
  token = { front = <Cloud URL>, back = <Cloud URL> },
}
```

Sheet **tags** are Dashboard search only; Lua ignores them.

Cloud figurine/token URLs plus a sheet label are required. A Cloud variant with no sheet label **errors** at init (`run npm run generic-npcs:import`). Missing `Cloud.GenericNpcFigurines` skips init with a Host warning (no-op).

---

## Import

Single host entry, used by the board paste field and the Dashboard bridge:

```lua
GlobalImportGenericNpcs("academicsProfessor_02,dogGuard_03")
-- or
GlobalImportGenericNpcs({ keys = "academicsProfessor_02,dogGuard_03" })
```

`GlobalImportGenericNpcsFromString` is the same function. Execute-lua / Dashboard has **no clicker**, so this Global is **not** Steam-gated; treat it as Storyteller-initiated. The CONTROL_BOARD button and paste `onEndEdit` **are** Steam-gated (`GlobalIsStorytellerSteamPlayer`). Only one of Dashboard bridge vs TTS IDE extension can listen on port **39998** at a time (existing `DashboardTtsBridge` contract).

Behavior (`GenericNpcs.beginImport`):

1. Parse comma-delimited keys; resolve via `D.resolveGenericNpcEntry`.
2. Skip unknown keys (`AlertGM` lists them) and keys already in this scene’s `genericMembership` (`AlertGM` duplicate list). Repeat keys in the same paste are ignored.
3. Zero valid new keys → `AlertGM` and stop.
4. Open ST-only label modal (`generic_npc_import_modal`, visibility `Black|Host`): one row per valid key, input pre-filled from `entry.label`. At most **24** keys per batch; extras are ignored with an alert. Typed labels are stashed from InputField `onValueChanged` (`HUD_genericNpcImportLabelChanged`) because `UI.getValue` does not return live InputField text.
5. **Confirm** → spawn batch + membership write. **Cancel** → no objects, no membership write.

CONTROL_BOARD XmlUI: paste `InputField` `gb_generic_import_keys` above the existing buttons (`visibility="Black"`), Import button / End Edit → `GlobalImportGenericNpcs`.

---

## Spawn / identity

v1 does **not** clone hidden save templates. Current spawn path:

| Piece | How |
| --- | --- |
| Token | `spawnObjectData` Custom_Tile, then `setCustomObject` + `reload`. Face-down `{0,0,180}` = light **OFF**. Tags `npc_control_token` + `generic_npc`. GM Notes `npcToken:<key>`. Hidden from PC colors like other control tokens. Placed on CONTROL_BOARD **top-right** (UV away from the seat row / palette, not on snaps). |
| Figurine | `spawnObject("Figurine_Custom")` + Cloud images + `reload`. Tags `npc_figurine` + `generic_npc`. GM Notes `npcInstance:<key>`. Locked. |
| Light | `NPCS.ensureNpcInPreloadZone(..., { forceNpcLightMode = "OFF" })` adopts the figurine into the **next free** preload bay (generics do not use named-NPC sorted stable indices) and repairs/spawns the paired `npc_light`. |

`NPCS.registerGenericCharacter` adds a runtime roster row (`isGeneric = true`, `figurine.scale = 53`, `fullName` = display label). Preload pool audit **skips** these keys.

Default on import (and on respawn until Apply says otherwise): token face-down, figurine in preload, light **OFF**.

---

## Persistence (`genericMembership`)

Live table: `sessionScene.npcWorld.genericMembership[key] = { key, displayName }` (label override). Placement/flip live in the usual `npcWorld.placements` after Apply, same as named staged NPCs.

| Event | Behavior |
| --- | --- |
| Import confirmed | Spawn objects; write membership for spawned keys |
| Save & Play / `NPCS.restoreAfterStateLoad` | `GenericNpcs.ensureLiveFromMembership()` recreates missing instances |
| Scene Apply (switch) | Destroy **live** generic objects but **keep** the outgoing membership table, write the incoming scene bundle, then `ensureLiveFromMembership` for the new row |
| Leave scene / no-scene / End Scene | `destroyAllLiveAndClearMembership` — destroy trio + clear **live** membership (library rows keep their nested `sessionScene` copy for later respawn) |
| Gameboard **Clear** (HERE) | Same as leave: destroy all live generics and clear membership |
| Mid-scene remove **one** token from the board | **Not wired.** `GenericNpcs.destroyLiveKey` exists; no drop/Clear-one path calls it yet |

Named NPCs stay on the workshop preload path.

---

## Remaining / out of scope

Keep these on the record. Do not imply they shipped with TOR-560.

**Specified for v1 but not implemented:**

- Destroy a **single** generic (figurine + token + light) and drop its membership row when that token is removed from the Stage Control board mid-scene (`destroyLiveKey` is ready; no call site).

**Explicitly out of scope until a later issue:**

- Seating generics at the table (runtime does not special-case-block `assignNpcToSeat`; do not treat seating as a supported feature)
- Play-as-NPC assignment for generics
- Memoriam `kind: "generic"` wiring
- Per-NPC lighting / scale overrides (children, animals)
- Dashboard ↔ Lua bidirectional sync of which generics exist in the live scene (Dashboard gold highlights are **localStorage only**)
- Replacing named-NPC preload with spawn-on-demand
