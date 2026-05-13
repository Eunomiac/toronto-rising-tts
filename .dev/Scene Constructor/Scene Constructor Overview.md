# Scene Constructor Overview

The Scene Constructor lets the Host paste JSON (typically generated from a Google Sheet) to define a **saved scene**: a bundle that uses the **same shape as `gameState.sessionScene`**, plus library metadata. Saved scenes appear as activation buttons in the Storyteller Scenes UI so the Host can switch between beats without re-entering every field by hand.

## State model (single live authority)

- **`gameState.sessionScene`** is always the **live** narrative bundle that reconcilers and HUD code read. Mutations go through `S.setStateVal` / existing helpers, then the usual sync entry points (`Sync.full`, domain `reconcile*`, etc.).
- **`gameState.sceneLibrary`** holds **inactive** copies plus the active scene’s **mirror**:
  - `sceneLibrary.order` — array of scene keys for button order.
  - `sceneLibrary.scenes[sceneKey]` — `{ title, receivesLiveWrites, sessionScene }` where nested `sessionScene` matches the live table’s shape (defaults merged in `S.validateState`).
  - `sceneLibrary.activeKey` — which library entry is **currently bound** for optional mirroring (see Unlink below).

There is **no second reconciler input**: the library is persisted storage and (when linked) a **shadow copy** of the live bundle. The table always reflects `sessionScene` after sync.

## Import file shape (Google Sheet → paste)

The pasted JSON may include a small **import wrapper** (not stored inside nested `sessionScene`):

| Field | Required | Notes |
|-------|----------|--------|
| `schemaVersion` | Recommended | Integer; reject or migrate unknown versions with a clear error. |
| `sceneKey` | Yes | Stable id (`openingAudience`). Must match `^[a-zA-Z][a-zA-Z0-9_]*$` or your chosen rule. |
| `title` | Yes | Shown on the scene button. |
| `sessionScene` | Yes | Object whose keys align with **`gameState.sessionScene`** (see below). |

On successful import: upsert `sceneLibrary.scenes[sceneKey]`, set `title`, default `receivesLiveWrites` to `true`, replace nested `sessionScene` from the payload (then `S.validateState` merges defaults).

### `sessionScene` fields (aligned with `core/state.ttslua`)

Use **flat** keys that already exist on live `sessionScene` (do not nest a separate `location` object in state — the Sheet may still *group* columns for humans, but the JSON applied to state should use `districtKey` / `siteKey`).

| Key | Type | Role |
|-----|------|------|
| `lightingPresetKey` | string \| null | Same semantics as today. |
| `tableKey` | string \| null | e.g. table id used with `RSL.SetTableTo` / `C.Tables`. |
| `seatPresent` | object | Sparse tri-state map (`nil` / `false` / `true`) — **derived** from `seatSlots` when `isPresent` is set (see `normalizeLiveSessionSceneSeatSlots` in `core/state.ttslua`). Imports may omit if every seat is described in `seatSlots`. |
| `seatSlots` | object | Per-seat rows (keys: `Brown`, `Orange`, `Red`, `Pink`, `Purple`, `NPC1`…`NPC4`). See **Seat slots** below. |
| `npcRoleOverride` | object | Existing structure. |
| `districtKey` | string \| null | Chronicle district. |
| `siteKey` | string \| null | Site within district. |
| `clock` | object | `hour`, `minute`, `day`, `month`, `year`, `useRealTime`, `realTimeSpeed` (same names as live state). |
| `chronicleWeatherFollowSchedule` | boolean | Existing flag. |
| `chronicleWeatherManualHold` | boolean | **Set this** (via the same state paths as the UI) when the scene should block clock-driven weather — do **not** invent a parallel “weather override channel”. |
| `rollDefaults` | object | Same keys as `active.rollOptions` merges. |
| `soundscapeNarrative` | object | Optional **intent** consumed **only on scene apply**: mapped into `gameState.soundscape` with the same setters / helpers the Storyteller UI uses. Empty `{}` if unused. See **Soundscape** below. |
| `npcWorld` | object | `byArea` (sparse slot maps) + `preload` — see **NPC world** below. |

### Seat slots (`sessionScene.seatSlots`)

Each key is a **seat id** (`C.PlayerColors` + `C.NPCSeats`). Value is either **omitted** (leave that seat unchanged relative to other fields) or an object:

**PC seats (`Brown` … `Purple`):**

```jsonc
"Red": {
  "characterKey": "lordLucien",
  "isPlayingNPC": false,
  "isPresent": true
}
```

