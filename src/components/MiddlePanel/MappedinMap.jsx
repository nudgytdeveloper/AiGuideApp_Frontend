import { useEffect, useRef } from "react"
import { getMapData, show3dMap } from "@mappedin/mappedin-js"
import "@mappedin/mappedin-js/lib/mappedin.css"

const MappedinMap = () => {
  const mapContainer = useRef(null)

  useEffect(() => {
    const init = async () => {
      const mapData = await getMapData({
        mapId: "68edec68d24915000bbf8757", // Science Centre map ID
        key: "YOUR_API_KEY_HERE",
        secret: "YOUR_API_SECRET_HERE",
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
