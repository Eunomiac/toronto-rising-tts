# Dice System Pt. 2 — Implementation Plan

**Source spec:** `.dev/Dice System/Dice System Extensions Pt. 2.md`
**Status:** Implementation complete (May 2026) — ready for full in-game test pass
**Architecture:** Single roll FSM in `core/roll_controller.ttslua` with player vs storyteller context; mutation on confirm → `Sync.player(color)` for PC stats only.

---

## Locked requirements summary

### Player bags
| Trigger | Behavior |
|---------|----------|
| Normal, no roll | Standard roll → SETUP (ST opens) |
| Normal, standard pool | Add normal/hunger (auto-hunger rules) |
| Normal, dedicated Rouse/Obliv check | Promote to STANDARD compound roll + add normal/hunger (Auto-Hunger); optional ST difficulty |
| Normal, right (standard/compound) | Remove main-pool die (Normal before Hunger); cancel if empty |
| Hunger, no roll | **No-op** (bag disabled until PRE_ROLL) |
| Hunger, standard pool | Surge off → Blood Surge; surge on → **+1 bloodSurgeRouse** |
| Hunger, standard right | Surge on → **−1** surge rouse (full undo at 0); surge off → **no-op** |
| Hunger, dedicated Rouse/Obliv check | **No-op** |
| Rouse/Obliv, no roll | Initiate appropriate Rouse type → **skip SETUP** → PRE_ROLL; auto-broadcast when pool is rouse-only |
| Rouse/Obliv, standard or matching dedicated pool | Add die to pool (mutual exclusion silent fail) |
| Rouse/Obliv, right | Remove one die if pool count for that kind > 0; cancel if empty |

### Blood Surge (toggle)
1. Add one **Blood Surge rouse** die (`pool.bloodSurgeRouse`, tagged).
2. Add `bloodSurge` count of normal/hunger via auto-hunger rules (`bloodSurgePool` script_state for undo).
3. Hunger **left** while surge on: **+1** `bloodSurgeRouse`.
4. Hunger **right** while surge on: **−1** surge rouse; at 0 → full undo (surge normal/hunger, not manual `pool.rouse`).

### Rouse/Obliv in pools (on confirm, if `PERM_AUTO_APPLY_ROUSE_OUTCOMES`)
1. Obliv tree (132–140); (D) → **Confirm – Hunger** / **Confirm – Stain** after WP phase.
2. All rouse dice: ALL ≤5 → +1 Hunger (one **Rouse** strip; includes Blood Surge dice).
4. Dedicated Rouse Check: stop after 1–3; no VTM classify on normal/hunger.
5. Standard: then classify normal+hunger (+werewolf N/A for players).

### Storyteller (`gameState.storytellerRolls`)
- **Max 3 slots** (drawer occupied from initiate until ST cancel clears slot).
- **One live** roll: unconfirmed / not broadcast — only slot receiving bag clicks, WP, Roll.
- **Cannot initiate** if no free drawer OR another roll is live.
- NPC **R** → SETUP + prefilled name; bag click → name modal (required, any string).
- **Name dedup:** among uncleared slots, trim + **case-insensitive** match → append ` (2)`, ` (3)`, …
- Drawer/light: first die added → on until **cancel** (stays through resolved-on-panel).
- Spawn arc center: drawer X, Y = 5, Z = drawer Z + 6 (`STD.arcCenterForSlot`).
- **Roll button:** programmatic randomize all tray dice; existing settle/debounce.
- **No auto cleanup** after broadcast; ST cancels from panel.
- **WP:** cosmetic only (no stat); same unlock/reroll/lock procedure as players.
- **Blood Surge on ST:** surge rouse + manual dice only; **no** auto Hunger/Stain/dice count from BP.
- **Rage:** ST manual count only (no Rage score in module).

### Werewolf (`C.RollType.WEREWOLF`, ST only)
- Pool: Werewolf + Rage only; mutual exclusion alerts.
- 6+ success; paired 10s; no messy/bestial; Rage 1–2 locked on WP reroll.
- Brutal: ≥2 Rage show 1 or 2 → **Confirm Fail** / **Confirm Violence** (after WP).
- Fail: force failure band + narrative labels; Violence: +4 successes, recalc, brutal labels.
- Display: narrative override (approach A), not new `C.ResultClass` enums.

### Rename (included in scope)
| Old | New |
|-----|-----|
| `RO.PERM_AUTO_ROUSE` | `RO.PERM_AUTO_APPLY_ROUSE_OUTCOMES` |
| `autoRouse` (state/UI id) | `autoApplyRouseOutcomes` |
| UI label "Auto-Rouse" | e.g. "Auto-apply Rouse outcomes" |

Migrate persisted `gameState.stRollSettings.autoRouse` → new key on load.

---

## Phase 0 — Spec hygiene & constants

**Goal:** Single source of truth in code comments and `.dev` docs.

- [ ] Update Pt. 2 doc:
  - Rage intro: lore note only; **no PC Rage score / auto allocation in this module**.
  - Obliv multi-die pointer at line 42 → procedure §132–140.
  - ST Obliv (D): show buttons, no stat apply.
  - Single initiate guard: no free drawer **or** live roll exists.
  - `pendingResolution` note for (D) / Brutal / auto-broadcast gate.
