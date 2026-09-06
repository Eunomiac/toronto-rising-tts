import net from "node:net";

const TTS_COMMAND_PORT = 39999;
const TTS_EDITOR_PORT = 39998;

type SocketLike = {
  on(event: string, cb: (data: Uint8Array) => void): void;
  once(event: string, cb: (err?: Error) => void): void;
  connect(port: number, host: string, cb: () => void): void;
  write(payload: string, encoding: "utf8", cb: (err: Error | null | undefined) => void): void;
  end(): void;
  destroy(): void;
};

type ExecuteResult = {
  readonly prints: readonly string[];
  readonly returnValue?: unknown;
  readonly error?: string;
  readonly timedOut: boolean;
};

const asMessageId = (msg: Record<string, unknown>): number | undefined => {
  const id = msg["messageID"];
  if (typeof id === "number" && Number.isFinite(id)) {
    return id;
  }
  if (typeof id === "string" && /^\d+$/.test(id)) {
    return Number(id);
  }
  return undefined;
};

const readJsonFromSocket = (socket: SocketLike): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    socket.on("data", (data: Uint8Array) => {
      chunks.push(data);
    });
    socket.once("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw.length === 0) {
        reject(new Error("Empty JSON payload from TTS"));
        return;
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          reject(new Error("TTS JSON root must be an object"));
          return;
        }
        resolve(parsed as Record<string, unknown>);
      } catch (error: unknown) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    socket.once("error", reject);
  });

const sendToTts = (message: object): Promise<void> =>
  new Promise((resolve, reject) => {
    const client: SocketLike = new net.Socket();
    client.once("error", (error?: Error) => {
      client.destroy();
      const detail = error?.message ?? "socket error";
      reject(new Error(
        detail.includes("ECONNREFUSED")
          ? "Could not reach Tabletop Simulator on localhost 39999. Load a game with External Editor enabled."
          : detail
      ));
    });
    client.connect(TTS_COMMAND_PORT, "127.0.0.1", () => {
      client.write(JSON.stringify(message), "utf8", (writeErr: Error | null | undefined) => {
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

/**
 * Same External Editor hook as TTS Tools Execute Code:
 * TTS listens on 39999; this dashboard listens on 39998 (only one editor at a time).
 */
export class DashboardTtsBridge {
  private server: { listen(port: number, host: string, cb: () => void): void } | null = null;
  private readonly inboundHandlers = new Set<(msg: Record<string, unknown>) => void>();
  private chain: Promise<void> = Promise.resolve();

  async ensureListening(): Promise<void> {
    if (this.server !== null) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const server = net.createServer((socket: SocketLike) => {
        void readJsonFromSocket(socket).then(
          (msg) => {
            for (const handler of this.inboundHandlers) {
              handler(msg);
            }
          },
          () => undefined
        );
      });

      server.once("error", (error?: Error) => {
        const detail = error?.message ?? "";
        if (detail.includes("EADDRINUSE")) {
          reject(new Error(
            "Port 39998 is already in use. Disable the TTS Tools extension (or any other External Editor) while using this Lua tab."
          ));
          return;
        }
        reject(error ?? new Error("Could not listen on 39998."));
      });

      server.listen(TTS_EDITOR_PORT, "127.0.0.1", () => {
        this.server = server;
        resolve();
      });
    });
  }

  /** Non-destructive probe of ports 39998 / 39999 for UI grey-out (TOR-560). */
  async getBridgeStatus(): Promise<{
    editorPort: "held_by_dashboard" | "free" | "in_use";
    commandPort: "reachable" | "unreachable";
    usable: boolean;
    message: string;
  }> {
    let editorPort: "held_by_dashboard" | "free" | "in_use" = "free";
    if (this.server !== null) {
      editorPort = "held_by_dashboard";
    } else {
      editorPort = await new Promise((resolve) => {
        const probe = net.createServer();
        probe.once("error", (error?: Error) => {
          const detail = error?.message ?? "";
          resolve(detail.includes("EADDRINUSE") ? "in_use" : "free");
        });
        probe.listen(TTS_EDITOR_PORT, "127.0.0.1", () => {
          probe.close(() => resolve("free"));
        });
      });
    }

    const commandPort = await new Promise<"reachable" | "unreachable">((resolve) => {
      const client = net.connect({ host: "127.0.0.1", port: TTS_COMMAND_PORT }, () => {
        client.end();
        resolve("reachable");
      });
      client.once("error", () => resolve("unreachable"));
    });

    let message = "TTS bridge ready.";
    if (editorPort === "in_use") {
      message = "TTS Tools extension is using port 39998 — disable it to spawn from the Dashboard.";
    } else if (commandPort === "unreachable") {
      message = "TTS External Editor not reachable on 39999 — load a game with External Editor enabled.";
    } else if (editorPort === "held_by_dashboard") {
      message = "Dashboard holds port 39998; TTS command port is reachable.";
    }

    const usable = editorPort !== "in_use" && commandPort === "reachable";
    return { editorPort, commandPort, usable, message };
  }

  executeLua(script: string): Promise<ExecuteResult> {
    const next = this.chain.then(() => this.runExecute(script));
    this.chain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  private async runExecute(script: string): Promise<ExecuteResult> {
    await this.ensureListening();

    return new Promise((resolve, reject) => {
      const prints: string[] = [];
      let returnValue: unknown;
      let luaError: string | undefined;
      let done = false;
      let idleTimer: ReturnType<typeof setTimeout> | undefined;
      let maxTimer: ReturnType<typeof setTimeout> | undefined;

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
          timedOut,
          ...(returnValue !== undefined ? { returnValue } : {}),
          ...(luaError !== undefined ? { error: luaError } : {})
        });
      };

      const resetIdle = (): void => {
        if (idleTimer !== undefined) {
          clearTimeout(idleTimer);
        }
        idleTimer = setTimeout(() => finish(false), 1200);
      };

      const onMessage = (msg: Record<string, unknown>): void => {
        if (done) {
          return;
        }
        const id = asMessageId(msg);
        if (id === 2 || id === 3 || id === 4 || id === 5) {
          resetIdle();
        }
        if (id === 2 && typeof msg["message"] === "string") {
          prints.push(msg["message"]);
        }
        if (id === 3 && typeof msg["error"] === "string") {
          luaError = msg["error"];
          finish(false);
        }
        if (id === 5 && "returnValue" in msg) {
          returnValue = msg["returnValue"];
          finish(false);
        }
      };

      this.inboundHandlers.add(onMessage);
      maxTimer = setTimeout(() => finish(true), 15000);

      void sendToTts({ messageID: 3, guid: "-1", script })
        .then(() => resetIdle())
        .catch((error: unknown) => {
          if (!done) {
            done = true;
            cleanup();
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
    });
  }
}

export const dashboardTtsBridge = new DashboardTtsBridge();
