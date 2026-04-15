import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { TtsExternalEditorBridge } from "./bridge.js";
import { quietRefreshObject } from "./quiet-refresh.js";

describe("quietRefreshObject auto-discovery", () => {
  it("reads disk files discovered by guid", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tts-qr-"));
    const guid = "g1test";
    await fs.writeFile(path.join(tmp, `Obj.${guid}.lua`), "print(1)", "utf8");
    await fs.writeFile(path.join(tmp, `Obj.${guid}.xml`), "<panel/>", "utf8");

    const liveJson = JSON.stringify({
      GUID: guid,
      LuaScript: "old",
      XmlUI: "old",
      Name: "Obj",
    });

    const bridge = {
      executeWithOutput: vi.fn()
        .mockResolvedValueOnce({
          prints: [],
          customMessages: [],
          timedOut: false,
          returnValue: liveJson,
        })
        .mockResolvedValueOnce({
          prints: [],
          customMessages: [],
          timedOut: false,
          returnValue: true,
        }),
    };

    const r = await quietRefreshObject(bridge as unknown as TtsExternalEditorBridge, {
      guid,
      repoRoot: tmp,
    });

    expect(r.error).toBeUndefined();
    expect(bridge.executeWithOutput).toHaveBeenCalledTimes(2);
  });
});
