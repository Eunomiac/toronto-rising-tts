/**
 * Human-readable help when localhost39998 cannot be bound (TTS → editor inbound).
 * Rolandostar / Seb TTS Editor extensions also listen here; only one listener is allowed.
 */

/**
 * Full error body for EADDRINUSE on the TTS inbound editor port (default 39998).
 *
 * @param port - TCP port (normally 39998).
 * @param systemDetail - Original `Error.message` from Node (e.g. EADDRINUSE).
 */
export function formatInboundPortConflictMessage(port: number, systemDetail: string): string {
  const lines: string[] = [
    `[toronto-rising-tts] Cannot bind 127.0.0.1:${String(port)} (Tabletop Simulator External Editor inbound).`,
    "",
    "Only **one** process may listen on this port. The usual conflict is **rolandostar.tabletopsimulator-lua** (Tabletop Simulator Lua) or **sebaestschjin.tts-editor** (TTS Editor) running in Cursor/VS Code — they open the same inbound socket so TTS can push Get Scripts payloads, prints, and execute return values.",
    "",
    "What to do:",
    "1. **Use one bridge at a time:** either this MCP (`tts_execute_lua`, `tts_quiet_refresh_object`, …) **or** full TTSLua / TTS Editor features that need 39998 — not both in the same session.",
    "2. **Free the port:** disable the other extension for this window, or close the workspace where it is active, then **restart MCP** (Cursor: reload MCP servers or reload the window).",
    "3. **TTS game option:** keep **External Editor** enabled in Tabletop Simulator (Options → General). That is required for 39999/39998 to work; it does not, by itself, fix a port fight in the IDE.",
    "",
    `System detail: ${systemDetail}`,
  ];
  return lines.join("\n");
}
