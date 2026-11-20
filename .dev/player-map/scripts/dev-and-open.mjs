#!/usr/bin/env node
/**
 * Start the Player Map dev server and open Chrome once Vite prints its local URL.
 * Used by the PLAYER MAP VS Code / Cursor task (single Run Task entry).
 *
 * Debug notes exist only on this Vite server. The public Cloudflare site does not
 * include them.
 *
 * On Windows, `start chrome <url>` uses the Default Chrome profile. Launch
 * chrome.exe with --profile-directory so an already-running Default Chrome does
 * not steal the tab. The profile name matches the Storyteller Dashboard task.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const preferredProfileName = process.env.PLAYER_MAP_CHROME_PROFILE_NAME || "Cursor";

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
  const fromEnv = process.env.PLAYER_MAP_CHROME_EXE;
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
  const fromEnv = process.env.PLAYER_MAP_CHROME_PROFILE_DIR;
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

function openBrowser(url) {
  if (opened) return;
  opened = true;
  const chromeExe = chromeExecutable();
  const profileDir = chromeProfileDirectory();
  if (!chromeExe) {
    console.error(`[player-map] Chrome not found; open ${url} yourself.`);
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
    },
  );
  child.unref();
  console.error(
    `[player-map] Opening ${url} in Chrome profile ${profileDir} (${preferredProfileName})`,
  );
}

const child = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"], {
  cwd: root,
  shell: true,
  stdio: ["inherit", "pipe", "pipe"],
  env: { ...process.env, NO_COLOR: "1" },
});

function onChunk(buf, stream) {
  const text = buf.toString("utf8").replace(/\x1B\[[0-9;]*m/g, "");
  stream.write(text);
  if (opened) return;
  const match = text.match(/Local:\s+(https?:\/\/\S+)/);
  if (match) openBrowser(match[1]);
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
