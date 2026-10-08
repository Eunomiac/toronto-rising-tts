import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Headshot } from "../headshots/Headshot";

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
  readonly slot: number;
  readonly name?: string;
  readonly characterKey?: string;
  readonly kind: "pc" | "npc" | "empty" | "nochair";
  readonly state?: "absent" | "disconnected";
  readonly role?: string;
};

/**
 * Left-to-right order of the control board seat row: today's colour seats renumbered, PC chairs 1–5 from the
 * centre outward and the old NPC1–NPC4 chairs as 6–9. Table B2 has seven chairs, so 8 and 9 have none.
 */
export const SEATS: readonly SeatSketch[] = [
  { slot: 9, kind: "nochair" },
  { slot: 7, name: "Lexi Madi", characterKey: "lexiMadi", kind: "npc" },
  { slot: 5, name: "Aishe Tache", characterKey: "aishe", kind: "pc", role: "as Adrian Varga" },
  { slot: 3, name: "Fomórach", characterKey: "fomorach", kind: "pc", state: "disconnected" },
  { slot: 1, name: "Black Caesar", characterKey: "blackCaesar", kind: "pc", state: "absent" },
  { slot: 2, name: "Lord Lucien", characterKey: "lordLucien", kind: "pc" },
  { slot: 4, name: "Rashid", characterKey: "rashid", kind: "pc" },
  { slot: 6, kind: "empty" },
  { slot: 8, kind: "nochair" }
];

const SeatContent = ({ seat }: { seat: SeatSketch }): ReactElement => (
  <>
    <span className="lab-seat-badge">{seat.slot}</span>
    <span className="lab-seat-text">
      {seat.name && <span className="lab-seat-name">{seat.name}</span>}
      {seat.kind === "empty" && <span className="lab-seat-flag">empty chair</span>}
      {seat.kind === "nochair" && <span className="lab-seat-flag">no chair at Table B2</span>}
      {seat.state === "absent" && <span className="lab-seat-flag">absent (dark)</span>}
      {seat.state === "disconnected" && <span className="lab-seat-flag warn">disconnected</span>}
      {seat.role && <span className="lab-seat-flag role">{seat.role}</span>}
    </span>
  </>
);

/** One cell per chair, sharing the row width evenly; the figurine headshot fills the cell. */
export const Seats = (): ReactElement => (
  <div className="lab-seats">
    {SEATS.map((seat) => {
      const className = `lab-seat ${seat.kind}${seat.state ? ` ${seat.state}` : ""}`;
      return seat.characterKey ? (
        <Headshot key={seat.slot} characterKey={seat.characterKey} className={className}>
          <SeatContent seat={seat} />
        </Headshot>
      ) : (
        <div key={seat.slot} className={className}>
          <SeatContent seat={seat} />
        </div>
      );
    })}
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
          <Seats />
        </div>
      )}
    </div>
  );
};

/** Height of the wide board as a fraction of its width: the 2:1 stage plus a little margin for the seat row. */
export const WIDE_BOARD_RATIO = 0.52;

type WidePack = { readonly label: string; readonly u: number; readonly v: number; readonly far: boolean };

/** Standard-placement packs at their in-game positions (u, v as fractions of the wide board). */
const WIDE_PACKS: readonly WidePack[] = [
  { label: "Far Center-Left", u: 0.36, v: 0.33, far: true },
  { label: "Far Center-Right", u: 0.64, v: 0.33, far: true },
  { label: "Far Left", u: 0.12, v: 0.6, far: true },
  { label: "Far Right", u: 0.88, v: 0.6, far: true },
  { label: "Mid Left", u: 0.3, v: 0.62, far: false },
  { label: "Mid Center", u: 0.5, v: 0.55, far: false },
  { label: "Mid Right", u: 0.7, v: 0.62, far: false },
  { label: "Center Left", u: 0.29, v: 0.84, far: false },
  { label: "CENTER", u: 0.5, v: 0.77, far: false },
  { label: "Center Right", u: 0.71, v: 0.84, far: false }
];

const WIDE_SEAT_BAND = 0.18;
const SLOT_SPACING = 56;

