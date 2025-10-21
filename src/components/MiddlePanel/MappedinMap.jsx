import { useEffect, useRef } from "react"
import { getMapData, show3dMap } from "@mappedin/mappedin-js"
import "@mappedin/mappedin-js/lib/mappedin.css"

const MappedinMap = () => {
  const mapContainer = useRef(null)

  useEffect(() => {
    const init = async () => {
      const mapData = await getMapData({
        mapId: "68edec68d24915000bbf8757", // Science Centre map ID
        key: "mik_DUwlsWsBypbdww8je5ad50840",
        secret: "mis_dylRwkoXQb3ocvaZURE20d0wQLJ6BgEINpYw9t9EQNy9a0b1054",
      })

      await show3dMap(mapContainer.current, mapData)
    }

    init()
  }, [])

  return (
    <div
      ref={mapContainer}
      style={{ width: "100%", height: "100vh" }}
      id="map"
    />
  )
}
export default MappedinMap
