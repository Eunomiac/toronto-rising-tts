/**
 * One-shot: list getName() for all objects tagged OrangeObject in the loaded save.
 */
import { TtsExternalEditorBridge } from "../dist/index.js";

const script = `
local tag = "OrangeObject"
local objs = getObjectsWithTag(tag)
local names = {}
for _, obj in ipairs(objs) do
  table.insert(names, obj.getName())
end
-- External Editor sometimes omits empty/small return payloads before idle; print + return covers both.
if JSON ~= nil and JSON.encode ~= nil then
  print(JSON.encode(names))
else
  for i, n in ipairs(names) do
    print(tostring(i) .. "|" .. tostring(n))
  end
end
return names
`;

const bridge = new TtsExternalEditorBridge();

try {
  const result = await bridge.executeWithOutput({
    script,
    guid: "-1",
    maxWaitMs: 20_000,
    idleTimeoutMs: 4000,
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.error) {
    process.exitCode = 1;
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await bridge.close();
}
