import React, { useEffect, useState } from "react"
import { useMap } from "@mappedin/react-sdk"

const FloorSwitcher = () => {
  const { mapData, mapView } = useMap()
  const [activeFloor, setActiveFloor] = useState(null)

  const switchFloor = (floor) => {
    console.debug("set floor: ", floor)
    mapView.setFloor(floor)
    setActiveFloor(floor.id)
  }

  useEffect(() => {
    if (!mapView) return
    const handleFloorChange = (event) => setActiveFloor(event.floor.id)
    mapView.on("floor-change", handleFloorChange)
    return () => mapView.off("floor-change", handleFloorChange)
  }, [mapView])

  if (!mapData) return null

  const floors = mapData.getByType("floor")
  console.debug("floors...: ", floors)

  return (
    <div className="floor-switcher">
      {floors.map((floor) => (
        <button
          key={floor.id}
          onClick={() => switchFloor(floor)}
          className={`floor-btn ${activeFloor === floor.id ? "active" : ""}`}
        >
          {floor.name}
        </button>
      ))}
    </div>
  )
}

export default FloorSwitcher
