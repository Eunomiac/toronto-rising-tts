import { gsap } from "gsap";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactElement } from "react";
import { fetchBridgeStatus, isBridgeConnected, reclaimEditorPort, releaseEditorPort } from "../ttsBridge.js";
import { subscribeTtsEvents } from "../ttsEvents.js";
import { applySheetCommands, fetchLiveSnapshot } from "./bridge.js";
import { applyLocal } from "./applyLocal.js";
import { createApplyQueue } from "../applyQueue.js";
import { deepMerge } from "./deepMerge.js";
import { mergeSeatPush } from "./livePush.js";
import { renderPage, SPREADS, type PageContext } from "./pages.js";
import { PlayerRail } from "./PlayerRail.js";
import { SeatJsonModal } from "./SeatJsonModal.js";
import { actionsForRing } from "./ringActions.js";
import { TraitRing } from "./TraitRing.js";
import type { ApplyCommand, RingTarget, SeatColor, SeatSnapshot, SheetSnapshot } from "./types.js";

type Props = {
  readonly active: boolean;
};

const emptyLiveSnapshot = (): SheetSnapshot => ({ ok: false, seats: [] });
const LOADING_RETRY_MS = 3000;

const friendlyBridgeMessage = (message: string): string => {
  if (/Claim Port first|not holding port 39998|bridge is disconnected/i.test(message)) {
    return "Dashboard is not connected to Tabletop Simulator. Click Claim Port to connect (uses the TTS Tools gateway when Cursor is open).";
  }
  if (/Command failed:|powershell\.exe|netstat\.exe/i.test(message)) {
    return "Could not inspect port 39998.";
  }
  if (/nil value|executeScript|did not return a sheet snapshot/i.test(message)) {
    return "Tabletop Simulator did not return a sheet snapshot. Save & Play so the live PCs bridge is loaded.";
  }
  return message;
};

