import { cp, mkdir } from "node:fs/promises";

await mkdir("dist/client", { recursive: true });
await cp("index.html", "dist/index.html");
await cp("src/client/styles.css", "dist/client/styles.css");
