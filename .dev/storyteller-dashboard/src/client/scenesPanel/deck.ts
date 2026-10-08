import type { DeckScene } from "../../shared/sceneDeck";

/**
 * Live scenes on deck. TTS only knows the scene on the table, so the dashboard remembers the rest: the table's scene
 * joins the deck when TTS reports it, and leaves when the Storyteller ends it from the dashboard.
 */

/** The deck with TTS's current scene in it (title refreshed); the same array when nothing changes. */
export const withTableScene = (deck: readonly DeckScene[], key: string, title: string): readonly DeckScene[] => {
  const row = deck.find((scene) => scene.key === key);
  if (row?.title === title) {
    return deck;
  }
  return row ? deck.map((scene) => (scene.key === key ? { key, title } : scene)) : [...deck, { key, title }];
};

export const withoutScene = (deck: readonly DeckScene[], key: string): readonly DeckScene[] =>
  deck.filter((scene) => scene.key !== key);
