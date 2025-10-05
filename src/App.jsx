import { useEffect, useState, useRef, useCallback } from "react"
import "./App.css"
import InvalidSession from "./components/invalidSession"
import TopPanel from "@nrs/components/TopPanel/index.jsx"
import MiddlePanel from "@nrs/components/MiddlePanel"
import BottomPanel from "@nrs/components/BottomPanel"
import LoadingOverlay from "@nrs/components/Common/LoadingOverlay"
import { useDispatch } from "react-redux"
import { verifySession } from "@nrs/slices/sessionSlice"
import PopupDialog from "@nrs/components/Common/Popup/PopupDialog"
import { useSelector } from "react-redux"
import { ArrayEqual } from "@nrs/utils/common"

// Main App component
export default function App() {
  const dispatch = useDispatch(),
    [sessionId, setSessionId] = useState(null),
    [isLoading] = useSelector((state) => {
      return [state.common.get("isLoading")]
    }, ArrayEqual)

  // get session from url
  useEffect(() => {
    const onPopState = () => {
      setSessionId(getSessionFromUrl())
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  // set session when component mount
  useEffect(() => {
    setSessionId(getSessionFromUrl())
  }, [])

  const getSessionFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search),
      session = params.get("session")
    // verify the session
    if (session) {
      dispatch(verifySession({ sessionId: session }))
    }
    return params.get("session") || ""
  }, [])

  const getMainNode = useCallback(() => {
    return sessionId ? (
      <>
        <LoadingOverlay isLoading={isLoading} />
        <div className="app-container">
          <TopPanel />
          <MiddlePanel />
          <BottomPanel />
        </div>
        <PopupDialog />
      </>
    ) : (
      <>
        <InvalidSession sessionId={sessionId} />
      </>
    )
  }, [sessionId, isLoading])

  let mainNode = getMainNode()
  return mainNode
}
