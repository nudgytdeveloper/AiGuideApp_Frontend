import bellIcon from "@nrs/assets/img/bell.png"
import settingsIcon from "@nrs/assets/img/settings.png"
import FeedbackModal from "@nrs/components/BottomPanel/FeedbackModal"
import Setting from "@nrs/components/TopPanel/Setting"
import { AIChat } from "@nrs/constants/PageType"
import { endSession } from "@nrs/slices/sessionSlice"
import { ArrayEqual } from "@nrs/utils/common"
import { useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import "@nrs/css/LangButton.css"

export const TopPanel = () => {
  const dispatch = useDispatch()
  const [selectedPageType, sessiom] = useSelector((state) => {
    return [
      state.common.get("selectedPageType"),
      state.session.get("sessionId")
    ]
  }, ArrayEqual)

  const [isSettingOpen, setIsSettingOpen] = useState(false)

  return (
    <>
      <header className="header">
        <span className="logo">AI Guide</span>
        <div className="header-icons">
          <button className="langPill" type="button">
            <span className="langPill__text">Language</span>
          </button>
          <img className="icon" src={bellIcon} alt="Notification" />
          <img
            className="icon"
            src={settingsIcon}
            alt="Settings"
            onClick={() => setIsSettingOpen(!isSettingOpen)}
          />
        </div>
      </header>
      {selectedPageType == AIChat ? <FeedbackModal /> : null}
      <Setting
        isOpen={isSettingOpen}
        onClose={() => setIsSettingOpen(false)}
        onEndJourney={() => {
          // end session
          if (sessiom) {
            dispatch(endSession({ sessionId: sessiom }))
          }
        }}
      />
    </>
  )
}

export default TopPanel
