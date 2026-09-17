import { useEffect, useState, type MouseEvent, type ReactElement } from "react";
import { chronologyFor, identityForColor, subtitleFor } from "./identity.js";
import { ATTRIBUTE_COLUMNS, ATTRIBUTE_LABELS, SKILL_COLUMNS, SKILL_LABELS, assetUrl } from "./layout.js";
import { DotLine } from "./DotLine.js";
import { paintDamageTrack, paintDotLine, paintHumanityTrack } from "./paint.js";
import type { RingAction, SeatColor, SeatSnapshot, Specialty } from "./types.js";

type Props = {
  readonly seat: SeatSnapshot;
  readonly onRing: (event: MouseEvent<HTMLElement>, actions: readonly RingAction[]) => void;
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

const ratingOrZero = (map: Record<string, { base: number; temp: number }>, key: string) =>
  map[key] ?? { base: 0, temp: 0 };

export const PageOne = ({ seat, onRing, onDesire }: Props): ReactElement => {
  const [desireDraft, setDesireDraft] = useState(seat.desire);
  useEffect(() => {
    setDesireDraft(seat.desire);
  }, [seat.color, seat.desire]);
  const identity = identityForColor(seat.color as SeatColor);
  const healthBoxes = paintDamageTrack(seat.health, seat.healthMax);
  const willBoxes = paintDamageTrack(seat.willpower, seat.willpowerMax);
  const humanityBoxes = paintHumanityTrack(seat.humanity, seat.humanityMax);
  const bpDots = paintDotLine("bloodPotency", seat.bloodPotency, seat.resolvedStatChanges.bloodPotency ?? 0);
  const hungerDots = Array.from({ length: seat.hungerMax }, (_, index) => ({
    active: index < seat.hunger,
    image: "dot_red" as const
  }));

  const openDots = (event: MouseEvent<HTMLElement>, family: "attributes" | "skills" | "bloodPotency", key: string): void => {
    onRing(event, [
      { id: "base-minus", label: "Base −", command: { op: "dotDelta", color: seat.color, family, key, field: "base", delta: -1 } },
      { id: "base-plus", label: "Base +", command: { op: "dotDelta", color: seat.color, family, key, field: "base", delta: 1 } },
      { id: "temp-minus", label: "Temp −", command: { op: "dotDelta", color: seat.color, family, key, field: "temp", delta: -1 } },
      { id: "temp-plus", label: "Temp +", command: { op: "dotDelta", color: seat.color, family, key, field: "temp", delta: 1 } }
    ]);
  };

  const openDamage = (event: MouseEvent<HTMLElement>, which: "health" | "willpower"): void => {
    onRing(event, [
      { id: "sup", label: "Sup", command: { op: "damage", color: seat.color, which, superficialDelta: 1, aggravatedDelta: 0 } },
      { id: "agg", label: "Agg", command: { op: "damage", color: seat.color, which, superficialDelta: 0, aggravatedDelta: 1 } },
      { id: "heal1", label: "Heal", command: { op: "damage", color: seat.color, which, superficialDelta: -1, aggravatedDelta: 0 } },
      { id: "healAll", label: "Clear", command: { op: "damage", color: seat.color, which, superficialDelta: -99, aggravatedDelta: -99 } }
    ]);
  };

  return (
    <article className="pc-page pc-page-one">
      <header className="pc-header">
        <h1 className="pc-name">{identity.fullName}</h1>
        <p className="pc-subtitle">{subtitleFor(identity)}</p>
        <p className="pc-chrono">{chronologyFor(identity)}</p>
        {identity.ambition !== "" ? <p className="pc-ambition">“{identity.ambition}”</p> : null}
        <input
          className={`pc-desire${desireDraft.trim() === "" ? " unset" : ""}`}
          value={desireDraft}
          placeholder="Enter your Desire …"
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
              const delta = seat.resolvedStatChanges[key] ?? 0;
              return (
                <button
                  key={key}
                  className="pc-trait"
                  type="button"
                  onClick={(event) => openDots(event, "attributes", key)}
                >
                  <span className="pc-trait-label">{ATTRIBUTE_LABELS[key]}:</span>
                  <DotLine slots={paintDotLine(key, rating, delta)} />
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
              const delta = seat.resolvedStatChanges[key] ?? 0;
              const specs = specialtiesFor(seat, key);
              return (
                <button
                  key={key}
                  className="pc-trait skill"
                  type="button"
                  onClick={(event) => openDots(event, "skills", key)}
                >
                  <span className="pc-trait-copy">
                    <span className="pc-trait-label">{SKILL_LABELS[key]}</span>
                    {delta !== 0 ? <span className="pc-badge">{delta > 0 ? `+${delta}` : delta}</span> : null}
                    {specs.map((spec) => (
                      <span key={`${spec.name}-${spec.decade ?? ""}`} className={`pc-spec ${spec.type}`}>
                        {spec.name}
                        {spec.type === "archaic" ? <i>{decadeLabel(spec.decade)}</i> : null}
                      </span>
                    ))}
                  </span>
                  <DotLine slots={paintDotLine(key, rating, delta)} />
                </button>
              );
            })}
          </div>
        ))}
      </section>

      <footer className="pc-trackers">
        <button className="pc-track" type="button" onClick={(event) => openDamage(event, "health")}>
          <span className="pc-track-label">Health</span>
          <span className="pc-boxes">
            {healthBoxes.slice(0, seat.healthMax).map((box, index) => (
              <span
                key={index}
                className={`pc-box${box.active ? " on" : ""}`}
                style={box.active && box.image ? { backgroundImage: `url("${assetUrl(`boxes/${box.image}.webp`)}")` } : undefined}
              />
            ))}
          </span>
          <span className="pc-track-note">Mend for {seat.mending}</span>
        </button>
        <button
          className="pc-xp"
          type="button"
          onClick={(event) => onRing(event, [
            { id: "xp-5", label: "−5", command: { op: "xp", color: seat.color, delta: -5 } },
            { id: "xp-1", label: "−1", command: { op: "xp", color: seat.color, delta: -1 } },
            { id: "xp+1", label: "+1", command: { op: "xp", color: seat.color, delta: 1 } },
            { id: "xp+5", label: "+5", command: { op: "xp", color: seat.color, delta: 5 } }
          ])}
        >
          <img src={assetUrl("dots/xp_jewel.webp")} alt="" />
          <strong>{seat.xp}</strong>
          <span>XP</span>
        </button>
        <button className="pc-track" type="button" onClick={(event) => openDamage(event, "willpower")}>
          <span className="pc-track-label">Willpower</span>
          <span className="pc-boxes">
            {willBoxes.slice(0, seat.willpowerMax).map((box, index) => (
              <span
                key={index}
                className={`pc-box${box.active ? " on" : ""}`}
                style={box.active && box.image ? { backgroundImage: `url("${assetUrl(`boxes/${box.image}.webp`)}")` } : undefined}
              />
            ))}
          </span>
        </button>
        <button
          className="pc-track"
          type="button"
          onClick={(event) => onRing(event, [
            { id: "stain+", label: "Stain +", command: { op: "humanity", color: seat.color, kind: "stain", delta: 1 } },
            { id: "stain-", label: "Stain −", command: { op: "humanity", color: seat.color, kind: "stain", delta: -1 } },
            { id: "clear", label: "Clear", command: { op: "humanity", color: seat.color, kind: "clearStains" } },
            { id: "hum+", label: "Hum +", command: { op: "humanity", color: seat.color, kind: "base", delta: 1 } },
            { id: "hum-", label: "Hum −", command: { op: "humanity", color: seat.color, kind: "base", delta: -1 } }
          ])}
        >
          <span className="pc-track-label">Humanity</span>
          <span className="pc-boxes">
            {humanityBoxes.map((box, index) => (
              <span
                key={index}
                className={`pc-box${box.active ? " on" : ""}`}
                style={box.active && box.image ? { backgroundImage: `url("${assetUrl(`boxes/${box.image}.webp`)}")` } : undefined}
              />
            ))}
          </span>
        </button>
        <div className="pc-track-stack">
          <button className="pc-track" type="button" onClick={(event) => openDots(event, "bloodPotency", "bloodPotency")}>
            <span className="pc-track-label">Blood Potency</span>
            <DotLine slots={bpDots} large />
            <span className="pc-track-note">Blood Surge for +{seat.bloodSurge}</span>
          </button>
          <button
            className="pc-track hunger"
            type="button"
            onClick={(event) => onRing(event, [
              { id: "hg-", label: "−1", command: { op: "hunger", color: seat.color, delta: -1 } },
              { id: "hg+", label: "+1", command: { op: "hunger", color: seat.color, delta: 1 } }
            ])}
          >
            <span className="pc-track-label">Hunger</span>
            <DotLine slots={hungerDots} />
          </button>
        </div>
      </footer>
    </article>
  );
};
