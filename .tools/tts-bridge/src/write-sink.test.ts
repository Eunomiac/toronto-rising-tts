import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveSafeWritePath, resolveWriteRoot } from "./write-sink.js";

describe("resolveSafeWritePath", () => {
  const root = path.resolve("/project");

  it("accepts a simple relative path", () => {
    const r = resolveSafeWritePath(root, "debug_logs/a.txt");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fullPath).toBe(path.join(root, "debug_logs", "a.txt"));
    }
  });

  it("rejects .. segments", () => {
    const r = resolveSafeWritePath(root, "debug_logs/../secret.txt");
    expect(r.ok).toBe(false);
  });

  it("rejects absolute paths on posix", () => {
    const r = resolveSafeWritePath(root, "/etc/passwd");
    expect(r.ok).toBe(false);
  });

  it("rejects Windows drive letters in name", () => {
    const r = resolveSafeWritePath(root, "C:\\temp\\x.txt");
    expect(r.ok).toBe(false);
  });

  it("normalizes backslashes to safe subpaths", () => {
    const r = resolveSafeWritePath(root, "a\\b\\c.txt");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fullPath).toBe(path.join(root, "a", "b", "c.txt"));
    }
  });
});

describe("resolveWriteRoot", () => {
  const prevEnv = process.env["TTS_WORKSPACE_WRITE_ROOT"];

  afterEach(() => {
    if (prevEnv === undefined) {
      delete process.env["TTS_WORKSPACE_WRITE_ROOT"];
    } else {
      process.env["TTS_WORKSPACE_WRITE_ROOT"] = prevEnv;
    }
  });

  it("defaults to .dev/.debug under workspace", () => {
    delete process.env["TTS_WORKSPACE_WRITE_ROOT"];
    const ws = path.resolve("/repo");
    expect(resolveWriteRoot(ws)).toBe(path.join(ws, ".dev", ".debug"));
  });

  it("respects TTS_WORKSPACE_WRITE_ROOT relative to workspace", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tts-root-"));
    try {
      process.env["TTS_WORKSPACE_WRITE_ROOT"] = "custom_out";
      expect(resolveWriteRoot(tmp)).toBe(path.join(tmp, "custom_out"));
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
