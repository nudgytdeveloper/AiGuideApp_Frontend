import "../App.css"

const InvalidSession = props => {
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
            {props.sessionId || "(empty)"}
          </span>
        </div>
        <p className="hint">
          Try visiting <code>?session=session_id</code> at the end of the URL
        </p>
      </main>
    </div>
  )
}

export default InvalidSession
