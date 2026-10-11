import { useState, type DragEvent, type ReactElement } from "react";
import type { LibraryScene } from "../../shared/sceneLibrary";
import { Headshot } from "../headshots/Headshot";
import { useWorldState } from "../worldState";
import { applyToDraft, draftSeatRows, draftSeatSlots, holderOfChair } from "./library";
import { isSeatColor } from "../catalogVocab";
import { liveSeats, tableUsesRandomSeating } from "./liveScene";
import { useSceneCatalogs } from "./roster";
import { startRosterDrag } from "./rosterDrag";
import { Overlay, Seats, type SeatDrops } from "./sketch";
import { NPC_DRAG_TYPE, SEAT_DRAG_TYPE } from "./stage";
import { orphanNpc, seatingChanged, seatOrphan, withSeatingOf, type SeatingEdit, type TransitionSeating } from "./transitionSeating";

/** A scene switch waiting on its seating: the scene being moved to, where the strip starts, and what runs next. */
export type SeatingAsk = {
  readonly destination: LibraryScene;
  readonly start: TransitionSeating;
  /** Runs once the strip is confirmed; `undefined` when it left the destination's seating as it was. */
  readonly then: (edit: SeatingEdit | undefined) => void;
};


/**
 * Shown before every switch away from a scene on the table: the next scene's seats, starting from the table's
 * (`carryOverSeating`). Clicking a seat takes that character out of the next scene or brings them in. Seated
 * NPCs drag between chairs, or off the strip to be left behind; NPCs left without a chair wait red-ringed
 * underneath and drag onto a chair (the NPC there swaps out). PCs only toggle. Continue writes the seating into
 * the scene's library row as it plays (`SeatingEdit`); Cancel or clicking off drops the switch.
 */
export const TransitionSeatingModal = ({ ask, onClose }: { ask: SeatingAsk; onClose: () => void }): ReactElement => {
  const { catalogs } = useSceneCatalogs();
  const tableSeats = useWorldState().seats?.seats ?? [];
  const [state, setState] = useState(ask.start);
  const [overOrphans, setOverOrphans] = useState(false);
  const tableKey = typeof ask.destination.sessionScene.tableKey === "string" ? ask.destination.sessionScene.tableKey : "";
  const seats = liveSeats({ seats: draftSeatRows(state.row, tableSeats), stage: [], generics: [], scatter: [], spotlightOrder: [] }, tableKey, catalogs);
  const nameOf = (characterKey: string): string =>
    catalogs?.namedNpcs.find((npc) => npc.characterKey === characterKey)?.fullName ?? characterKey;
  const seating: SeatDrops = {
    move: (seat, chair) =>
      setState((current) =>
        isSeatColor(seat) || isSeatColor(holderOfChair(draftSeatSlots(current.row), chair))
          ? current
          : { ...current, row: applyToDraft(current.row, { op: "seatMove", seat, chair }) }),
    seatNpc: (characterKey, chair) => setState((current) => seatOrphan(current, characterKey, chair)),
    displace: (characterKey, chair) => setState((current) => seatOrphan(current, characterKey, chair))
  };
  const leavesSeat = (event: DragEvent<HTMLElement>): boolean =>
    event.dataTransfer.types.includes(SEAT_DRAG_TYPE) && event.dataTransfer.types.includes(NPC_DRAG_TYPE);
  const proceed = (): void => {
    const edited = state.row;
    onClose();
    ask.then(seatingChanged(ask.destination, edited) ? (row) => withSeatingOf(row, edited) : undefined);
  };
  return (
    <Overlay onClose={onClose}>
      <div className="lab-modal lab-transition">
        <span className="lab-modal-title">Seating for {ask.destination.title}</span>
        <p className="lab-transition-hint">
          The table's seating, carried into the next scene (its own seating wins any clash). Click a seat to take
          that character out of the scene or bring them in. Drag an NPC off the strip to leave them behind.
        </p>
        <div className="lab-transition-seats">
          <Seats seats={seats} onPresence={(seat, present) => setState((current) => ({ ...current, row: applyToDraft(current.row, { op: "seatPresence", seat, present }) }))} seating={seating} />
        </div>
        <div
          className={`lab-transition-orphans${overOrphans ? " drop" : ""}`}
          onDragOver={(event) => {
            if (leavesSeat(event)) {
              event.preventDefault();
              setOverOrphans(true);
            }
          }}
          onDragLeave={() => setOverOrphans(false)}
          onDrop={(event) => {
            setOverOrphans(false);
            const characterKey = event.dataTransfer.getData(NPC_DRAG_TYPE);
            if (characterKey && event.dataTransfer.getData(SEAT_DRAG_TYPE)) {
              setState((current) => orphanNpc(current, characterKey));
            }
          }}
        >
          {state.orphans.length === 0 ? (
            <span className="lab-transition-empty">No one is left behind. Drag a seated NPC here to leave them out of the next scene.</span>
          ) : (
            state.orphans.map((characterKey) => (
              <div
                key={characterKey}
                className="lab-transition-orphan"
                title={`${nameOf(characterKey)}: left behind. Drag onto a chair to seat them (the NPC there is left behind instead).`}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(NPC_DRAG_TYPE, characterKey);
                  event.dataTransfer.effectAllowed = "move";
                  startRosterDrag(event, [{ characterKey, name: nameOf(characterKey) }]);
                }}
              >
                <Headshot className="lab-transition-orphan-head" characterKey={characterKey} />
                <span className="lab-transition-orphan-name">{nameOf(characterKey)}</span>
              </div>
            ))
          )}
        </div>
        {tableUsesRandomSeating(tableKey, catalogs) && (
          <p className="lab-transition-hint">{tableKey || "This table"} shuffles its chairs when the scene starts: who is seated carries over, not which chair.</p>
        )}
        <div className="lab-modal-actions">
          <button type="button" className="lab-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="lab-btn primary" onClick={proceed}>Continue ▸</button>
        </div>
      </div>
    </Overlay>
  );
};
