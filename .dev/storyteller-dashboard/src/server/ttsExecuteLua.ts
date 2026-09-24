import {
  connectGateway,
  type GatewaySession,
  type GatewayStatus
} from "@tts-tools/gateway-client";
import { reclaimEditorPort } from "./ttsEditorPort.js";

type ExecuteResult = {
  readonly prints: readonly string[];
  readonly returnValue?: unknown;
  readonly error?: string;
  readonly timedOut: boolean;
};

export type DashboardBridgeStatus = {
  readonly mode: GatewayStatus["mode"];
  readonly editorPort: "via_gateway" | "held_by_dashboard" | "free";
  readonly commandPort: "reachable" | "unreachable";
  readonly usable: boolean;
  readonly message: string;
};

const ROUTE_TAG = "DASHBOARD";
const CLIENT_ID = "storyteller-dashboard";

const wait = (ms: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const statusMessage = (mode: GatewayStatus["mode"], detail?: string): string => {
  if (mode === "gateway") {
    return detail ?? "Connected through the TTS Tools gateway (Cursor).";
  }
  if (mode === "direct") {
    return detail ?? "Connected directly on editor port 39998 (gateway not running).";
  }
  return detail ?? "Not connected to Tabletop Simulator. Click Claim Port to connect.";
};

/**
 * Single Dashboard TTS bridge: thin wrapper over `@tts-tools/gateway-client`.
 * Prefer gateway when Cursor/TTS Tools is up; otherwise bind 39998 directly and rejoin later.
 */
export class DashboardTtsBridge {
  private session: GatewaySession | undefined;
  private mode: GatewayStatus["mode"] = "disconnected";
  private detail: string | undefined;
  /** After Release Port — do not auto-connect until Claim. */
  private optedOut = false;
  private connectPromise: Promise<GatewaySession> | undefined;
  private chain: Promise<void> = Promise.resolve();

  private bindSession = (session: GatewaySession): void => {
    this.session = session;
    this.mode = session.mode;
    session.on("status", (status) => {
      this.mode = status.mode;
      this.detail = status.detail;
      if (status.mode === "disconnected") {
        this.session = undefined;
      }
    });
  };

  private dropSession = async (): Promise<void> => {
    const current = this.session;
    this.session = undefined;
    this.connectPromise = undefined;
    this.mode = "disconnected";
    this.detail = undefined;
    if (!current) {
      return;
    }
    try {
      await current.close();
    } catch {
      // ignore
    }
  };

  private openSession = async (): Promise<GatewaySession> => {
    const session = await connectGateway({
      routeTag: ROUTE_TAG,
      clientId: CLIENT_ID,
      failover: true
    });
    this.bindSession(session);
    this.detail = undefined;
    return session;
  };

  private ensureSession = async (): Promise<GatewaySession> => {
    if (this.optedOut) {
      throw new Error("Dashboard TTS bridge is disconnected. Click Claim Port to connect.");
    }
    if (this.session && this.mode !== "disconnected") {
      return this.session;
    }
    if (!this.connectPromise) {
      this.connectPromise = this.openSession().finally(() => {
        this.connectPromise = undefined;
      });
    }
    return this.connectPromise;
  };

  /**
   * Connect (or reconnect). Tries the gateway/client first; only force-clears 39998
   * if that fails (escape hatch when another tool holds the port and no gateway is up).
   */
  async reclaimAndListen(): Promise<{
    readonly killed: readonly { readonly pid: number; readonly name: string }[];
    readonly leftover: readonly { readonly pid: number; readonly name: string }[];
    readonly failed: readonly { readonly pid: number; readonly error: string }[];
    readonly listening: boolean;
    readonly message: string;
  }> {
    this.optedOut = false;
    await this.dropSession();

    try {
      await this.ensureSession();
      return {
        killed: [],
        leftover: [],
        failed: [],
        listening: this.mode !== "disconnected",
        message: statusMessage(this.mode)
      };
    } catch (firstError: unknown) {
      // Fall through to reclaim.
      void firstError;
    }

    let killed: { pid: number; name: string }[] = [];
    let leftover: { pid: number; name: string }[] = [];
    let failed: { pid: number; error: string }[] = [];
    let reclaimNote = "";

    try {
      const result = await reclaimEditorPort(process.pid);
      killed = result.killed.map((row) => ({ pid: row.pid, name: row.name }));
      leftover = result.leftover
        .filter((row) => row.pid !== process.pid)
        .map((row) => ({ pid: row.pid, name: row.name }));
      failed = result.failed.map((row) => ({ pid: row.pid, error: row.error }));
      const stopped = killed.length === 0
        ? "No other process was using port 39998."
        : `Stopped ${killed.map((row) => `${row.name} (${row.pid})`).join(", ")}.`;
      const leftoverNote = leftover.length === 0
        ? ""
        : ` Still held by ${leftover.map((row) => `${row.name} (${row.pid})`).join(", ")}.`;
      const failedNote = failed.length === 0
        ? ""
        : ` Could not stop ${failed.map((row) => String(row.pid)).join(", ")}.`;
      reclaimNote = `${stopped}${leftoverNote}${failedNote} `;
      await wait(400);
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : "Could not inspect port 39998.";
      reclaimNote = (/Command failed:/i.test(raw) ? "Could not inspect port 39998." : raw) + " ";
    }

    try {
      await this.ensureSession();
      return {
        killed,
        leftover,
        failed,
        listening: this.mode !== "disconnected",
        message: `${reclaimNote}${statusMessage(this.mode)}`
      };
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      return {
        killed,
        leftover,
        failed,
        listening: false,
        message: `${reclaimNote}Could not connect: ${detail}`
      };
    }
  }

  async releasePort(): Promise<{ listening: boolean; message: string }> {
    this.optedOut = true;
    await this.dropSession();
    return {
      listening: false,
      message: "Disconnected the Dashboard TTS bridge. TTS Tools / the gateway can use the editor port."
    };
  }

  /**
   * Local session state only — do **not** probe 39998/39999 here.
   * Auto-connects when not opted out (gateway preferred, then direct).
   */
  async getBridgeStatus(): Promise<DashboardBridgeStatus> {
    if (this.optedOut) {
      return {
        mode: "disconnected",
        editorPort: "free",
        commandPort: "unreachable",
        usable: false,
        message: "Dashboard TTS bridge is disconnected. Click Claim Port to connect."
      };
    }

    if (!this.session || this.mode === "disconnected") {
      try {
        await this.ensureSession();
      } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        return {
          mode: "disconnected",
          editorPort: "free",
          commandPort: "unreachable",
          usable: false,
          message: detail.includes("EADDRINUSE") || /already in use/i.test(detail)
            ? "Editor port 39998 is busy and no gateway answered. Click Claim Port to take it, or start Cursor with TTS Tools."
            : `Not connected: ${detail}`
        };
      }
    }

    if (this.mode === "gateway") {
      return {
        mode: "gateway",
        editorPort: "via_gateway",
        commandPort: "reachable",
        usable: true,
        message: statusMessage("gateway", this.detail)
      };
    }

    if (this.mode === "direct") {
      return {
        mode: "direct",
        editorPort: "held_by_dashboard",
        commandPort: "reachable",
        usable: true,
        message: statusMessage("direct", this.detail)
      };
    }

    return {
      mode: "disconnected",
      editorPort: "free",
      commandPort: "unreachable",
      usable: false,
      message: statusMessage("disconnected", this.detail)
    };
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
    const session = await this.ensureSession();
    const prints: string[] = [];
    let luaError: string | undefined;

    const onPrint = (message: string): void => {
      prints.push(message);
    };
    const onError = (payload: Record<string, unknown>): void => {
      if (typeof payload.error === "string") {
        luaError = payload.error;
      } else if (typeof payload.errorMessagePrefix === "string") {
        luaError = payload.errorMessagePrefix;
      }
    };

    session.on("print", onPrint);
    session.on("error", onError);

    // Await the real executeLua to completion before releasing the serial chain.
    // A soft Promise.race timeout used to return early while Lua was still running,
    // which let the PCs-tab poll queue more executeLua calls and hammer TTS.
    try {
      const returnValue = await session.executeLua(script);
      const result: ExecuteResult = {
        prints,
        timedOut: false,
        returnValue
      };
      if (luaError !== undefined) {
        return { ...result, error: luaError };
      }
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (/timed out/i.test(message)) {
        return {
          prints,
          timedOut: true,
          ...(luaError !== undefined ? { error: luaError } : {})
        };
      }
      if (luaError !== undefined) {
        return { prints, timedOut: false, error: luaError };
      }
      throw error instanceof Error ? error : new Error(message);
    } finally {
      session.off("print", onPrint as (...args: unknown[]) => void);
      session.off("error", onError as (...args: unknown[]) => void);
    }
  }
}

export const dashboardTtsBridge = new DashboardTtsBridge();