export const PcSheetTab = ({ active }: Props): ReactElement => {
  const spreadRef = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState<SheetSnapshot>(emptyLiveSnapshot);
  const [selected, setSelected] = useState<SeatColor>("Pink");
  const [status, setStatus] = useState("Checking TTS…");
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reclaiming, setReclaiming] = useState(false);
  const [holdingPort, setHoldingPort] = useState(false);
  const [ring, setRing] = useState<{ x: number; y: number; target: RingTarget } | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [spread, setSpread] = useState(0);
  const inFlight = useRef(false);
  const skipLive = useRef(false);
  const syncingRef = useRef(false);
  const applyingNow = useRef(false);
  const retryTimer = useRef<number | null>(null);

  const showOffline = useCallback((message: string): void => {
    skipLive.current = true;
    setLive(false);
    setSnapshot(emptyLiveSnapshot());
    setRing(null);
    setJsonOpen(false);
    setStatus(friendlyBridgeMessage(message));
  }, []);

  const refresh = useCallback(async (force = false): Promise<void> => {
    if (force) {
      skipLive.current = false;
    }
    if (!force && syncingRef.current) {
      return;
    }
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    try {
      const bridge = await fetchBridgeStatus();
      const holding = isBridgeConnected(bridge);
      setHoldingPort(holding);
      if (!holding) {
        showOffline(
          bridge.message ||
            "Dashboard is not connected to Tabletop Simulator. Click Claim Port to connect."
        );
        return;
      }
      if (skipLive.current) {
        return;
      }
      if (!bridge.usable) {
        showOffline(bridge.message);
        return;
      }
      const result = await fetchLiveSnapshot();
      if (syncingRef.current) {
        return;
      }
      if (result.live) {
        setSnapshot(result.snapshot);
        setLive(true);
        setStatus(result.message);
        return;
      }
      showOffline(result.message);
      if (result.loading && retryTimer.current === null) {
        retryTimer.current = window.setTimeout(() => {
          retryTimer.current = null;
          void refreshRef.current(true);
        }, LOADING_RETRY_MS);
      }
    } catch (error: unknown) {
      showOffline(error instanceof Error ? error.message : "Could not reach TTS.");
    } finally {
      inFlight.current = false;
    }
  }, [showOffline]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const applyQueue = useMemo(
    () =>
      createApplyQueue({
        send: applySheetCommands,
        onSettled: (next) => {
          setSnapshot(next);
          setLive(true);
          setStatus("Live from Tabletop Simulator.");
        },
        onFailure: (error) => {
          showOffline(error.message);
          skipLive.current = false;
          inFlight.current = false;
          void refreshRef.current(true);
        },
        onPendingChange: (pending) => {
          syncingRef.current = pending > 0;
          setSyncing(pending > 0);
        }
      }),
    [showOffline]
  );

  useEffect(() => {
    if (!active) {
      return;
    }
    // One-shot load when the tab opens (plus slow retries while TTS reports it is still loading).
    // Do not poll execute-lua otherwise — that stalls TTS.
    void refresh(true);
    return () => {
      if (retryTimer.current !== null) {
        window.clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, [active, refresh]);

  useEffect(() => {
    if (!active) {
      return;
    }
    // TTS announces every seat change (Sync.player → DashPush.seat). While our own apply is in
    // flight its returned snapshot is authoritative, so pushes are dropped until it settles.
    return subscribeTtsEvents((event) => {
      if (event.topic === "reload") {
        void refreshRef.current(true);
        return;
      }
      if (event.topic !== "pcSeat" || syncingRef.current || applyingNow.current) {
        return;
      }
      setSnapshot((current) => mergeSeatPush(current, event.color, event.data));
    });
  }, [active]);

  useLayoutEffect(() => {
    const root = spreadRef.current;
    if (!root || !active || !live) {
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(root.querySelectorAll(".pc-page"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: "power2.out" });
    }, root);
    return () => ctx.revert();
  }, [active, live, spread]);

  const claimPort = async (): Promise<void> => {
    if (reclaiming) {
      return;
    }
    setReclaiming(true);
    setBusy(true);
    setStatus("Connecting TTS bridge…");
    try {
      const result = await reclaimEditorPort();
      setHoldingPort(result.listening);
      setStatus(result.message);
      skipLive.current = false;
      inFlight.current = false;
      await refresh(true);
    } catch (error: unknown) {
      setHoldingPort(false);
      showOffline(error instanceof Error ? error.message : "Could not connect the TTS bridge.");
    } finally {
      setBusy(false);
      setReclaiming(false);
    }
  };

  const releasePort = async (): Promise<void> => {
    if (reclaiming) {
      return;
    }
    setReclaiming(true);
    setBusy(true);
    setStatus("Disconnecting TTS bridge…");
    try {
      const result = await releaseEditorPort();
      setHoldingPort(false);
      showOffline(result.message);
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Could not disconnect the TTS bridge.");
    } finally {
      setBusy(false);
      setReclaiming(false);
    }
  };

  const apply = (command: ApplyCommand, closeRing = true): void => {
    if (!live) {
      return;
    }
    if (closeRing) {
      setRing(null);
    }
    setSnapshot((current) => applyLocal(current, command));
    applyQueue.enqueue(command);
  };

  /** Wait for TTS and surface host errors to the caller (modals) instead of dropping offline. */
  const applyNow = async (command: ApplyCommand): Promise<void> => {
    if (!live) {
      throw new Error("No live sheet to apply into.");
    }
    setBusy(true);
    applyingNow.current = true;
    try {
      const next = await applySheetCommands([command]);
      if (!next.ok) {
        const detail = next.error ?? `${command.op} apply failed`;
        if (/Unknown op/i.test(detail)) {
          throw new Error(`${detail}. Save & Play in Tabletop Simulator so the latest dashboard bridge loads, then try again.`);
        }
        throw new Error(detail);
      }
      setSnapshot(next);
      setLive(true);
      setStatus("Live from Tabletop Simulator.");
    } finally {
      applyingNow.current = false;
      setBusy(false);
    }
  };

  const applyPlayerDataJsonPatch = async (patch: Record<string, unknown>): Promise<void> => {
    if (!live) {
      throw new Error("No live sheet to apply into.");
    }
    const current = snapshot.seats.find((row) => row.color === selected) ?? snapshot.seats[0];
    if (!current) {
      throw new Error("No seat selected to patch.");
    }
    const base = current.playerData ?? {};
    // Deep-merge into stored playerData; send only keys the author typed.
    // JSON null deletes (top-level → deleteKeys; nested → omitted from merged parent).
    const merged = deepMerge(base, patch) as Record<string, unknown>;
    const partial: Record<string, unknown> = {};
    const deleteKeys: string[] = [];
    for (const key of Object.keys(patch)) {
      if (patch[key] === null) {
        deleteKeys.push(key);
      } else {
        partial[key] = merged[key];
      }
    }
    await applyNow({
      op: "mergePlayerData",
      color: current.color,
      patch: partial,
      ...(deleteKeys.length > 0 ? { deleteKeys } : {})
    });
  };

  const seat: SeatSnapshot | undefined = live
    ? (snapshot.seats.find((row) => row.color === selected) ?? snapshot.seats[0])
    : undefined;

  const openRing = (event: MouseEvent<HTMLElement>, target: RingTarget): void => {
    const panel = event.currentTarget.closest(".pc-sheet-panel");
    const bounds = panel?.getBoundingClientRect();
    setRing({
      x: event.clientX - (bounds?.left ?? 0),
      y: event.clientY - (bounds?.top ?? 0),
      target
    });
  };

  const ringActions = ring && seat ? actionsForRing(seat, ring.target) : [];

  const goToSpread = (index: number): void => {
    setRing(null);
    setSpread(index);
  };

  return (
    <div className="pc-sheet-workspace">
      {live && snapshot.seats.length > 0 ? (
        <PlayerRail
          seats={snapshot.seats}
          selected={seat?.color ?? selected}
          onSelect={setSelected}
          onCommand={(command) => void apply(command)}
        />
      ) : <aside className="pc-rail" aria-hidden={!live} />}
      <div className="pc-spread-wrap">
        {live && seat ? (
          <div ref={spreadRef} className="pc-spread">
            {(SPREADS[spread] ?? SPREADS[0]).pages.map((page, index) => {
              const ctx: PageContext = {
                seat,
                snapshot,
                side: index === 0 ? "left" : "right",
                onRing: openRing,
                apply: (command) => apply(command),
                applyNow
              };
              return <Fragment key={page}>{renderPage(page, ctx)}</Fragment>;
            })}
            {spread > 0 ? (
              <button
                type="button"
                className="pc-spread-home"
                title={`Back to pages ${SPREADS[0].label}`}
                aria-label={`Back to pages ${SPREADS[0].label}`}
                onClick={() => goToSpread(0)}
              />
            ) : null}
            {([["prev", spread - 1], ["next", spread + 1]] as const).map(([dir, target]) => {
              const row = SPREADS[target];
              return row ? (
                <button
                  key={dir}
                  type="button"
                  className={`pc-spread-arrow ${dir}`}
                  title={`Pages ${row.label}`}
                  aria-label={`Pages ${row.label}`}
                  onClick={() => goToSpread(target)}
                >
                  <svg viewBox="0 0 24 40" aria-hidden="true">
                    <path d={dir === "prev" ? "M21 3 L3 20 L21 37 Z" : "M3 3 L21 20 L3 37 Z"} />
                  </svg>
                </button>
              ) : null;
            })}
          </div>
        ) : (
          <div className="pc-spread pc-spread-offline" role="status">
            <p className="pc-offline-title">No live sheet</p>
            <p className="pc-offline-body">{status}</p>
          </div>
        )}
        <div className="pc-bridge-bar">
          <div className={`status ${live ? "success" : "idle"}`}>{status}{syncing ? "  Updating Tabletop Simulator…" : ""}{busy ? "  Sending…" : ""}</div>
          <button
            className="pc-bridge-debug"
            type="button"
            disabled={!live || seat == null}
            onClick={() => setJsonOpen(true)}
            title="Show raw playerData JSON for this seat (merge Apply into game state)"
          >
            JSON
          </button>
          <button
            className={`pc-bridge-retry${holdingPort ? " release" : " claim"}`}
            type="button"
            disabled={reclaiming}
            onClick={() => void (holdingPort ? releasePort() : claimPort())}
            title={holdingPort
              ? "Disconnect the Dashboard TTS bridge (gateway or direct)"
              : "Connect via the TTS Tools gateway when Cursor is open, or take port 39998 directly"}
          >
            {reclaiming ? (holdingPort ? "Releasing…" : "Claiming…") : (holdingPort ? "Release Port" : "Claim Port")}
          </button>
        </div>
      </div>
      {ring && live ? (
        <TraitRing
          x={ring.x}
          y={ring.y}
          actions={ringActions}
          onPick={(action, button) => {
            const command = button === "right" ? (action.right ?? action.left) : action.left;
            void apply(command, action.closeOnPick === true);
          }}
          onClose={() => setRing(null)}
        />
      ) : null}
      {jsonOpen && seat ? (
        <SeatJsonModal
          title={seat.charName || seat.charKey || seat.color}
          playerData={seat.playerData ?? {}}
          onClose={() => setJsonOpen(false)}
          onApply={applyPlayerDataJsonPatch}
        />
      ) : null}
    </div>
  );
};
