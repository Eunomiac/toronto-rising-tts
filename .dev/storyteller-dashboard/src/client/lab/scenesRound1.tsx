import type { ReactElement } from "react";
import {
  Board,
  Box,
  Btn,
  Chip,
  ClockJumps,
  ClockReadout,
  Location,
  PreviewPanel,
  PreviewTabs,
  Queue,
  RollsReserved,
  Roster,
  SceneTitle,
  Seats,
  Sound,
  Weather,
  WideBoard,
  type SketchState
} from "./sketch";

/** Scenes redesign, round 1: three grey-box layouts for the one-screen Scenes tab. */

export type LabSketch = {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly render: (state: SketchState) => ReactElement;
};

const BOARD_ASPECT_WITH_SEATS = 0.9;
const BOARD_ASPECT_STAGE_ONLY = 1.1;

const StageInTheMiddle = ({ previewOpen, clockDiffers, weatherOverride }: SketchState): ReactElement => {
  const boardH = 962;
  const boardW = Math.round(boardH * BOARD_ASPECT_WITH_SEATS);
  return (
    <>
      <Box x={8} y={8} w={1904} h={56} title="Scene bar" tier="A" className="lab-bar">
        <div className="lab-row">
          <SceneTitle withLibrary />
          <PreviewTabs />
        </div>
      </Box>
      <Box x={8} y={72} w={392} h={778} title="NPC roster (Main / Generic / Memoriam)" tier="A"
        lines={["Drag a token onto the board; drag a tray header to place the whole group.", "Generic NPCs = today's Stage NPCs tab, merged in."]}>
        <Roster />
      </Box>
      <Box x={8} y={858} w={392} h={176} title="Rolls" tone="reserved">
        <RollsReserved />
      </Box>
      <Box x={408} y={72} w={boardW} h={boardH} title="Stage + table (board art includes the seat row, as today)" tier="A"
        lines={["Double-click lights / unlights; drag a pack handle to move a whole pack."]}>
        <Board w={boardW - 16} h={boardH - 70} withSeats />
      </Box>
      <Box x={1282} y={72} w={630} h={250} title="When" tier="A">
        <ClockReadout differs={clockDiffers} big />
        <ClockJumps compact={false} />
      </Box>
      <Box x={1282} y={330} w={630} h={170} title="Where" tier="A">
        <Location stacked={false} />
      </Box>
      <Box x={1282} y={508} w={630} h={120} title="Weather" tier="A">
        <Weather override={weatherOverride} />
      </Box>
      <Box x={1282} y={636} w={630} h={150} title="Sound" tier="A">
        <Sound withVolumes={false} />
      </Box>
      <Box x={1282} y={794} w={630} h={240} title="Queued changes" tier="A">
        <Queue narrow={false} />
      </Box>
      {previewOpen && <PreviewPanel x={1000} y={72} w={912} h={962} />}
    </>
  );
};

const GlanceStrip = ({ previewOpen, clockDiffers, weatherOverride, popoverOpen }: SketchState): ReactElement => {
  const stripH = 132;
  const bodyY = 8 + stripH + 8;
  const bodyH = 1042 - bodyY - 8;
  const stageX = 356;
  const stageW = 1647 - 8 - stageX;
  const boardW = stageW - 16;
  const boardH = Math.round(boardW * 0.56);
  return (
    <>
      <Box x={8} y={8} w={380} h={stripH} title="Scene" tier="A" className="lab-strip">
        <SceneTitle withLibrary />
        <p className="lab-note">2 scenes being prepared · click to open</p>
      </Box>
      <Box x={396} y={8} w={400} h={stripH} title="Where (click to edit)" tier="A" className="lab-strip">
        <Location stacked={false} />
      </Box>
      <Box x={804} y={8} w={440} h={stripH} title="When (click for clock controls)" tier="A" className="lab-strip">
        <ClockReadout differs={clockDiffers} big={false} />
      </Box>
      <Box x={1252} y={8} w={320} h={stripH} title="Weather (click to override)" tier="A" className="lab-strip">
        <Weather override={weatherOverride} />
      </Box>
      <Box x={1580} y={8} w={332} h={stripH} title="Sound (click for volumes)" tier="A" className="lab-strip">
        <Sound withVolumes={false} />
      </Box>

      <Box x={8} y={bodyY} w={340} h={bodyH} title="NPC roster" tier="A" lines={["Collapses to a thin rail when not dragging."]}>
        <Roster />
      </Box>
      <Box x={stageX} y={bodyY} w={stageW} h={bodyH} title="Stage + table (real 2:1 board; seats float above the Far zones)" tier="A"
        lines={["Click a seat: present ↔ absent. Drag an NPC onto a seat to seat them.", "Double-click lights / unlights; drag a pack handle to move a whole pack."]}>
        <WideBoard w={boardW} h={boardH} />
        <div className="lab-row">
          <Btn>Table: Table B2 ▾</Btn>
          <Btn>Placement: Standard ▾</Btn>
          <span className="lab-note">Spare height below the board in this layout: about 90 px.</span>
        </div>
      </Box>
      <Box x={1647} y={bodyY} w={265} h={420} title="Queued changes" tier="A">
        <Queue narrow />
      </Box>
      <Box x={1647} y={bodyY + 428} w={265} h={bodyH - 428} title="Rolls" tone="reserved">
        <RollsReserved />
      </Box>

      {popoverOpen && (
        <Box x={804} y={bodyY} w={540} h={230} title="Pop-up: clock controls (opened from When)" tone="popover" tier="B">
          <ClockJumps compact={false} />
          <div className="lab-row">
            <Btn>Type scene date / time…</Btn>
            <Btn>Set scene time to present day</Btn>
            <Btn>Set present day to scene time</Btn>
          </div>
          <div className="lab-row">
            <Btn>Real-time: off</Btn>
            <Chip tone="dim">speed ×1</Chip>
            <Btn>Years…</Btn>
          </div>
        </Box>
      )}
      {previewOpen && (
        <PreviewPanel x={8} y={bodyY} w={stageX + stageW - 8} h={bodyH} wide />
      )}
    </>
  );
};