- `characterKey` — optional; narrative / future NPC-as-PC sheet column (`D.characters` / PCS keys as you standardize).
- `isPlayingNPC` — optional boolean; when true, future behavior: hide `forPCOnly` props, spawn NPC sheet flow (as in your design notes).
- `isPresent` — optional boolean or null-equivalent: when **set**, drives `sessionScene.seatPresent[seat]` and thus lighting “present” checks.

**NPC seats (`NPC1` … `NPC4`):**

```jsonc
"NPC1": {
  "characterKey": "myleneHamelin",
  "isPresent": true
},
"NPC2": { "slotEmpty": true }
```

- `characterKey` — non-empty string occupies the slot (`gameState.seatLayout.occupiedNPCSlots` updated on validate when this row is present).
- `slotEmpty` — `true` forces the slot empty (`occupiedNPCSlots` → `false`) regardless of other fields.
- Omit the NPC key entirely if the import should not change that slot’s occupancy.

### Soundscape (`sessionScene.soundscapeNarrative`)

Optional keys (all optional; `{}` means “no narrative-driven apply”):

- `backgroundMusic`, `location`, `wind`, `rain`, `thunderstorm`, `isIndoors` — **apply** maps these into `gameState.soundscape` using the **existing** mutation paths (same as panel actions), never a duplicate weather pipeline.
- When the scene should **lock** manual weather / block chronicle schedule, set the real flags on `sessionScene` directly: `chronicleWeatherManualHold`, `chronicleWeatherFollowSchedule` — the scene-apply code sets them with `S.setStateVal` like any other mutation.

### NPC world (`sessionScene.npcWorld`) — sparse tables

Avoid long arrays with empty placeholders. Use **sparse maps** keyed by string slot index (JSON object keys are always strings; Lua after `JSON.decode` matches TTS).

**`byArea`** — keys are area ids (e.g. `centerForward`, `nearLeft`, `nearRight`, `farLeft`, `farRight`). Each value is an object whose keys are **slot indices** (`"1"`, `"3"`, …) and values are spawn descriptors (omit an index entirely to skip that slot).

```jsonc
"npcWorld": {
  "byArea": {
    "nearLeft": {
      "1": { "characterKey": "adrianVarga", "npcLightMode": "OFF" },
      "3": { "characterKey": "theAristocrat", "npcLightMode": "OFF" }
    }
  },
  "preload": ["evangelineDupont", "oliverGagnon", "eddie"]
}
```

- `preload` — array of `characterKey` strings to ensure in the preload zone on load **unless** an instance is already placed on stage (per your existing rule).

Runtime NPC instances remain under **`gameState.npcs.instances`**; `npcWorld` is the **saved scene’s staging intent**, copied into live NPC flows during apply.

## Switching scenes

Same choreography as table switches: blindfold all players → write **live** state from the chosen library entry’s `sessionScene` (and any companion top-level slices the apply pipeline defines) → run reconcilers / `Sync.full` → lift blindfolds.

## Import validation (modal UX)

Validation runs **when the Host confirms import**, **before** the modal closes.

- If validation **fails**: keep the modal open; set a dedicated UI **text element** under the confirm control to a **short, actionable** message (one primary error first; optional “also:” second line if cheap).
- If validation **succeeds**: close the modal, write `sceneLibrary`, then `S.validateState` and refresh buttons.

Messages should name the **JSON path** and the **fix** (e.g. `sessionScene.seatSlots.NPC2.characterKey: expected string or omit key; got number.`, `sceneKey: must match pattern …`, `schemaVersion: unsupported value 7; this build supports 1.`).

**`InputField` for paste / titles:** Do not read live `InputField` text with `UI.getValue` on confirm. Follow the TTS contract and in-repo reference (`rollDash_difficulty_*` + `HUD_rollSetDifficulty`): use **`onValueChanged` / `onEndEdit`** to stash the **`value`** argument, prefill with **`UI.setAttribute(id, "text", …)`**, and read from stash on confirm. See [`.dev/SOLVING ISSUES & DEBUGGING.md`](../SOLVING%20ISSUES%20%26%20DEBUGGING.md) (*Global UI `InputField` — typed text*).

## UI controls

For each key in `sceneLibrary.order`, activate a pre-declared dummy button and set label from `scenes[k].title` (do **not** use `setXML` / `setXMLTable` for dynamic lists). Active scene: green; inactive: default; unlink grey (see below).

