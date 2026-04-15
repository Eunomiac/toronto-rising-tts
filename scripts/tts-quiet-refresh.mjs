/**
 * CLI quiet refresh: optional game-day path when nothing else listens on 39998.
 * If Cursor MCP is already running, ensureListening fails — use tts_quiet_refresh_object in chat instead.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bridgeUrl = pathToFileURL(path.join(root, ".tools/tts-bridge/dist/index.js")).href;
const { TtsExternalEditorBridge, quietRefreshObject } = await import(bridgeUrl);

/**
 * @param {string} title
 * @param {string} body
 */
function showMessageBox(title, body) {
  const escTitle = title.replace(/'/g, "''");
  const lines = body.split(/\r?\n/);
  const psBody = lines
    .map((ln) => `'${ln.replace(/'/g, "''")}'`)
    .join(" + [Environment]::NewLine + ");
  const ps = `[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show(${psBody}, '${escTitle}', 'OK', 'Error')`;
  spawnSync("powershell.exe", ["-NoProfile", "-STA", "-Command", ps], {
    windowsHide: true,
    encoding: "utf8",
  });
}

async function main() {
  const guid = process.argv[2]?.trim();
  if (!guid) {
    console.error("Usage: npm run tts-quiet-refresh -- <guid>");
    return 1;
  }

  const bridge = new TtsExternalEditorBridge();
  try {
    try {
      await bridge.ensureListening();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(msg);
      showMessageBox(
        "Toronto Rising — Quiet refresh",
        "Port 39998 is not available (Cursor MCP or another extension may already use it).\n\nUse the agent tool tts_quiet_refresh_object with this GUID; paths are optional.\nSee the Terminal for the technical message."
      );
      return 1;
    }

    const result = await quietRefreshObject(bridge, {
      guid,
      repoRoot: process.cwd(),
    });

    if (result.error) {
      console.error(JSON.stringify(result, null, 2));
      showMessageBox(
        "Toronto Rising — Quiet refresh failed",
        `${result.error}\n\nSee the Terminal for full JSON.`
      );
      return 1;
    }
    console.log(JSON.stringify(result, null, 2));
    return 0;
  } finally {
    await bridge.close();
  }
}

const code = await main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg);
  showMessageBox("Toronto Rising — Quiet refresh", msg);
  return 1;
});
process.exitCode = code;
