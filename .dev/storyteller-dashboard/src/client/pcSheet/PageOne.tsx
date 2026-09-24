import { useEffect, useState, type MouseEvent, type ReactElement } from "react";
import { bankedXpFromLog } from "./bankedXp.js";
import { chronologyFor, identityFromSeat, subtitleFor } from "./identity.js";
import { ATTRIBUTE_COLUMNS, ATTRIBUTE_LABELS, SKILL_COLUMNS, SKILL_LABELS, assetUrl } from "./layout.js";
import { DotLine } from "./DotLine.js";
import { paintDamageTrack, paintDotLine, paintHumanityTrack } from "./paint.js";
import { formatBadge } from "./ringActions.js";
import type { RingTarget, SeatSnapshot, Specialty } from "./types.js";

type Props = {
  readonly seat: SeatSnapshot;
  readonly onRing: (event: MouseEvent<HTMLElement>, target: RingTarget) => void;
  readonly onCommand: (deltaHungerOrXp: { op: "hunger" | "xp"; delta: number }) => void;
  readonly onDesire: (text: string) => void;
};

const COLUMN_TITLES = ["Physical", "Social", "Mental"] as const;

const specialtiesFor = (seat: SeatSnapshot, skill: string): readonly Specialty[] =>
  seat.specialties.filter((row) => row.skill === skill);

const decadeLabel = (decade?: number): string => {
  if (typeof decade !== "number") {
    return "";
  }
  return `[${decade}s]`;
};

const ratingOrZero = (map: Record<string, SeatSnapshot["bloodPotency"]>, key: string) =>
  map[key] ?? { base: 0, temp: 0, disabled: 0 };

const SpecialtiesLine = ({ specs }: { readonly specs: readonly Specialty[] }): ReactElement | null => {
  if (specs.length === 0) {
    return null;
  }
  return (
    <span className="pc-specs">
      {specs.map((spec, index) => (
        <span key={`${spec.name}-${spec.decade ?? index}`}>
          {index > 0 ? <span className="pc-spec-sep"> ◆ </span> : null}
          <span className={`pc-spec ${spec.type}`}>
            {spec.name}
            {spec.type === "archaic" ? <i>{decadeLabel(spec.decade)}</i> : null}
          </span>
        </span>
      ))}
    </span>
  );
};

const BoxTrack = ({ boxes }: { readonly boxes: ReturnType<typeof paintDamageTrack> }): ReactElement => (
  <span className="pc-boxes">
    {boxes.map((box, index) => (
      <span
        key={index}
        className={`pc-box${box.active ? " on" : ""}`}
        style={box.active && box.image ? { backgroundImage: `url("${assetUrl(`boxes/${box.image}.webp`)}")` } : undefined}
      />
    ))}
  </span>
);

