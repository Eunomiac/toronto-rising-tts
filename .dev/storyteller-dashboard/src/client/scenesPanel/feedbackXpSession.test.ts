import { describe, expect, it } from "vitest";
import { isFeedbackXpDoneForSession, markFeedbackXpDoneForSession } from "./feedbackXpSession";

const memoryStorage = (): Storage => {
  const memory: Record<string, string> = {};
  return {
    getItem: (key: string) => memory[key] ?? null,
    setItem: (key: string, value: string) => {
      memory[key] = value;
    },
    removeItem: (key: string) => {
      delete memory[key];
    },
    clear: () => {
      for (const key of Object.keys(memory)) {
        delete memory[key];
      }
    },
    key: () => null,
    length: 0
  } as Storage;
};

describe("feedbackXpSession", () => {
  it("starts unset for a session, then stays done after mark", () => {
    const storage = memoryStorage();
    expect(isFeedbackXpDoneForSession(12, storage)).toBe(false);
    markFeedbackXpDoneForSession(12, storage);
    expect(isFeedbackXpDoneForSession(12, storage)).toBe(true);
    expect(isFeedbackXpDoneForSession(13, storage)).toBe(false);
  });
});
