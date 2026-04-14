/**
 * Agent guidance: .dev/TTS_MCP.md; .dev/TTS_BUNDLING_SETUP.md (port 39998 listener); .dev/tts-api/Getting Started/External Editor API.md.
 */
import net from "node:net";
import type { ExecuteOptions, ExecuteResult, TtsExecuteError } from "./types.js";
import { readJsonFromSocket } from "./socket-json.js";

const DEFAULT_CLIENT_PORT = 39_999;
const DEFAULT_SERVER_PORT = 39_998;

/**
 * After the last inbound print/custom/return-related message, wait this long before treating
 * a print-only execute as complete. Large default so coroutine sequences (e.g. lighting tests)
 * with multi-second gaps do not false-complete; callers may pass a smaller `idleTimeoutMs` for
 * fast probe scripts. The overall call is still capped by `maxWaitMs`.
 */
const DEFAULT_IDLE_TIMEOUT_MS = 60_000;

function asMessageId(msg: Record<string, unknown>): number | undefined {
  const id = msg["messageID"];
  if (typeof id === "number" && Number.isFinite(id)) {
    return id;
  }
  if (typeof id === "string" && /^\d+$/.test(id)) {
    return Number(id);
  }
  return undefined;
}

/**
 * Bidirectional client for the Tabletop Simulator External Editor API:
 * listens on `serverPort` (default 39998) for TTS → editor messages, sends commands to `clientPort` (default 39999).
 * Execute calls are serialized (single-flight) so inbound print/error/return lines are not mixed across snippets.
 */
export class TtsExternalEditorBridge {
  private readonly clientPort: number;
  private readonly serverPort: number;
  private server: net.Server | null = null;
  private readonly inboundHandlers = new Set<(msg: Record<string, unknown>) => void>();
  private chain: Promise<void> = Promise.resolve();

  constructor(options?: { clientPort?: number; serverPort?: number }) {
    this.clientPort = options?.clientPort ?? DEFAULT_CLIENT_PORT;
    this.serverPort = options?.serverPort ?? DEFAULT_SERVER_PORT;
  }

  /**
   * Ensures a TCP server is listening for inbound TTS messages. Idempotent.
   */
  async ensureListening(): Promise<void> {
    if (this.server !== null) {
      return;
    }

    return new Promise((resolve, reject) => {
      const server = net.createServer((socket: net.Socket) => {
        readJsonFromSocket(socket).then(
          (msg) => {
            for (const handler of this.inboundHandlers) {
              handler(msg);
            }
          },
          (err: unknown) => {
            console.error(
              "[tts-bridge] Failed to parse inbound TTS message:",
              err instanceof Error ? err.message : err
            );
          }
        );
      });

      server.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          reject(
            new Error(
              `Port ${this.serverPort} is already in use (TTS editor inbound). Only one listener is allowed on 39998 — stop other External Editor clients (e.g. TTS Tools / VS Code extensions) or change serverPort. Original: ${err.message}`
            )
          );
          return;
        }
        reject(err);
      });

      server.listen(this.serverPort, "127.0.0.1", () => {
        this.server = server;
        resolve();
      });
    });
  }

  /**
   * Stops the inbound listener (for tests or clean shutdown).
   */
  async close(): Promise<void> {
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

  /**
   * Sends `messageID: 2` so TTS forwards `customMessage` to `onExternalMessage` in the game.
   * Does not wait for Lua output (prints may still arrive asynchronously on this listener).
   */
  sendCustomMessage(customMessage: unknown): Promise<void> {
    return this.enqueue(async () => {
      if (typeof customMessage !== "object" || customMessage === null || Array.isArray(customMessage)) {
        throw new Error("customMessage must be a non-null object (TTS expects a Lua table / JSON object)");
      }
      await this.ensureListening();
      await this.sendToTts({ messageID: 2, customMessage });
    });
  }

  /**
   * Runs Lua in TTS and collects prints, optional return value / error / custom messages until completion or timeout.
   */
  executeWithOutput(options: ExecuteOptions): Promise<ExecuteResult> {
    return this.enqueue(() => this.runExecute(options));
  }

  /** Serialize all outbound operations so `ensureListening` and execute sessions never race. */
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.chain.then(fn);
    this.chain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  private async runExecute(opts: ExecuteOptions): Promise<ExecuteResult> {
    await this.ensureListening();

    return new Promise((resolve, reject) => {
      const prints: string[] = [];
      const customMessages: unknown[] = [];
      let returnValue: unknown | undefined;
      let error: TtsExecuteError | undefined;
      let done = false;

      const maxWait = opts.maxWaitMs ?? 30_000;
      const idleWait = opts.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;

      let idleTimer: NodeJS.Timeout | undefined;
      let maxTimer: NodeJS.Timeout | undefined;

      const cleanup = (): void => {
        if (idleTimer !== undefined) {
          clearTimeout(idleTimer);
        }
        if (maxTimer !== undefined) {
          clearTimeout(maxTimer);
        }
        this.inboundHandlers.delete(onMessage);
      };

      const finish = (timedOut: boolean): void => {
        if (done) {
          return;
        }
        done = true;
        cleanup();
        resolve({
          prints,
          returnValue,
          error,
          customMessages,
          timedOut,
        });
      };

      const resetIdle = (): void => {
        if (idleTimer !== undefined) {
          clearTimeout(idleTimer);
        }
        idleTimer = setTimeout(() => {
          if (!done) {
            finish(false);
          }
        }, idleWait);
      };

      const onMessage = (msg: Record<string, unknown>): void => {
        if (done) {
          return;
        }

        const id = asMessageId(msg);
        if (id === 2 || id === 3 || id === 4 || id === 5) {
          resetIdle();
        }

        switch (id) {
          case 2: {
            const line = msg["message"];
            if (typeof line === "string") {
              prints.push(line);
            }
            break;
          }
          case 3: {
            if (typeof msg["error"] === "string") {
              error = {
                message: msg["error"],
                guid: typeof msg["guid"] === "string" ? msg["guid"] : "-1",
                errorMessagePrefix:
                  typeof msg["errorMessagePrefix"] === "string" ? msg["errorMessagePrefix"] : "",
              };
              finish(false);
            }
            break;
          }
          case 4:
            if ("customMessage" in msg) {
              customMessages.push(msg["customMessage"]);
            }
            break;
          case 5:
            // TTS sends this after execute when the chunk returns a value. Primitives and
            // JSON-friendly values work; raw Lua tables may not serialize — use JSON.encode in Lua.
            if ("returnValue" in msg) {
              returnValue = msg["returnValue"];
            }
            finish(false);
            break;
          default:
            break;
        }
      };

      this.inboundHandlers.add(onMessage);

      maxTimer = setTimeout(() => {
        if (!done) {
          finish(true);
        }
      }, maxWait);

      this.sendToTts({
        messageID: 3,
        guid: opts.guid ?? "-1",
        script: opts.script,
      })
        .then(() => {
          resetIdle();
        })
        .catch((e: unknown) => {
          if (!done) {
            done = true;
            cleanup();
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        });
    });
  }

  private sendToTts(message: object): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.once("error", reject);
      client.connect(this.clientPort, "127.0.0.1", () => {
        const payload = JSON.stringify(message);
        client.write(payload, "utf8", (writeErr: Error | null | undefined) => {
          if (writeErr) {
            client.destroy();
            reject(writeErr);
            return;
          }
          client.end();
          resolve();
        });
      });
    });
  }
}
