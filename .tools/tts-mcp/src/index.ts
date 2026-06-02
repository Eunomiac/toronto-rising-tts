#!/usr/bin/env node
/**
 * MCP stdio server: execute Lua in Tabletop Simulator via the External Editor API (localhost 39998/39999).
 *
 * Agent guidance: .dev/TTS_MCP.md; .dev/TTS_BUNDLING_SETUP.md (ports 39998/39999); .dev/tts-api/Getting Started/External Editor API.md.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { TtsExternalEditorBridge } from "../../tts-bridge/dist/index.js";

const bridge = new TtsExternalEditorBridge();

/** When unset, tools refuse (avoids binding 39998 while TTS Tools extension is active). Set by `npm run tts-mcp:start`. */
const MCP_ALLOWED = process.env.TR_TTS_MCP_ALLOW === "1";

const MCP_DISABLED_MESSAGE =
  "Toronto Rising TTS MCP is disabled. It conflicts with the TTS Tools extension on port 39998. " +
  "Use Save & Play / in-game console for normal dev. To run MCP manually: disable the extension MCP entry in Cursor, " +
  "then `npm run tts-mcp:build` and `npm run tts-mcp:start` (sets TR_TTS_MCP_ALLOW). See .dev/TTS_MCP.md.";

function mcpDisabledResponse(): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  return {
    content: [{ type: "text", text: JSON.stringify({ ok: false, error: MCP_DISABLED_MESSAGE }, null, 2) }],
    isError: true,
  };
}

const server = new McpServer({
  name: "toronto-rising-tts",
  version: "1.0.0",
});

const executeInputSchema = {
  script: z.string().describe("Lua snippet executed in TTS for the given object GUID."),
  guid: z
    .string()
    .optional()
    .describe('Target script context (default Global: "-1").'),
  maxWaitMs: z
    .number()
    .int()
    .positive()
    .max(120_000)
    .optional()
    .describe(
      "Wall-clock cap (ms) for the whole execute: after this, `timedOut: true` if nothing finished the session earlier. Bridge default 30000 when omitted. Raise toward the 120000 max for multi-minute sequences (e.g. lighting tests); leave lower for quick probes."
    ),
  idleTimeoutMs: z
    .number()
    .int()
    .positive()
    .max(120_000)
    .optional()
    .describe(
      "After the last inbound print/custom during a print-driven run, wait this many ms of silence before treating the execute as done. Bridge default 90000 when omitted (forgiving for gaps between sequence steps, e.g. easing visual demos). Pass a smaller value (e.g. 2000–5000) for fast print-only snippets where latency matters. When TTS sends `messageID` 5 promptly (e.g. `return` of a string/number/boolean or JSON-friendly value), the bridge often finishes without waiting the full idle window; **nested Lua tables may never trigger a usable `returnValue`**, so prefer `JSON.encode` + `print` per `.dev/TTS_MCP.md` (*Return values*)."
    ),
};

const executeOutputSchema = {
  prints: z.array(z.string()),
  returnValue: z.unknown().optional(),
  error: z
    .object({
      message: z.string(),
      guid: z.string(),
      errorMessagePrefix: z.string(),
    })
    .optional(),
  customMessages: z.array(z.unknown()),
  timedOut: z.boolean(),
};

server.registerTool(
  "tts_execute_lua",
  {
    description:
      "**Manual-only** (not for Cursor agents by default): run Lua in a live TTS session via External Editor. Disabled unless started with `npm run tts-mcp:start` (`TR_TTS_MCP_ALLOW=1`). Conflicts with the TTS Tools extension on port **39998** — do not enable in Cursor MCP while using Save & Play. Prerequisites: TTS loaded, External Editor on, port 39998 free. Returns `prints`, optional `returnValue`, `error`, `customMessages`, `timedOut`. See `.dev/TTS_MCP.md`.",
    inputSchema: executeInputSchema,
    outputSchema: executeOutputSchema,
  },
  async ({ script, guid, maxWaitMs, idleTimeoutMs }) => {
    if (!MCP_ALLOWED) {
      return mcpDisabledResponse();
    }
    const result = await bridge.executeWithOutput({
      script,
      guid: guid ?? "-1",
      maxWaitMs: maxWaitMs ?? undefined,
      idleTimeoutMs: idleTimeoutMs ?? undefined,
    });
    const text = JSON.stringify(result, null, 2);
    return {
      content: [{ type: "text", text }],
      structuredContent: {
        prints: result.prints,
        returnValue: result.returnValue,
        error: result.error,
        customMessages: result.customMessages,
        timedOut: result.timedOut,
      },
    };
  }
);

const customMessageInputSchema = {
  customMessage: z
    .record(z.string(), z.unknown())
    .describe("JSON object forwarded to TTS as `customMessage` (Lua table) for `onExternalMessage`."),
};

server.registerTool(
  "tts_send_custom_message",
  {
    description:
      "**Manual-only** (same gate as `tts_execute_lua`): send External Editor messageID 2 to `onExternalMessage`. Disabled unless `npm run tts-mcp:start`. Conflicts with TTS Tools extension on port 39998. See `.dev/TTS_MCP.md`.",
    inputSchema: customMessageInputSchema,
  },
  async ({ customMessage }) => {
    if (!MCP_ALLOWED) {
      return mcpDisabledResponse();
    }
    await bridge.sendCustomMessage(customMessage);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ ok: true }, null, 2),
        },
      ],
    };
  }
);

async function main(): Promise<void> {
  if (MCP_ALLOWED) {
    await bridge.ensureListening();
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error(
    "tts-mcp:",
    error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : error
  );
  process.exitCode = 1;
});
