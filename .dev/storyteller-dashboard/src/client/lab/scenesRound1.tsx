import { useEffect, useState, type ReactElement } from "react";
import {
  AspectRow,
  ConditionsPanel,
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
  type HuntPc,
  type LabLocation,
  type LibraryActions,
  type LibraryEntry,
  type LiveScenes,
  type SceneRef
} from "../scenesPanel/glance";
import { PreparedPanels, ScenePreview, type PreparedScene } from "../scenesPanel/preview";
import type { RollOptionsView } from "../scenesPanel/rolls/bridge";
import { RollsCell, type OptionsAccess } from "../scenesPanel/rolls/RollsCell";
import type { PoolDieAction, RollsCommand } from "../scenesPanel/rolls/commands";
import type { PoolKind, RollPool, RollsSlice } from "../worldState";
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
  SEATS,
  Seats,
  Sound,
  Weather,
  WIDE_BOARD_RATIO,
  WideBoard,
  type SketchState
} from "../scenesPanel/sketch";

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
        lines={["Drag a token onto the board; drag a tray header to place the whole group.", "Generic NPCs = the generic cutout catalogue."]}>
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
  const [scenes, setScenes] = useState<LiveScenes>({ live: [ref(SCENE_NAME), ref("Mod Club — Little Italy")], current: ref(SCENE_NAME) });
  const [library, setLibrary] = useState<readonly LibraryEntry[]>(LIBRARY.map(ref));
  const [linked, setLinked] = useState(true);
  const [prepared, setPrepared] = useState(PREPARED);
  const titleOf = (key: string): string => library.find((entry) => entry.key === key)?.title ?? prepared.find((scene) => scene.key === key)?.title ?? key;
  const addToDeck = (key: string): void =>
    setScenes((now) => ({ ...now, live: now.live.some((scene) => scene.key === key) ? now.live : [...now.live, { key, title: titleOf(key) }] }));
  const play = (key: string): void => {
    addToDeck(key);
    setScenes((now) => ({ ...now, current: { key, title: titleOf(key) } }));
    setPreparing(false);
  };
  const libraryActions: LibraryActions = {
    rename: (key, title) => setLibrary((rows) => rows.map((row) => (row.key === key ? { ...row, title } : row))),
    remove: (key) => setLibrary((rows) => rows.filter((row) => row.key !== key)),
    move: (key, by) => setLibrary((rows) => {
      const index = rows.findIndex((row) => row.key === key);
      const next = [...rows];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row!);
      return next;
    })
  };
  useEffect(() => {
    setPresentDay(PRESENT_DAY);
    setSceneTime(clockDiffers ? FLASHBACK_TIME : PRESENT_DAY);
  }, [clockDiffers]);
  const changeSceneTime = (next: Date): void => {
    setSceneTime(next);
    setPresentDay((present) => (next.getTime() > present.getTime() ? next : present));
  };
  const [fog, setFog] = useState(false);
  const [rolls, setRolls] = useState(LAB_ROLLS);
  const G = 4;
  const leftW = 380;
  const stripX = G + leftW + G;
  const stripH = 132;
  const bodyY = G + stripH + G;
  const bodyH = 1042 - bodyY - G;
  const rightW = 265;
  const rightX = 1920 - G - rightW;
  const stageW = rightX - G - stripX;
  const phaseH = 34;
  const mainY = bodyY + phaseH + G;
  const aspectH = 114;
  const stageY = mainY + aspectH + G;
  const stageH = 1042 - G - stageY;
  const boardW = stageW - 12;
  const boardH = stageH - 10;
  const queueH = 420;
  const rightH = 1042 - G - mainY;
  const huntH = 48;
  const rosterY = bodyY + huntH + G;
  const whenW = 470;
  const weatherW = 380;
  const soundX = stripX + whenW + G + weatherW + G;
  return (
    <>
      <Box x={G} y={G} w={leftW} h={stripH} className="lab-backdrop-box">
        <LocationPanel
          location={location}
          overridden={location.districtKey !== SCENE_LOCATION.districtKey || location.siteKey !== SCENE_LOCATION.siteKey}
          onChange={setLocation}
          onRelease={() => setLocation(SCENE_LOCATION)}
          fog={{ on: fog, onToggle: () => setFog(!fog) }}
        />
      </Box>
      <Box x={G} y={bodyY} w={leftW} h={huntH} className="lab-hunt-box lab-borderless">
        <HuntRoller location={location} pcs={LAB_HUNTERS} onConfirm={() => undefined} />
      </Box>
      <Box x={G} y={rosterY} w={leftW} h={1042 - G - rosterY} className="lab-borderless lab-dock-box">
        <RosterDock scene={scenes.current?.title ?? SCENE_NAME} />
      </Box>

      <Box x={stripX} y={G} w={whenW} h={stripH} className="lab-backdrop-box">
        <WhenPanel
          at={scenes.current === null ? presentDay : sceneTime}
          present={presentDay}
          onChange={changeSceneTime}
          onSetPresent={setPresentDay}
          forceOpen={popoverOpen}
          presentOnly={scenes.current === null}
          w={whenW - 2}
          h={stripH - 2}
        />
      </Box>
      <Box x={stripX + whenW + G} y={G} w={weatherW} h={stripH} className="lab-backdrop-box">
        <WeatherPanel at={sceneTime} forceOverride={weatherOverride} forceCelsius={heatWave ? 34 : coldSnap ? -27 : null} w={weatherW - 2} h={stripH - 2} />
      </Box>
      <Box x={soundX} y={G} w={1920 - G - soundX} h={stripH}>
        <SoundMixer indoors />
      </Box>

      <Box x={stripX} y={bodyY} w={1920 - G - stripX} h={phaseH} className="lab-phase-box lab-borderless">
        <PhaseStrip
          library={library}
          libraryActions={libraryActions}
          scenes={scenes}
          linkMenu={{ linked, onUnlink: () => setLinked(false), onFork: () => setLinked(true) }}
          onSwitch={(key) => setScenes((now) => ({ ...now, current: now.live.find((scene) => scene.key === key) ?? now.current }))}
          onEndScene={() => setScenes((now) => {
            const live = now.live.filter((scene) => scene.key !== now.current?.key);
            return { live, current: live[0] ?? null };
          })}
          onPlay={play}
          onEdit={() => setPreparing(true)}
          onPrepare={(at, districtName, siteName) => {
            const title = `${districtName} — ${siteName}`;
            setPrepared((now) => [...now, { key: title, title, location: at, indoors: true }]);
            setPreparing(true);
          }}
          onOpenDeck={() => setPreparing(true)}
        />
      </Box>
      <Box x={stripX} y={mainY} w={stageW} h={aspectH} className="lab-aspects-box lab-borderless">
        <AspectRow location={location} />
      </Box>
      <Box x={rightX} y={mainY} w={rightW} h={aspectH} className="lab-aspects-box lab-borderless">
        <ConditionsPanel location={location} />
      </Box>
      <Box x={stripX} y={stageY} w={stageW} h={stageH} className="lab-borderless">
        <WideBoard w={boardW} h={boardH} />
      </Box>
      <Box x={rightX} y={mainY + aspectH + G} w={rightW} h={rightH - queueH - G - aspectH - G} className="roll-box">
        <RollsCell rolls={rolls} send={(command) => setRolls((current) => labRollsApply(current, command))} options={LAB_ROLL_OPTIONS} />
      </Box>
      <Box x={rightX} y={mainY + rightH - queueH} w={rightW} h={queueH} className="lab-queue-box">
        <QueuePanel connected={!ttsDisconnected} />
      </Box>
      {(previewOpen || preparing) && (
        <Overlay onClose={() => setPreparing(false)}>
          <ScenePreview
            x={G}
            y={bodyY}
            w={1920 - 2 * G}
            h={bodyH}
            prepared={prepared}
            scenes={scenes}
            onSave={() => setPreparing(false)}
            onDeck={addToDeck}
            onPlay={play}
            onDiscard={(key) => {
              setPrepared((now) => now.filter((scene) => scene.key !== key));
              setPreparing(false);
            }}
            onPrepare={() => setPreparing(false)}
            panels={(key, w, h) => {
              const scene = prepared.find((entry) => entry.key === key);
              return scene ? <PreparedPanels scene={scene} w={w} h={h} /> : <></>;
            }}
          />
        </Overlay>
      )}
    </>
  );
};

