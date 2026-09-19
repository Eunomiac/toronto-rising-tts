import { gsap } from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactElement } from "react";
import { fetchBridgeStatus, reclaimEditorPort, releaseEditorPort } from "../ttsBridge.js";
import { applySheetCommand, snapshotOrFixture } from "./bridge.js";
import { applyLocal } from "./applyLocal.js";
import { fixtureSnapshot } from "./fixture.js";
import { PageOne } from "./PageOne.js";
import { PlayerRail } from "./PlayerRail.js";
import { actionsForRing } from "./ringActions.js";
import { TraitRing } from "./TraitRing.js";
import type { ApplyCommand, RingTarget, SeatColor, SeatSnapshot, SheetSnapshot } from "./types.js";

type Props = {
  readonly active: boolean;
};

const POLL_MS = 2500;

const friendlyBridgeMessage = (message: string): string => {
  if (/Claim Port first|not holding port 39998/i.test(message)) {
    return "Dashboard is not holding the editor port.";
  }
  if (/Command failed:|powershell\.exe|netstat\.exe/i.test(message)) {
    return "Could not inspect port 39998.";
  }
  if (/nil value|executeScript|did not return a sheet snapshot/i.test(message)) {
    return "Live sheet is not answering yet — showing stand-in stats.";
  }
  return message;
};

export const PcSheetTab = ({ active }: Props): ReactElement => {
  const spreadRef = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState<SheetSnapshot>(() => fixtureSnapshot());
  const [selected, setSelected] = useState<SeatColor>("Pink");
  const [status, setStatus] = useState("Checking TTS…");
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reclaiming, setReclaiming] = useState(false);
  const [holdingPort, setHoldingPort] = useState(false);
  const [ring, setRing] = useState<{ x: number; y: number; target: RingTarget } | null>(null);
  const inFlight = useRef(false);
  const skipLive = useRef(false);

  const refresh = useCallback(async (force = false): Promise<void> => {
    if (force) {
      skipLive.current = false;
    }
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    try {
      const bridge = await fetchBridgeStatus();
      const holding = bridge.editorPort === "held_by_dashboard";
      setHoldingPort(holding);
      if (!holding) {
        skipLive.current = true;
        setLive(false);
        setStatus(bridge.editorPort === "in_use"
          ? "TTS Tools is using port 39998. Click Claim Port to take it for the live sheet."
          : "Dashboard is not holding the editor port. Click Claim Port to talk to Tabletop Simulator.");
        return;
      }
      if (skipLive.current) {
        return;
      }
      if (!bridge.usable) {
        skipLive.current = true;
        setLive(false);
        setStatus(bridge.message);
        return;
      }
      const result = await snapshotOrFixture();
      if (result.live) {
        setSnapshot(result.snapshot);
        setLive(true);
        setStatus(result.message);
        return;
      }
      skipLive.current = true;
      setLive(false);
      setStatus(friendlyBridgeMessage(result.message));
    } catch (error: unknown) {
      skipLive.current = true;
      setLive(false);
      setStatus(friendlyBridgeMessage(error instanceof Error ? error.message : "Could not reach TTS."));
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }
    void refresh();
    const timer = window.setInterval(() => {
      if (!busy) {
        void refresh();
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [active, busy, refresh]);

  useLayoutEffect(() => {
    const root = spreadRef.current;
    if (!root || !active) {
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(root.querySelectorAll(".pc-page"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: "power2.out" });
    }, root);
    return () => ctx.revert();
  }, [active]);

  const claimPort = async (): Promise<void> => {
    if (reclaiming) {
      return;
    }
    setReclaiming(true);
    setBusy(true);
    setStatus("Claiming port 39998…");
    try {
      const result = await reclaimEditorPort();
      setHoldingPort(result.listening);
      setStatus(result.message);
      skipLive.current = false;
      inFlight.current = false;
      await refresh(true);
    } catch (error: unknown) {
      skipLive.current = true;
      setLive(false);
      setHoldingPort(false);
      setStatus(error instanceof Error ? error.message : "Could not claim port 39998.");
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
    setStatus("Releasing port 39998…");
    try {
      const result = await releaseEditorPort();
      setHoldingPort(false);
      skipLive.current = true;
      setLive(false);
      setStatus(result.message);
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Could not release port 39998.");
    } finally {
      setBusy(false);
      setReclaiming(false);
    }
  };

  const apply = async (command: ApplyCommand, closeRing = true): Promise<void> => {
    setBusy(true);
    if (closeRing) {
      setRing(null);
    }
    try {
      if (!live) {
        setSnapshot((current) => applyLocal(current ?? fixtureSnapshot(), command));
        setStatus("Stand-in sheet — changes stay on this tab until live TTS answers.");
        return;
      }
      const next = await applySheetCommand(command);
      if (next.ok) {
        setSnapshot(next);
        setLive(true);
        setStatus("Applied in Tabletop Simulator.");
      } else {
        setStatus(friendlyBridgeMessage(next.error ?? "Apply failed."));
      }
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Apply failed.");
    } finally {
      setBusy(false);
    }
  };

  const seat: SeatSnapshot | undefined = snapshot?.seats.find((row) => row.color === selected) ?? snapshot?.seats[0];

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
      {snapshot ? (
        <PlayerRail
          seats={snapshot.seats}
          selected={seat?.color ?? selected}
          onSelect={setSelected}
          onCommand={(command) => void apply(command)}
        />
      ) : <aside className="pc-rail" />}
      <div className="pc-spread-wrap">
        <div ref={spreadRef} className="pc-spread">
          {seat ? (
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
          ) : <article className="pc-page pc-page-one" />}
          <article className="pc-page pc-page-two" aria-hidden="true">
            <span>II</span>
          </article>
        </div>
        <div className="pc-bridge-bar">
          <div className={`status ${live ? "success" : "idle"}`}>{status}{busy ? "  Sending…" : ""}</div>
          <button
            className={`pc-bridge-retry${holdingPort ? " release" : " claim"}`}
            type="button"
            disabled={reclaiming}
            onClick={() => void (holdingPort ? releasePort() : claimPort())}
            title={holdingPort
              ? "Release port 39998 so TTS Tools can use it"
              : "Stop anything using port 39998, then try Tabletop Simulator again"}
          >
            {reclaiming ? (holdingPort ? "Releasing…" : "Claiming…") : (holdingPort ? "Release Port" : "Claim Port")}
          </button>
        </div>
      </div>
      {ring ? (
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
    </div>
  );
};
