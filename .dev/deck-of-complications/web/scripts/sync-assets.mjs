/** Copy playmat / card / overlay assets into public/assets for Vite. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.resolve(root, "../assets");
const dest = path.join(root, "public/assets");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === "README.md") continue;
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

if (!fs.existsSync(src)) {
  throw new Error(`Assets folder missing: ${src}`);
}
fs.rmSync(dest, { recursive: true, force: true });
copyDir(src, dest);
console.log(`Synced assets → ${path.relative(root, dest)}`);
