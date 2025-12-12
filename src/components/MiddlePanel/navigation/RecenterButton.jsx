import React, { useCallback } from "react"
import { useMap } from "@mappedin/react-sdk"
import { useSelector } from "react-redux"

const RecenterButton = () => {
  const { mapView } = useMap()
  const position = useSelector((state) => state.navigation.get("position"))

  const onRecenter = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (!mapView) return
      // recenter to current position
      if (position?.latitude && position?.longitude && position?.floorId) {
        mapView.Camera.animateTo(
          { center: position, zoomLevel: 20 },
          { duration: 1000 }
        )
      }
    },
    [mapView, position]
  )

  return (
    <button
      className="recenter-btn"
      onClick={(e) => onRecenter(e)}
      aria-label="Re-center"
    >
      Re-center
    </button>
  )
}

export default RecenterButton
