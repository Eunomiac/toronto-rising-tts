import { gsap } from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactElement } from "react";
import { fetchBridgeStatus } from "../ttsBridge.js";
import { applySheetCommand, snapshotOrFixture } from "./bridge.js";
import { fixtureSnapshot } from "./fixture.js";
import { PageOne } from "./PageOne.js";
import { PlayerRail } from "./PlayerRail.js";
import { TraitRing } from "./TraitRing.js";
import type { ApplyCommand, RingAction, SeatColor, SeatSnapshot, SheetSnapshot } from "./types.js";

type Props = {
  readonly active: boolean;
};

const POLL_MS = 2500;

export const PcSheetTab = ({ active }: Props): ReactElement => {
  const spreadRef = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState<SheetSnapshot | null>(null);
  const [selected, setSelected] = useState<SeatColor>("Pink");
  const [status, setStatus] = useState("Checking TTS…");
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ring, setRing] = useState<{ x: number; y: number; actions: readonly RingAction[] } | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async (): Promise<void> => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    try {
      const bridge = await fetchBridgeStatus();
      if (!bridge.usable) {
        setSnapshot(fixtureSnapshot());
        setLive(false);
        setStatus(bridge.message);
        return;
      }
      const result = await snapshotOrFixture();
      setSnapshot(result.snapshot);
      setLive(result.live);
      setStatus(result.message);
    } catch (error: unknown) {
      setSnapshot(fixtureSnapshot());
      setLive(false);
      setStatus(error instanceof Error ? error.message : "Could not reach TTS.");
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
  }, [active, selected]);

  const apply = async (command: ApplyCommand): Promise<void> => {
    setBusy(true);
    setRing(null);
    try {
      const next = await applySheetCommand(command);
      if (next.ok) {
        setSnapshot(next);
        setLive(true);
        setStatus("Applied in Tabletop Simulator.");
      } else {
        setStatus(next.error ?? "Apply failed.");
      }
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Apply failed.");
    } finally {
      setBusy(false);
    }
  };

  const seat: SeatSnapshot | undefined = snapshot?.seats.find((row) => row.color === selected) ?? snapshot?.seats[0];

  const openRing = (event: MouseEvent<HTMLElement>, actions: readonly RingAction[]): void => {
    const panel = event.currentTarget.closest(".pc-sheet-panel");
    const bounds = panel?.getBoundingClientRect();
    setRing({
      x: event.clientX - (bounds?.left ?? 0),
      y: event.clientY - (bounds?.top ?? 0),
      actions
    });
  };

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
        <div className={`status ${live ? "success" : "idle"}`}>{status}{busy ? "  Sending…" : ""}</div>
      </div>
      {ring ? (
        <TraitRing
          x={ring.x}
          y={ring.y}
          actions={ring.actions}
          onPick={(action) => void apply(action.command)}
          onClose={() => setRing(null)}
        />
      ) : null}
    </div>
  );
};
