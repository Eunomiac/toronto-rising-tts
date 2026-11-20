# Assigning NPCs to Players (Play as NPC — TOR-95)

## Agent Routing

Read this when:
- implementing or testing Play-as-NPC assignment, NPC face sheets, or `CSHEET_NPC_*` tiles
- changing `seatSlots.isPlayingNPC` / `npcCharacterKey`, Memoriam `assignments`, or map-pin stamp rules for playing NPCs

Source of truth:
- This document (author contract)
- Scene seat fields: [Scene Import Guide § Seat slots](../Storyteller%20Dashboard%20Docs/Scene%20Import%20Guide.md)
- Memoriam enter/exit remaining work: [Memoriam.md](../Phases/Memoriam.md)
- Sheet recipe: [`lib/json/pc-as-npc-template.jsonc`](../../lib/json/pc-as-npc-template.jsonc) + [`ui/player/csheets/npc_sheet.xml`](../../ui/player/csheets/npc_sheet.xml)
- Pure fill engine (no TTS): `.tools/pc-as-npc/` — `npm run test:pc-as-npc`
- Save inject: `.tools/tts-save/inject-csheet-npc-sheets.js`

Verification:
- `npm run test:pc-as-npc` (fill + inject fixtures + contract helpers)
- Dashboard Playwright assign smoke (drop → confirm → Unassign)
- After inject: File → Load `TS_Save_230`; five HiddenObject NPC sheets at Y −200 follow seat moves

Status: in progress (foundations)

---

## Overview

A seated player can be assigned a **named** or **generic** NPC for a period of time. For the duration of the assignment:

- The player's seated **figurine** and **PC character sheets** are replaced by the NPC figurine and that seat's **NPC sheet** tile (`G.CSHEET_NPC_<COLOR>`), dynamically filled from export data.
- Rolls from that seat broadcast and display as the **NPC**.
- The Storyteller Dashboard is the **only** assigner (no control-board assign path).

## State model

| Field | Meaning |
| --- | --- |
| `seatSlots.<Color>.characterKey` | Real chronicle PC (unchanged while playing an NPC) |
| `seatSlots.<Color>.isPlayingNPC` | Player is portraying an NPC from this PC chair |
| `seatSlots.<Color>.npcCharacterKey` | NPC portrayed (required when `isPlayingNPC`) |
| `seatSlots.<Color>.isPresent` | Remains **true** while playing an NPC (seat stays lit) |
| `npcRoleOverride` | Derived — rebuilt from PC rows (`SceneLibrary.syncNpcRoleOverrideFromSeatSlots`) |

**Generics:** reuse scene **generic membership** (`displayName` / `tier` / `keptId`) — same path as `genericAdd` / `GenericNpcs.importNamed`. Do not invent a parallel name/tier store on the seat.

**Roleplay Notes:** chronicle column → `EXPORT_CHARACTERS_NAMED` / `EXPORT_CHARACTERS_GENERIC` → Dashboard catalogs. Assignment confirm seeds from that field; the ST may edit; the edited text is stored on the assignment (scene seat / Memoriam payload).

## Assigning NPCs

### 1. Token → seated PC (Dashboard)

When an NPC token is dragged from the roster or stage onto a seated PC, show a **confirmation** modal:

- Multiline **Roleplay Notes** (seeded from export/catalog).
- For **generics:** tier buttons (only tiers that have stats) + display name field.

**Live table:** apply immediately — **no blindfold**. Mid-scene assign does not move map pins as a transition; stamp the PC's `lastActiveMapPin` to the **current** scene site/clock (“last seen here”), then while `isPlayingNPC` skip further pin stamps on scene/location apply.

**Scene library / preview:** store on the row; world apply under blindfold only when that scene is played.

### 2. Memoriam initialization

