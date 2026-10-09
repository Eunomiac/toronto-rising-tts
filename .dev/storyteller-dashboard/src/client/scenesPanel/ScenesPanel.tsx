import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { createApplyQueue } from "../applyQueue";
import {
  ambientLabel,
  AspectRow,
  ConditionsPanel,
  HuntRoller,
  LocationPanel,
  PhaseStrip,
  QueuePanel,
  RosterDock,
  SoundMixer,
  WeatherPanel,
  WhenPanel,
  type LabLocation,
  type LiveScenes,
  type QueueView
} from "./glance";
import { ScenePreview } from "./preview";
import { useControlBoardSnaps, useSceneCatalogs } from "./roster";
import type { SceneCatalogs } from "./catalogs";
import { Box, Overlay, WideBoard, type LiveBoard } from "./sketch";
import type { SheetSnapshot } from "../pcSheet/types";
import { sceneDeckSnapshot, setSceneDeckSection, useSceneDeck, useSceneDeckStatus } from "../sceneDeck";
import { useSceneLibraryStatus } from "../sceneLibrary";
import { DraftPanels } from "./DraftPanels";
import { useLibraryActions } from "./useLibraryActions";
import { clockNow, refreshWorldSnapshot, useWorldState, WORLD_TOPICS, type WorldState } from "../worldState";
import { sendScenesCommands, type ScenesReply } from "./bridge";
import { mergedStageChanges, ScenesCommandContext, type ScenesCommand, type ScenesSend } from "./commands";
import { withoutScene, withTableScene } from "./deck";
import { RollsCell, type OptionsAccess } from "./rolls/RollsCell";
import { loadRollOptions, sendRollsCommands } from "./rolls/bridge";
import { RollsCommandContext, type RollsCommand, type RollsSend } from "./rolls/commands";
import {
  huntPcs,
  isScatter,
  lightingPreset,
  liveSeats,
  liveTokens,
  locationOverridden,
  sceneConditions,
  soundView,
  spotlightView,
  toDate,
  weatherAxes
} from "./liveScene";
import { addToQueue, commandKind, commandsToSend, loadSendMode, queueLines, saveSendMode, type QueueEntry, type SendMode } from "./queue";
import { describeQueued } from "./queueLabels";
import { boardToStage, stagePacks, type StagePack } from "./stageFrame";

/**
 * The Scenes tab: Lab layout B (`lab/scenesRound1.tsx` GlanceStrip) drawn from what TTS broadcasts.
 * Build phases and what is still read-only: `agent/Scenes Redesign/Build Plan.md`.
 */

const G = 4;
const LEFT_W = 380;
const STRIP_X = G + LEFT_W + G;
const STRIP_H = 132;
const BODY_Y = G + STRIP_H + G;
const RIGHT_W = 265;
const RIGHT_X = 1920 - G - RIGHT_W;
const STAGE_W = RIGHT_X - G - STRIP_X;
const PHASE_H = 34;
const MAIN_Y = BODY_Y + PHASE_H + G;
const ASPECT_H = 114;
const STAGE_Y = MAIN_Y + ASPECT_H + G;
const STAGE_H = 1042 - G - STAGE_Y;
const RIGHT_H = 1042 - G - MAIN_Y;
const QUEUE_H = 420;
const ROLLS_Y = MAIN_Y + ASPECT_H + G;
const ROLLS_H = RIGHT_H - QUEUE_H - G - ASPECT_H - G;
const HUNT_H = 48;
const ROSTER_Y = BODY_Y + HUNT_H + G;
const WHEN_W = 470;
const WEATHER_W = 380;
const SOUND_X = STRIP_X + WHEN_W + G + WEATHER_W + G;

/** Until the PC seat data is merged in, no seat opens tracker controls. */
const NO_SHEET: SheetSnapshot = { ok: true, seats: [] };

const NO_SCENE = "No scene on the table";

const missingSlices = (world: WorldState): boolean => WORLD_TOPICS.some((topic) => world[topic] === undefined);

/**
 * One execute-lua snapshot when the tab opens with slices missing (dashboard server restarted mid-session) and
 * again after TTS reloads the game; never on a timer. Pushes fill everything else.
 */
