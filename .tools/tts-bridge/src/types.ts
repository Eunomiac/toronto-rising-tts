/**
 * Options for executing a Lua snippet in Tabletop Simulator via the External Editor API.
 *
 * Agent guidance: .dev/TTS_MCP.md; .dev/tts-api/Getting Started/External Editor API.md.
 */
export interface ExecuteOptions {
  /** Lua source to run in the context of `guid` (default Global `-1`). */
  script: string;
  /** Object GUID string, e.g. `"-1"` for Global. */
  guid?: string;
  /** Absolute wall-clock cap (ms). After this, the call ends with `timedOut: true`. */
  maxWaitMs?: number;
  /**
   * After the last inbound message (print / custom / etc.), wait this long before treating
   * print-only runs as complete. When omitted, the bridge uses a long default (60s) so
   * multi-step TTS sequences with quiet gaps are less likely to end early; pass a lower value
   * for quick probes.
   */
  idleTimeoutMs?: number;
}

/** Parsed Lua/runtime error from TTS (inbound messageID 3 with `error`). */
export interface TtsExecuteError {
  message: string;
  guid: string;
  errorMessagePrefix: string;
}

/**
 * Result of one execute round-trip: collected `print` lines, optional `return` value,
 * optional error, optional `sendExternalMessage` payloads, and timeout flag.
 */
export interface ExecuteResult {
  prints: string[];
  returnValue?: unknown;
  error?: TtsExecuteError;
  customMessages: unknown[];
  /**
   * True when the session ended because `maxWaitMs` elapsed with no further completion
   * (no Lua error message and no `returnValue` / idle completion yet). False for normal
   * completion: Lua error, explicit `messageID` 5 return, or idle timeout after last print/custom.
   */
  timedOut: boolean;
}
