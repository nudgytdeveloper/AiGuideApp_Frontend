import { useEffect, useState } from "react"
import bellIcon from "./assets/img/bell.png"
import settingsIcon from "./assets/img/settings.png"
import mapIcon from "./assets/img/find_map.png"
import scanIcon from "./assets/img/live_scan.png"
import micIcon from "./assets/img/mic.png"

function getSessionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("session") || "";
}

export default function App() {
  const [sessionId, setSessionId] = useState(getSessionFromUrl());
  // get session from url
  useEffect(() => {
    const onPopState = () => setSessionId(getSessionFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [])

  let invalidSessionNode = (
    <div className="container">
      <header className="header">
        <h1>Ai Guide App</h1>
        <p>Getting <code>session</code> from hologram</p>
      </header>

      <main className="card">
        <div className="row">
          <span className="label">session_id:</span>
          <span className="value" data-testid="session-id">
            {sessionId || "(empty)"}
          </span>
        </div>
        <p className="hint">
          Try visiting <code>?session=session_id</code> at the end of the URL
        </p>
      </main>
    </div>
  ),
  mainNode = (
    <div className="app-container">
      <header className="header">
        <span className="logo">AI Guide</span>
        <div className="header-icons">
          <img className="icon" src={bellIcon} alt="Notification"></img>
          <img className="icon" src={settingsIcon} alt="Settings"></img>
        </div>
      </header>
      <main className="main">
        <div className="video-preview">
          <img src="" alt="" />
        </div>
        <div className="action-buttons">
          <button className="action-btn">
            <img src={mapIcon} height={80} width={80}></img>
          </button>
          <button className="action-btn">
            <img src={scanIcon} height={80} width={80}></img>
          </button>
        </div>
      </main>
      <footer className="chat-box">
        <input id="chatbox" name="chatbox" type="text" placeholder="Type your message..." />
        <button className="mic-btn">
          <img src={micIcon}></img>
        </button>
      </footer>
    </div>
  )
  // TODO: to add checking session id's validility
  return sessionId ? mainNode : invalidSessionNode
}