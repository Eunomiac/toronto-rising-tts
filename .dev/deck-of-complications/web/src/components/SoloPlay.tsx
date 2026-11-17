import { useEffect, useMemo, useState } from "react";
import catalogJson from "../../public/data/catalog.json";
import {
  adjust,
  cancelConfirm,
  candidates,
  confirmEnd,
  createGame,
  discardSelected,
  maybeAutoEnd,
  publicView,
  requestStop,
  resumePlay,
  reveal,
  selectCard,
  setCardValue,
  setModeStop,
  toggleCategories,
  toggleEnhance,
  toggleNegate,
  type PublicGameView,
} from "../engine/game";
import type { CatalogCard, ClientRole, GameState } from "../engine/types";
import type { GameIntent } from "../protocol";
import { playSfx, unlockAudio } from "../audio/sfx";
import { Board } from "./Board";
import { MuteButton } from "./MuteButton";
import { SessionStrip } from "./SessionStrip";

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
  const [margin, setMargin] = useState(-3);
  const [game, setGame] = useState<GameState | null>(null);

  useEffect(() => {
    setGame(newSolo(margin));
    void unlockAudio().then(() => playSfx("deal"));
    // mount only
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
          break;
        case "select":
          selectCard(g, intent.cardId);
          break;
        case "enhance":
          toggleEnhance(g);
          break;
        case "negate":
          toggleNegate(g);
          break;
        case "discard":
          discardSelected(g);
          break;
        case "random": {
          const list = candidates(g, intent.mode);
          if (list.length) {
            selectCard(g, list[Math.floor(Math.random() * list.length)]);
            g.mode = "select";
          }
          break;
        }
        case "adjust":
          adjust(g, intent.delta);
          break;
        case "setValue":
          setCardValue(g, intent.value);
          break;
        case "toggleAutoDiscard":
          toggleCategories(g);
          break;
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
    <div className={`page game solo role-${role}`}>
      <MuteButton />
      <header className="top-bar">
        <div>
          <h1>Deck of Complications</h1>
        </div>
        <div className="solo-tools">
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
              onChange={(e) => setMargin(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void unlockAudio().then(() => playSfx("deal"));
              setGame(newSolo(margin));
            }}
          >
            Redeal
          </button>
        </div>
      </header>
      <div className="game-stage">
        <div className="game-main">
          <SessionStrip role={role} view={view} onIntent={apply} />
          <Board
            view={view}
            role={role}
            onFlip={(cardId) => {
              void unlockAudio().then(() => {
                playSfx("burn");
                apply({ op: "flip", cardId });
              });
            }}
            onSelect={(cardId) => apply({ op: "select", cardId })}
            onIntent={apply}
          />
        </div>
      </div>
    </div>
  );
}
