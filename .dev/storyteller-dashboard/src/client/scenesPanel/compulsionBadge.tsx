import type { ReactElement } from "react";
import { compulsionKey, compulsionName, type ActiveCompulsion } from "../../shared/compulsionText";
import { useCompulsionText } from "../compulsionText";

/**
 * The selected Compulsion over a PC's seat, named on a red tag; hovering shows the card's Influence, Burden and
 * Catharsis from `data/compulsion-text.json` (placeholder text until the Photoshop dump is imported).
 */
export const CompulsionBadge = ({ active, clan }: { active: ActiveCompulsion; clan: string }): ReactElement => {
  const { file, error } = useCompulsionText();
  const name = compulsionName(active, clan);
  const text = name ? file?.entries[compulsionKey(name, active.n)] : undefined;
  const title = name ? `${name} ${active.n}` : `Clan Compulsion ${active.n}`;
  const problem = error
    ?? (!name ? `No Compulsion is listed for the clan "${clan}".` : file && !text ? `No text for ${compulsionKey(name, active.n)} yet.` : null);
  return (
    <span className="lab-compulsion">
      {name ?? "Compulsion"}
      <span className="lab-compulsion-tip" role="tooltip">
        <span className="lab-compulsion-title">
          {title}
          {file?.placeholder && <span className="lab-compulsion-placeholder">placeholder text</span>}
        </span>
        {problem && <span className="lab-note">{problem}</span>}
        {text && (
          <>
            <span className="lab-compulsion-head">Influence</span>
            <span className="lab-compulsion-text">{text.influence}</span>
            <span className="lab-compulsion-head">Burden</span>
            <span className="lab-compulsion-text">{text.burden}</span>
            <span className="lab-compulsion-head">Catharsis</span>
            <span className="lab-compulsion-text">{text.catharsis}</span>
          </>
        )}
        {!file && !problem && <span className="lab-note">Loading the card text…</span>}
      </span>
    </span>
  );
};
