const SCRIPT_KEY = "tr-dashboard-lua-script";

type ExecutePayload = {
  readonly prints?: readonly string[];
  readonly returnValue?: unknown;
  readonly error?: string;
  readonly timedOut?: boolean;
};

const requiredElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
};

export const initLuaTab = (): void => {
  const script = requiredElement<HTMLTextAreaElement>("lua-script");
  const run = requiredElement<HTMLButtonElement>("lua-run");
  const status = requiredElement<HTMLDivElement>("lua-status");
  const output = requiredElement<HTMLPreElement>("lua-output");
  const saved = window.localStorage.getItem(SCRIPT_KEY);
  if (saved !== null) {
    script.value = saved;
  }

  const setStatus = (kind: "idle" | "loading" | "error" | "success", message: string): void => {
    status.className = `status ${kind}`;
    status.textContent = message;
  };

  const execute = async (): Promise<void> => {
    const lua = script.value;
    window.localStorage.setItem(SCRIPT_KEY, lua);
    if (lua.trim().length === 0) {
      setStatus("error", "Type Lua to run.");
      return;
    }

    setStatus("loading", "Running in Tabletop Simulator…");
    output.textContent = "";
    try {
      const response = await fetch("/api/tts/execute-lua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: lua })
      });
      const payload = await response.json() as ExecutePayload & { error?: string };
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : `Execute failed (${response.status})`);
      }

      const lines = [...(payload.prints ?? [])];
      if (payload.returnValue !== undefined) {
        lines.push(`return ${JSON.stringify(payload.returnValue)}`);
      }
      if (payload.timedOut) {
        lines.push("(timed out waiting for more TTS output)");
      }
      output.textContent = lines.join("\n");
      if (payload.error) {
        setStatus("error", payload.error);
        return;
      }
      setStatus("success", "Finished.");
    } catch (error: unknown) {
      setStatus("error", error instanceof Error ? error.message : "Could not run Lua in TTS.");
    }
  };

  run.addEventListener("click", () => void execute());
  script.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void execute();
    }
  });
};