- [ ] Update `Dice System Outline.md` §1.4: Rouse uses **RouseDie**, not Normal/Hunger placeholder.
- [ ] `lib/constants.ttslua`:
  - `C.RollType.WEREWOLF = "werewolf"`.
  - `C.RollTypesNoWillpower` / `NoTakeHalf` / `AutoBroadcast` / pool-init rules for new types.
  - Fix comments: ROUSE pools use `rouse` count not `hunger = 1`.
- [ ] `lib/roll_options.ttslua`: rename perm + defaults + migration helper.
- [ ] `core/state.ttslua`: default `stRollSettings` key rename + load migration.
- [ ] `ui/shared/roll_options_modal.xml` + `core/roll_ui.ttslua`: toggle id/label.

**Files:** `.dev/Dice System/*.md`, `lib/constants.ttslua`, `lib/roll_options.ttslua`, `core/state.ttslua`, `ui/shared/roll_options_modal.xml`, `core/roll_ui.ttslua`

---

## Phase 1 — Die taxonomy & pool model

**Goal:** Extensible die kinds without forking the FSM.

### 1.1 Die registry (new `lib/dice_kinds.ttslua` or section in `lib/constants.ttslua`)

Per kind: `tag`, `poolKey`, `faceMapper(value)`, `wpLockRule`, `storytellerOk`.

Kinds: `normal`, `hunger`, `rouse`, `oblivRouse`, `werewolf`, `rage`.

Flags on dice/bags:
- `bloodSurgeRouse` — GM Notes suffix or dedicated note field on leave-container.

### 1.2 Active roll pool shape

**Player** (`playerData[pid].hud.rollData.active`):

```lua
pool = {
  normal = 0, hunger = 0, rouse = 0, oblivRouse = 0,
  -- werewolf/rage only on ST slots
}
meta = {
  bloodSurgeActive = false,
  bloodSurgeSpawnedGuids = {}, -- toggle-off
}
pendingResolution = nil | "oblivHungerStain" | "brutalFailViolence"
```

**Storyteller** (`gameState.storytellerRolls.slots[1..3]`):

```lua
{
  id, label, rollType, phase, pool, difficulty, result, diceFaces,
  drawerSlot = 1|2|3, willpower = {...}, pendingResolution, ...
}
gameState.storytellerRolls.liveSlotIndex = 1|2|3|nil
```

### 1.3 Physical dice read/write

- [ ] Extend `isDieTag` / `colorFromTags` → `ownerFromTags` (`<Color>Object` | `StorytellerObject`).
- [ ] `RC._getDiceForRoll` → `_getDiceByKindForRoll(ownerRef, rollId)` returning table per kind.
- [ ] `G.GetDice*GUID` helpers: Rouse, OblivRouse, ST bags; extend `GetDiceOwner`.
- [ ] `onObjectLeaveContainer`: tag kind + roll id (+ surge flag when applicable).
- [ ] ST spawn: `dice_bag` arc center from assigned drawer slot.

**Files:** `core/global_script.ttslua`, `core/roll_controller.ttslua`, `lib/guids.ttslua`, `objects/dice_bag.ttslua`

---

## Phase 2 — Bag clicks & spawn routing

- [ ] Rewrite `objects/dice_bag.ttslua`:
  - `getDieType()` → all `*Die` tags + `StorytellerObject`.
  - `click_roll` matrix per spec (player + ST live slot).
  - ST: name modal callback before SETUP completes (global).
- [ ] `GlobalInitiateRoll` / new `GlobalInitiateStorytellerRoll`:
  - Rouse/Obliv player: `initiator=player`, skip SETUP → PRE_ROLL, pre-seed pool.
- [ ] `GlobalRollSpawnDieRequest`: redirect + exclusivity (werewolf vs vampire).
- [ ] `callBagFunction` / `getBagSpawnedCount`: all bag types per owner.
- [ ] Rouse pool reset: destroy all bags' staged dice for roll; reset pool counts; spawn 1 rouse if PRE_ROLL.

**Files:** `objects/dice_bag.ttslua`, `core/global_script.ttslua`, `core/roll_controller.ttslua`

---

## Phase 3 — Consequence engine & confirm gates

**Goal:** `CLASSIFICATION_OUTCOME_BUILDERS` pattern (mirror Custom Roll Mechanics doc).

- [ ] `lib/rouse_outcomes.ttslua` (pure):
  - `resolveBloodSurgeRouse(face)`
  - `resolveOblivRouseDice(faces) → { outcome, pendingChoice? }`
  - `resolveRouseDice(faces) → hungerDelta`
- [ ] `RC.applyPendingRouseOutcomes(color|slot, active)` on confirm only:
  - Respect `RO.PERM_AUTO_APPLY_ROUSE_OUTCOMES`.
  - PC: `S.setPlayerVal` + `Sync.player` + sheet/overlay refresh.
  - ST: skip stat writes.
