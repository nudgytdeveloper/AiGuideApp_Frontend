import React, { useEffect } from "react"
import { useMap, useMapViewEvent } from "@mappedin/react-sdk"
import { BlueDot } from "@mappedin/blue-dot"
import { useThrottle } from "@nrs/utils/common"
import { useDispatch } from "react-redux"
import { setPosition } from "@nrs/slices/navigationSlice"

const MyBlueDot = () => {
  const { mapView } = useMap()
  const dispatch = useDispatch(),
    canSend = useThrottle(2000)

  // Enable BlueDot once the MapView is loaded.
  useEffect(() => {
    if (!mapView) return

    const blueDot = new BlueDot(mapView)

    blueDot.on("position-update", (update) => {
      // console.debug("BlueDot position-update:", update.coordinate)
      if (update.coordinate && canSend) {
        dispatch(setPosition(update.coordinate))
      }
    })
    blueDot.on("state-change", (state) => {
      console.log("BlueDot state-change:", state)
    })

    blueDot.on("floor-change", (floor) => {
      console.log("Change to floor:", floor.id)
      mapView.setFloor(floor)
    })

    blueDot.enable({
      debug: false,
      timeout: 30000,
    })

    blueDot.follow("floor-and-position")
    // blueDot.update({
    //   accuracy: 35,
    //   floorOrFloorId: mapView.currentFloor,
    //   latitude: 1.3324536194139647,
    //   longitude: 103.73559461967736,
    // })

    return () => {
      blueDot.disable()
    }
  }, [mapView])

  useMapViewEvent("click", (event) => {
    if (event.coordinate) {
      // console.debug("Coordinate: ", event.coordinate)
      // Follow mode is disabled when clicking on the map. Re-enable it.
      // myBlueDot?.current.follow("position-only")
      // // Update Blue Dot position to where the user clicked.
      // myBlueDot?.current.update({
      //   accuracy: 4,
      //   floorOrFloorId: mapView.currentFloor,
      //   latitude: event.coordinate.latitude,
      //   longitude: event.coordinate.longitude,
      // })
    }
  })

  return <></>
}
export default MyBlueDot
