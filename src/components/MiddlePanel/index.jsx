import "@nrs/css/MiddlePanel.css"
import AvatarChat from "@nrs/components/MiddlePanel/AvatarChat"
import { AIChat, ExhibitDetection, Navigation } from "@nrs/constants/PageType"
import { useSelector, useDispatch } from "react-redux"
import mapIcon from "@nrs/assets/img/map.png"
import scanIcon from "@nrs/assets/img/mission.png"
import { setPageType } from "@nrs/slices/commonSlice"
import { ArrayEqual } from "@nrs/utils/common"
import { useCallback } from "react"
import MappedinMap from "@nrs/components/MiddlePanel/MappedinMap"
import LiveFeed from "@nrs/components/LiveFeed"
import { MissionMap } from "@nrs/constants/MapMode"

const MiddlePanel = () => {
  const dispatch = useDispatch(),
    [selectedPageType, isLiveFeedEnabled] = useSelector((state) => {
      const commonState = state.common
      return [
        commonState.get("selectedPageType"),
        commonState.get("isLiveFeedEnabled")
      ]
    }, ArrayEqual)

  const togglePageType = useCallback(
    (type) => {
      const pageType = type == selectedPageType ? AIChat : type
      dispatch(setPageType(pageType))
    },
    [selectedPageType]
  )

  return (
    <main className="main">
      {selectedPageType == AIChat ? (
        <AvatarChat />
      ) : selectedPageType == Navigation ? (
        <MappedinMap />
      ) : (
        // <LiveScan />
        <MappedinMap mapMode={MissionMap} />
      )}
      {selectedPageType == AIChat && isLiveFeedEnabled ? (
        <div className="video-preview">{<LiveFeed />}</div>
      ) : null}
      <div className="action-buttons">
        <button
          id="navigationBtn"
          className="action-btn"
          onClick={() => togglePageType(Navigation)}
        >
          <img src={mapIcon} height={80} width={80} alt="Map" />
        </button>
        <button
          id="exhibitScanBtn"
          className="action-btn"
          onClick={() => togglePageType(ExhibitDetection)}
        >
          <img src={scanIcon} height={80} width={80} alt="Scan" />
        </button>
      </div>
    </main>
  )
}

export default MiddlePanel