const LIBRARY = [
  "Elysium — The Annex",
  "Rack — Kensington",
  "Kai's haven",
  "Prince's court — Casa Loma",
  "Docks ambush — Waterfront",
  "Rooftop meet — Financial District",
  "Chantry — University",
  "Sewers — The Warrens",
  "Gala — Rosedale",
  "Safehouse — Parkdale"
];

const LibraryRailAndClock = ({ previewOpen, clockDiffers, weatherOverride }: SketchState): ReactElement => {
  const boardW = 660;
  const boardH = Math.round(boardW / BOARD_ASPECT_STAGE_ONLY);
  return (
    <>
      <Box x={8} y={8} w={300} h={1026} title="Scene library" tier="A">
        <div className="lab-library">
          <SceneTitle withLibrary={false} />
          <span className="lab-search">Search scenes…</span>
          {LIBRARY.map((name, index) => (
            <span key={name} className={`lab-library-row${index === 0 ? " live" : ""}${index === 1 || index === 2 ? " prep" : ""}`}>
              {name}
              {index === 0 && <Chip tone="on">on table</Chip>}
              {(index === 1 || index === 2) && <Chip tone="accent">in prep</Chip>}
            </span>
          ))}
          <Btn>+ New scene</Btn>
        </div>
      </Box>
      <Box x={316} y={8} w={boardW} h={boardH + 44} title="Stage only" tier="A">
        <Board w={boardW - 16} h={boardH} withSeats={false} />
      </Box>
      <Box x={316 + boardW + 8} y={8} w={952 - boardW - 8} h={300} title="Where" tier="A">
        <Location stacked />
      </Box>
      <Box x={316 + boardW + 8} y={316} w={952 - boardW - 8} h={boardH + 44 - 308} title="Weather" tier="A">
        <Weather override={weatherOverride} />
      </Box>
      <Box x={316} y={boardH + 60} w={952} h={118} title="Table: Table B2 (click to switch)" tier="A">
        <Seats direction="row" />
      </Box>
      <Box x={316} y={boardH + 186} w={952} h={1042 - 8 - (boardH + 186)} title="NPC roster (horizontal trays)" tier="A">
        <Roster grid />
      </Box>
      <Box x={1276} y={8} w={636} h={470} title="When (large clock)" tier="A"
        lines={["A dial could ring the night: dusk → dawn arc with the scene hand and a present-day marker."]}>
        <ClockReadout differs={clockDiffers} big />
        <ClockJumps compact={false} />
      </Box>
      <Box x={1276} y={486} w={636} h={180} title="Sound" tier="A">
        <Sound withVolumes />
      </Box>
      <Box x={1276} y={674} w={636} h={220} title="Queued changes" tier="A">
        <Queue narrow={false} />
      </Box>
      <Box x={1276} y={902} w={636} h={132} title="Rolls" tone="reserved">
        <RollsReserved />
      </Box>
      {previewOpen && <PreviewPanel x={316} y={8} w={952} h={1026} />}
    </>
  );
};

export const SCENES_ROUND_1: readonly LabSketch[] = [
  {
    id: "scenes-r1-a",
    label: "A · Stage in the middle",
    summary: "Closest to today: roster left, the board (with its seat row) as large as the height allows, every widget stacked in a right rail.",
    render: (state) => <StageInTheMiddle {...state} />
  },
  {
    id: "scenes-r1-b",
    label: "B · Glance strip",
    summary: "Everything you need at a glance in one top strip; click a section for its controls. The board is drawn at its real 2:1 shape, with the seat row floating above the Far zones.",
    render: (state) => <GlanceStrip {...state} />
  },
  {
    id: "scenes-r1-c",
    label: "C · Library rail + big clock",
    summary: "Scene library always open on the left, a large clock column on the right, the stage smaller in the middle with seats and trays beneath it.",
    render: (state) => <LibraryRailAndClock {...state} />
  }
];
