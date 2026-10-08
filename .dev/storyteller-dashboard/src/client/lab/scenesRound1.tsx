import { useEffect, useState, type ReactElement } from "react";
import {
  AspectRow,
  FLASHBACK_TIME,
  HuntRoller,
  LocationPanel,
  PhaseStrip,
  PRESENT_DAY,
  QueuePanel,
  RosterDock,
  SCENE_LOCATION,
  SoundMixer,
  WeatherPanel,
  WhenPanel,
  type LabLocation
} from "./glance";
import {
  Overlay,
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
  WIDE_BOARD_RATIO,
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

/**
 * Glance strip: Where (names + resonances), the hunt roll, and scene notes (with the roster folded to a rail
 * beside them) on the left; When, Weather, and Sound across the top; the phase bar right beneath them; then the
 * four aspects and the stage. PC trackers pop up over their seats. Scene time and location live here so every
 * panel reads the same values.
 */
const GlanceStrip = ({ previewOpen, clockDiffers, weatherOverride, heatWave, coldSnap, popoverOpen, ttsDisconnected }: SketchState): ReactElement => {
  const [preparing, setPreparing] = useState(false);
  const [sceneTime, setSceneTime] = useState(PRESENT_DAY);
  const [presentDay, setPresentDay] = useState(PRESENT_DAY);
  const [location, setLocation] = useState<LabLocation>(SCENE_LOCATION);
  useEffect(() => {
    setPresentDay(PRESENT_DAY);
    setSceneTime(clockDiffers ? FLASHBACK_TIME : PRESENT_DAY);
  }, [clockDiffers]);
  const changeSceneTime = (next: Date): void => {
    setSceneTime(next);
    setPresentDay((present) => (next.getTime() > present.getTime() ? next : present));
  };
  const leftW = 380;
  const stripX = 8 + leftW + 8;
  const stripH = 132;
  const bodyY = 8 + stripH + 8;
  const bodyH = 1042 - bodyY - 8;
  const rightX = 1647;
  const stageW = rightX - 8 - stripX;
  const phaseH = 38;
  const mainY = bodyY + phaseH + 8;
  const aspectH = 118;
  const stageY = mainY + aspectH + 8;
  const stageH = 1042 - 8 - stageY;
  const boardW = stageW - 18;
  const boardH = stageH - 14;
  const queueH = 420;
  const rightH = 1042 - 8 - mainY;
  const huntH = 64;
  const rosterY = bodyY + huntH + 8;
  const whenW = 470;
  const weatherW = 380;
  const soundX = stripX + whenW + 8 + weatherW + 8;
  return (
    <>
      <Box x={8} y={8} w={leftW} h={stripH} className="lab-backdrop-box">
        <LocationPanel
          location={location}
          overridden={location.districtKey !== SCENE_LOCATION.districtKey || location.siteKey !== SCENE_LOCATION.siteKey}
          onChange={setLocation}
          onRelease={() => setLocation(SCENE_LOCATION)}
        />
      </Box>
      <Box x={8} y={bodyY} w={leftW} h={huntH} className="lab-hunt-box lab-borderless">
        <HuntRoller location={location} />
      </Box>
      <Box x={8} y={rosterY} w={leftW} h={1042 - 8 - rosterY} className="lab-borderless lab-dock-box">
        <RosterDock scene={SCENE_NAME} />
      </Box>

      <Box x={stripX} y={8} w={whenW} h={stripH} className="lab-backdrop-box">
        <WhenPanel
          at={sceneTime}
          present={presentDay}
          onChange={changeSceneTime}
          onSetPresent={setPresentDay}
          forceOpen={popoverOpen}
          w={whenW - 2}
          h={stripH - 2}
        />
      </Box>
      <Box x={stripX + whenW + 8} y={8} w={weatherW} h={stripH} className="lab-backdrop-box">
        <WeatherPanel at={sceneTime} forceOverride={weatherOverride} forceCelsius={heatWave ? 34 : coldSnap ? -27 : null} w={weatherW - 2} h={stripH - 2} />
      </Box>
      <Box x={soundX} y={8} w={1912 - soundX} h={stripH}>
        <SoundMixer indoors />
      </Box>

      <Box x={stripX} y={bodyY} w={1912 - stripX} h={phaseH} className="lab-phase-box lab-borderless">
        <PhaseStrip library={LIBRARY} onPrepare={() => setPreparing(true)} />
      </Box>
      <Box x={stripX} y={mainY} w={stageW} h={aspectH} className="lab-aspects-box lab-borderless">
        <AspectRow location={location} />
      </Box>
      <Box x={stripX} y={stageY} w={stageW} h={stageH} className="lab-borderless">
        <WideBoard w={boardW} h={boardH} />
      </Box>
      <Box x={rightX} y={mainY} w={265} h={rightH - queueH - 8} tone="reserved" />
      <Box x={rightX} y={mainY + rightH - queueH} w={265} h={queueH} className="lab-queue-box">
        <QueuePanel connected={!ttsDisconnected} />
      </Box>

      {(previewOpen || preparing) && (
        <Overlay onClose={() => setPreparing(false)}>
          <PreviewPanel x={8} y={bodyY} w={stripX + stageW - 8} h={bodyH} wide />
        </Overlay>
      )}
    </>
  );
};

const SCENE_NAME = "Elysium — Casa Loma: Great Hall";

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
        <Seats />
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
    label: "A · Middle",
    summary: "Closest to today: roster left, the board (with its seat row) as large as the height allows, every widget stacked in a right rail.",
    render: (state) => <StageInTheMiddle {...state} />
  },
  {
    id: "scenes-r1-b",
    label: "B · Glance",
    summary: "Everything you need at a glance in one top strip; click a section for its controls. The board is drawn at its real 2:1 shape, with the seat row floating above the Far zones.",
    render: (state) => <GlanceStrip {...state} />
  },
  {
    id: "scenes-r1-c",
    label: "C · Rail",
    summary: "Scene library always open on the left, a large clock column on the right, the stage smaller in the middle with seats and trays beneath it.",
    render: (state) => <LibraryRailAndClock {...state} />
  }
];
