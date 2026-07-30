/**
 * Live integration test: U.chain in real TTS (Global `U` from bundled mod).
 * Requires: TTS running, External Editor on, port 39998 free for the bridge, Toronto Rising loaded with current `lib/util.ttslua`.
 *
 * Usage: npm run tts-bridge:build && npm run tts-bridge:run-sequence-test
 */
import { TtsExternalEditorBridge } from "../dist/index.js";

/** Lua: no top-level return value (see External Editor API — messageID 5 only when code returns a value). */
const script = `
do
  print("RS_INIT")
  local seq = {
    function()
      print("RS_BODY_1")
      return 0.12
    end,
    function()
      print("RS_BODY_2")
      return 0.12
    end,
    function()
      print("RS_BODY_3")
      return 0.12
    end,
  }
  U.chain(seq, {
    stepNames = { "a", "b", "c" },
    onStepStart = function(i, name)
      print("RS_START_" .. tostring(i) .. "_" .. tostring(name))
    end,
    onStepEnd = function(i, name, ok, err)
      print("RS_END_" .. tostring(i) .. "_" .. tostring(ok))
    end,
    onComplete = function(ok, detail)
      print("RS_ONCOMPLETE ok=" .. tostring(ok) .. " detail=" .. tostring(detail))
      U.mcpEmitResult({ test = "ChainLiveHarness", ok = ok, detail = detail })
    end,
  })
  print("RS_SCHEDULED")
end
`;

const bridge = new TtsExternalEditorBridge();

try {
  const result = await bridge.executeWithOutput({
    script,
    guid: "-1",
    maxWaitMs: 45_000,
    idleTimeoutMs: 5_000,
  });

  console.log(JSON.stringify(result, null, 2));

  const text = result.prints.join("\n");
  const pass =
    !result.error &&
    !result.timedOut &&
    text.includes("RS_ONCOMPLETE ok=true") &&
    text.includes("detail=nil") &&
    text.includes("RS_START_1_a") &&
    text.includes("RS_END_3_true") &&
    text.includes("TR_AGENT_V1") &&
    text.includes("ChainLiveHarness");

  if (!pass) {
    console.error("CHAIN_LIVE_TEST: FAIL (see prints above)");
    process.exitCode = 1;
  } else {
    console.error("CHAIN_LIVE_TEST: PASS");
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await bridge.close();
}
