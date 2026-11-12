# Seat occupancy and client connection

## Agent Routing

Read this when:
- touching `absentFromSession`, `tableSlot`, `isPresent`, PC seat piles, or hand stash
- touching player connect / disconnect handlers, load-time seating, or blindfold transitions
- touching the Debug panel connection mode or PCs-panel connection buttons

Source of truth:
- `core/player_connection.ttslua` — connection authority, connect / disconnect handlers, blindfold checkpoint
- `lib/figurine_seat_layout.ttslua` — occupancy (`tableSlot`, `absentFromSession`), Table B sizing, random seating
- `core/hud_blindfold.ttslua`, `core/phases.ttslua` — checkpoint call sites

Verification:
- Solo, Debug panel in **Assume Connected**: toggle a PC Disconnected on the PCs panel → seat darkens, nothing moves; Apply a scene → seat Unoccupied (pile stashed, hand zone and the cards in it stay where they were); toggle Connected → chair and pile return at once, and the hand moves with its cards to the new chair
- Multiclient: [`.dev/E2E Playbooks/Multiplayer-Session.md`](../../.dev/E2E%20Playbooks/Multiplayer-Session.md)

Status:
- current

Vocabulary rule: [`.cursor/rules/toronto-rising-seat-occupancy-terms.mdc`](../../.cursor/rules/toronto-rising-seat-occupancy-terms.mdc).

## Model

- **Occupied seat:** a PC or NPC holds a numbered chair (`tableSlot`).
  - **Present** — lit, fully visible (`isPresent ~= false`).
  - **Absent / Not Present** — chair, sheet, and hand stay; lights dark (`isPresent == false`, or a seated NPC standing on the stage).
- **Unoccupied seat:** no chair; the seat pile is stashed once and table transitions never move it.
  - NPC: removed from the table (`slotEmpty`).
  - PC: `absentFromSession == true`, caused **only** by the client being **disconnected**.

`absentFromSession` and `tableSlot` are mutually exclusive.

## Connection authority

`PC.isSeatConnected(color)`:

- Debug panel **Assume Connected** (`debug.assumeConnected == true`, the default for new saves and saves without the key): returns `debug.simulatedConnection[color]` (default connected). The PCs panel shows a per-seat Connected / Disconnected button that flips it.
- **By Connection Status** (live play): the chronicle Steam id for that color is connected. PCs-panel connection buttons are hidden.

