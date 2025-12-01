import { useEffect, useState, useCallback } from "react"
import "./App.css"
import InvalidSession from "@nrs/components/InvalidSession"
import TopPanel from "@nrs/components/TopPanel/index.jsx"
import MiddlePanel from "@nrs/components/MiddlePanel"
import BottomPanel from "@nrs/components/BottomPanel"
import FeedbackModal from "@nrs/components/BottomPanel/FeedbackModal"
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
    [isLoading, selectedPageType] = useSelector((state) => {
      const commonState = state.common
      return [commonState.get("isLoading"), commonState.get("selectedPageType")]
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
          <FeedbackModal />
        </div>
        <PopupDialog />
      </>
    ) : (
      <>
        <InvalidSession sessionId={sessionId} />
      </>
    )
  }, [sessionId, isLoading, selectedPageType])

  let mainNode = getMainNode()
  return mainNode
}
