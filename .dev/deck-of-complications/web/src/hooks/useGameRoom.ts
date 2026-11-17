import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PartySocket } from "partysocket";
import type { ClientRole } from "../engine/types";
import type { PublicGameView } from "../engine/game";
import type { ClientMessage, GameIntent, ServerMessage } from "../protocol";

export function useGameRoom(roomId: string, role: ClientRole, token: string) {
  const [view, setView] = useState<PublicGameView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<PartySocket | null>(null);

  const host = useMemo(() => {
    const envHost = import.meta.env.VITE_PARTY_HOST as string | undefined;
    if (envHost) return envHost;
    return window.location.host;
  }, []);

  useEffect(() => {
    if (!roomId || !token || !role) return;
    setError(null);
    const socket = new PartySocket({
      host,
      party: "game-room",
      room: roomId,
      query: { role, token },
    });
    socketRef.current = socket;

    socket.addEventListener("open", () => setConnected(true));
    socket.addEventListener("close", () => setConnected(false));
    socket.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as ServerMessage;
        if (msg.type === "error") {
          setError(msg.message);
          return;
        }
        if (msg.type === "state" || msg.type === "ended") {
          setView(msg.view);
          setError(null);
        }
      } catch {
        setError("Could not read a message from the game server.");
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [host, roomId, role, token]);

  const sendIntent = useCallback((intent: GameIntent) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("Not connected to the game room.");
      return;
    }
    const msg: ClientMessage = { type: "intent", intent };
    socket.send(JSON.stringify(msg));
  }, []);

  return { view, error, connected, sendIntent };
}