- **Import Scene** — opens modal with large text field + confirm; validation as above.
- **New Scene** — **fork** the live table into a new library row (see **Forking a scene** below). Does **not** blindfold or apply state: the physical table and `gameState.sessionScene` stay as they are; only `sceneLibrary` changes so future mirrors target the new row while the previous row stays pinned to the fork-time snapshot.
- **Unlink Scene** — sets `receivesLiveWrites = false` on the **active** library entry only: **stop mirroring** live `sessionScene` into that entry’s stored `sessionScene`. Does **not** snapshot-freeze; the stored bundle simply stops receiving updates until linked again.
- **Delete Scene** — arm mode → pick scene → confirm → remove from `scenes` and `order`, clear `activeKey` if deleted, then refresh.
- **End Scene** — narrative end: notify players, fade location audio / unduck weather as today, clear district/site lights per existing patterns.

## Forking a scene (“New Scene”)

Use this when the Storyteller wants to **keep going** on the current table setup but **preserve a return point**: the row that was receiving live updates stops updating and stays exactly as things stood at the fork; a **new** row becomes the mirror target so later play only mutates that copy.

**Behavior (single atomic mutation pass on `sceneLibrary` + `activeKey`):**

1. **Source of truth for the fork** — Deep-clone the **live** narrative bundle from `gameState.sessionScene` (and any other slices you define as mirrored into library entries, e.g. companion fields you later add to the shadow). Call this clone `F`.

2. **Previous active row** — Let `K = sceneLibrary.activeKey`. If `K` is non-nil and `scenes[K]` exists:
   - Set `scenes[K].sessionScene = F` (so the “original” row matches the fork instant exactly — no one-frame drift vs the new row).
   - Set `scenes[K].receivesLiveWrites = false` so it **no longer** receives mirror updates after this click.

3. **New row** — Allocate a **new unique** `sceneKey` derived from `K` (e.g. `openingAudience` → `openingAudience_2`, then `_3`, … skipping collisions with any existing `scenes` key). Set `title` similarly (e.g. append ` (2)`, ` (3)`, or match the key suffix — keep it obvious in the UI).
   - `scenes[newKey] = { title = <derived>, receivesLiveWrites = true, sessionScene = U.clone(F) }`.
   - Append `newKey` to `sceneLibrary.order` (typically after `K` or at the end — product choice).
   - Set `sceneLibrary.activeKey = newKey`.

4. **No world reconcile** — Do not run scene-apply / blindfold / `Sync.full` solely because of New Scene: live state is unchanged; only which library entry is the **mirror sink** changes.

5. **Returning to the original** — The Host switches back to scene button `K`. That runs the normal **switch scene** pipeline: apply `scenes[K].sessionScene` to live state and reconcile. Because `K`’s bundle was fixed at `F` when the fork happened, the table returns to that **saved moment**, while the forked row `newKey` still holds whatever was mirrored during the “continuation” branch (for comparison or resuming later).

**Edge cases**

- **`activeKey` is nil** (no row was mirroring): still create a new row from a clone of live `sessionScene`, set `receivesLiveWrites = true`, `activeKey = newKey`, append to `order`. There is no prior row to pin.
- **Collision-safe keys** — Scan existing `scenes` keys when picking `_2`, `_3`, … so imports and prior forks never collide.

## Unlink and “always up to date” (recommended wiring)

**Goal:** While a scene is active, its library row should stay aligned with play **without** a manual “save scene” step.

**Recommended pattern (avoids dual-writer reconciler bugs):**

1. **One live writer:** All runtime mutations continue to update **`gameState.sessionScene`** (and existing companions like `soundscape`, `npcs`, etc.) exactly as they do today.
2. **At most one mirrored library row:** When `sceneLibrary.activeKey == K` and `scenes[K].receivesLiveWrites == true`, after each successful mutation batch that touches scene-relevant keys, **deep-clone** live `sessionScene` (and any other slices you define as part of the “scene bundle”) into `sceneLibrary.scenes[K].sessionScene`. No separate “scene truth” feeds lights or audio.
3. **Unlink:** Flip `receivesLiveWrites` to `false` for that entry; mirroring stops. The copy is **whatever it was last time mirroring ran** — not a special freeze pass.
4. **Inactive scenes:** Other library entries are **not** updated while inactive (no N-way fan-out on every seat toggle).

This gives you “always current” for the **active** saved scene with **one** authoritative live record and a **passive shadow** for persistence, not two competing sources of truth for the table.
