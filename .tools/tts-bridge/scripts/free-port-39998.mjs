/**
 * Stop leftover listeners on the TTS External Editor inbound port (39998).
 *
 * Kills node / dashboard / tts-bridge / MCP holders. Leaves Cursor, VS Code,
 * and Tabletop Simulator alone (IPv4 and IPv6 can coexist; Cursor's TTS Tools
 * bind is usually IPv6 `::`).
 *
 * Usage (repo root):
 *   npm run tts-bridge:free-port
 *   npm run tts-bridge:free-port -- --dry-run
 */
import { execFileSync } from "node:child_process";

const PORT = 39998;
const DRY_RUN = process.argv.includes("--dry-run");

const PROTECTED_NAMES = new Set([
  "cursor",
  "code",
  "code - insiders",
  "code - oss",
  "tabletopsimulator",
]);

const LIST_CONNECTIONS_PS = `
$ErrorActionPreference = 'SilentlyContinue'
Get-NetTCPConnection -LocalPort ${PORT} |
  Where-Object { $_.State -eq 'Listen' } |
  ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess
    $cim = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $_.OwningProcess)
    [PSCustomObject]@{
      localAddress = $_.LocalAddress
      pid = $_.OwningProcess
      name = $proc.ProcessName
      command = $cim.CommandLine
    }
  } | ConvertTo-Json -Compress
`;

/**
 * @typedef {{ localAddress: string, pid: number, name: string, command?: string }} Listener
 */

function powershellJson(command) {
  const raw = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command],
    { encoding: "utf8", windowsHide: true }
  ).trim();
  if (raw.length === 0) {
    return [];
  }
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function listListeners() {
  if (process.platform !== "win32") {
    throw new Error("tts-bridge:free-port currently supports Windows only.");
  }
  /** @type {Listener[]} */
  const rows = powershellJson(LIST_CONNECTIONS_PS);
  const byPid = new Map();
  for (const row of rows) {
    const pid = Number(row.pid);
    if (!Number.isInteger(pid) || pid <= 4) {
      continue;
    }
    const existing = byPid.get(pid);
    const address = String(row.localAddress ?? "");
    if (existing) {
      if (!existing.addresses.includes(address)) {
        existing.addresses.push(address);
      }
      continue;
    }
    byPid.set(pid, {
      pid,
      name: String(row.name ?? ""),
      command: row.command == null ? "" : String(row.command),
      addresses: [address],
    });
  }
  return [...byPid.values()];
}

function isProtected(listener) {
  const name = listener.name.trim().toLowerCase();
  if (PROTECTED_NAMES.has(name) || name.includes("tabletop")) {
    return true;
  }
  const command = listener.command.toLowerCase();
  return (
    /[\\/]cursor\.exe\b/.test(command) ||
    /[\\/]code\.exe\b/.test(command) ||
    /[\\/]tabletopsimulator\.exe\b/.test(command)
  );
}

function formatListener(listener) {
  const where = listener.addresses.join(", ");
  let command = listener.command.length > 0 ? listener.command : "(no command line)";
  if (command.length > 140) {
    command = `${command.slice(0, 137)}...`;
  }
  return `PID ${listener.pid}  ${listener.name}  [${where}]\n  ${command}`;
}

function killPid(pid) {
  execFileSync("taskkill.exe", ["/PID", String(pid), "/F"], {
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function printSection(title, listeners) {
  console.log(title);
  if (listeners.length === 0) {
    console.log("  (none)");
    return;
  }
  for (const listener of listeners) {
    console.log(formatListener(listener));
  }
}

try {
  const listeners = listListeners();
  if (listeners.length === 0) {
    console.log(`No LISTEN sockets on port ${PORT}.`);
    process.exit(0);
  }

  const skip = listeners.filter(isProtected);
  const kill = listeners.filter((listener) => !isProtected(listener));

  printSection(`Port ${PORT} listeners:`, listeners);
  console.log("");
  printSection("Leaving alone (Cursor / VS Code / Tabletop Simulator):", skip);
  console.log("");

  if (kill.length === 0) {
    console.log("Nothing safe to stop. Remaining listeners can coexist.");
    process.exit(0);
  }

  if (DRY_RUN) {
    printSection("Would stop (--dry-run):", kill);
    process.exit(0);
  }

  printSection("Stopping:", kill);
  let failed = 0;
  for (const listener of kill) {
    try {
      killPid(listener.pid);
      console.log(`Stopped PID ${listener.pid}.`);
    } catch (error) {
      failed += 1;
      const detail = error instanceof Error ? error.message : String(error);
      console.error(`Could not stop PID ${listener.pid}: ${detail}`);
    }
  }

  const leftover = listListeners();
  console.log("");
  printSection("Still listening:", leftover);
  process.exit(failed > 0 ? 1 : 0);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
