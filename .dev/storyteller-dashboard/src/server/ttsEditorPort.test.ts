import { describe, expect, it } from "vitest";
import { shouldKillListener, type EditorPortListener } from "./ttsEditorPort.js";

const listener = (pid: number, name: string, command = ""): EditorPortListener => ({
  pid,
  name,
  command,
  addresses: ["127.0.0.1"]
});

describe("shouldKillListener", () => {
  it("does not kill the dashboard process itself", () => {
    expect(shouldKillListener(listener(19276, "node"), 19276)).toBe(false);
  });

  it("does not kill Tabletop Simulator", () => {
    expect(shouldKillListener(listener(16472, "Tabletop Simulator", "C:\\...\\Tabletop Simulator.exe"), 19276)).toBe(false);
  });

  it("kills Cursor TTS Tools and leftover node holders", () => {
    expect(shouldKillListener(listener(21812, "Cursor", "D:\\Apps\\Cursor\\Cursor.exe --type=utility"), 19276)).toBe(true);
    expect(shouldKillListener(listener(4400, "node", "node .tools/tts-bridge"), 19276)).toBe(true);
  });
});
