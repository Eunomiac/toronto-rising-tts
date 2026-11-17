import { useEffect, useState } from "react";
import type { ClientRole } from "./engine/types";
import { Atmosphere } from "./components/Atmosphere";
import { GameView } from "./components/GameView";
import { Home } from "./components/Home";
import { SoloPlay } from "./components/SoloPlay";

function parseRoute() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const gameMatch = path.match(/^\/g\/([^/]+)\/?$/);
  if (gameMatch) {
    const role = (params.get("role") || "player") as ClientRole;
    const token = params.get("token") || "";
    return { kind: "game" as const, roomId: gameMatch[1], role, token };
  }
  if (path === "/solo" || path.startsWith("/solo/")) {
    return { kind: "solo" as const };
  }
  return { kind: "home" as const };
}

export default function App() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    const onNav = () => setRoute(parseRoute());
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);

  return (
    <>
      <Atmosphere />
      {route.kind === "solo" ? (
        <SoloPlay />
      ) : route.kind === "game" ? (
        !route.token ? (
          <div className="page error">
            <h1>Deck of Complications</h1>
            <p>This join link is missing its token.</p>
          </div>
        ) : (
          <GameView roomId={route.roomId} role={route.role} token={route.token} />
        )
      ) : (
        <Home />
      )}
    </>
  );
}
