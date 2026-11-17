import { MuteButton } from "./MuteButton";

export function Home() {
  return (
    <div className="page home">
      <MuteButton />
      <h1>Deck of Complications</h1>
      <p className="lede">
        Play the Toronto Rising Deck of Complications from a browser. The
        Storyteller starts a short-lived game from the Storyteller Dashboard;
        you join with a private link.
      </p>
      <ul className="links">
        <li>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, "", "/");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          >
            Practice board
          </a>{" "}
          — local deal, no multiplayer server.
        </li>
        <li>
          Live games use a join link that looks like{" "}
          <code>/g/&lt;room&gt;?role=player&amp;token=…</code>
        </li>
      </ul>
    </div>
  );
}
