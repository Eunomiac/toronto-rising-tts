import net from "node:net";

/**
 * Reads one JSON object from a TTS inbound connection (buffer until socket `end`, then parse).
 * Matches the framing used by TTS when sending to the editor on port 39998.
 */
export function readJsonFromSocket(socket: net.Socket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    socket.on("data", (data: Buffer) => {
      chunks.push(data);
    });
    socket.once("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw.length === 0) {
        reject(new Error("Empty JSON payload from TTS"));
        return;
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          reject(new Error("TTS JSON root must be an object"));
          return;
        }
        resolve(parsed as Record<string, unknown>);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
    socket.once("error", reject);
  });
}
