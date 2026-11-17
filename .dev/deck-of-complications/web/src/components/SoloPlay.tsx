import { useEffect, useMemo, useState } from "react";
import catalogJson from "../../public/data/catalog.json";
import {
  adjust,
  armSelect,
  cancelConfirm,
  candidates,
  clearSelection,
  confirmEnd,
  createGame,
  discardCard,
  maybeAutoEnd,
  pickRandomSelected,
  publicView,
  requestStop,
  resumePlay,
  reveal,
  selectCard,
  setAdjust,
  setCardValue,
  setMargin,
  setModeStop,
  toggleCategories,
  toggleEnhance,
  toggleNegate,
  toggleSelect,
  type PublicGameView,
} from "../engine/game";
import type { CatalogCard, ClientRole, GameState } from "../engine/types";
import type { GameIntent } from "../protocol";
import { playSfx, unlockAudio } from "../audio/sfx";
import { Board } from "./Board";
import { FloatingHud } from "./FloatingHud";
import { MuteButton } from "./MuteButton";

const catalog = (catalogJson as { cards: CatalogCard[] }).cards;

function newSolo(margin: number): GameState {
  return createGame(
    {
      color: "Red",
      rollId: "solo",
      rollType: "launch",
      playerLabel: "Solo Test",
      margin,
    },
    catalog,
  );
}

export function SoloPlay() {
  const [role, setRole] = useState<ClientRole>("player");
  const [margin, setMarginUi] = useState(-3);
  const [game, setGame] = useState<GameState | null>(null);

  useEffect(() => {
    setGame(newSolo(margin));
    void unlockAudio().then(() => playSfx("deal"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const view: PublicGameView | null = useMemo(
    () => (game ? publicView(game) : null),
    [game],
  );

  function apply(intent: GameIntent) {
    setGame((prev) => {
      if (!prev) return prev;
      const g = structuredClone(prev) as GameState;
      switch (intent.op) {
        case "flip": {
          reveal(g, intent.cardId, catalog);
          maybeAutoEnd(g);
          break;
        }
        case "stop":
          if (role === "player") requestStop(g);
          else if (g.mode === "select") setModeStop(g);
          else if (g.mode === "confirm") confirmEnd(g);
          else requestStop(g);
          break;
        case "confirmEnd":
          confirmEnd(g);
          break;
        case "cancelConfirm":
          cancelConfirm(g);
          break;
        case "resume":
          resumePlay(g);
          break;
        case "forceSelect":
          armSelect(g);
          break;
        case "toggleSelect":
          toggleSelect(g, intent.cardId);
          break;
        case "clearSelection":
          clearSelection(g);
          break;
        case "select":
          selectCard(g, intent.cardId);
          break;
        case "enhance":
          toggleEnhance(g, intent.cardId);
          break;
        case "negate":
          toggleNegate(g, intent.cardId);
          break;
        case "discard":
          discardCard(g, intent.cardId);
          break;
        case "setValue":
          setCardValue(g, intent.cardId, intent.value);
          break;
        case "pickRandomSelected":
          pickRandomSelected(g);
          break;
        case "adjust":
          adjust(g, intent.delta);
          break;
        case "setAdjust":
          setAdjust(g, intent.value);
          break;
        case "setMargin":
          setMargin(g, intent.value);
          break;
        case "toggleAutoDiscard":
          toggleCategories(g);
          break;
        case "random": {
          const list = candidates(g, intent.mode);
          if (list.length) {
            selectCard(g, list[Math.floor(Math.random() * list.length)]);
            g.mode = "select";
          }
          break;
        }
      }
      return g;
    });
  }

  if (!view || !game) {
    return (
      <div className="page loading">
        <MuteButton />
        <p>Dealing…</p>
      </div>
    );
  }

  return (
    <div className={`page game immersive solo role-${role}`}>
      <MuteButton />
      {/* Solo practice only — hidden from real player sessions */}
      <div className="solo-dev-tools">
        <label>
          Act as
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ClientRole)}
          >
            <option value="player">Player</option>
            <option value="storyteller">Storyteller</option>
          </select>
        </label>
        <label>
          Margin
          <input
            type="number"
            value={margin}
            onChange={(e) => setMarginUi(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            void unlockAudio().then(() => playSfx("deal"));
            setGame(newSolo(margin));
          }}
        >
          Redeal
        </button>
      </div>

      <FloatingHud role={role} view={view} onIntent={apply} />
      <Board
        view={view}
        role={role}
        onFlip={(cardId) => {
          void unlockAudio().then(() => {
            playSfx("burn");
            apply({ op: "flip", cardId });
          });
        }}
        onToggleSelect={(cardId) => apply({ op: "toggleSelect", cardId })}
        onIntent={apply}
      />
    </div>
  );
}
