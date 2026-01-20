import bellIcon from "@nrs/assets/img/bell.png"
import settingsIcon from "@nrs/assets/img/settings.png"
import FeedbackModal from "@nrs/components/BottomPanel/FeedbackModal"
import Setting from "@nrs/components/TopPanel/Setting"
import { AIChat } from "@nrs/constants/PageType"
import { endSession } from "@nrs/slices/sessionSlice"
import { ArrayEqual } from "@nrs/utils/common"
import { useState, useCallback } from "react"
import { useSelector, useDispatch } from "react-redux"
import "@nrs/css/LangButton.css"

export const TopPanel = () => {
  const dispatch = useDispatch()
  const [selectedPageType, sessiom, selectedLang] = useSelector((state) => {
    return [
      state.common.get("selectedPageType"),
      state.session.get("sessionId"),
      state.common.get("language")
    ]
  }, ArrayEqual)

  const [isSettingOpen, setIsSettingOpen] = useState(false)
  const [settingOpenFrom, setSettingOpenFrom] = useState(null) // "lang" | "settings" | null

  const openSetting = useCallback((from) => {
    setSettingOpenFrom(from)
    setIsSettingOpen(true)
  }, [])

  const closeSetting = useCallback(() => {
    setIsSettingOpen(false)
    setSettingOpenFrom(null)
  }, [])

  const handleToggleSetting = useCallback(
    (from) => {
      if (isSettingOpen) {
        closeSetting(from)
      } else {
        openSetting(from)
      }
    },
    [isSettingOpen]
  )

  return (
    <>
      <header className="header">
        <span className="logo">AI Guide</span>
        <div className="header-icons">
          <button
            className={`langPill ${selectedLang ? "langPill--active" : "langPill--default"}`}
            type="button"
            alt="Language selection"
            onClick={() => handleToggleSetting("lang")}
          >
            <span className="langPill__text">
              {selectedLang ? selectedLang.get("label") : "Language"}
            </span>
          </button>
          <img className="icon" src={bellIcon} alt="Notification" />
          <img
            className="icon"
            src={settingsIcon}
            alt="Settings"
            onClick={() => handleToggleSetting("settings")}
          />
        </div>
      </header>
      {selectedPageType == AIChat ? <FeedbackModal /> : null}
      <Setting
        isOpen={isSettingOpen}
        openFrom={settingOpenFrom}
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
