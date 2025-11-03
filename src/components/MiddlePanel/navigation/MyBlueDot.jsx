import React, { useEffect, useRef } from "react"
import { useMap, useMapViewEvent } from "@mappedin/react-sdk"
import { BlueDot } from "@mappedin/blue-dot"

const MyBlueDot = () => {
  const { mapView } = useMap()
  const myBlueDot = useRef(null)

  // Enable BlueDot once the MapView is loaded.
  useEffect(() => {
    if (!mapView) return

    const blueDot = new BlueDot(mapView)
    myBlueDot.current = blueDot

    blueDot.on("position-update", (update) => {
      console.log("BlueDot position-update:", update)
    })
    blueDot.on("state-change", (state) => {
      console.log("BlueDot state-change:", state)
    })

    blueDot.enable({
      debug: true,
    })

    blueDot.follow("position-only")
    blueDot.update({
      accuracy: 10,
      floorOrFloorId: mapView.currentFloor,
      latitude: 1.3332910937485318,
      longitude: 103.7362784548411,
    })

    return () => {
      blueDot.disable()
    }
  }, [mapView])

  //   useMapViewEvent("click", (event) => {
  //     if (event.coordinate) {
  //       // Follow mode is disabled when clicking on the map. Re-enable it.
  //       myBlueDot?.current.follow("position-only")
  //       // Update Blue Dot position to where the user clicked.
  //       myBlueDot?.current.update({
  //         accuracy: 4,
  //         floorOrFloorId: mapView.currentFloor,
  //         latitude: event.coordinate.latitude,
  //         longitude: event.coordinate.longitude,
  //       })
  //     }
  //   })

  return <></>
}
export default MyBlueDot
