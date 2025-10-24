import React, { useState, useMemo, useCallback, useEffect } from "react"
import { MapView, useMapData, useMap } from "@mappedin/react-sdk"
import NavigatorOverlay from "@nrs/components/MiddlePanel/navigation/NavigatorOverlay"

// IMPORTANT: include Mappedin's default styles so labels/paths/markers look right.
// This is the typical path exposed by the React SDK build.
// import "@mappedin/react-sdk/lib/esm/index.css"

/**
 * This is the top-level component you mount in your page.
 * It:
 *  - pulls map data from Mappedin using your credentials via useMapData()
 *  - renders <MapView> only once mapData is ready
 *
 * NOTE: In production, do NOT expose your real secret in public web unless you’re okay
 * with users seeing it (e.g. offline kiosk). Normally you'd proxy a short-lived token
 * from your backend instead of shipping `secret` to the browser.
 */

const MappedinMap = () => {
  // Fetch map data (venue geometry, spaces, paths, etc.) once.
  // returns { isLoading, error, mapData }  :contentReference[oaicite:17]{index=17}
  const { isLoading, error, mapData } = useMapData({
    key: "mik_DUwlsWsBypbdww8je5ad50840", // mik_xxx
    secret: "mis_dylRwkoXQb3ocvaZURE20d0wQLJ6BgEINpYw9t9EQNy9a0b1054", // mis_xxx
    mapId: "68edec68d24915000bbf8757", // map id
  })

  if (isLoading) {
    return <div>Loading indoor map…</div>
  }
  if (error) {
    return <div>Failed to load map: {error.message}</div>
  }

  // mapData is ready → render the actual interactive map.
  return mapData ? (
    <div id="map">
      <MapView
        mapData={mapData}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        {/* All children here can call useMap() */}
        <NavigatorOverlay />
      </MapView>
    </div>
  ) : null
}
export default MappedinMap
