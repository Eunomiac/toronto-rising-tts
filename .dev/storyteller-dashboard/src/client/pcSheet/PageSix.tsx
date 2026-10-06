import { useState, type ReactElement } from "react";
import { bankedXpFromLog } from "./bankedXp.js";
import { assetUrl } from "./layout.js";
import type { PageContext } from "./pages.js";
import { parseXpLog, type XpEntry, type XpSession } from "./sheetData.js";
import { formatShortDate, formatSummation, sessionTitleUpper } from "./xpDisplay.js";
import { XpModal } from "./XpModal.js";

const EntryList = ({ entries, kind }: { readonly entries: readonly XpEntry[]; readonly kind: "gain" | "spend" }): ReactElement => (
  <ul className={`pc-xp-entries ${kind}`}>
    {entries.map((entry, index) => (
      <li key={index}>
        <b>{kind === "gain" ? "+" : "−"}{entry.amount} XP</b>
        <span>{entry.description}</span>
      </li>
    ))}
  </ul>
);

const SessionBlock = ({ session, live }: { readonly session: XpSession; readonly live: boolean }): ReactElement => {
  const date = formatShortDate(session.date);
  return (
    <section className={`pc-xp-session${live ? " live" : ""}`}>
      <header className="pc-xp-session-title">
        <span>{sessionTitleUpper(session.sessionDisplay, session.num)}</span>
        {date !== "" ? <span className="pc-xp-date">{date}</span> : null}
      </header>
      <div className="pc-xp-bins">
        <EntryList entries={session.gains} kind="gain" />
        <EntryList entries={session.spends} kind="spend" />
      </div>
      <p className="pc-xp-sum">
        {formatSummation(session.prevTotal, session.gainTotal, session.spendTotal)} <b>{session.newTotal} XP</b>
      </p>
    </section>
  );
};

export const PageSix = ({ ctx }: { readonly ctx: PageContext }): ReactElement => {
  const [adding, setAdding] = useState(false);
  const sessions = parseXpLog(ctx.seat.playerData);
  const liveNum = ctx.snapshot.sessionNum;
  return (
    <article className={`pc-page pc-sheet-page pc-page-six ${ctx.side}`}>
      <div className="pc-divider">
        <h3 className="pc-section-title">Experience Log</h3>
        <button type="button" className="pc-add-text" onClick={() => setAdding(true)}>+ Entry</button>
      </div>
      <div className="pc-xp-head">
        <button type="button" className="pc-xp" title="Add an Experience Log entry" onClick={() => setAdding(true)}>
          <span className="pc-xp-jewel">
            <img src={assetUrl("dots/xp_jewel.webp")} alt="" />
            <strong>{bankedXpFromLog(ctx.seat.playerData.xp)}</strong>
          </span>
          <span>XP</span>
        </button>
      </div>
      <div className="pc-xp-log">
        {sessions.map((session) => <SessionBlock key={session.key} session={session} live={session.num === liveNum} />)}
      </div>
      {adding ? <XpModal seat={ctx.seat} snapshot={ctx.snapshot} send={ctx.applyNow} onClose={() => setAdding(false)} /> : null}
    </article>
  );
};
