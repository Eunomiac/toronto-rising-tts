"use strict";
const { test } = require("node:test");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
test("location condition Lua behavior", () => {
  const candidates = process.env.LUA ? [process.env.LUA] : ["lua5.2", "lua", "texlua"];
  for (const command of candidates) {
    const result = spawnSync(command, [".dev/scripts/location_conditions.test.lua"], {
      cwd: path.resolve(__dirname, "../.."), encoding: "utf8",
    });
    if (result.error?.code === "ENOENT") continue;
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    if (result.status !== 0) throw new Error("Lua condition tests failed (" + command + ")");
    return;
  }
  throw new Error("Install Lua 5.2+ or set LUA to its executable (texlua also works).");
});