export const PageOne = ({ seat, onRing, onCommand, onDesire }: Props): ReactElement => {
  const [desireDraft, setDesireDraft] = useState(seat.desire);
  useEffect(() => {
    setDesireDraft(seat.desire);
  }, [seat.color, seat.desire]);
  const identity = identityFromSeat(seat);
  const ambition = identity.ambition.trim();
  const subtitle = subtitleFor(identity);
  const chronology = chronologyFor(identity);
  const healthBoxes = paintDamageTrack(seat.health, seat.healthMax);
  const willBoxes = paintDamageTrack(seat.willpower, seat.willpowerMax);
  const humanityBoxes = paintHumanityTrack(seat.humanity, seat.humanityMax);
  const bpDots = paintDotLine("bloodPotency", seat.bloodPotency);
  const hungerDots = Array.from({ length: seat.hungerMax }, (_, index) => ({
    active: index < seat.hunger,
    image: "dot_red" as const
  }));

  const nudge = (op: "hunger" | "xp", event: MouseEvent<HTMLElement>, delta: number): void => {
    event.preventDefault();
    onCommand({ op, delta });
  };

  return (
    <article className="pc-page pc-page-one">
      <header className="pc-header">
        <h1 className="pc-name">{identity.fullName}</h1>
        {subtitle !== "" ? <p className="pc-subtitle">{subtitle}</p> : null}
        {chronology !== "" ? <p className="pc-chrono">{chronology}</p> : null}
        {ambition !== "" ? <p className="pc-ambition">“{ambition}”</p> : null}
        <input
          className={`pc-desire${desireDraft.trim() === "" ? " unset" : ""}`}
          value={desireDraft}
          placeholder="Player has not selected a Desire ..."
          onChange={(event) => setDesireDraft(event.target.value)}
          onBlur={(event) => onDesire(event.target.value)}
        />
        <div className="pc-convictions">
          {identity.convictions.map((text) => (
            <p key={text}>“{text}”</p>
          ))}
        </div>
      </header>

      <section className="pc-grid pc-attributes" aria-label="Attributes">
        {ATTRIBUTE_COLUMNS.map((column, columnIndex) => (
          <div key={columnIndex} className="pc-col">
            <h2 className="pc-col-title">{COLUMN_TITLES[columnIndex]}</h2>
            {column.map((key) => {
              const rating = ratingOrZero(seat.attributes, key);
              const badge = seat.badges[key] ?? 0;
              return (
                <button
                  key={key}
                  className="pc-trait"
                  type="button"
                  onClick={(event) => onRing(event, { kind: "trait", family: "attributes", key })}
                >
                  <span className="pc-trait-copy">
                    <span className="pc-trait-label">{ATTRIBUTE_LABELS[key]}</span>
                    {badge !== 0 ? <span className="pc-badge">{formatBadge(badge)}</span> : null}
                  </span>
                  <DotLine slots={paintDotLine(key, rating)} />
                </button>
              );
            })}
          </div>
        ))}
      </section>

      <section className="pc-grid pc-skills" aria-label="Skills">
        {SKILL_COLUMNS.map((column, columnIndex) => (
          <div key={columnIndex} className="pc-col">
            <h2 className="pc-col-title">{COLUMN_TITLES[columnIndex]}</h2>
            {column.map((key) => {
              const rating = ratingOrZero(seat.skills, key);
              const badge = seat.badges[key] ?? 0;
              const specs = specialtiesFor(seat, key);
              return (
                <button
                  key={key}
                  className="pc-trait skill"
                  type="button"
                  onClick={(event) => onRing(event, { kind: "trait", family: "skills", key })}
                >
                  <span className="pc-trait-copy">
                    <span className="pc-trait-label">{SKILL_LABELS[key]}</span>
                    {badge !== 0 ? <span className="pc-badge">{formatBadge(badge)}</span> : null}
                    <SpecialtiesLine specs={specs} />
                  </span>
                  <DotLine slots={paintDotLine(key, rating)} />
                </button>
              );
            })}
          </div>
        ))}
      </section>

      <footer className="pc-trackers">
        <button className="pc-track" type="button" onClick={(event) => onRing(event, { kind: "damage", which: "health" })}>
          <span className="pc-track-label">Health</span>
          <BoxTrack boxes={healthBoxes} />
          <span className="pc-track-note">Mend for <b>+{seat.mending}</b></span>
        </button>
        <button
          className="pc-xp"
          type="button"
          onClick={(event) => nudge("xp", event, 1)}
          onContextMenu={(event) => nudge("xp", event, -1)}
        >
          <img src={assetUrl("dots/xp_jewel.webp")} alt="" />
          <strong>{bankedXpFromLog(seat.xp)}</strong>
          <span>XP</span>
        </button>
        <button className="pc-track" type="button" onClick={(event) => onRing(event, { kind: "damage", which: "willpower" })}>
          <span className="pc-track-label">Willpower</span>
          <BoxTrack boxes={willBoxes} />
        </button>
        <button className="pc-track" type="button" onClick={(event) => onRing(event, { kind: "humanity" })}>
          <span className="pc-track-label">Humanity</span>
          <BoxTrack boxes={humanityBoxes} />
        </button>
        <div className="pc-track-stack">
          <button className="pc-track" type="button" onClick={(event) => onRing(event, { kind: "bloodPotency" })}>
            <span className="pc-track-label">Blood Potency</span>
            <DotLine slots={bpDots} large />
            <span className="pc-track-note">Blood Surge for <b>+{seat.bloodSurge}</b></span>
          </button>
          <button
            className="pc-track hunger"
            type="button"
            onClick={(event) => nudge("hunger", event, 1)}
            onContextMenu={(event) => nudge("hunger", event, -1)}
          >
            <span className="pc-track-label">Hunger</span>
            <DotLine slots={hungerDots} />
          </button>
        </div>
      </footer>
    </article>
  );
};