/** Snap slots: six around each Far ellipse; five on a shallow arc (centre slot lowest) for mid and center packs. */
const packSlots = (pack: WidePack, w: number, h: number): readonly { x: number; y: number }[] => {
  const cx = pack.u * w;
  const cy = pack.v * h;
  if (pack.far) {
    return Array.from({ length: 6 }, (_, index) => {
      const angle = (index / 6) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(angle) * w * 0.075, y: cy + Math.sin(angle) * h * 0.09 };
    });
  }
  return Array.from({ length: 5 }, (_, index) => {
    const offset = index - 2;
    return { x: cx + offset * SLOT_SPACING, y: cy - Math.abs(offset) * 9 };
  });
};

type StageToken = {
  readonly characterKey: string;
  readonly name: string;
  readonly lit: boolean;
  readonly at: { readonly pack: string; readonly slot: number } | { readonly u: number; readonly v: number };
};

/** Sample stage: most tokens snapped to pack slots, two dragged freely to spots of the Storyteller's choosing. */
const STAGE_TOKENS: readonly StageToken[] = [
  { characterKey: "drake", name: "Drake", lit: true, at: { pack: "Far Center-Left", slot: 5 } },
  { characterKey: "mara", name: "Mara", lit: true, at: { pack: "Far Center-Left", slot: 1 } },
  { characterKey: "victorVex", name: "Victor", lit: true, at: { pack: "Mid Center", slot: 1 } },
  { characterKey: "bee", name: "Bee", lit: true, at: { pack: "Mid Center", slot: 2 } },
  { characterKey: "eddie", name: "Eddie", lit: false, at: { pack: "Mid Center", slot: 3 } },
  { characterKey: "ren", name: "Ren", lit: true, at: { pack: "CENTER", slot: 2 } },
  { characterKey: "kai", name: "Kai", lit: true, at: { pack: "CENTER", slot: 1 } },
  { characterKey: "carol", name: "Carol", lit: false, at: { pack: "CENTER", slot: 3 } },
  { characterKey: "rosie", name: "Rosie", lit: true, at: { pack: "Center Left", slot: 2 } },
  { characterKey: "terry", name: "Terry", lit: false, at: { pack: "Far Right", slot: 4 } },
  { characterKey: "scarlett", name: "Scarlett", lit: true, at: { u: 0.2, v: 0.36 } },
  { characterKey: "drIrenaVoss", name: "Dr. Voss", lit: false, at: { u: 0.86, v: 0.86 } }
];

const tokenPoint = (token: StageToken, w: number, h: number): { x: number; y: number } => {
  if ("u" in token.at) {
    return { x: token.at.u * w, y: token.at.v * h };
  }
  const { pack: label, slot } = token.at;
  const pack = WIDE_PACKS.find((entry) => entry.label === label);
  const point = pack ? packSlots(pack, w, h)[slot] : undefined;
  if (!point) {
    throw new Error(`Lab stage token ${token.characterKey}: no slot ${slot} in pack ${label}`);
  }
  return point;
};

/** A figurine headshot with the name under it; hovering enlarges the headshot. Gold ring = lit. */
const Token = ({ token, x, y }: { token: StageToken; x: number; y: number }): ReactElement => (
  <div className={`lab-token${token.lit ? " lit" : ""}`} style={{ left: x, top: y }}>
    <Headshot className="lab-token-head" characterKey={token.characterKey} />
    <span className="lab-token-name">{token.name}</span>
  </div>
);

/**
 * The control board at its real in-game shape (scaled 2:1), with the seat row floating along the top margin
 * above the Far zones. Token positions map straight to stage positions in the game world, so tokens can sit
 * anywhere; pack slots are mild snap points and group drop targets.
 */
