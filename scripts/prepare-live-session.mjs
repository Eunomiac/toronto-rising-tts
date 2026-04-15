/**
 * Prepare live TTS session: ensure toronto-rising-tts MCP is not holding 39998,
 * then probe TTS External Editor ports. Windows-only MCP detection (port owner command line).
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const MCP_DEACTIVATE_HINT = [
  "To turn off toronto-rising-tts MCP in Cursor:",
  " • Open Settings (Ctrl+,) → Features → Model Context Protocol",
  "  • Find toronto-rising-tts and switch it off (or use the MCP panel toggles).",
  "  • If the server was stuck, use Command Palette: reload the window or restart MCP servers.",
].join("\n");

/**
 * @param {string} host
 * @param {number} port
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
function probeConnect(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

/**
 * @param {string} title
 * @param {string} body
 * @param {"Error" | "Information"} [icon]
 */
function showMessageBox(title, body, icon = "Error") {
  const iconName = icon === "Information" ? "Information" : "Error";
  const escTitle = title.replace(/'/g, "''");
  const lines = body.split(/\r?\n/);
  const psBody = lines
    .map((ln) => `'${ln.replace(/'/g, "''")}'`)
    .join(" + [Environment]::NewLine + ");
  const ps = `[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show(${psBody}, '${escTitle}', 'OK', '${iconName}')`;
  spawnSync("powershell.exe", ["-NoProfile", "-STA", "-Command", ps], {
    windowsHide: true,
    encoding: "utf8",
  });
}

/**
 * True if a process listening on 39998 has a command line that looks like this repo's tts-mcp entry.
 * Exit code 10 from the probe script means "MCP detected".
 *
 * @returns {boolean}
 */
function isTorontoRisingMcpListeningOn39998() {
  if (process.platform !== "win32") {
    return false;
  }
  const ps1 = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    "$listeners = @(Get-NetTCPConnection -LocalPort 39998 -State Listen -ErrorAction SilentlyContinue)",
    "if ($listeners.Count -eq 0) { exit 0 }",
    "$seen = @{}",
    "foreach ($l in $listeners) {",
    "  $procId = $l.OwningProcess",
    "  if ($seen.ContainsKey($procId)) { continue }",
    "  $seen[$procId] = $true",
    "  $p = Get-CimInstance Win32_Process -Filter \"ProcessId = $($procId)\"",
    "  if ($null -eq $p) { continue }",
    "  $cmd = [string]$p.CommandLine",
    "  if ($cmd -match 'tts-mcp' -and $cmd -match 'index\\.js') { exit 10 }",
    "}",
    "exit 0",
  ].join("\r\n");
  const tmp = path.join(os.tmpdir(), `toronto-rising-mcp-probe-${String(process.pid)}-${String(Date.now())}.ps1`);
  try {
    fs.writeFileSync(tmp, ps1, "utf8");
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-File", tmp],
      { windowsHide: true, encoding: "utf8" }
    );
    return false;
  } catch (err) {
    const rec = err && typeof err === "object" && "status" in err ? err : {};
    const status = typeof rec.status === "number" ? rec.status : 0;
    if (status === 10) {
      return true;
    }
    console.warn(
      "Could not probe port 39998 process owner (continuing without MCP detection):",
      err instanceof Error ? err.message : String(err)
    );
    return false;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  if (isTorontoRisingMcpListeningOn39998()) {
    const full = [
      "toronto-rising-tts MCP appears to be listening on 127.0.0.1:39998 (node running tts-mcp …/index.js).",
      "For a live session with the TTSLua extension Save & Play, turn MCP off first.",
      "",
      MCP_DEACTIVATE_HINT,
    ].join("\n");
    console.error(full);
    showMessageBox(
      "Toronto Rising — MCP still active",
      "toronto-rising-tts is using port 39998.\nTurn it off in Cursor Settings → MCP, then run this task again.\nSee the Terminal for step-by-step hints."
    );
    return 1;
  }

  const ttsOk = await probeConnect("127.0.0.1", 39999, 4000);
  const inboundOk = await probeConnect("127.0.0.1", 39998, 3000);

  if (!ttsOk) {
    const msg =
      "127.0.0.1:39999 — Tabletop Simulator is not accepting the External Editor connection. Load Toronto Rising and keep External Editor enabled (Options → General).";
    console.error(msg);
    showMessageBox("Toronto Rising — TTS check failed", "TTS is not reachable on port 39999.\nSee the Terminal for details.");
    return 1;
  }

  if (!inboundOk) {
    console.warn(
      "127.0.0.1:39998 — Nothing is accepting connections yet. This is OK before your first Save & Play / Get Scripts with the TTSLua extension; try again after the extension opens the bridge."
    );
  }

  console.log(
    "Prepare live session: OK — toronto-rising-tts MCP is not listening on 39998. TTS port 39999 is reachable." +
      (inboundOk ? " Port 39998 is also accepting connections." : " (Optional) Open 39998 after you use the extension.")
  );
  return 0;
}

const code = await main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg);
  showMessageBox("Toronto Rising — Prepare session", msg);
  return 1;
});
process.exitCode = code;
