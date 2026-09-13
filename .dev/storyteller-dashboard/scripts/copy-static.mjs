import { cp, mkdir } from "node:fs/promises";

await mkdir("public/client/icons", { recursive: true });
await cp("assets/icons", "public/client/icons", { recursive: true });
