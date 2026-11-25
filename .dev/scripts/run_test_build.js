"use strict";

/**
 * `npm run build:test`
 *
 * The long app tests that used to sit inside Full: the Player Map check
 * (unit tests and Playwright), the Storyteller Dashboard unit tests and
 * browser smokes, and the Complications web unit tests.
 *
 * Dashboard browser smokes need the dev server. If it is already listening
 * on port 8788, this uses it and leaves it running. Otherwise it starts one
 * for the smokes and stops it afterward.
 */

const { spawn, spawnSync } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const dashboardDir = path.join(root, ".dev", "storyteller-dashboard");

function runNpm(prefix, script) {
  const command = `npm --prefix "${prefix}" run ${script}`;
  const child = spawnSync(command, { cwd: root, stdio: "inherit", shell: true });
  if (child.error) {
    throw child.error;
  }
  if (child.status !== 0) {
    throw new Error(`${command} failed (${child.status})`);
  }
}

function dashboardUp() {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:8788/", (res) => {
      res.resume();
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withDashboard(run) {
  if (await dashboardUp()) {
    await run();
    return;
  }
  const child = spawn("npm run dev", { cwd: dashboardDir, shell: true, stdio: "inherit" });
  const started = Date.now();
  let up = false;
  while (Date.now() - started < 60000) {
    if (await dashboardUp()) {
      up = true;
      break;
    }
    await sleep(500);
  }
  if (!up) {
    stop(child);
    throw new Error("The Storyteller Dashboard did not start for the browser tests.");
  }
  try {
    await run();
  } finally {
    stop(child);
  }
}

function stop(child) {
  if (process.platform === "win32" && child.pid) {
    spawnSync(`taskkill /pid ${child.pid} /T /F`, { shell: true, stdio: "ignore" });
    return;
  }
  child.kill();
}

async function main() {
  runNpm(path.join(root, ".dev", "player-map"), "check");
  runNpm(dashboardDir, "test");
  runNpm(path.join(root, ".dev", "deck-of-complications", "web"), "test");
  await withDashboard(async () => {
    for (const script of [
      "test:dnd",
      "test:npc-rolls:browser",
      "test:exports:browser",
      "test:reminders:browser",
      "test:disciplines:browser",
    ]) {
      runNpm(dashboardDir, script);
    }
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
