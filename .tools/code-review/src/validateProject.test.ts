import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { validateProject } from "./validateProject.js";

function writeJson(absPath: string, value: unknown): void {
  fs.writeFileSync(absPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

describe("validateProject", () => {
  it("passes for a minimal partitioned production file with matching registry", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "code-review-"));
    const reviewDir = path.join(tmp, ".dev", "Code Review");
    fs.mkdirSync(reviewDir, { recursive: true });
    const coreDir = path.join(tmp, "core");
    fs.mkdirSync(coreDir, { recursive: true });

    const luaPath = path.join(coreDir, "sample.ttslua");
    const lua = [
      "-- #region ::== [100] Sample ==::",
      "local z = 3",
      "-- #endregion ::== [100] ==::",
      "",
    ].join("\n");
    fs.writeFileSync(luaPath, lua, "utf8");

    writeJson(path.join(reviewDir, "excluded_files.json"), {
      version: 1,
      entries: [],
    });

    writeJson(path.join(reviewDir, "region_registry.json"), {
      version: 1,
      regions: [
        {
          file: "core/sample.ttslua",
          regionNum: 100,
          parentRegionNum: null,
          title: "Sample",
          startLine: 1,
          endLine: 3,
          classification: "",
          description: "",
          notes: "",
        },
      ],
    });

    fs.writeFileSync(path.join(reviewDir, "findings.jsonl"), "\n", "utf8");

    const errors = validateProject({ repoRoot: tmp });
    expect(errors).toEqual([]);
  });

  it("fails when registry is missing a region row", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "code-review-"));
    const reviewDir = path.join(tmp, ".dev", "Code Review");
    fs.mkdirSync(reviewDir, { recursive: true });
    const coreDir = path.join(tmp, "core");
    fs.mkdirSync(coreDir, { recursive: true });

    fs.writeFileSync(
      path.join(coreDir, "sample.ttslua"),
      ["-- #region ::== [100] Sample ==::", "local z = 3", "-- #endregion ::== [100] ==::", ""].join("\n"),
      "utf8",
    );

    writeJson(path.join(reviewDir, "excluded_files.json"), { version: 1, entries: [] });
    writeJson(path.join(reviewDir, "region_registry.json"), { version: 1, regions: [] });
    fs.writeFileSync(path.join(reviewDir, "findings.jsonl"), "\n", "utf8");

    const errors = validateProject({ repoRoot: tmp });
    expect(errors.some((e) => e.includes("Missing registry row"))).toBe(true);
  });
});
