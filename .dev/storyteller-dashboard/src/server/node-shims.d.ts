declare module "node:crypto" { export function randomUUID(): string; }
declare module "node:fs" { export function createReadStream(path: string): { pipe(response: unknown): void }; }
declare module "node:fs/promises" {
  export const promises: { readdir(directory: string, options: { withFileTypes: true }): Promise<{ name: string; isDirectory(): boolean; isFile(): boolean }[]>; readFile(file: string, encoding: "utf8"): Promise<string> };
  export function stat(path: string): Promise<{ isFile(): boolean }>;
  export function readdir(directory: string, options: { withFileTypes: true }): Promise<{ name: string; isDirectory(): boolean; isFile(): boolean }[]>;
  export function readFile(file: string, encoding: "utf8"): Promise<string>;
}
declare module "node:http" {
  export type IncomingMessage = AsyncIterable<Uint8Array | string> & { readonly method?: string; readonly url?: string; readonly headers: { readonly host?: string } };
  export type ServerResponse = { writeHead(statusCode: number, headers?: Record<string, string>): void; end(body?: string): void };
  export function createServer(handler: (request: IncomingMessage, response: ServerResponse) => void): { listen(port: number, host: string, callback: () => void): void };
}
declare module "node:path" {
  const path: { join(...parts: string[]): string; resolve(...parts: string[]): string; relative(from: string, to: string): string; normalize(filePath: string): string; extname(filePath: string): string; dirname(filePath: string): string };
  export default path;
}
declare module "node:url" { export function fileURLToPath(url: string): string; }
declare const process: { readonly cwd: () => string; readonly env: Record<string, string | undefined> };
declare const console: { log(message: string): void };
declare const Buffer: { isBuffer(value: unknown): value is Uint8Array; from(value: Uint8Array | string): Uint8Array; concat(chunks: readonly Uint8Array[]): { toString(encoding: "utf8"): string } };
