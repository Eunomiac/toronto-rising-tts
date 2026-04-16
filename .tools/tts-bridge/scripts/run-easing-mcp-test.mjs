/**
 * One-shot: run testEasingForMcp() in live TTS Global context.
 * Usage: npm run tts-bridge:build && node scripts/run-easing-mcp-test.mjs
 *
 * Idle timeout: the bridge ends the session `idleTimeoutMs` after the last inbound print
 * (messageID 2) unless TTS sends messageID 5 first. `testEasingForMcp()` schedules long
 * coroutine work; the chunk often returns before animations finish, so messageID 5 may not
 * mean “easing done”. Do not set idle to 120s unless you want to sit that long after the
 * final `TR_AGENT_V1` result line.
 */
import { TtsExternalEditorBridge } from "../dist/index.js";

/** Seconds of silence after the last TTS line before the bridge resolves (post `mcpEmitResult`). */
const IDLE_AFTER_LAST_PRINT_MS = 15_000;

const bridge = new TtsExternalEditorBridge();

try {
  const onlyEasing = process.argv.includes("--only-easing");
  if (!onlyEasing) {
    const probe = await bridge.executeWithOutput({
      script: 'print("PING", type(testEasingForMcp), type(DEBUG))',
      guid: "-1",
      maxWaitMs: 15_000,
      idleTimeoutMs: 5_000,
    });
    console.error("PROBE:", JSON.stringify(probe, null, 2));
    if (probe.error) {
      throw new Error("probe failed");
    }
  }

  const result = await bridge.executeWithOutput({
    script: "testEasingForMcp()",
    guid: "-1",
    maxWaitMs: 180_000,
    idleTimeoutMs: IDLE_AFTER_LAST_PRINT_MS,
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.error) process.exitCode = 1;
  else if (result.timedOut) process.exitCode = 2;
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await bridge.close();
}
