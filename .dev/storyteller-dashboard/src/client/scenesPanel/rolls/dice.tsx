import type { CSSProperties, MouseEvent, ReactElement } from "react";
import { Overlay } from "../../lab/sketch";
import type { PoolKind, RollDie, RollPool } from "../../worldState";
import { dieFaceSrc, poolDiamonds, poolText, type PoolRingChoice } from "./view";

/** A pool as diamonds, coloured by kind, as on the players' in-game roll controls. */
export const PoolDiamonds = ({ pool, onClick }: { pool: RollPool; onClick?: (event: MouseEvent<HTMLElement>) => void }): ReactElement => {
  const { rouse, runs } = poolDiamonds(pool);
  const empty = rouse.length === 0 && runs.length === 0;
  const body = (
    <>
      {rouse.length > 0 && (
        <span className="pool-run rouse">
          {rouse.map((kind, index) => <span key={index} className={`pool-dia ${kind}`}>◆</span>)}
        </span>
      )}
      {runs.map((run, runIndex) => (
        <span key={runIndex} className="pool-run">
          {run.map((kind, index) => <span key={index} className={`pool-dia ${kind}`}>◆</span>)}
        </span>
      ))}
      {empty && <span className="pool-empty">{onClick ? "+" : "—"}</span>}
    </>
  );
  return onClick ? (
    <button type="button" className="pool-diamonds editable" title={`Pool ${poolText(pool)}. Click to add or remove dice.`} onClick={onClick}>
      {body}
    </button>
  ) : (
    <span className="pool-diamonds" title={`Pool ${poolText(pool)}`}>{body}</span>
  );
};

/** Rolled dice as face art; a pickable die toggles in or out of the Storyteller's reroll. */
export const RolledDice = ({ dice, pickable, onPick }: { dice: readonly RollDie[]; pickable: boolean; onPick?: (index: number) => void }): ReactElement | null =>
  dice.length === 0 ? null : (
    <div className="rolled-dice">
      {dice.map((die, index) => (
        <button
          key={index}
          type="button"
          className={`rolled-die ${die.kind}${die.selected ? " selected" : ""}${die.value === undefined ? " unread" : ""}`}
          disabled={!pickable}
          title={`${die.kind} ${die.value ?? "?"}${pickable ? " (click to pick for the reroll)" : ""}`}
          onClick={() => onPick?.(index + 1)}
        >
          <img src={dieFaceSrc(die.kind, die.value)} alt="" draggable={false} />
        </button>
      ))}
    </div>
  );

const RING_R = 46;

/**
 * The pool's dice ring, opened by clicking a pool: one spoke per die kind the Storyteller may change, with its
 * count. Left-click adds a die of that kind, right-click removes one; the centre shows the pool as it stands.
 */
export const DiceRing = ({ x, y, pool, choices, onChange, onClose }: {
  x: number;
  y: number;
  pool: RollPool;
  choices: readonly PoolRingChoice[];
  onChange: (kind: PoolKind, delta: 1 | -1) => void;
  onClose: () => void;
}): ReactElement => (
  <Overlay onClose={onClose}>
    <div className="dice-ring" style={{ left: x, top: y }}>
      <span className="dice-ring-centre"><PoolDiamonds pool={pool} /></span>
      {choices.map((choice, index) => {
        const angle = Math.PI + (index / choices.length) * Math.PI * 2;
        return (
          <button
            key={choice.kind}
            type="button"
            className={`dice-ring-btn ${choice.kind}`}
            style={{ left: Math.cos(angle) * RING_R * 1.6, top: Math.sin(angle) * RING_R } as CSSProperties}
            title={`${choice.label}: left-click to add a die, right-click to remove one`}
            onClick={() => onChange(choice.kind, 1)}
            onContextMenu={(event) => {
              event.preventDefault();
              onChange(choice.kind, -1);
            }}
          >
            <img src={dieFaceSrc(choice.kind, 6)} alt="" draggable={false} />
            <span className="dice-ring-count">{pool[choice.kind] ?? 0}</span>
          </button>
        );
      })}
    </div>
  </Overlay>
);
