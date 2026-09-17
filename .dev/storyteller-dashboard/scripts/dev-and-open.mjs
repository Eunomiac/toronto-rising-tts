#!/usr/bin/env node
/**
 * Start Storyteller Dashboard and open Chrome once the listen line appears.
 * Used by the STORYTELLER DASHBOARD VS Code / Cursor task (single Run Task entry).
 *
 * On Windows, `start chrome <url>` uses the Default Chrome profile. The dashboard
 * belongs in the profile named "Cursor". Launch chrome.exe with
 * --profile-directory so an already-running Default Chrome does not steal the tab.
 * --silent-debugger-extension-api hides Chrome’s “extension started debugging this
 * browser” infobar for that process (shared by every profile once Chrome is running).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const url = process.env.STORYTELLER_DASHBOARD_URL || "http://127.0.0.1:8788";
const listenHint = "Storyteller dashboard listening on";
const preferredProfileName = process.env.STORYTELLER_DASHBOARD_CHROME_PROFILE_NAME || "Cursor";

let opened = false;

function chromeUserDataDir() {
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "User Data");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome");
  }
  return path.join(os.homedir(), ".config", "google-chrome");
}

function chromeExecutable() {
  const fromEnv = process.env.STORYTELLER_DASHBOARD_CHROME_EXE;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const candidates =
    process.platform === "win32"
      ? [
          path.join(process.env.PROGRAMFILES || "", "Google", "Chrome", "Application", "chrome.exe"),
          path.join(process.env["PROGRAMFILES(X86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
          path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
        ]
      : process.platform === "darwin"
        ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
        : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function chromeProfileDirectory() {
  const fromEnv = process.env.STORYTELLER_DASHBOARD_CHROME_PROFILE_DIR;
  if (fromEnv) return fromEnv;
  const localStatePath = path.join(chromeUserDataDir(), "Local State");
  try {
    const localState = JSON.parse(fs.readFileSync(localStatePath, "utf8"));
    const cache = localState?.profile?.info_cache || {};
    const wanted = String(preferredProfileName).toLowerCase();
    for (const [directory, info] of Object.entries(cache)) {
      const name = String(info?.name || "").toLowerCase();
      if (name === wanted) return directory;
    }
  } catch {
    // Fall through to the known Cursor profile folder on this machine.
  }
  return "Profile 3";
}

function openBrowser() {
  if (opened) return;
  opened = true;
  const chromeExe = chromeExecutable();
  const profileDir = chromeProfileDirectory();
  if (!chromeExe) {
    console.error(
      `[storyteller-dashboard] Chrome not found; open ${url} in the Cursor Chrome profile yourself.`,
    );
    return;
  }
  const child = spawn(
    chromeExe,
    [
      `--profile-directory=${profileDir}`,
      "--silent-debugger-extension-api",
      "--new-window",
      url,
    ],
    {
    cwd: root,
    stdio: "ignore",
    detached: true,
    windowsHide: true,
  });
  child.unref();
  console.error(
    `[storyteller-dashboard] Opening ${url} in Chrome profile ${profileDir} (${preferredProfileName})`,
  );
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
