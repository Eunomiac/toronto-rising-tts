import { describe, expect, it } from "vitest";
import { parseNetstatListening, shouldKillListener, type EditorPortListener } from "./ttsEditorPort.js";

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

describe("parseNetstatListening", () => {
  it("reads IPv4 and IPv6 LISTENING rows for the editor port", () => {
    const stdout = [
      "  TCP    0.0.0.0:39998          0.0.0.0:0              LISTENING       21812",
      "  TCP    127.0.0.1:39998        0.0.0.0:0              LISTENING       19276",
      "  TCP    [::]:39998             [::]:0                 LISTENING       21812",
      "  TCP    127.0.0.1:39999        0.0.0.0:0              LISTENING       16472"
    ].join("\r\n");
    expect(parseNetstatListening(stdout, 39998)).toEqual([
      { address: "0.0.0.0", pid: 21812 },
      { address: "127.0.0.1", pid: 19276 },
      { address: "[::]", pid: 21812 }
    ]);
  });
});
