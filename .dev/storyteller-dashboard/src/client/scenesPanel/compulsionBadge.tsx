import type { ReactElement } from "react";
import { compulsionKey, compulsionName, type ActiveCompulsion } from "../../shared/compulsionText";
import { useCompulsions } from "../compulsionText";

/**
 * The selected Compulsion over a PC's seat, named on a red tag; hovering shows the card's Influence, Burden and
 * Catharsis from `data/compulsions.jsonc`.
 */
export const CompulsionBadge = ({ active, clan }: { active: ActiveCompulsion; clan: string }): ReactElement => {
  const { compulsions, error } = useCompulsions();
  const name = compulsions ? compulsionName(active, clan, compulsions) : undefined;
  const card = name ? compulsions?.cards[compulsionKey(name, active.n)] : undefined;
  const problem = error
    ?? (compulsions && !name
      ? active.type.toLowerCase() === "clan"
        ? `No Compulsion in compulsions.jsonc names the clan "${clan}".`
        : `No Compulsion named "${active.type}" in compulsions.jsonc.`
      : compulsions && name && !card ? `compulsions.jsonc has no card ${active.n} for ${name}.` : null);
  return (
    <span className="lab-compulsion">
      {name ?? "Compulsion"}
      <span className="lab-compulsion-tip" role="tooltip">
        <span className="lab-compulsion-title">
          {name ?? "Compulsion"}
          <span className="lab-compulsion-card">card {active.n}</span>
        </span>
        {problem && <span className="lab-note">{problem}</span>}
        {card && (
          <>
            <span className="lab-compulsion-head">Influence: <b>{card.influence.title}</b></span>
            <span className="lab-compulsion-text">{card.influence.description}</span>
            <span className="lab-compulsion-head">Burden: <b>{card.burden.title}</b></span>
            <span className="lab-compulsion-flavor">{card.burden.flavor}</span>
            <span className="lab-compulsion-text">{card.burden.description}</span>
            <span className="lab-compulsion-head">Catharsis: <b>{card.catharsis.title}</b></span>
            <span className="lab-compulsion-text">{card.catharsis.description}</span>
          </>
        )}
        {!compulsions && !problem && <span className="lab-note">Loading the card text…</span>}
      </span>
    </span>
  );
};
