import { gsap } from "gsap";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactElement } from "react";
import { fetchBridgeStatus, isBridgeConnected, reclaimEditorPort, releaseEditorPort } from "../ttsBridge.js";
import { applySheetCommands, fetchLiveSnapshot } from "./bridge.js";
import { applyLocal } from "./applyLocal.js";
import { createApplyQueue } from "./applyQueue.js";
import { deepMerge } from "./deepMerge.js";
import { PageOne } from "./PageOne.js";
import { PlayerRail } from "./PlayerRail.js";
import { SeatJsonModal } from "./SeatJsonModal.js";
import { actionsForRing } from "./ringActions.js";
import { TraitRing } from "./TraitRing.js";
import type { ApplyCommand, RingTarget, SeatColor, SeatSnapshot, SheetSnapshot } from "./types.js";

type Props = {
  readonly active: boolean;
};

const emptyLiveSnapshot = (): SheetSnapshot => ({ ok: false, seats: [] });

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
  const inFlight = useRef(false);
  const skipLive = useRef(false);
  const syncingRef = useRef(false);

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
    // One-shot load when the tab opens. Do not poll execute-lua — that stalls TTS.
    void refresh(true);
  }, [active, refresh]);

  useLayoutEffect(() => {
    const root = spreadRef.current;
    if (!root || !active || !live) {
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(root.querySelectorAll(".pc-page"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: "power2.out" });
    }, root);
    return () => ctx.revert();
  }, [active, live]);

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
    const command: ApplyCommand = {
      op: "mergePlayerData",
      color: current.color,
      patch: partial,
      ...(deleteKeys.length > 0 ? { deleteKeys } : {})
    };
    setBusy(true);
    try {
      const next = await applySheetCommands([command]);
      if (!next.ok) {
        const detail = next.error ?? "mergePlayerData apply failed";
        if (/Unknown op/i.test(detail)) {
          throw new Error(
            `${detail}. Save & Play in Tabletop Simulator so the dashboard.pc_sheet bridge (mergePlayerData) loads, then try Apply again.`
          );
        }
        throw new Error(detail);
      }
      setSnapshot(next);
      setLive(true);
      setStatus("Live from Tabletop Simulator.");
    } finally {
      setBusy(false);
    }
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
            <PageOne
              seat={seat}
              onRing={openRing}
              onCommand={({ op, delta }) => void apply({ op, color: seat.color, delta })}
              onDesire={(text) => {
                if (text !== seat.desire) {
                  void apply({ op: "desire", color: seat.color, text });
                }
              }}
            />
            <article className="pc-page pc-page-two" aria-hidden="true">
              <span>II</span>
            </article>
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
