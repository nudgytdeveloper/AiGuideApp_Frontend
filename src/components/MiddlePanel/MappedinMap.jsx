import React from "react"
import { MapView, useMapData } from "@mappedin/react-sdk"
import MapOverlay from "@nrs/components/MiddlePanel/navigation/MapOverlay"
import MyBlueDot from "@nrs/components/MiddlePanel/navigation/MyBlueDot"

const MappedinMap = () => {
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

  return mapData ? (
    <div id="map">
      <MapView
        mapData={mapData}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        <MyBlueDot />
        <MapOverlay />
      </MapView>
    </div>
  ) : null
}
export default MappedinMap
