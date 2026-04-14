#!/usr/bin/env node
/**
 * Standalone listener: binds localhost **39998**, persists `messageID` 4 `type: "write"` under `.dev/.debug/`
 * (or `TTS_WORKSPACE_WRITE_ROOT`). Use when TTS is open without Cursor MCP.
 *
 * Agent guidance: .dev/TTS_MCP.md
 */
import { TtsExternalEditorBridge } from "./bridge.js";

const bridge = new TtsExternalEditorBridge();

try {
  await bridge.ensureListening();
} catch (e) {
  console.error("[tts-bridge:listen]", e instanceof Error ? e.message : e);
  process.exitCode = 1;
  process.exit(1);
}

console.error(
  "[tts-bridge:listen] Listening on 127.0.0.1:39998; write sink active. Ctrl+C to exit."
);
process.stdin.resume();
await new Promise<never>(() => {
  /* process stays alive until SIGINT */
});
