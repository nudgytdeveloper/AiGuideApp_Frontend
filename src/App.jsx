import { useEffect, useState } from "react";

function getSessionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("session") || "";
}

export default function App() {
  const [sessionId, setSessionId] = useState(getSessionFromUrl());

  useEffect(() => {
    const onPopState = () => setSessionId(getSessionFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
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
          Try visiting <code>?session=session_id</code> at the end of the URL.
        </p>
        <button
          className="copyBtn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(sessionId);
              alert("Copied session_id to clipboard!");
            } catch (e) {
              alert("Unable to copy. Session: " + sessionId);
            }
          }}
          disabled={!sessionId}
        >
          Copy session_id
        </button>
      </main>

      <footer className="footer">
        <small>
          QR code should encode: <code>{`{frontend_base_url}/?session={session_id}`}</code>
        </small>
      </footer>
    </div>
  );
}