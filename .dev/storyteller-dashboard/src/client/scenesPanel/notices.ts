import { useEffect, useState } from "react";
import { subscribeTtsEvents, type TtsPushEvent } from "../ttsEvents";

/** The server replays the last notice to a tab that reconnects; older than this, it is not news. */
const NOTICE_FRESH_MS = 60_000;

/** The text of a fresh `notice` push (TTS refused or failed something the Storyteller started). */
export const noticeText = (event: TtsPushEvent, now: number): string | undefined => {
  if (event.topic !== "notice" || (event.at !== undefined && now - event.at > NOTICE_FRESH_MS)) {
    return undefined;
  }
  const text = (event.data as { text?: unknown } | undefined)?.text;
  return typeof text === "string" && text !== "" ? text : undefined;
};

/** The latest TTS notice until the Storyteller dismisses it. */
export const useTtsNotice = (): { readonly notice: string | null; readonly dismiss: () => void } => {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => subscribeTtsEvents((event) => {
    const text = noticeText(event, Date.now());
    if (text) {
      setNotice(text);
    }
  }), []);
  return { notice, dismiss: () => setNotice(null) };
};