const useWorldSnapshotOnce = (active: boolean, world: WorldState): string | null => {
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);
  const empty = Object.keys(world).length === 0;
  const hadData = useRef(false);
  if (!empty) {
    hadData.current = true;
  } else if (hadData.current) {
    hadData.current = false;
    attempted.current = false;
  }
  const missing = missingSlices(world);
  useEffect(() => {
    if (!active || !missing || attempted.current) {
      return;
    }
    attempted.current = true;
    refreshWorldSnapshot().then(
      () => setError(null),
      (reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason))
    );
  }, [active, missing]);
  useEffect(() => {
    if (!active) {
      attempted.current = false;
    }
  }, [active]);
  return error;
};

/** Browser-side clock: re-render every second while TTS's clock runs (narrative time comes from `clockNow`). */
const useNow = (running: boolean): number => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return now;
};

/** The on-deck list, kept in the dashboard's scene deck file; TTS's table scene joins it once that file has loaded. */
const useLiveScenes = (liveKey: string | undefined, title: string | null): LiveScenes & { remove: (key: string) => void } => {
  const { deck } = useSceneDeck();
  const { loaded } = useSceneDeckStatus();
  useEffect(() => {
    if (!loaded || !liveKey || !title) {
      return;
    }
    const next = withTableScene(deck, liveKey, title);
    if (next !== deck) {
      setSceneDeckSection("deck", next);
    }
  }, [loaded, deck, liveKey, title]);
  const current = liveKey && title ? { key: liveKey, title } : null;
  return {
    live: current && !deck.some((scene) => scene.key === current.key) ? [...deck, current] : deck,
    current,
    remove: (key: string) => setSceneDeckSection("deck", withoutScene(sceneDeckSnapshot().deck, key))
  };
};

const Waiting = ({ text }: { text: string }): ReactElement => <p className="lab-note scenes-live-wait">{text}</p>;

/**
 * Commands go through the serial apply queue (one execute-lua in flight; clicks made meanwhile go in the next
 * batch). Replies only say whether TTS accepted them; the push channel brings the new state back.
 */
const useScenesQueue = (): { send: ScenesSend; sendAll: (commands: readonly ScenesCommand[]) => void; pending: number; error: string | null; clearError: () => void } => {
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const queue = useMemo(() => createApplyQueue<ScenesCommand, ScenesReply>({
    send: sendScenesCommands,
    onSettled: () => setError(null),
    onFailure: (failure) => setError(failure.message),
    onPendingChange: setPending
  }), []);
  const send = useCallback((command: ScenesCommand) => queue.enqueue(command), [queue]);
  const sendAll = useCallback((commands: readonly ScenesCommand[]) => queue.enqueueAll(commands), [queue]);
  const clearError = useCallback(() => setError(null), []);
  return { send, sendAll, pending, error, clearError };
};

/** Roll commands skip the Send queue (dice are live play) but share its one-in-flight transport pattern. */
const useRollsQueue = (): { send: RollsSend; options: OptionsAccess; pending: number; error: string | null; clearError: () => void } => {
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const queue = useMemo(() => createApplyQueue<RollsCommand, ScenesReply>({
    send: sendRollsCommands,
    onSettled: () => setError(null),
    onFailure: (failure) => setError(failure.message),
    onPendingChange: setPending
  }), []);
  const send = useCallback((command: RollsCommand) => queue.enqueue(command), [queue]);
  const options = useMemo((): OptionsAccess => ({
    load: loadRollOptions,
    changeType: async (color, rollType) => {
      const reply = await sendRollsCommands([{ op: "rollType", color, rollType }]);
      if (!reply.ok) {
        throw new Error(reply.error ?? "TTS refused the roll type.");
      }
      return loadRollOptions(color);
    }
  }), []);
  const clearError = useCallback(() => setError(null), []);
  return { send, options, pending, error, clearError };
};

/**
 * Send / Live mode (remembered; Live by default). Queued mode holds the small changes `commandKind` marks "queue"
 * until Send; a multi-step action sends the queue first, in the same batch. Switching to Live sends what is queued.
 */
