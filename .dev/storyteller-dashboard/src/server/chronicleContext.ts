import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type ChronicleContext = {
  readonly text: string;
  readonly files: readonly string[];
};

const MAX_CONTEXT_CHARS = 80_000;

const isMarkdownFile = (filePath: string): boolean => filePath.toLowerCase().endsWith(".md");

const collectMarkdownFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectMarkdownFiles(fullPath);
    }

    if (entry.isFile() && isMarkdownFile(fullPath)) {
      return [fullPath];
    }

    return [];
  }));

  return nested.flat().sort((left, right) => left.localeCompare(right));
};

export const loadChronicleContext = async (baseDir: string): Promise<ChronicleContext> => {
  const absoluteDir = path.resolve(process.cwd(), baseDir);

  try {
    const files = await collectMarkdownFiles(absoluteDir);
    const sections: string[] = [];
    let remaining = MAX_CONTEXT_CHARS;

    for (const file of files) {
      if (remaining <= 0) {
        break;
      }

      const relativePath = path.relative(process.cwd(), file);
      const raw = await readFile(file, "utf8");
      const trimmed = raw.slice(0, Math.max(0, remaining));
      sections.push(`\n--- Chronicle file: ${relativePath} ---\n${trimmed}`);
      remaining -= trimmed.length;
    }

    return {
      text: sections.join("\n"),
      files: files.map((file) => path.relative(process.cwd(), file))
    };
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { text: "", files: [] };
    }

    throw error;
  }
};
