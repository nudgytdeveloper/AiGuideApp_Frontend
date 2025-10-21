import AvatarChat from "@nrs/components/MiddlePanel/AvatarChat"
import { AIChat, ExhibitDetection, Navigation } from "@nrs/constants/PageType"
import { useSelector, useDispatch } from "react-redux"
import mapIcon from "@nrs/assets/img/find_map.png"
import scanIcon from "@nrs/assets/img/live_scan.png"
import { setPageType } from "@nrs/slices/commonSlice"
import { ArrayEqual } from "@nrs/utils/common"
import { useCallback } from "react"
import LiveFeed from "@nrs/components/LiveFeed"
import LiveScan from "@nrs/components/MiddlePanel/LiveScan"
import MappedinMap from "@nrs/components/MiddlePanel/MappedinMap"

const MiddlePanel = () => {
  const dispatch = useDispatch(),
    [selectedPageType] = useSelector((state) => {
      return [state.common.get("selectedPageType")]
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
        <LiveScan />
      )}
      {selectedPageType == AIChat ? (
        <div className="video-preview">
          <LiveFeed />
        </div>
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