const SCENE_NAME = "Elysium — Casa Loma: Great Hall";

const LAB_HUNTERS: readonly HuntPc[] = SEATS.flatMap((seat) =>
  seat.kind === "pc" && seat.color ? [{ color: seat.color, name: seat.playedBy ?? seat.name ?? seat.color }] : []);

const LAB_ROLLS: RollsSlice = {
  pcs: [
    { color: "Pink", name: "Adrian Varga", rollType: "discipline", phase: "setup", pool: { normal: 4, hunger: 2 }, conditions: "", wpReroll: false, done: false, canModifyPool: false, dice: [] },
    {
      color: "Purple", name: "Black Caesar", rollType: "standard", phase: "preRoll", pool: { normal: 5, hunger: 2, rouse: 1 }, difficulty: 3,
      conditions: "", wpReroll: false, done: false, canModifyPool: false, dice: []
    },
    {
      color: "Brown", name: "Fomórach", rollType: "standard", phase: "rolling", pool: { normal: 4, hunger: 1 }, difficulty: 2,
      conditions: "", wpReroll: true, done: false, canModifyPool: false,
      dice: [{ value: 7, kind: "normal" }, { kind: "normal" }, { value: 3, kind: "normal" }, { kind: "normal" }, { value: 6, kind: "hunger" }]
    },
    {
      color: "Red", name: "Lord Lucien", rollType: "standard", phase: "postRoll", pool: { normal: 5, hunger: 1 }, difficulty: 3,
      conditions: "No Take Half", result: { resultClass: "win", successes: 4, margin: 1, text: "WIN +1" }, wpReroll: false, done: false, canModifyPool: true,
      dice: [{ value: 8, kind: "normal" }, { value: 2, kind: "normal" }, { value: 6, kind: "normal" }, { value: 4, kind: "normal" }, { value: 9, kind: "normal" }, { value: 10, kind: "hunger" }]
    },
    {
      color: "Orange", name: "Rashid", rollType: "rouse", phase: "resolved", pool: { rouse: 1 }, conditions: "", result: { text: "ROUSED" },
      wpReroll: false, done: true, canModifyPool: false, dice: [{ value: 3, kind: "rouse" }]
    }
  ],
  storyteller: {
    canInitiate: true,
    slots: [
      { index: 1, label: "Drake", rollType: "standard", phase: "postRoll", live: true, canBroadcast: false, pendingBroadcast: false },
      { index: 2, label: "Mara", rollType: "frenzy", phase: "resolved", live: false, canBroadcast: true, pendingBroadcast: true }
    ],
    live: {
      rollType: "standard", label: "Drake", slot: 1, phase: "postRoll", hint: "Pick dice to reroll, or Confirm.", wpReroll: false,
      pool: { normal: 4, hunger: 2 }, difficulty: 4, result: { resultClass: "messyCritical", successes: 5, margin: 1, text: "MESSY CRITICAL +1" },
      dice: [{ value: 10, kind: "normal" }, { value: 3, kind: "normal", selected: true }, { value: 6, kind: "normal" }, { value: 7, kind: "normal" }, { value: 10, kind: "hunger" }, { value: 1, kind: "hunger" }],
      actions: { roll: false, rollEnabled: false, half: false, wp: true, recalc: true, reroll: true, rerollEnabled: true, confirm: true, oblivChoice: false, brutalChoice: false },
      secret: false,
      quiet: false
    }
  },
  werewolves: ["drake"],
  oblivionSeats: ["Pink"]
};