const useSendMode = (
  transport: { send: ScenesSend; sendAll: (commands: readonly ScenesCommand[]) => void },
  world: WorldState,
  catalogs: SceneCatalogs | null,
  packs: readonly StagePack[]
): { send: ScenesSend; sendBatch: (commands: readonly ScenesCommand[]) => void; view: QueueView; queued: readonly ScenesCommand[] } => {
  const [mode, setModeState] = useState<SendMode>(loadSendMode);
  const [entries, setEntries] = useState<readonly QueueEntry[]>([]);
  const nextId = useRef(1);
  const lines = useMemo(() => queueLines(entries, describeQueued(world, catalogs, packs)), [entries, world, catalogs, packs]);
  const queued = useMemo(() => entries.map((entry) => entry.command), [entries]);
  const latest = useRef({ entries, lines, mode, transport });
  latest.current = { entries, lines, mode, transport };
  const takeQueue = useCallback((): readonly ScenesCommand[] => {
    const pending = commandsToSend(latest.current.entries, latest.current.lines);
    setEntries([]);
    return pending;
  }, []);
  const send = useCallback<ScenesSend>((command) => {
    const kind = commandKind(command);
    if (kind === "queue" && latest.current.mode === "queued") {
      setEntries((previous) => addToQueue(previous, command, nextId.current++));
    } else if (kind === "flush") {
      latest.current.transport.sendAll([...takeQueue(), command]);
    } else {
      latest.current.transport.send(command);
    }
  }, [takeQueue]);
  const sendBatch = useCallback((commands: readonly ScenesCommand[]) => latest.current.transport.sendAll([...takeQueue(), ...commands]), [takeQueue]);
  const view: QueueView = {
    mode,
    lines: lines.map((line) => ({ id: line.id, text: `${line.subject}: ${line.from} → ${line.to}` })),
    setMode: (next) => {
      if (next === "live") {
        transport.sendAll(takeQueue());
      }
      saveSendMode(next);
      setModeState(next);
    },
    send: () => transport.sendAll(takeQueue()),
    remove: (id) => setEntries((previous) => previous.filter((entry) => entry.id !== id)),
    clear: () => setEntries([])
  };
  return { send, sendBatch, view, queued };
};

const CommandStatus = ({ pending, error, onDismiss }: { pending: number; error: string | null; onDismiss: () => void }): ReactElement | null => {
  if (error) {
    return (
      <div className="scenes-live-status error" role="alert">
        <span>{error}</span>
        <button type="button" className="lab-btn" onClick={onDismiss}>OK</button>
      </div>
    );
  }
  return pending > 0 ? <div className="scenes-live-status">Sending to TTS…</div> : null;
};

