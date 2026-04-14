import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseMarkerFile } from "./markerParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "..", "fixtures");

describe("parseMarkerFile", () => {
  it("accepts a single-root leaf fixture", () => {
    const content = fs.readFileSync(path.join(fixturesDir, "valid_leaf.ttslua"), "utf8");
    const { parsed, errors } = parseMarkerFile("core/example.ttslua", content);
    expect(errors).toEqual([]);
    expect(parsed).not.toBeNull();
    if (!parsed) {
      return;
    }
    expect(parsed.lineCount).toBe(3);
    expect(parsed.roots).toHaveLength(1);
    expect(parsed.flat).toHaveLength(1);
    expect(parsed.flat[0]?.regionNum).toBe(100);
    expect(parsed.flat[0]?.parentRegionNum).toBeNull();
  });

  it("accepts nested regions with strict adjacency", () => {
    const content = fs.readFileSync(path.join(fixturesDir, "valid_nested.ttslua"), "utf8");
    const { parsed, errors } = parseMarkerFile("core/example.ttslua", content);
    expect(errors).toEqual([]);
    expect(parsed).not.toBeNull();
    if (!parsed) {
      return;
    }
    expect(parsed.lineCount).toBe(5);
    expect(parsed.flat).toHaveLength(2);
    const child = parsed.flat.find((r) => r.regionNum === 200);
    expect(child?.parentRegionNum).toBe(100);
  });

  it("errors on mismatched endregion", () => {
    const content = [
      "-- #region ::== [100] A ==::",
      "-- #endregion ::== [200] ==::",
      "",
    ].join("\n");
    const { parsed, errors } = parseMarkerFile("core/bad.ttslua", content);
    expect(parsed).toBeNull();
    expect(errors.some((e) => e.includes("mismatches"))).toBe(true);
  });
});
