"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { traceProtectedUrls } = require("./protected-usage-report.js");

const UI_URL = "https://steamusercontent-a.akamaihd.net/ugc/111/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/";
const IMAGE_URL = "https://steamusercontent-a.akamaihd.net/ugc/222/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB/";
const STATE_URL = "https://steamusercontent-a.akamaihd.net/ugc/333/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC/";

test("traceProtectedUrls identifies global UI, object images, and serialized state with object context", () => {
  const save = {
    CustomUIAssets: [{ Name: "old_global", URL: UI_URL }],
    ObjectStates: [
      {
        GUID: "abc123",
        Name: "Custom_Token",
        Nickname: "A suspect token",
        Description: "Useful description",
        Tags: ["NPC"],
        Transform: { posX: 1, posY: 2, posZ: 3 },
        CustomImage: { ImageURL: IMAGE_URL },
        LuaScriptState: JSON.stringify({ portrait: STATE_URL }),
      },
    ],
  };
  const files = traceProtectedUrls(save, [
    { path: "ui.png", url: UI_URL },
    { path: "image.png", url: IMAGE_URL },
    { path: "state.png", url: STATE_URL },
  ]);

  assert.equal(files[0].occurrences[0].category, "Global Custom UI");
  assert.equal(files[0].occurrences[0].entry.assetName, "old_global");
  assert.equal(files[1].occurrences[0].category, "Object image or asset field");
  assert.equal(files[1].occurrences[0].object.guid, "abc123");
  assert.equal(files[1].occurrences[0].jsonPath, "$.ObjectStates[0].CustomImage.ImageURL");
  assert.equal(files[2].occurrences[0].category, "Object serialized Lua state");
  assert.match(files[2].occurrences[0].excerpt, /portrait/);
  assert.equal(files[2].occurrences[0].stringLocation.line, 1);
});

test("traceProtectedUrls matches the UGC identity when Steam changes hostnames", () => {
  const changedHost = UI_URL.replace("steamusercontent-a.akamaihd.net", "steamusercontent.com");
  const [file] = traceProtectedUrls({ SkyURL: changedHost }, [{ path: "sky.png", url: UI_URL }]);
  assert.equal(file.occurrences.length, 1);
  assert.equal(file.occurrences[0].category, "Global skybox");
  assert.equal(file.occurrences[0].exactUrlMatch, false);
  assert.equal(file.occurrences[0].matchedUrl, changedHost);
});
