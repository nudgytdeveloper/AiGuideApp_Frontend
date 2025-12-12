import bellIcon from "@nrs/assets/img/bell.png"
import settingsIcon from "@nrs/assets/img/settings.png"
import FeedbackModal from "@nrs/components/BottomPanel/FeedbackModal"
import Setting from "@nrs/components/TopPanel/Setting"
import { AIChat } from "@nrs/constants/PageType"
import { ArrayEqual } from "@nrs/utils/common"
import { useState } from "react"
import { useSelector } from "react-redux"

export const TopPanel = () => {
  const [selectedPageType] = useSelector((state) => {
    return [state.common.get("selectedPageType")]
  }, ArrayEqual)

  const [isSettingOpen, setIsSettingOpen] = useState(false)

  return (
    <>
      <header className="header">
        <span className="logo">AI Guide</span>
        <div className="header-icons">
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
        onEndJourney={() => {}}
      />
    </>
  )
}

export default TopPanel
