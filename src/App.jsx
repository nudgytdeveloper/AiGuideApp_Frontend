import { useEffect, useState, useRef } from "react"
import "./App.css"
import InvalidSession from "./components/invalidSession"
import TopPanel from "@nrs/components/TopPanel/index.jsx"
import MiddlePanel from "@nrs/components/MiddlePanel"
import BottomPanel from "@nrs/components/BottomPanel"

//Previous Function before Editing
function getSessionFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get("session") || ""
}

// Main App component - this is what gets exported
export default function App() {
  const [sessionId, setSessionId] = useState(getSessionFromUrl())
  useEffect(() => {
    console.log("start up..")
    getSessionFromUrl()
  }, [])

  // get session from url
  useEffect(() => {
    const onPopState = () => {
      console.log("pop state...")
      setSessionId(getSessionFromUrl())
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  let mainNode = (
    <div className="app-container">
      <TopPanel />
      <MiddlePanel />
      <BottomPanel />
    </div>
  )

  // TODO: to add checking session id's validility
  return sessionId ? mainNode : <InvalidSession sessionId={sessionId} />
}
