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
      console.debug("BlueDot position-update:", update)
    })
    blueDot.on("state-change", (state) => {
      console.debug("BlueDot state-change:", state)
    })

    // blueDot.enable({
    //   debug: true,
    // })

    blueDot.enable({
      debug: true,
      //   accuracyRing: {
      //     color: "forestgreen",
      //     opacity: 0.1,
      //   },
      timeout: 30000,
    })

    // blueDot.follow("position-only")
    // blueDot.update({
    //   accuracy: 10,
    //   floorOrFloorId: mapView.currentFloor,
    //   latitude: 1.3332910937485318,
    //   longitude: 103.7362784548411,
    // })

    return () => {
      blueDot.disable()
    }
  }, [mapView])

  return <></>
}
export default MyBlueDot
