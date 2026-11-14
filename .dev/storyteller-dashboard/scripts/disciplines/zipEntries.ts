import { inflateRawSync } from "node:zlib";

type ZipEntry = {
  readonly name: string;
  readonly method: number;
  readonly compSize: number;
  readonly uncompSize: number;
  readonly localHeaderOffset: number;
};

const readCentralDirectory = (buffer: Buffer): ZipEntry[] => {
  // End of central directory: signature 0x06054b50
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP: end of central directory not found");
  const count = buffer.readUInt16LE(eocd + 10);
  const cdOffset = buffer.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  let offset = cdOffset;
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error(`ZIP: bad central directory at ${offset}`);
    const method = buffer.readUInt16LE(offset + 10);
    const compSize = buffer.readUInt32LE(offset + 20);
    const uncompSize = buffer.readUInt32LE(offset + 24);
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLen).toString("utf8").replace(/\\/g, "/");
    entries.push({ name, method, compSize, uncompSize, localHeaderOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
};

const readLocalPayload = (buffer: Buffer, entry: ZipEntry): Buffer => {
  const offset = entry.localHeaderOffset;
  if (buffer.readUInt32LE(offset) !== 0x04034b50) throw new Error(`ZIP: bad local header for ${entry.name}`);
  const nameLen = buffer.readUInt16LE(offset + 26);
  const extraLen = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + nameLen + extraLen;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compSize);
  if (entry.method === 0) return Buffer.from(compressed);
  if (entry.method === 8) {
    const raw = inflateRawSync(compressed);
    if (entry.uncompSize !== 0 && raw.length !== entry.uncompSize) {
      throw new Error(`ZIP entry ${entry.name}: expected ${entry.uncompSize} bytes, got ${raw.length}`);
    }
    return raw;
  }
  throw new Error(`ZIP entry ${entry.name}: unsupported method ${entry.method}`);
};

/** Read named entries from a ZIP buffer (store or deflate). */
export const readZipEntries = (buffer: Buffer, names: readonly string[]): Map<string, Buffer> => {
  const want = new Set(names.map((name) => name.replace(/\\/g, "/")));
  const catalog = readCentralDirectory(buffer);
  const found = new Map<string, Buffer>();
  for (const entry of catalog) {
    if (!want.has(entry.name)) continue;
    found.set(entry.name, readLocalPayload(buffer, entry));
  }
  for (const name of want) {
    if (!found.has(name)) throw new Error(`ZIP missing entry ${name}`);
  }
  return found;
};

/** List all entry names from the ZIP central directory. */
export const listZipEntryNames = (buffer: Buffer): string[] =>
  readCentralDirectory(buffer).map((entry) => entry.name);
