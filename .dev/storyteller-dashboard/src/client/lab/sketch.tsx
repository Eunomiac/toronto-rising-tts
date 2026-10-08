import type { CSSProperties, ReactElement, ReactNode } from "react";

/**
 * Grey-box building blocks for Lab sketches. Every sketch is laid out in absolute pixels on the
 * fixed 1920×1042 canvas (1080 minus the app tab bar), so sizes on screen are the real sizes.
 */

export const CANVAS_W = 1920;
export const CANVAS_H = 1042;

export type Tier = "A" | "B" | "C" | "D";
export type BoxTone = "plain" | "preview" | "reserved" | "popover";

export type SketchState = {
  readonly previewOpen: boolean;
  readonly clockDiffers: boolean;
  readonly weatherOverride: boolean;
  readonly popoverOpen: boolean;
};

type BoxProps = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly title: string;
  readonly tier?: Tier;
  readonly tone?: BoxTone;
  readonly lines?: readonly string[];
  readonly children?: ReactNode;
  readonly className?: string;
};

export const Box = ({ x, y, w, h, title, tier, tone = "plain", lines, children, className }: BoxProps): ReactElement => (
  <section className={`lab-box ${tone}${className ? ` ${className}` : ""}`} style={{ left: x, top: y, width: w, height: h }}>
    <header className="lab-box-head">
      <span className="lab-box-title">{title}</span>
      {tier && <span className={`lab-box-tier tier-${tier}`}>{tier}</span>}
      <span className="lab-box-size">{w}×{h}</span>
    </header>
    {children && <div className="lab-box-body">{children}</div>}
    {lines && lines.length > 0 && (
      <ul className="lab-box-lines">
        {lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
    )}
  </section>
);

/** Small labelled placeholder used inside boxes. */
export const Chip = ({ children, tone, style }: { children: ReactNode; tone?: "on" | "warn" | "dim" | "accent"; style?: CSSProperties }): ReactElement => (
  <span className={`lab-chip${tone ? ` ${tone}` : ""}`} style={style}>{children}</span>
);

export const Btn = ({ children, tone }: { children: ReactNode; tone?: "primary" | "danger" | "live" }): ReactElement => (
  <span className={`lab-btn${tone ? ` ${tone}` : ""}`}>{children}</span>
);

/* ---------- seats ---------- */

type SeatSketch = {
  readonly seat: string;
  readonly who: string;
  readonly kind: "pc" | "npc" | "empty";
  readonly state?: "absent" | "disconnected";
  readonly role?: string;
};

/** Left-to-right order of the control board seat row. */
export const SEATS: readonly SeatSketch[] = [
  { seat: "NPC4", who: "empty", kind: "empty" },
  { seat: "NPC2", who: "Lexie", kind: "npc" },
  { seat: "Purple", who: "Ana", kind: "pc", role: "as Prince Vargas" },
  { seat: "Pink", who: "Jo", kind: "pc", state: "disconnected" },
  { seat: "Red", who: "Sam", kind: "pc", state: "absent" },
  { seat: "Orange", who: "Dee", kind: "pc" },
  { seat: "Brown", who: "Kai", kind: "pc" },
  { seat: "NPC1", who: "Rashid", kind: "npc" },
  { seat: "NPC3", who: "empty", kind: "empty" }
];

/** Row seats share the width evenly; column seats take `rowHeight` each. */
export const Seats = ({ direction, rowHeight }: { direction: "row" | "column"; rowHeight?: number }): ReactElement => (
  <div className={`lab-seats ${direction}`}>
    {SEATS.map((seat) => (
      <div
        key={seat.seat}
        className={`lab-seat ${seat.kind}${seat.state ? ` ${seat.state}` : ""}`}
        style={rowHeight === undefined ? undefined : { height: rowHeight }}
      >
        <span className="lab-seat-token" />
        <span className="lab-seat-text">
          <span className="lab-seat-name">{seat.who}</span>
          <span className="lab-seat-key">{seat.seat}</span>
          {seat.state === "absent" && <span className="lab-seat-flag">absent (dark)</span>}
          {seat.state === "disconnected" && <span className="lab-seat-flag warn">disconnected</span>}
          {seat.role && <span className="lab-seat-flag role">{seat.role}</span>}
        </span>
      </div>
    ))}
  </div>
);

/* ---------- stage board ---------- */

const PACK_ROWS: readonly (readonly { label: string; u: number; lit?: number; size: number }[])[] = [
  [
    { label: "Far L", u: 0.14, size: 6 },
    { label: "Far CL", u: 0.38, lit: 2, size: 6 },
    { label: "Far CR", u: 0.62, size: 6 },
    { label: "Far R", u: 0.86, size: 6 }
  ],
  [
    { label: "Mid L", u: 0.22, size: 5 },
    { label: "Mid C", u: 0.5, lit: 3, size: 5 },
    { label: "Mid R", u: 0.78, size: 5 }
  ],
  [
    { label: "Center L", u: 0.28, lit: 1, size: 5 },
    { label: "CENTER", u: 0.5, lit: 5, size: 5 },
    { label: "Center R", u: 0.72, size: 5 }
  ]
];

/**
 * Schematic polar stage: four far six-packs, mid ring, center ring, optional seat row along the bottom
 * (the dashboard board art today includes the seat row). Gold dots are lit NPCs, grey dots unlit.
 */
export const Board = ({ w, h, withSeats }: { w: number; h: number; withSeats: boolean }): ReactElement => {
  const stageH = withSeats ? h * 0.84 : h;
  const rowY = [0.2, 0.5, 0.8].map((v) => v * stageH);
  const dot = Math.max(5, Math.min(w, h) / 70);
  return (
    <div className="lab-board" style={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <ellipse cx={w / 2} cy={stageH * 0.98} rx={w * 0.46} ry={stageH * 0.62} className="lab-board-ring" />
        <ellipse cx={w / 2} cy={stageH * 0.98} rx={w * 0.3} ry={stageH * 0.34} className="lab-board-ring" />
        {PACK_ROWS.map((row, rowIndex) => row.map((pack) => {
          const cx = pack.u * w;
          const cy = rowY[rowIndex] ?? 0;
          const r = dot * 3.2;
          return (
            <g key={pack.label}>
              <circle cx={cx} cy={cy} r={r} className="lab-board-pack" />
              {Array.from({ length: pack.size }, (_, index) => {
                const angle = (index / pack.size) * Math.PI * 2 - Math.PI / 2;
                const lit = index < (pack.lit ?? 0);
                return (
                  <circle
                    key={index}
                    cx={cx + Math.cos(angle) * r * 0.62}
                    cy={cy + Math.sin(angle) * r * 0.62}
                    r={dot * 0.75}
                    className={lit ? "lab-board-npc lit" : (pack.lit !== undefined ? "lab-board-npc" : "lab-board-snap")}
                  />
                );
              })}
              <text x={cx} y={cy + r + 13} className="lab-board-label">{pack.label}</text>
            </g>
          );
        }))}
      </svg>
      {withSeats && (
        <div className="lab-board-seats" style={{ top: stageH, height: h - stageH }}>
          <Seats direction="row" />
        </div>
      )}
    </div>
  );
};

/** Standard-placement packs at their in-game positions (u, v as fractions of the wide board). */
const WIDE_PACKS: readonly { label: string; u: number; v: number; far: boolean; lit?: number }[] = [
  { label: "Far Center-Left", u: 0.36, v: 0.29, far: true, lit: 2 },
  { label: "Far Center-Right", u: 0.64, v: 0.29, far: true },
  { label: "Far Left", u: 0.13, v: 0.58, far: true },
  { label: "Far Right", u: 0.87, v: 0.58, far: true },
  { label: "Mid Left", u: 0.32, v: 0.63, far: false },
  { label: "Mid Center", u: 0.5, v: 0.56, far: false, lit: 3 },
  { label: "Mid Right", u: 0.68, v: 0.63, far: false },
  { label: "Center Left", u: 0.3, v: 0.81, far: false, lit: 1 },
  { label: "CENTER", u: 0.5, v: 0.75, far: false, lit: 5 },
  { label: "Center Right", u: 0.7, v: 0.81, far: false }
];

const WIDE_SEAT_BAND = 0.17;

/**
 * The control board at its real in-game shape (scaled 2:1), with the seat row floating along the top margin
 * above the Far zones instead of along the bottom. Far packs are ellipses of six; mid and center packs are five.
 */
export const WideBoard = ({ w, h }: { w: number; h: number }): ReactElement => {
  const dot = Math.max(5, w / 150);
  return (
    <div className="lab-board" style={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {WIDE_PACKS.map((pack) => {
          const cx = pack.u * w;
          const cy = pack.v * h;
          const rx = pack.far ? w * 0.075 : w * 0.032;
          const ry = pack.far ? h * 0.075 : w * 0.032;
          const size = pack.far ? 6 : 5;
          return (
            <g key={pack.label}>
              {pack.far
                ? <ellipse cx={cx} cy={cy} rx={rx} ry={ry} className="lab-board-ring" />
                : <circle cx={cx} cy={cy} r={rx} className="lab-board-pack" />}
              {Array.from({ length: size }, (_, index) => {
                const angle = (index / size) * Math.PI * 2 - Math.PI / 2;
                const lit = index < (pack.lit ?? 0);
                const reach = pack.far ? 1 : 0.62;
                return (
                  <circle
                    key={index}
                    cx={cx + Math.cos(angle) * rx * reach}
                    cy={cy + Math.sin(angle) * ry * reach}
                    r={dot * 0.75}
                    className={lit ? "lab-board-npc lit" : (pack.lit !== undefined ? "lab-board-npc" : "lab-board-snap")}
                  />
                );
              })}
              <text x={cx} y={cy + (pack.far ? 4 : ry + 14)} className="lab-board-label">{pack.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="lab-board-seats floating" style={{ top: 8, height: h * WIDE_SEAT_BAND }}>
        <Seats direction="row" />
      </div>
    </div>
  );
};

/* ---------- modules ---------- */

export const ClockReadout = ({ differs, big }: { differs: boolean; big: boolean }): ReactElement => (
  <div className={`lab-clock${big ? " big" : ""}`}>
    {differs && (
      <div className="lab-clock-present small">
        <span className="lab-clock-tag">Present day</span> Fri Oct 9, 2026 · 11:40 PM
      </div>
    )}
    <div className="lab-clock-main">
      <span className="lab-clock-tag">{differs ? "Scene time" : "Present day = scene time"}</span>
      <span className="lab-clock-time">{differs ? "8:15 PM" : "11:40 PM"}</span>
      <span className="lab-clock-date">{differs ? "Tue Sep 22, 2026 (flashback)" : "Fri Oct 9, 2026"}</span>
    </div>
    <div className="lab-clock-sun">
      <Chip>Dusk 7:02 PM</Chip>
      <Chip tone="warn">Dawn in {differs ? "10h 41m" : "7h 22m"}</Chip>
      <Chip tone="dim">real-time: off</Chip>
    </div>
  </div>
);

export const ClockJumps = ({ compact }: { compact: boolean }): ReactElement => (
  <div className="lab-jumps">
    <span className="lab-jumps-label">Jump scene time (left = forward, right-click = back)</span>
    <div className="lab-jumps-row">
      {(compact ? ["+10m", "+30m", "+1h", "+2h", "+1d", "+1w"] : ["+10m", "+20m", "+30m", "+1h", "+2h", "+4h", "+1d", "+3d", "+1w", "+1mo"]).map((label) => (
        <Btn key={label}>{label}</Btn>
      ))}
      <Btn>Dawn −…</Btn>
      <Btn>Dusk +…</Btn>
    </div>
  </div>
);

export const Weather = ({ override }: { override: boolean }): ReactElement => (
  <div className={`lab-weather${override ? " override" : ""}`}>
    <div className="lab-weather-icons">
      <Chip tone={override ? "accent" : "on"}>Rain: {override ? "HEAVY" : "light"}</Chip>
      <Chip tone={override ? "accent" : "dim"}>Wind: {override ? "max" : "low"}</Chip>
      <Chip tone={override ? "accent" : "dim"}>Thunder: {override ? "ON" : "off"}</Chip>
    </div>
    <p className="lab-weather-source">
      {override ? "OVERRIDE until dawn (6:58 AM)" : "Following the schedule"}
      {override && <Btn tone="danger">Back to schedule</Btn>}
    </p>
  </div>
);

export const Location = ({ stacked }: { stacked: boolean }): ReactElement => (
  <div className={`lab-location${stacked ? " stacked" : ""}`}>
    <span className="lab-location-row"><span className="lab-location-key">District</span> The Annex</span>
    <span className="lab-location-row"><span className="lab-location-key">Site</span> Elysium (Casa Loma)</span>
    <span className="lab-location-row"><span className="lab-location-key">Skybox</span> site default <Chip tone="dim">fog on</Chip></span>
    <span className="lab-location-chips">
      <Chip tone="accent">Elysium</Chip>
      <Chip tone="accent">Masquerade risk</Chip>
      <Chip>+ condition</Chip>
    </span>
  </div>
);

export const Sound = ({ withVolumes }: { withVolumes: boolean }): ReactElement => (
  <div className="lab-sound">
    <p className="lab-sound-now">Now: Intrigue · Location: Casa Loma halls · Rain (light)</p>
    <div className="lab-sound-lanes">
      <Btn>Main</Btn>
      <Btn tone="primary">Intrigue</Btn>
      <Btn>Combat</Btn>
      <Btn>Location</Btn>
      <Btn>Featured…</Btn>
      <Btn tone="danger">Stop all</Btn>
    </div>
    {withVolumes && (
      <div className="lab-sound-volumes">
        {["Music", "Location", "Featured", "Rain", "Wind"].map((lane) => (
          <span key={lane} className="lab-sound-volume"><span>{lane}</span><span className="lab-sound-bar" /></span>
        ))}
      </div>
    )}
  </div>
);

export const Queue = ({ narrow }: { narrow: boolean }): ReactElement => (
  <div className={`lab-queue${narrow ? " narrow" : ""}`}>
    <div className="lab-queue-head">
      <Chip tone="on">TTS connected</Chip>
      <span className="lab-queue-live"><span className="lab-toggle" /> Live</span>
    </div>
    <ol className="lab-queue-list">
      <li>Light Lexie (Mid C)</li>
      <li>Sam: present → absent</li>
      <li>Weather: rain → heavy</li>
    </ol>
    <div className="lab-queue-actions">
      <Btn tone="primary">Send 3 changes</Btn>
      <Btn>Clear queue</Btn>
    </div>
    <p className="lab-queue-hint">Play Scene, End Scene, table / location changes, clock jumps, Clear Stage and rolls skip the queue.</p>
  </div>
);

export const Roster = ({ grid = false }: { grid?: boolean }): ReactElement => (
  <div className="lab-roster">
    <div className="lab-roster-tabs">
      <Btn tone="primary">Main NPCs</Btn>
      <Btn>Generic NPCs</Btn>
      <Btn>Memoriam</Btn>
    </div>
    <span className="lab-search">Search every NPC…</span>
    <div className={grid ? "lab-roster-trays grid" : "lab-roster-trays"}>
      {["Camarilla", "Anarchs", "Sabbat", "Independents", "Hecata", "Werewolves", "Generic: saved tags"].map((group) => (
        <div key={group} className="lab-tray">
          <span className="lab-tray-name">{group}</span>
          <span className="lab-tray-tokens">{Array.from({ length: 7 }, (_, index) => <span key={index} className="lab-tray-token" />)}</span>
        </div>
      ))}
    </div>
    <Btn>+ Add generic NPCs</Btn>
  </div>
);

export const SceneTitle = ({ withLibrary }: { withLibrary: boolean }): ReactElement => (
  <div className="lab-scene-title">
    <span className="lab-scene-live">ON THE TABLE</span>
    <span className="lab-scene-name">Elysium — The Annex</span>
    {withLibrary && <Btn>Scene library…</Btn>}
    <Btn tone="danger">End Scene</Btn>
  </div>
);

export const PreviewTabs = (): ReactElement => (
  <div className="lab-preview-tabs">
    <span className="lab-preview-tab active">Prep: Rack — Kensington</span>
    <span className="lab-preview-tab">Prep: Kai's haven</span>
    <span className="lab-preview-tab add">+ prepare a scene</span>
  </div>
);

/** Slide-out editor for a library scene that is not on the table (blue = not live). */
export const PreviewPanel = ({ x, y, w, h, wide = false }: { x: number; y: number; w: number; h: number; wide?: boolean }): ReactElement => (
  <Box x={x} y={y} w={w} h={h} title="Preview panel: Rack — Kensington (not on the table)" tone="preview" tier="B">
    <div className="lab-preview-body">
      <PreviewTabs />
      <div className="lab-preview-grid">
        <div>
          {wide
            ? <WideBoard w={Math.round(w * 0.7)} h={Math.round(w * 0.7 * 0.56)} />
            : <Board w={Math.round(w * 0.62)} h={Math.round((w * 0.62) / 0.9)} withSeats />}
          <p className="lab-note">Same board, blue frame: edits change the library scene only.</p>
        </div>
        <div className="lab-preview-side">
          <Location stacked />
          <ClockReadout differs big={false} />
          <Weather override={false} />
          <Sound withVolumes={false} />
        </div>
      </div>
      <div className="lab-preview-actions">
        <Btn tone="primary">Save</Btn>
        <Btn tone="live">Play Scene</Btn>
        <Btn tone="danger">Discard (double-click)</Btn>
        <span className="lab-preview-hint">Click outside to slide away; it stays in progress.</span>
      </div>
    </div>
  </Box>
);

export const RollsReserved = (): ReactElement => (
  <p className="lab-reserved">Reserved for Storyteller rolls (later step). Right-click any token or seat → ring menu: Roll…, Notes / tooltip.</p>
);
