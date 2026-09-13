import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { initGenerateNpc } from "./generateNpcTab";
import { initLuaTab } from "./luaTab";
import { initScenesTab } from "./scenesTab";
import { initStageNpcs } from "./stageNpcs";

const DEFAULT_TAB_ID = "tab-stage-npcs";

const TABS = [
  { id: "tab-stage-npcs", panelId: "panel-stage-npcs", label: "Stage NPCs" },
  { id: "tab-scenes", panelId: "panel-scenes", label: "Scenes" },
  { id: "tab-lua", panelId: "panel-lua", label: "Lua" },
  { id: "tab-generate-npc", panelId: "panel-generate-npc", label: "Generate NPC" }
] as const;

type TabId = (typeof TABS)[number]["id"];

export const App = (): ReactElement => {
  const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB_ID);
  const started = useRef(false);

  useLayoutEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    void initStageNpcs();
    initScenesTab();
    initLuaTab();
    initGenerateNpc();
  }, []);

  useLayoutEffect(() => {
    window.dispatchEvent(new Event("resize"));
    if (activeTab === DEFAULT_TAB_ID) {
      document.getElementById("generic-npc-search")?.focus();
    }
  }, [activeTab]);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: TabId): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.id === tabId);
    const next = TABS[(index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length];
    if (!next) {
      return;
    }
    setActiveTab(next.id);
    document.getElementById(next.id)?.focus();
  };

  return (
    <>
      <nav className="app-tabs" role="tablist" aria-label="Storyteller Dashboard">
        {TABS.map((tab) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              id={tab.id}
              className={selected ? "lock active" : undefined}
              type="button"
              role="tab"
              aria-controls={tab.panelId}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <section
        id="panel-stage-npcs"
        className="tab-panel stage-npcs-panel"
        role="tabpanel"
        aria-labelledby="tab-stage-npcs"
        hidden={activeTab !== "tab-stage-npcs"}
      >
        <aside className="saved-tags-rail" aria-label="Saved search tags">
          <div className="saved-tags-list" id="saved-tags-list"></div>
        </aside>
        <div className="stage-npcs-main">
          <div className="stage-npcs-toolbar">
            <div className="stage-npcs-search-row">
              <input id="generic-npc-search" type="search" placeholder="Search NPCs…" autoComplete="off" />
              <button id="generic-npc-save-tags" type="button" title="Save current search terms as tags">+</button>
            </div>
            <div className="status idle" id="generic-npc-status">Ready.</div>
          </div>
          <div className="generic-npc-grid" id="generic-npc-grid" aria-label="Generic NPCs"></div>
          <footer className="generic-npc-queue">
            <div className="generic-npc-queue-list" id="generic-npc-queue-list"></div>
            <div className="generic-npc-queue-actions">
              <span id="generic-npc-queue-count">No NPCs selected</span>
              <button id="generic-npc-clear-added" type="button">Clear Generics</button>
              <button id="generic-npc-clear" type="button" disabled>Clear</button>
              <button id="generic-npc-copy" type="button" disabled>Copy</button>
              <button id="generic-npc-spawn" type="button" disabled>Spawn in TTS</button>
            </div>
            <div className="status idle" id="generic-npc-bridge-status">Checking TTS bridge…</div>
          </footer>
        </div>
        <aside className="generic-npc-preview" aria-label="Full cutout preview">
          <img id="generic-npc-preview-image" alt="" hidden />
          <p className="generic-npc-preview-empty" id="generic-npc-preview-empty">Hover a cutout</p>
          <p className="generic-npc-preview-label" id="generic-npc-preview-label" hidden></p>
        </aside>
      </section>

      <section
        id="panel-scenes"
        className="tab-panel scenes-panel"
        role="tabpanel"
        aria-labelledby="tab-scenes"
        hidden={activeTab !== "tab-scenes"}
      >
        <div className="scenes-workspace">
          <aside className="scenes-group-rail" aria-label="NPC groups">
            <div id="scenes-palette-list" className="scenes-palette-list" hidden></div>
            <div id="scenes-group-trays" className="scenes-group-trays"></div>
          </aside>
          <div className="scenes-board-wrap" id="scenes-board-wrap">
            <div className="scenes-board-frame" id="scenes-board-frame">
              <img id="scenes-board-img" className="scenes-board-img" alt="Control board" />
              <div id="scenes-board-overlay" className="scenes-board-overlay"></div>
            </div>
            <button id="scenes-clear-stage" className="scenes-clear-stage" type="button">Clear Stage</button>
          </div>
          <aside className="scenes-widget-rail" aria-label="Scene controls">
            <input id="scenes-title" type="text" placeholder="Scene title" aria-label="Scene title" />
            <div className="scenes-mode-toggle" role="group" aria-label="Placement">
              <button id="scenes-mode-standard" className="lock active" type="button" title="Standard table and polar stage">Standard</button>
              <button id="scenes-mode-scatter" type="button" title="Scatter areas">Scatter</button>
            </div>
            <div className="scenes-widget scenes-place-widget">
              <button id="scenes-district" type="button" title="District">
                <span className="scenes-widget-icon" aria-hidden="true">⌖</span>
                <span className="scenes-widget-value">District</span>
              </button>
              <button id="scenes-site" type="button" title="Site">
                <span className="scenes-widget-icon" aria-hidden="true">⌂</span>
                <span className="scenes-widget-value">Site</span>
              </button>
              <button id="scenes-skybox" type="button" title="Skybox">
                <span className="scenes-widget-icon" aria-hidden="true">☁</span>
                <span className="scenes-widget-value">Skybox</span>
              </button>
            </div>
            <div className="scenes-widget scenes-clock-widget">
              <div className="scenes-clock-face">
                <output id="scenes-clock-time-out" htmlFor="scenes-clock-minutes">21:00</output>
                <label className="scenes-present-day" title="Present day">
                  <input id="scenes-present-day" type="checkbox" defaultChecked />
                  Now
                </label>
              </div>
              <label className="scenes-clock-slider" title="Time of day">
                <input id="scenes-clock-minutes" type="range" min={0} max={1435} step={5} defaultValue={1260} />
              </label>
              <div className="scenes-clock-date">
                <label className="scenes-clock-slider" title="Day">
                  <output id="scenes-clock-day-out" htmlFor="scenes-clock-day">13</output>
                  <input id="scenes-clock-day" type="range" min={1} max={31} defaultValue={13} />
                </label>
                <label className="scenes-clock-slider" title="Month">
                  <output id="scenes-clock-month-out" htmlFor="scenes-clock-month">September</output>
                  <input id="scenes-clock-month" type="range" min={1} max={12} defaultValue={9} />
                </label>
                <label className="scenes-clock-year" title="Year">
                  <input id="scenes-clock-year" type="number" min={1} max={2100} defaultValue={2026} aria-label="Year" />
                </label>
              </div>
            </div>
            <div className="scenes-widget scenes-weather-widget">
              <select id="scenes-weather" hidden></select>
              <div className="scenes-weather-axes">
                <button id="scenes-weather-rain" type="button" title="Rain">🌧</button>
                <button id="scenes-weather-snow" type="button" title="Snow is not in the import catalog yet" disabled>❄</button>
                <button id="scenes-weather-wind" type="button" title="Wind">🌬</button>
                <button id="scenes-weather-thunder" type="button" title="Thunder">⚡</button>
              </div>
              <label className="scenes-fog-toggle" title="Top fog">
                <input id="scenes-fog" type="checkbox" defaultChecked />
                Fog
              </label>
              <select id="scenes-lighting" aria-label="Lighting" title="Lighting"></select>
            </div>
            <div className="scenes-widget scenes-sound-widget">
              <select id="scenes-location-track" aria-label="Location track" title="Location track"></select>
              <select id="scenes-background-mood" aria-label="Background mood" title="Background mood"></select>
            </div>
            <div className="scenes-widget scenes-conditions-widget" id="scenes-conditions-list"></div>
            <div className="scenes-widget scenes-table-widget" id="scenes-table-row">
              <div id="scenes-table-chips" className="scenes-table-chips"></div>
            </div>
            <footer className="scenes-footer">
              <div className="status idle" id="scenes-bridge-status">Checking TTS bridge…</div>
              <div className="scenes-footer-actions">
                <button id="scenes-copy" type="button">Copy JSON</button>
                <button id="scenes-import" type="button" disabled>Import in TTS</button>
              </div>
            </footer>
          </aside>
        </div>
        <div id="scenes-toasts" className="scenes-toasts" aria-live="polite"></div>
      </section>
      <div id="scenes-drag-layer" className="scenes-drag-layer"></div>

      <section
        id="panel-lua"
        className="tab-panel lua-panel"
        role="tabpanel"
        aria-labelledby="tab-lua"
        hidden={activeTab !== "tab-lua"}
      >
        <div className="lua-toolbar">
          <button id="lua-run" type="button">Run</button>
          <div className="status idle" id="lua-status">Uses the same External Editor hook as Execute Code. Disable the TTS Tools extension first — only one editor can listen on 39998.</div>
        </div>
        <textarea id="lua-script" spellCheck={false} placeholder={'print("Hello from the Storyteller Dashboard")'}></textarea>
        <pre className="lua-output" id="lua-output"></pre>
      </section>

      <section
        id="panel-generate-npc"
        className="tab-panel"
        role="tabpanel"
        aria-labelledby="tab-generate-npc"
        hidden={activeTab !== "tab-generate-npc"}
      >
        <main className="dashboard-shell">
          <section className="control-panel">
            <div className="brand-block">
              <p className="eyebrow">Toronto Rising</p>
              <h1>Storyteller Dashboard</h1>
              <p>Second-monitor V5 NPC generator. No Tabletop Simulator integration in this MVP.</p>
            </div>
            <textarea id="prompt" placeholder="18, girl, has beef with Aishe, mortal…" rows={4}></textarea>
            <div className="shortcut-bar">
              <button id="generate-one" type="button">ENTER Generate</button>
              <button id="generate-many" type="button">SHIFT+ENTER x3</button>
              <button id="generate-image" type="button">CTRL+ENTER + Image</button>
              <button id="generate-many-image" type="button">CTRL+SHIFT Both</button>
            </div>
            <div className="quick-grid" id="quick-grid"></div>
            <div className="status idle" id="status">Ready.</div>
            <div className="mutation-row" id="mutation-row"></div>
          </section>
          <section className="npc-grid" id="npc-grid" aria-label="Generated NPCs"></section>
          <aside className="history-panel">
            <h2>Session History</h2>
            <div id="history-list"><p>No generated NPCs yet.</p></div>
          </aside>
        </main>
      </section>

      <div id="modal-root"></div>
    </>
  );
};