export const WideBoard = ({ w, h }: { w: number; h: number }): ReactElement => (
  <div className="lab-board wide" style={{ width: w, height: h }}>
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {WIDE_PACKS.map((pack) => {
        const cx = pack.u * w;
        const cy = pack.v * h;
        return (
          <g key={pack.label}>
            {pack.far && <ellipse cx={cx} cy={cy} rx={w * 0.075} ry={h * 0.09} className="lab-board-ring" />}
            {packSlots(pack, w, h).map((slot, index) => (
              <circle key={index} cx={slot.x} cy={slot.y} r={5} className="lab-board-snap" />
            ))}
            <text x={cx} y={pack.far ? cy + 6 : cy + 52} className="lab-board-label">{pack.label}</text>
          </g>
        );
      })}
    </svg>
    {STAGE_TOKENS.map((token) => {
      const point = tokenPoint(token, w, h);
      return <Token key={token.characterKey} token={token} x={point.x} y={point.y} />;
    })}
    <div className="lab-board-seats floating" style={{ top: 8, height: h * WIDE_SEAT_BAND }}>
      <Seats />
    </div>
    <div className="lab-board-corner left">
      <Btn>Table: Table B2 ▾</Btn>
      <Btn>Placement: Standard ▾</Btn>
    </div>
    <p className="lab-board-corner right">
      Drag anywhere; tokens snap only when dropped over a slot. Drop a whole group on a pack to arrange it.
      Double-click to light / unlight. Hover a token to enlarge it.
    </p>
  </div>
);

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
    <div className="lab-queue-actions">
      <Btn tone="primary">Send 3 changes</Btn>
      <Btn>Clear queue</Btn>
    </div>
    <ol className="lab-queue-list">
      <li>Light Victor (Mid Center)</li>
      <li>Black Caesar: present → absent</li>
      <li>Weather: rain → heavy</li>
    </ol>
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
            ? <WideBoard w={Math.round(w * 0.7)} h={Math.round(w * 0.7 * WIDE_BOARD_RATIO)} />
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

type PcCell = {
  readonly slot: number;
  readonly name: string;
  readonly characterKey: string;
  readonly state?: "absent" | "disconnected";
  readonly health: { readonly max: number; readonly sup: number; readonly agg: number };
  readonly willpower: { readonly max: number; readonly sup: number; readonly agg: number };
  readonly hunger: number;
};

/** Same left-to-right order as the PC chairs in the seat row, so each cell sits under its chair. */
const PC_CELLS: readonly PcCell[] = [
  { slot: 5, name: "Aishe Tache", characterKey: "aishe", health: { max: 7, sup: 2, agg: 0 }, willpower: { max: 6, sup: 1, agg: 0 }, hunger: 2 },
  { slot: 3, name: "Fomórach", characterKey: "fomorach", state: "disconnected", health: { max: 8, sup: 0, agg: 0 }, willpower: { max: 5, sup: 0, agg: 0 }, hunger: 3 },
  { slot: 1, name: "Black Caesar", characterKey: "blackCaesar", state: "absent", health: { max: 9, sup: 1, agg: 1 }, willpower: { max: 7, sup: 0, agg: 0 }, hunger: 1 },
  { slot: 2, name: "Lord Lucien", characterKey: "lordLucien", health: { max: 6, sup: 0, agg: 0 }, willpower: { max: 8, sup: 3, agg: 0 }, hunger: 4 },
  { slot: 4, name: "Rashid", characterKey: "rashid", health: { max: 7, sup: 0, agg: 0 }, willpower: { max: 5, sup: 0, agg: 1 }, hunger: 0 }
];

const Track = ({ label, max, sup, agg }: { label: string; max: number; sup: number; agg: number }): ReactElement => (
  <span className="lab-track">
    <span className="lab-track-label">{label}</span>
    {Array.from({ length: max }, (_, index) => (
      <span key={index} className={`lab-track-box${index < agg ? " agg" : index < agg + sup ? " sup" : ""}`} />
    ))}
  </span>
);

/** Abbreviated PC control panel: one cell per PC with Health, Willpower, and Hunger one click away. */
export const PcPanel = (): ReactElement => (
  <div className="lab-pcs">
    {PC_CELLS.map((pc) => (
      <div key={pc.slot} className={`lab-pc${pc.state ? ` ${pc.state}` : ""}`}>
        <Headshot className="lab-pc-head" characterKey={pc.characterKey}>
          <span className="lab-seat-badge">{pc.slot}</span>
        </Headshot>
        <span className="lab-pc-body">
          <span className="lab-pc-name">
            {pc.name}
            {pc.state === "absent" && <span className="lab-seat-flag">absent</span>}
            {pc.state === "disconnected" && <span className="lab-seat-flag warn">disconnected</span>}
          </span>
          <Track label="Health" {...pc.health} />
          <Track label="Willpower" {...pc.willpower} />
          <span className="lab-track">
            <span className="lab-track-label">Hunger</span>
            {Array.from({ length: 5 }, (_, index) => (
              <span key={index} className={`lab-hunger-die${index < pc.hunger ? " on" : ""}`} />
            ))}
          </span>
        </span>
      </div>
    ))}
  </div>
);

export const RollsReserved = (): ReactElement => (
  <p className="lab-reserved">Reserved for Storyteller rolls (later step). Right-click any token or seat → ring menu: Roll…, Notes / tooltip.</p>
);
