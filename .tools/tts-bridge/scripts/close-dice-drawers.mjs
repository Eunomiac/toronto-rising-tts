/**
 * One-shot: set every dice drawer (tags DiceDrawer + <Color>Object) to off poses
 * from lib/constants C.ObjectPositions (no require — External Editor execute has no bundle require).
 */
import { TtsExternalEditorBridge } from "../dist/index.js";

// Matches C.ObjectPositions CSHEET_DICE_DRAWER_* .off (Vector form as in constants.ttslua)
const script = `
local colors = {"Brown", "Orange", "Red", "Pink", "Purple"}
local offPoses = {
  Brown = {
    position = Vector({60.68, -0.72, -33.51}),
    scale = Vector({23.57, 0.42, 7.68})
  },
  Orange = {
    position = Vector({31.90, -0.72, -48.18}),
    scale = Vector({23.57, 0.42, 7.68})
  },
  Red = {
    position = Vector({0.00, -0.72, -53.23}),
    scale = Vector({23.57, 0.42, 7.68})
  },
  Pink = {
    position = Vector({-31.90, -0.72, -48.18}),
    scale = Vector({23.57, 0.42, 7.68})
  },
  Purple = {
    position = Vector({-60.68, -0.72, -33.51}),
    scale = Vector({23.57, 0.42, 7.68})
  }
}

local function applyOff(obj, pose)
  if obj == nil or pose == nil then return end
  pcall(function() obj.setPositionSmooth(pose.position, false, false) end)
  local ok = pcall(function() obj.setScaleSmooth(pose.scale, false, false) end)
  if not ok then
    pcall(function() obj.setScale(pose.scale) end)
  end
end

local objs = getObjectsWithTag("DiceDrawer")
if type(objs) ~= "table" then
  print(JSON ~= nil and JSON.encode and JSON.encode({ error = "no DiceDrawer objects" }) or "no DiceDrawer")
  return "fail"
end

local moved = 0
for _, obj in ipairs(objs) do
  if obj ~= nil then
    local okTags, tags = pcall(function() return obj.getTags() end)
    if okTags and type(tags) == "table" then
      for _, c in ipairs(colors) do
        local want = c .. "Object"
        for _, t in ipairs(tags) do
          if t == want then
            applyOff(obj, offPoses[c])
            moved = moved + 1
            break
          end
        end
      end
    end
  end
end

local summary = { moved = moved, note = "dice drawers set to off" }
if JSON ~= nil and JSON.encode ~= nil then
  print(JSON.encode(summary))
end
return moved
`;

const bridge = new TtsExternalEditorBridge();

try {
  const result = await bridge.executeWithOutput({
    script,
    guid: "-1",
    maxWaitMs: 25_000,
    idleTimeoutMs: 5000,
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