The Memoriam popup must allow dragging tokens onto PC names without auto-closing when clicking away, and must allow interacting with the roster. Assignees are auto-marked present playing that NPC. Advance payload uses existing `assignments` kinds (`library` / `memoriam` / `generic`).

## Restoring / unassign

Assignments are **per-scene** (and Memoriam payload). They do not survive a normal scene switch or Memoriam exit. **Forks** (e.g. mid-scene location change) copy seating and **keep** the assignment.

**Unassign** clears `isPlayingNPC` / `npcCharacterKey`, reverses hide/show, redeals `HeldCard`s. Triggers:

- Scene switch (non-fork)
- Memoriam exit
- Dashboard **Unassign** on the NPC tracker popup when that NPC is played by a PC

## Map pins

- Player is present (`isPresent`); **character** pin behaves as if the PC did not travel with the NPC role.
- Mid-scene assign: stamp last-seen to current site, then skip stamps while playing.
- Scene Apply where the row already has Play-as-NPC: do not stamp the PC pin to the new site.

Pure helpers: `.tools/pc-as-npc/contract.js` (`shouldStampMapPinOnSceneApply`, etc.).

## Double-booking

Not allowed. If the assigned NPC is on a homeland seat or the stage, remove them from that seat/stage on confirm.

## Selective object hide (not disconnect / not full `absentFromSession`)

New selective path — do **not** reuse unoccupied-pile park wholesale (that parks the hand zone).

### Keep

- Signal fire and candle
- Throne / chair
- Dice bags
- Base and back supporting the character sheet and dice bags
- Dice tray
- Anchor objects
- Spotlights
- **Hand zone** (discipline cards in hand still go to storage with `HeldCard`)

### Hide

Same park protocol as an unoccupied pile for these objects only:

- PC figurine
- All PC CSHEET pages 1–8
- Compulsion / tarot decks
- Hunger smoke
- Prince scenery (Red)
- Any other `<Color>Object` not listed under Keep

Frozen role lists for tests: `.tools/pc-as-npc/selective-hide.json`.

### Show

- NPC figurine at that chair (or Scatter group center as a PC)
- That seat's `G.CSHEET_NPC_<COLOR>` **double-wide** sheet (centered between that seat's PAGE_1 and PAGE_2), filled from the template — left pane combat/powers, right pane Advantages + Roleplay Notes

## Scatter

NPCs may be assigned to Scatter PCs. The player moves between Scatter groups like a PC. The Scatter control indicator keeps the **PC's** default art (no per-NPC assets yet).

## Trackers

- Max Health / Willpower from export; Hunger/Rage from live `npc_trackers` for `npcCharacterKey`.
- Face sheet shows ASCII tracks (configurable glyphs in `pc-as-npc-template.jsonc` → `trackerGlyphs`).
- PC Hunger / XP stay on the PC. NPC-body damage does not convert onto the PC on unassign / Memoriam exit.

## Physical NPC sheet objects

Five seat-bound **double-wide** tiles `CSHEET_NPC_<COLOR>` live in the save:

- Cloned from `CSHEET_PAGE_1_<COLOR>` art/scripts; `scaleX` is twice a PC page; XZ is the midpoint of that seat's PAGE_1 and PAGE_2 (interior edges of the two-page pair); parked at hide Y (−200)
- XmlUI root matches PC `page_root` scale/pose with width ×2 (left + right panes)
- Tags: `HiddenObject` + `<Color>Object`; registered in `guids.ttslua`, `LockedObjects`, `ClickableSeatControls`, `TableSourceObjects.player` (`CSHEET_NPC`), and `ObjectPositions.CSHEET_NPC`
- Inject: `npm run tts-save:inject-csheet-npc -- --saveName 230` (add `--replace` to refresh pose/size if already injected)

## Tests (no TTS)

```bash
npm run test:pc-as-npc
```

Covers fill engine fixtures, inject plan/apply, XML↔template id cross-check, selective-hide contract helpers, export `Roleplay Notes` header fixtures.