| Event | Effect | Timing |
| --- | --- | --- |
| Connect (`PC.handleSeatConnected`) | Clear `absentFromSession`, assign a chair (fixed tables: `C.DefaultTableSlots[color]`; random tables: the PC's session chair; either falls back to the lowest free chair if taken; Scatter: an empty scatter group), relayout, `Sync.player` | Immediate — no blindfold |
| Disconnect (`PC.handleSeatDisconnected`) | Seat darkens via effective presence; chair kept | Immediate |
| Blindfold checkpoint (`PC.applyConnectionCheckpoint`) | Every PC still disconnected and not yet `absentFromSession`: set it, clear `tableSlot`, stash the pile. Loose owned `DisciplineCard`s (and other in-hand cards) get `HeldCard` and go into that PC's storage; the empty hand zone parks with the pile (TOR-763). Other seats do not shift. | Under cover, before transition work |
| Load (`M.setupPlayers` → `PC.seatAllPlayersForStartup`) | Session start: every PC counts as connected while startup setup runs (layout, reference objects and seat rigs assume a full table), so all are seated — **state only** (no per-seat presence pass or `Sync.player` here); the startup gate's single `Sync.full` lays out chairs (restoring any parked pile) and applies presence, lights and HUD | Immediate |
| End of startup readiness gate (`PC.finishStartupConnectionAssumption`) | Stops the startup assumption and runs the first connection checkpoint: PCs who are not connected become unoccupied | After the gate's final step (no extra cover) |
| Debug mode switch / PCs-panel toggle | Same handlers as a real connect / disconnect, driven by simulated connection | Immediate |

Checkpoint call sites:

- `HUDBF.runStagedTransition` and `HUDBF.runTransition` — before the covered work (scene Apply, scene end, table toggle, location Apply, Memoriam, Play → Spotlight, Spotlight → End, `RSL.SetTableTo` own cover)
- `Phases.onEnter[PLAY]` after the session cover is raised (Intermission → Play)
- `Phases.onEnter[INTERMISSION]` before the no-scene default (End → Intermission)

Scenes, tables, and phases never author `absentFromSession`: every wholesale seat-row replacement runs `FSL.carryLiveAbsenceOnto` (scene Apply, Scatter stash restore, Scatter → table seeding).

## Table B

A Table B variant always has chairs for **all five PCs plus every seated NPC** (5 + seated NPCs, at most B4 = 9), so a connecting PC can always sit down without a table transition (`FSL.tableBVariantIndex` = seated NPC count, raised only when a chair number is already beyond that). Random seating is drawn once per session: on Intermission → Play, `FSL.drawSessionChairs` shuffles the five PCs into chairs 1..5 and stores them in `seatLayout.sessionChairs`. The only other writer is a Storyteller seat move on Table B (`SeatMoves.moveToChair` → `FSL.moveSessionChair`): the PC keeps the new chair for the rest of the session and swaps session chairs with its old holder; a PC can't move past chair 5, nor an NPC into 1..5. `S.validateState` seeds the default chairs for an old save. Every Table B transition until the next Intermission → Play runs `FSL.applySessionChairs`: each PC goes back to their session chair, seated NPCs fill chairs 6.. in their current chair order, and an unoccupied PC's chair stays an empty gap that the next connect fills (their session chair).

Parking (`FSL.setOccupantPileVisible(color, false)`) first stashes that PC's loose owned `DisciplineCard`s (world rule: `DisciplineCard` + `<Color>Card` may only live in that color's hand or that color's storage) and any other cards still in the hand into storage with `HeldCard`, waits for `putObject` absorption, parks the empty hand zone under the table, then hides every `<Color>Object` — decks and loose cards included (Pink tarot deck, compulsion deck). The storage container hides after a longer settle so absorption can finish. Table Y for everything that was parked is recorded in `seatLayout.absentPileY` (keyed by role, or `guid:<guid>` for role-less objects). On reconnect, objects layout lifted unhide in place; objects layout does not own (decks, dice drawers, tarot set) return to their hide snapshot only when the stash shows they were on the table, then their reconcilers re-pose them at the new chair. The hand zone returns at table height and only `HeldCard` / legacy `StashedHandCard` cards are dealt back out of storage. During the startup “assume connected” window, already-parked hands are not lifted (so cards are not dealt only to be re-stashed at the end-of-gate checkpoint).

Anything that could lift a parked object skips unoccupied seats: `reconcileObjectPositionsOwnedAfterLayout` (dice drawers via `skipColors`, Pink tarot), `Compulsions.reconcileSelectedCardsToAnchors`, Scatter leave (`FSL.isInParkedPcPile` — Red's Prince scenery), `O.applyPcSeatHiddenObjectPresence(seat, true)`, spotlight seat figures (`isColorInSession`), hunger smoke (`syncHungerSmokeForSeat`), and dice bags (`DBV.reconcileForPlayer`).

Layout passes skip re-hiding an unoccupied PC whose pile is already parked (`FSL.isUnoccupiedPcPileStashed`), and the cold-load character-sheet pass (`RSL.ensureMinVisibleCsheetPagesForAllSeats`) skips unoccupied PCs so their sheet stays parked. On load every PC is still seated when that pass runs, so all get pages 1 and 2; the end-of-startup checkpoint then parks a disconnected PC's pile with those pages recorded, ready to come back on connect.

## Scatter

Scatter has no chairs; group membership is the seat. `ScatterOccupancy.reconcilePcConnectionInPack` removes unoccupied PCs from their group and puts an occupied PC with no group into an empty group (six groups, five PCs). It runs on connect, at the checkpoint, on load, and on a Scatter scene Apply (authored packs never seat an unoccupied PC).
