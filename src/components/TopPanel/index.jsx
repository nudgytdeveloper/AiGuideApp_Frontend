import bellIcon from "@nrs/assets/img/bell.png"
import settingsIcon from "@nrs/assets/img/settings.png"

export const TopPanel = () => {
  return (
    <header className="header">
      <span className="logo">AI Guide</span>
      <div className="header-icons">
        <img className="icon" src={bellIcon} alt="Notification" />
        <img className="icon" src={settingsIcon} alt="Settings" />
      </div>
    </header>
  )
}

export default TopPanel