export const ScenesPanel = ({ active }: { active: boolean }): ReactElement => {
  const world = useWorldState();
  const { catalogs } = useSceneCatalogs();
  const snapshotError = useWorldSnapshotOnce(active, world);
  const commands = useScenesQueue();
  const rollCommands = useRollsQueue();
  const { snaps } = useControlBoardSnaps();
  const packs = useMemo(() => (snaps ? stagePacks(snaps) : []), [snaps]);
  const { send, sendBatch, view: queueView, queued } = useSendMode(commands, world, catalogs, packs);
  const now = useNow(world.clock?.running === true);
  const { phase, scene, clock, soundscape, seats, rolls } = world;

  // With no live scene (Intermission, Downtime, nothing on the table) the clock panel works on present day.
  const sceneActive = scene?.liveKey !== undefined && clock?.activeClock === "scene";
  const sceneNow = sceneActive && clock ? clockNow(clock, now) : undefined;
  const sceneAt = sceneNow ? toDate(sceneNow) : null;
  // TTS moves present day forward with a scene that passes it, but only re-pushes the clock on rollovers.
  const pushedPresent = clock?.presentDay ? toDate(clock.presentDay) : null;
  const present = pushedPresent && sceneAt && sceneAt > pushedPresent ? sceneAt : pushedPresent;
  const at = sceneAt ?? present;
  const location: LabLocation | null = scene?.districtKey && scene.siteKey ? { districtKey: scene.districtKey, siteKey: scene.siteKey } : null;
  const siteTrack = catalogs?.sites.find((site) => site.key === scene?.siteKey)?.locationTrack;
  const siteAmbience = siteTrack ? ambientLabel(siteTrack) : "Silent";
  const title = scene?.liveTitle ?? null;
  const liveScenes = useLiveScenes(scene?.liveKey, title);
  const deckError = useSceneDeckStatus().error;
  const library = useLibraryActions({ scene, sendBatch, removeFromDeck: liveScenes.remove });
  const libraryError = useSceneLibraryStatus().error;
  const presentNow = present ?? new Date();
  const stageTokens = useMemo(
    () => (seats ? liveTokens(seats.stage, catalogs, seats.generics).map((token) => ({ ...token, at: boardToStage(token.u, token.v) })) : []),
    [seats, catalogs]
  );
  const pendingStage = useMemo(() => mergedStageChanges(queued), [queued]);
  const pendingScatter = useMemo(
    () => queued.flatMap((command) => (command.op === "scatterPlace"
      ? [command.group === undefined ? { characterKey: command.characterKey, kind: command.kind } : { characterKey: command.characterKey, kind: command.kind, group: command.group }]
      : [])),
    [queued]
  );
  const board = useMemo((): LiveBoard | null => {
    if (!seats) {
      return null;
    }
    return {
      seats: liveSeats(seats, scene?.tableKey, catalogs),
      sheet: NO_SHEET,
      tokens: stageTokens,
      pending: pendingStage,
      pendingScatter,
      generics: seats.generics,
      scatter: seats.scatter,
      env: {
        tableKey: scene?.tableKey ?? "",
        scatter: scene ? isScatter(scene) : false,
        sky: scene?.skyboxOverride ?? "",
        lighting: (scene && lightingPreset(scene)) ?? ""
      },
      rollRing: {
        werewolves: rolls?.werewolves ?? [],
        oblivionSeats: rolls?.oblivionSeats ?? [],
        endPhase: phase?.phase === "End"
      }
    };
  }, [seats, scene, catalogs, stageTokens, pendingStage, pendingScatter, rolls?.werewolves, rolls?.oblivionSeats, phase?.phase]);
  const hunters = useMemo(() => (seats ? huntPcs(seats, catalogs) : []), [seats, catalogs]);
  const libraryLocation = scene?.library?.districtKey && scene.library.siteKey
    ? { districtKey: scene.library.districtKey, siteKey: scene.library.siteKey }
    : null;
  const waitText = snapshotError ?? "Waiting for TTS…";
  const connected = snapshotError === null && Object.keys(world).length > 0;

  return (
    <ScenesCommandContext.Provider value={send}>
    <RollsCommandContext.Provider value={rollCommands.send}>
    <div className="lab-canvas scenes-live">
      {active && (
        <>
          <Box x={G} y={G} w={LEFT_W} h={STRIP_H} className="lab-backdrop-box">
            {location && scene ? (
              <LocationPanel
                location={location}
                overridden={locationOverridden(scene)}
                onChange={(next) => send({ op: "location", districtKey: next.districtKey, siteKey: next.siteKey })}
                onRelease={() => {
                  if (libraryLocation) {
                    send({ op: "location", ...libraryLocation });
                  }
                }}
                fog={{ on: scene.topFog, onToggle: () => send({ op: "topFog", on: !scene.topFog }) }}
              />
            ) : (
              <Waiting text={scene ? "No location on the table." : waitText} />
            )}
          </Box>
          <Box x={G} y={BODY_Y} w={LEFT_W} h={HUNT_H} className="lab-hunt-box lab-borderless">
            {location && <HuntRoller location={location} pcs={hunters} onConfirm={(hunt) => rollCommands.send({ op: "hunt", ...hunt })} />}
          </Box>
          <Box x={G} y={ROSTER_Y} w={LEFT_W} h={1042 - G - ROSTER_Y} className="lab-borderless lab-dock-box">
            <RosterDock scene={title ?? NO_SCENE} />
          </Box>

          <Box x={STRIP_X} y={G} w={WHEN_W} h={STRIP_H} className="lab-backdrop-box">
            {at && present && clock ? (
              <WhenPanel
                at={at}
                present={present}
                onChange={() => undefined}
                onSetPresent={() => undefined}
                forceOpen={false}
                presentOnly={!sceneActive}
                live={{
                  running: clock.running,
                  speed: clock.speed,
                  ...(clock.dusk ? { dusk: toDate(clock.dusk) } : {}),
                  ...(clock.dawn ? { dawn: toDate(clock.dawn) } : {})
                }}
                w={WHEN_W - 2}
                h={STRIP_H - 2}
              />
            ) : (
              <Waiting text={waitText} />
            )}
          </Box>
          <Box x={STRIP_X + WHEN_W + G} y={G} w={WEATHER_W} h={STRIP_H} className="lab-backdrop-box">
            {at && scene ? (
              <WeatherPanel
                at={at}
                forceOverride={false}
                forceCelsius={clock?.temperatureC ?? null}
                live={weatherAxes(scene.weather)}
                held={scene.weatherOverride !== undefined}
                w={WEATHER_W - 2}
                h={STRIP_H - 2}
              />
            ) : (
              <Waiting text={waitText} />
            )}
          </Box>
          <Box x={SOUND_X} y={G} w={1920 - G - SOUND_X} h={STRIP_H}>
            {soundscape ? <SoundMixer indoors={scene?.weather.indoors === true} sceneAmbience={siteAmbience} live={soundView(soundscape)} /> : <Waiting text={waitText} />}
          </Box>

          <Box x={STRIP_X} y={BODY_Y} w={1920 - G - STRIP_X} h={PHASE_H} className="lab-phase-box lab-borderless">
            {phase && seats ? (
              <PhaseStrip
                library={library.entries}
                libraryActions={library.actions}
                scenes={liveScenes}
                {...(library.linkMenu ? { linkMenu: library.linkMenu } : {})}
                onSwitch={library.play}
                onEndScene={() => {
                  send({ op: "endScene" });
                  if (scene?.liveKey) {
                    liveScenes.remove(scene.liveKey);
                  }
                }}
                onPlay={library.play}
                onEdit={library.openPreview}
                onPrepare={library.prepare}
                onOpenDeck={library.openPreview}
                live={{
                  phase: phase.phase ?? "Intermission",
                  subPhase: phase.subPhase,
                  sessionNum: phase.sessionNum,
                  sessionName: phase.sessionName,
                  spotlight: spotlightView(seats),
                  ...(present ? { presentYear: present.getFullYear() } : {})
                }}
              />
            ) : (
              <Waiting text={waitText} />
            )}
          </Box>
          <Box x={STRIP_X} y={MAIN_Y} w={STAGE_W} h={ASPECT_H} className="lab-aspects-box lab-borderless">
            {location && scene && (
              <AspectRow location={location} />
            )}
          </Box>
          <Box x={RIGHT_X} y={MAIN_Y} w={RIGHT_W} h={ASPECT_H} className="lab-aspects-box lab-borderless">
            {location && scene && (
              <ConditionsPanel location={location} conditions={sceneConditions(scene)} onChange={(ids) => send({ op: "conditions", ids })} />
            )}
          </Box>
          <Box x={STRIP_X} y={STAGE_Y} w={STAGE_W} h={STAGE_H} className="lab-borderless">
            {board ? <WideBoard w={STAGE_W - 12} h={STAGE_H - 10} live={board} /> : <Waiting text={waitText} />}
          </Box>
          <Box x={RIGHT_X} y={ROLLS_Y} w={RIGHT_W} h={ROLLS_H} className="roll-box">
            <CommandStatus pending={commands.pending} error={commands.error} onDismiss={commands.clearError} />
            <CommandStatus pending={rollCommands.pending} error={rollCommands.error} onDismiss={rollCommands.clearError} />
            {deckError && <div className="scenes-live-status error" role="alert">{deckError}</div>}
            {libraryError && <div className="scenes-live-status error" role="alert">{libraryError}</div>}
            {library.notice && (
              <div className="scenes-live-status error" role="alert">
                <span>{library.notice}</span>
                <button type="button" className="lab-btn" onClick={library.clearNotice}>OK</button>
              </div>
            )}
            <RollsCell rolls={rolls} send={rollCommands.send} options={rollCommands.options} />
          </Box>
          <Box x={RIGHT_X} y={MAIN_Y + RIGHT_H - QUEUE_H} w={RIGHT_W} h={QUEUE_H} className="lab-queue-box">
            <QueuePanel connected={connected} live={queueView} />
          </Box>
          {library.previewKey !== null && library.previews.length > 0 && (
            <Overlay onClose={library.closePreview}>
              <ScenePreview
                x={G}
                y={BODY_Y}
                w={1920 - 2 * G}
                h={1042 - G - BODY_Y}
                prepared={library.previews}
                initialKey={library.previewKey}
                scenes={liveScenes}
                note={(key) =>
                  library.previews.find((row) => row.key === key)?.linked
                    ? "The table writes into this scene while it plays; unlink it first or your saved edits will be overwritten."
                    : undefined}
                onSave={library.saveDraft}
                onDeck={library.deckDraft}
                onPlay={library.playDraft}
                onDiscard={library.discardDraft}
                panels={(key, w, h) => {
                  const draft = library.previews.find((row) => row.key === key);
                  return draft ? (
                    <DraftPanels
                      draft={draft}
                      saved={library.savedRow(draft.key)}
                      present={presentNow}
                      catalogs={catalogs}
                      w={w}
                      h={h}
                      onChange={(update) => library.updateDraft(draft.key, update)}
                    />
                  ) : <Waiting text="This scene is no longer being prepared." />;
                }}
              />
            </Overlay>
          )}
        </>
      )}
    </div>
    </RollsCommandContext.Provider>
    </ScenesCommandContext.Provider>
  );
};
