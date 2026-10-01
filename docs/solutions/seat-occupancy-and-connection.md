# Seat occupancy and client connection

## Agent Routing

Read this when:
- touching `absentFromSession`, `tableSlot`, `isPresent`, PC seat piles, hand stash, or control-board PC tokens
- touching player connect / disconnect handlers, load-time seating, or blindfold transitions
- touching the Debug panel connection mode or PCs-panel connection buttons

Source of truth:
- `core/player_connection.ttslua` — connection authority, connect / disconnect handlers, blindfold checkpoint
- `lib/figurine_seat_layout.ttslua` — occupancy (`tableSlot`, `absentFromSession`), Table B sizing, random seating
- `core/hud_blindfold.ttslua`, `core/phases.ttslua` — checkpoint call sites

Verification:
- Solo, Debug panel in **Assume Connected**: toggle a PC Disconnected on the PCs panel → seat darkens, nothing moves; Apply a scene → seat Unoccupied (pile, hand, cards stashed; token under the board); toggle Connected → chair, pile, hand return at once
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

- Debug panel **Assume Connected** (`debug.assumeConnected == true`): returns `debug.simulatedConnection[color]` (default connected). The PCs panel shows a per-seat Connected / Disconnected button that flips it.
- **By Connection Status** (live play): the chronicle Steam id for that color is connected. PCs-panel connection buttons are hidden.

| Event | Effect | Timing |
| --- | --- | --- |
| Connect (`PC.handleSeatConnected`) | Clear `absentFromSession`, assign a chair (fixed tables: `C.DefaultTableSlots[color]`; random tables: lowest free chair; Scatter: an empty scatter group), relayout, remirror token, `Sync.player` | Immediate — no blindfold |
| Disconnect (`PC.handleSeatDisconnected`) | Seat darkens via effective presence; chair kept | Immediate |
| Blindfold checkpoint (`PC.applyConnectionCheckpoint`) | Every PC still disconnected and not yet `absentFromSession`: set it, clear `tableSlot`, stash pile + hand + cards, park the control-board token beneath the board. Other seats do not shift. | Under cover, before transition work |
| Load (`M.setupPlayers`) | Session start: checkpoint, then connect every connected seat | Immediate |

Checkpoint call sites:

- `HUDBF.runStagedTransition` and `HUDBF.runTransition` — before the covered work (scene Apply, scene end, table toggle, location Apply, Memoriam, Play → Spotlight, Spotlight → End, `RSL.SetTableTo` own cover)
- `Phases.onEnter[PLAY]` after the session cover is raised (Intermission → Play)
- `Phases.onEnter[INTERMISSION]` before the no-scene default (End → Intermission)

Scenes, tables, and phases never author `absentFromSession`: every wholesale seat-row replacement runs `FSL.carryLiveAbsenceOnto` (scene Apply, Scatter stash restore, Scatter → table seeding, control-board preview draft).

## Table B

A Table B variant always has chairs for **all five PCs plus every seated NPC** (5 + seated NPCs, at most B4 = 9), so a connecting PC can always sit down without a table transition. Random seating shuffles all five PCs and the seated NPCs into chairs 1..N; a disconnected PC's drawn chair stays empty.

## Control-board PC tokens

- A connected PC's token always sits on a chair snap. Dropping it anywhere else snaps it straight back to its chair. Swapping two PC tokens between chairs and clicking Apply reseats them.
- A disconnected (`absentFromSession`) PC's token is locked a few units beneath the control board (hidden from view). It is not part of the Y = −200 hide/restore park.
- No control-board action can make a PC Unoccupied.
