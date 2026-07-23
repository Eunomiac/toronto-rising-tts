#!/usr/bin/env node
/**
 * Start Storyteller Dashboard and open Chrome once the listen line appears.
 * Used by the STORYTELLER DASHBOARD VS Code / Cursor task (single Run Task entry).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const url = process.env.STORYTELLER_DASHBOARD_URL || "http://127.0.0.1:8788";
const listenHint = "Storyteller dashboard listening on";

let opened = false;

function openBrowser() {
  if (opened) return;
  opened = true;
  const child = spawn("cmd.exe", ["/d", "/c", "start", "", "chrome", url], {
    cwd: root,
    stdio: "ignore",
    detached: true,
    windowsHide: true,
  });
  child.unref();
  console.error(`[storyteller-dashboard] Opening ${url}`);
}

const child = spawn("npm", ["run", "dev"], {
  cwd: root,
  shell: true,
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
});

function onChunk(buf, stream) {
  const text = buf.toString("utf8");
  stream.write(text);
  if (!opened && text.includes(listenHint)) {
    openBrowser();
  }
}

child.stdout.on("data", (buf) => onChunk(buf, process.stdout));
child.stderr.on("data", (buf) => onChunk(buf, process.stderr));

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
});
process.on("SIGTERM", () => {
  child.kill("SIGTERM");
});
