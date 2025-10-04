import { useEffect, useState, useRef } from "react"
import "./App.css"
import InvalidSession from "./components/invalidSession"
import TopPanel from "@nrs/components/TopPanel/index.jsx"
import MiddlePanel from "@nrs/components/MiddlePanel"
import BottomPanel from "@nrs/components/BottomPanel"
import LoadingOverlay from "@nrs/components/Common/LoadingOverlay"
import { useDispatch } from "react-redux"
import { verifySession } from "@nrs/slices/sessionSlice"

// Main App component - this is what gets exported
export default function App() {
  const dispatch = useDispatch()

  function getSessionFromUrl() {
    const params = new URLSearchParams(window.location.search),
      session = params.get("session")
    // verify the session
    if (session) {
      console.log("session: ", params.get("session"))
      dispatch(verifySession({ sessionId: session }))
    }
    return params.get("session") || ""
  }

  const [sessionId, setSessionId] = useState(getSessionFromUrl()),
    [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log("start up..")
    getSessionFromUrl()
    setTimeout(() => {
      setIsLoading(false)
    }, 3000)
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
    <>
      <LoadingOverlay isLoading={isLoading} />
      <div className="app-container">
        <TopPanel />
        <MiddlePanel />
        <BottomPanel />
      </div>
    </>
  )

  // TODO: to add checking session id's validility
  return sessionId ? mainNode : <InvalidSession sessionId={sessionId} />
}