const LAB_POOL_DIE: Readonly<Partial<Record<PoolDieAction, readonly [PoolKind, 1 | -1]>>> = {
  addHungerDie: ["hunger", 1],
  remHungerDie: ["hunger", -1],
  addStandardDie: ["normal", 1],
  remStandardDie: ["normal", -1]
};

const bumpPool = (pool: RollPool, kind: PoolKind, count: number): RollPool => ({ ...pool, [kind]: Math.max(0, count) });

/** The Lab's stand-in for TTS: pool changes from the dice ring land on the sample rolls; everything else is ignored. */
const labRollsApply = (rolls: RollsSlice, command: RollsCommand): RollsSlice => {
  if (command.op === "poolDie") {
    const change = LAB_POOL_DIE[command.action];
    return change
      ? { ...rolls, pcs: rolls.pcs.map((roll) => (roll.color === command.color ? { ...roll, pool: bumpPool(roll.pool, change[0], (roll.pool[change[0]] ?? 0) + change[1]) } : roll)) }
      : rolls;
  }
  const live = rolls.storyteller.live;
  if (command.op === "npcPool" && live) {
    const kind: PoolKind = live.rollType === "werewolf" ? (command.kind === "hunger" ? "rage" : "werewolf") : command.kind;
    return { ...rolls, storyteller: { ...rolls.storyteller, live: { ...live, pool: bumpPool(live.pool, kind, (live.pool[kind] ?? 0) + command.delta) } } };
  }
  return rolls;
};

const LAB_OPTIONS_VIEW: RollOptionsView = {
  color: "Pink",
  rollType: "discipline",
  rollTypes: [{ key: "standard", label: "Standard" }, { key: "discipline", label: "Discipline" }, { key: "frenzy", label: "Frenzy" }],
  permanent: { autoApplyRouseOutcomes: true, autoWp: false, autoRemorse: true, autoHunger: true },
  structural: { takeHalf: true, wpReroll: true, hungerDice: true, crits: true },
  locked: { takeHalf: false, hungerDice: false },
  conditions: [{ id: "noTakeHalf", label: "No Take Half", on: false }, { id: "canRerollHunger", label: "Can reroll Hunger", on: false }],
  negating: { takeHalf: "noTakeHalf", wpReroll: "noWPReroll", hungerDice: "noHungerDice", crits: "noCriticals" },
  rerolls: 1,
  diceRerolled: 3
};

const LAB_ROLL_OPTIONS: OptionsAccess = {
  load: () => Promise.resolve(LAB_OPTIONS_VIEW),
  changeType: (_color, rollType) => Promise.resolve({ ...LAB_OPTIONS_VIEW, rollType })
};

/** Lab scenes use their title as their key. */
const ref = (title: string): SceneRef => ({ key: title, title });

const PREPARED: readonly PreparedScene[] = [
  { key: "Rack — Kensington Market", title: "Rack — Kensington Market", location: { districtKey: "HarbordVillage", siteKey: "Kensington" }, indoors: false },
  { key: "Mod Club — Little Italy", title: "Mod Club — Little Italy", location: { districtKey: "LittleItaly", siteKey: "ModClub" }, indoors: true }
];

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
