export type ExecuteLuaResult = {
  readonly prints: readonly string[];
  readonly returnValue?: unknown;
  readonly error?: string;
  readonly timedOut?: boolean;
};

export type BridgeStatus = {
  readonly usable: boolean;
  readonly message: string;
  readonly mode?: "gateway" | "direct" | "disconnected";
  readonly editorPort?: "via_gateway" | "held_by_dashboard" | "free" | "in_use";
};

/** True when the Dashboard has an active TTS link (gateway or direct). */
export const isBridgeConnected = (status: BridgeStatus): boolean =>
  status.usable === true
  || status.editorPort === "via_gateway"
  || status.editorPort === "held_by_dashboard";

export const luaLongString = (value: string): string => {
  let n = 0;
  while (value.includes(`]${"=".repeat(n)}]`)) {
    n += 1;
  }
  const eq = "=".repeat(n);
  return `[${eq}[${value}]${eq}]`;
};

export const fetchBridgeStatus = async (): Promise<BridgeStatus> => {
  const response = await fetch("/api/tts-bridge-status");
  const payload = await response.json() as BridgeStatus & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Bridge status failed (${response.status})`);
  }
  return payload;
};

export const reclaimEditorPort = async (): Promise<{ listening: boolean; message: string }> => {
  const response = await fetch("/api/tts/reclaim-editor-port", { method: "POST" });
  const payload = await response.json() as { listening?: boolean; message?: string; error?: string };
  if (!response.ok && payload.listening !== true) {
    if (typeof payload.message === "string") {
      return { listening: false, message: payload.message };
    }
    throw new Error(payload.error ?? `Could not clear port 39998 (${response.status})`);
  }
  return {
    listening: payload.listening === true,
    message: payload.message ?? payload.error ?? "Could not reclaim the editor port."
  };
};

export const releaseEditorPort = async (): Promise<{ listening: boolean; message: string }> => {
  const response = await fetch("/api/tts/release-editor-port", { method: "POST" });
  const payload = await response.json() as { listening?: boolean; message?: string; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? payload.message ?? `Could not release port 39998 (${response.status})`);
  }
  return {
    listening: payload.listening === true,
    message: payload.message ?? "Released port 39998."
  };
};

export const executeLua = async (script: string): Promise<ExecuteLuaResult> => {
  const response = await fetch("/api/tts/execute-lua", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script })
  });
  const payload = await response.json() as ExecuteLuaResult & { error?: string };
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : `Execute failed (${response.status})`);
  }
  return {
    prints: payload.prints ?? [],
    returnValue: payload.returnValue,
    error: payload.error,
    timedOut: payload.timedOut
  };
};
