import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { createApplyQueue } from "../applyQueue";
import { AspectRow, HuntRoller, LocationPanel, PhaseStrip, RosterDock, SoundMixer, WeatherPanel, WhenPanel, type LabLocation } from "../lab/glance";
import { useSceneCatalogs } from "../lab/labRoster";
import { Box, WideBoard, type LiveBoard } from "../lab/sketch";
import type { SheetSnapshot } from "../pcSheet/types";
import { clockNow, refreshWorldSnapshot, useWorldState, WORLD_TOPICS, type WorldState } from "../worldState";
import { sendScenesCommands, type ScenesReply } from "./bridge";
import { ScenesCommandContext, type ScenesCommand, type ScenesSend } from "./commands";
import { boardToStage, liveSeats, liveTokens, soundView, spotlightView, toDate, weatherAxes } from "./liveScene";

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

const Waiting = ({ text }: { text: string }): ReactElement => <p className="lab-note scenes-live-wait">{text}</p>;

/**
 * Commands go through the serial apply queue (one execute-lua in flight; clicks made meanwhile go in the next
 * batch). Replies only say whether TTS accepted them; the push channel brings the new state back.
 */
const useScenesQueue = (): { send: ScenesSend; pending: number; error: string | null; clearError: () => void } => {
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const queue = useMemo(() => createApplyQueue<ScenesCommand, ScenesReply>({
    send: sendScenesCommands,
    onSettled: () => setError(null),
    onFailure: (failure) => setError(failure.message),
    onPendingChange: setPending
  }), []);
  const send = useCallback((command: ScenesCommand) => queue.enqueue(command), [queue]);
  const clearError = useCallback(() => setError(null), []);
  return { send, pending, error, clearError };
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
  const now = useNow(world.clock?.running === true);
  const { phase, scene, clock, soundscape, seats } = world;

  const present = clock?.presentDay ? toDate(clock.presentDay) : null;
  const sceneNow = clock ? clockNow(clock, now) : undefined;
  const at = sceneNow ? toDate(sceneNow) : present;
  const location: LabLocation | null = scene?.districtKey && scene.siteKey ? { districtKey: scene.districtKey, siteKey: scene.siteKey } : null;
  const title = scene?.liveTitle ?? null;
  const board = useMemo((): LiveBoard | null => {
    if (!seats) {
      return null;
    }
    return {
      seats: liveSeats(seats, scene?.tableKey, catalogs),
      sheet: NO_SHEET,
      tokens: liveTokens(seats.stage, catalogs).map((token) => ({ ...token, at: boardToStage(token.u, token.v) })),
      table: scene?.tableKey ?? "No table"
    };
  }, [seats, scene?.tableKey, catalogs]);
  const waitText = snapshotError ?? "Waiting for TTS…";

  return (
    <ScenesCommandContext.Provider value={commands.send}>
    <div className="lab-canvas scenes-live">
      {active && (
        <>
          <Box x={G} y={G} w={LEFT_W} h={STRIP_H} className="lab-backdrop-box">
            {location ? (
              <LocationPanel location={location} overridden={false} onChange={() => undefined} onRelease={() => undefined} readOnly />
            ) : (
              <Waiting text={scene ? "No location on the table." : waitText} />
            )}
          </Box>
          <Box x={G} y={BODY_Y} w={LEFT_W} h={HUNT_H} className="lab-hunt-box lab-borderless">
            {location && <HuntRoller location={location} />}
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
                w={WEATHER_W - 2}
                h={STRIP_H - 2}
              />
            ) : (
              <Waiting text={waitText} />
            )}
          </Box>
          <Box x={SOUND_X} y={G} w={1920 - G - SOUND_X} h={STRIP_H}>
            {soundscape ? <SoundMixer indoors={scene?.weather.indoors === true} live={soundView(soundscape)} /> : <Waiting text={waitText} />}
          </Box>

          <Box x={STRIP_X} y={BODY_Y} w={1920 - G - STRIP_X} h={PHASE_H} className="lab-phase-box lab-borderless">
            {phase && seats ? (
              <PhaseStrip
                library={[]}
                scenes={{ live: title ? [title] : [], current: title }}
                onSwitch={() => undefined}
                onEndScene={() => undefined}
                onPlay={() => undefined}
                onPrepare={() => undefined}
                live={{
                  phase: phase.phase ?? "Intermission",
                  subPhase: phase.subPhase,
                  sessionNum: phase.sessionNum,
                  sessionName: phase.sessionName,
                  spotlight: spotlightView(seats)
                }}
              />
            ) : (
              <Waiting text={waitText} />
            )}
          </Box>
          <Box x={STRIP_X} y={MAIN_Y} w={STAGE_W} h={ASPECT_H} className="lab-aspects-box lab-borderless">
            {location && <AspectRow location={location} />}
          </Box>
          <Box x={STRIP_X} y={STAGE_Y} w={STAGE_W} h={STAGE_H} className="lab-borderless">
            {board ? <WideBoard w={STAGE_W - 12} h={STAGE_H - 10} live={board} /> : <Waiting text={waitText} />}
          </Box>
          <Box x={RIGHT_X} y={MAIN_Y} w={RIGHT_W} h={1042 - G - MAIN_Y} tone="reserved">
            <CommandStatus pending={commands.pending} error={commands.error} onDismiss={commands.clearError} />
          </Box>
        </>
      )}
    </div>
    </ScenesCommandContext.Provider>
  );
};