- [ ] `pendingResolution`:
  - Set in `recalculate` when Obliv (D) or Brutal triggers.
  - Blocks `RollTypesAutoBroadcast` until resolved.
  - WP completes first; then show dual buttons (user confirmed order).
- [ ] Dedicated Rouse/Obliv rolls: skip `Dice.classifyRoll` when pool has no normal/hunger.

**Files:** new `lib/rouse_outcomes.ttslua`, `core/roll_controller.ttslua`, `core/dice.ttslua` (minimal)

---

## Phase 4 — UI & broadcast

- [ ] `core/roll_ui.ttslua`:
  - `dieFaceImage(value, kind)` for all face tables.
  - Pool display: icons/rows per kind (player panel).
  - `pendingResolution` buttons (Obliv, Brutal).
  - Broadcast strips: compact rows above main result (`Rouse Check: [faces] …`).
- [ ] `ui/shared/roll_panels.xml`: preload all `dieFace_*` assets; ST storyteller roll panel (3 slot rows + live controls).
- [ ] `RUI.narrativeLabel` + brutal display strings (approach A).
- [ ] ST dashboard: replace/extend `rollDash_ST` for `storytellerRolls` slots (not player colors).

**Files:** `core/roll_ui.ttslua`, `ui/shared/roll_panels.xml`, new `ui/storyteller/panel_rolls.xml` (if needed)

---

## Phase 5 — Storyteller roll FSM

- [ ] `core/storyteller_rolls.ttslua` (facade) or RC context switch:
  - `initiate`, `assignSlot`, `setLive`, `openRoll`, `setPool`, `roll`, `confirm`, `cancel`.
  - Drawer/light via `C.ObjectPositions` + `L.SetLightMode` (existing ST entries).
  - `lib/dice_drawer.ttslua` or sibling: `openSTDrawer(slot)` / `closeSTDrawer(slot)`.
- [ ] NPC panel: wire `npc_roll_*` → `GlobalInitiateStorytellerRoll({ label = npcName })`.
- [ ] Name dedup helper: `disambiguateLabel(name, activeSlots)`.
- [ ] Programmatic roll: `randomize()` on all dice in slot tray after Roll click.

**Files:** `core/storyteller_rolls.ttslua`, `core/npcs.ttslua` or `core/global_script.ttslua`, `core/lighting.ttslua`, `ui/storyteller/panel_npcs.xml`

---

## Phase 6 — Werewolf

- [ ] `Dice.classifyRoll` variant or opts: `noMessyCritical`, `noBestialFailure`, combined werewolf+rage pools.
- [ ] Brutal detector: count Rage dice with value 1 or 2 ≥ 2.
- [ ] Confirm Violence: +4 successes, reclassify, brutal narrative labels.
- [ ] WP lock: only Rage showing 1 or 2; werewolf dice always rerollable.

**Files:** `core/dice.ttslua`, `core/roll_controller.ttslua`, `lib/rouse_outcomes.ttslua` or `lib/werewolf_outcomes.ttslua`

---

## Phase 7 — Layout, objects, verification

- [x] `C.TableSourceObjects.player`: `DICEBAG_ROUSE` + optional `DICEBAG_OBLIVROUSE` per seat (Purple GUID in `lib/guids.ttslua`).
- [x] ST bags/drawers: `lib/st_dice_drawer.ttslua`, `G.GetDiceStorytellerBagGUID`, `C.ObjectPositions` DICE_DRAWER_STORYTELLER_*.
- [x] `.dev/testbed/TEST BED.ttslua`: region 11 manual scenario checklist + `printDicePt2ScenarioChecklist()`.
- [x] Legacy `autoRouse` migration retained in `lib/roll_options.ttslua` only (intentional one-time load).

---

## Suggested implementation order

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4
                              ↘ Phase 5 (can parallel after 1–2)
                              → Phase 6 (after 1, 3, 5)
                              → Phase 7
```

**MVP milestones:**
1. Player rouse bags + pool reset + auto PRE_ROLL + physical RouseDie (no surge/obliv yet).
2. Blood Surge toggle + outcomes rename.
3. Obliv tree + pending confirm + broadcast strips.
4. ST slots + drawers + cosmetic WP.
5. Werewolf + Brutal.

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Dual FSM drift | Single `RC` with `rollContext = { kind="player", color } \| { kind="st", slot }` |
| Toggle surge removes wrong dice | Track `bloodSurgeSpawnedGuids` at spawn |
| Auto-broadcast before Obliv choice | `pendingResolution` gate in `recalculate` |
| `onObjectRandomize` ignores new tags | Extend `isDieTag` first (Phase 1) |
| Saved games break on rename | Load-time migration in `state.ttslua` |

---

## Out of scope (explicit)

- PC werewolf characters or automatic Rage substitution.
- NPC Willpower/stat tracking in `gameState`.
- New `C.ResultClass` enum values for Brutal (display-only overrides).

---

## Doc updates (same PR as each phase)

Update in lockstep: Pt. 2 spec, `Dice System Outline.md`, `Custom Roll Mechanics.md` (registry for outcomes), `AGENTS.md` if public APIs change.
