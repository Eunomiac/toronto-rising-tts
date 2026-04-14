/**
 * Quick live test: requires TTS running, External Editor enabled, and nothing else bound to 39998.
 * Usage: node .tools/tts-bridge/scripts/smoke-test.mjs
 */
import { TtsExternalEditorBridge } from "../dist/index.js";

const script = ['print("hello from tts-bridge smoke test")', "return 1 + 1"].join("\n");

const bridge = new TtsExternalEditorBridge();

try {
  const result = await bridge.executeWithOutput({
    script,
    guid: "-1",
    maxWaitMs: 15_000,
    /** Long enough that `return` usually arrives after `print` (short idle can end the session early). */
    idleTimeoutMs: 2500,
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.error || result.timedOut ? 1 : 0;
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await bridge.close();
}
