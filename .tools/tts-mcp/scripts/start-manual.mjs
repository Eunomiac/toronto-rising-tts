/**
 * Manual MCP entry: sets TR_TTS_MCP_ALLOW so tools are not no-ops.
 * Use instead of pointing Cursor at dist/index.js directly.
 *
 *   npm run tts-mcp:build
 *   npm run tts-mcp:start
 *
 * Do not run while the TTS Tools extension is using port 39998.
 */
process.env.TR_TTS_MCP_ALLOW = "1";
await import("../dist/index.js");
