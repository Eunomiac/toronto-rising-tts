export type ExecuteLuaResult = {
  readonly prints: readonly string[];
  readonly returnValue?: unknown;
  readonly error?: string;
  readonly timedOut?: boolean;
};

export type BridgeStatus = {
  readonly usable: boolean;
  readonly message: string;
};

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
