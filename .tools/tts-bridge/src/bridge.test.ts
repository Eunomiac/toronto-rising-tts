import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { TtsExternalEditorBridge } from "./bridge.js";
import { readJsonFromSocket } from "./socket-json.js";

type MockTtsHandler = (msg: Record<string, unknown>) => Promise<void>;

/** Mimics TTS: listens for commands on `commandPort`, replies via one-shot connections to `editorPort`. */
class MockTts {
  private server: net.Server | null = null;

  constructor(
    private readonly commandPort: number,
    private readonly editorPort: number,
    private readonly handler: MockTtsHandler
  ) {}

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket: net.Socket) => {
        readJsonFromSocket(socket)
          .then((msg) => this.onCommand(msg))
          .catch(() => undefined);
      });
      this.server.once("error", reject);
      this.server.listen(this.commandPort, "127.0.0.1", () => resolve());
    });
  }

  private async onCommand(msg: Record<string, unknown>): Promise<void> {
    await this.handler(msg);
  }

  async stop(): Promise<void> {
    const s = this.server;
    if (s === null) {
      return;
    }
    return new Promise((resolve) => {
      s.close(() => {
        this.server = null;
        resolve();
      });
    });
  }
}

function sendOneShotJson(port: number, body: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const c = new net.Socket();
    c.once("error", reject);
    c.connect(port, "127.0.0.1", () => {
      const raw = JSON.stringify(body);
      c.end(raw, "utf8", () => resolve());
    });
  });
}

async function freeTcpPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      if (addr === null || typeof addr === "string") {
        s.close();
        reject(new Error("Unexpected address"));
        return;
      }
      const port = addr.port;
      s.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(port);
        }
      });
    });
  });
}

/** Two ports with inequality guard (ephemeral reuse can occasionally repeat). */
async function twoDistinctFreePorts(): Promise<{ editorPort: number; commandPort: number }> {
  let editorPort = await freeTcpPort();
  let commandPort = await freeTcpPort();
  let guard = 0;
  while (commandPort === editorPort && guard < 16) {
    commandPort = await freeTcpPort();
    guard += 1;
  }
  if (commandPort === editorPort) {
    throw new Error("Could not allocate two distinct TCP ports for test");
  }
  return { editorPort, commandPort };
}

describe("TtsExternalEditorBridge", () => {
  let bridge: TtsExternalEditorBridge | null = null;
  let mock: MockTts | null = null;

  afterEach(async () => {
    if (bridge !== null) {
      await bridge.close();
      bridge = null;
    }
    if (mock !== null) {
      await mock.stop();
      mock = null;
    }
  });

  it("accepts string numeric messageID from mock TTS (return path)", async () => {
    const { editorPort, commandPort } = await twoDistinctFreePorts();
    mock = new MockTts(commandPort, editorPort, async (msg) => {
      if (msg["messageID"] !== 3) {
        return;
      }
      await sendOneShotJson(editorPort, { messageID: "5", returnValue: { ok: true } });
    });
    await mock.start();
    bridge = new TtsExternalEditorBridge({ clientPort: commandPort, serverPort: editorPort });
    const result = await bridge.executeWithOutput({ script: "return {}", maxWaitMs: 5000 });
    expect(result.timedOut).toBe(false);
    expect(result.returnValue).toEqual({ ok: true });
  });

  it("collects prints and returnValue from mock TTS", async () => {
    const { editorPort, commandPort } = await twoDistinctFreePorts();
    mock = new MockTts(commandPort, editorPort, async (msg) => {
      if (msg["messageID"] !== 3) {
        return;
      }
      await sendOneShotJson(editorPort, { messageID: 2, message: "hi" });
      await sendOneShotJson(editorPort, { messageID: 5, returnValue: 99 });
    });
    await mock.start();
    bridge = new TtsExternalEditorBridge({ clientPort: commandPort, serverPort: editorPort });
    const result = await bridge.executeWithOutput({ script: "return 1", maxWaitMs: 5000 });
    expect(result.timedOut).toBe(false);
    expect(result.error).toBeUndefined();
    expect(result.prints).toEqual(["hi"]);
    expect(result.returnValue).toBe(99);
  });

  it("captures Lua error payload (messageID 3)", async () => {
    const { editorPort, commandPort } = await twoDistinctFreePorts();
    mock = new MockTts(commandPort, editorPort, async (msg) => {
      if (msg["messageID"] !== 3) {
        return;
      }
      await sendOneShotJson(editorPort, {
        messageID: 3,
        error: "syntax fault",
        guid: "-1",
        errorMessagePrefix: "Error in Global Script: ",
      });
    });
    await mock.start();
    bridge = new TtsExternalEditorBridge({ clientPort: commandPort, serverPort: editorPort });
    const result = await bridge.executeWithOutput({ script: "oops()", maxWaitMs: 5000 });
    expect(result.timedOut).toBe(false);
    expect(result.error?.message).toBe("syntax fault");
    expect(result.returnValue).toBeUndefined();
  });

  it("ends with timedOut when no inbound response within maxWaitMs", async () => {
    const { editorPort, commandPort } = await twoDistinctFreePorts();
    mock = new MockTts(commandPort, editorPort, async () => undefined);
    await mock.start();
    bridge = new TtsExternalEditorBridge({ clientPort: commandPort, serverPort: editorPort });
    const result = await bridge.executeWithOutput({ script: "sleep()", maxWaitMs: 150, idleTimeoutMs: 500 });
    expect(result.timedOut).toBe(true);
  });

  it("completes print-only snippets via idle timeout", async () => {
    const { editorPort, commandPort } = await twoDistinctFreePorts();
    mock = new MockTts(commandPort, editorPort, async (msg) => {
      if (msg["messageID"] !== 3) {
        return;
      }
      await sendOneShotJson(editorPort, { messageID: 2, message: "only-print" });
    });
    await mock.start();
    bridge = new TtsExternalEditorBridge({ clientPort: commandPort, serverPort: editorPort });
    const result = await bridge.executeWithOutput({
      script: "print(1)",
      maxWaitMs: 5000,
      idleTimeoutMs: 100,
    });
    expect(result.timedOut).toBe(false);
    expect(result.prints).toEqual(["only-print"]);
    expect(result.returnValue).toBeUndefined();
  });

  it("serializes concurrent executeWithOutput calls", async () => {
    const { editorPort, commandPort } = await twoDistinctFreePorts();
    let inboundExecuteCount = 0;
    mock = new MockTts(commandPort, editorPort, async (msg) => {
      if (msg["messageID"] !== 3) {
        return;
      }
      inboundExecuteCount += 1;
      const n = inboundExecuteCount;
      if (n === 1) {
        await new Promise((r) => setTimeout(r, 100));
        await sendOneShotJson(editorPort, { messageID: 5, returnValue: "a" });
      } else {
        await sendOneShotJson(editorPort, { messageID: 5, returnValue: "b" });
      }
    });
    await mock.start();
    bridge = new TtsExternalEditorBridge({ clientPort: commandPort, serverPort: editorPort });

    const order: string[] = [];
    const p1 = bridge.executeWithOutput({ script: "x", maxWaitMs: 5000 }).then((r) => {
      order.push(String(r.returnValue));
    });
    const p2 = bridge.executeWithOutput({ script: "y", maxWaitMs: 5000 }).then((r) => {
      order.push(String(r.returnValue));
    });
    await Promise.all([p1, p2]);

    expect(order).toEqual(["a", "b"]);
  });
});
