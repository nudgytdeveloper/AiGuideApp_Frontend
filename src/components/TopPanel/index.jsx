import bellIcon from "@nrs/assets/img/bell.png"
import settingsIcon from "@nrs/assets/img/settings.png"
import FeedbackModal from "@nrs/components/BottomPanel/FeedbackModal"
import { AIChat } from "@nrs/constants/PageType"
import { ArrayEqual } from "@nrs/utils/common"
import { useSelector } from "react-redux"

export const TopPanel = () => {
  const [selectedPageType] = useSelector((state) => {
    return [state.common.get("selectedPageType")]
  }, ArrayEqual)

  return (
    <>
      <header className="header">
        <span className="logo">AI Guide</span>
        <div className="header-icons">
          <img className="icon" src={bellIcon} alt="Notification" />
          <img className="icon" src={settingsIcon} alt="Settings" />
        </div>
      </header>
      {selectedPageType == AIChat ? <FeedbackModal /> : null}
    </>
  )
}

export default TopPanel
