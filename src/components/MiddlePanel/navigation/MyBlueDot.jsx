import React, { useEffect, useRef } from "react"
import { useMap, useMapViewEvent } from "@mappedin/react-sdk"
import { BlueDot } from "@mappedin/blue-dot"
import { useThrottle } from "@nrs/utils/common"
import { useDispatch } from "react-redux"
import { setPosition } from "@nrs/slices/navigationSlice"

const MyBlueDot = () => {
  const { mapView } = useMap()
  const myBlueDot = useRef(null)
  const dispatch = useDispatch(),
    canSend = useThrottle(1000)

  // Enable BlueDot once the MapView is loaded.
  useEffect(() => {
    if (!mapView) return

    const blueDot = new BlueDot(mapView)
    myBlueDot.current = blueDot

    blueDot.on("position-update", (update) => {
      console.debug("BlueDot position-update:", update.coordinate)
      if (update.coordinate && canSend) {
        console.debug("@@@@ SET POSITION on redux..")
        dispatch(setPosition(update.coordinate))
      }

      if (update.coordinate) {
        mapView.Camera.set({
          center: update.coordinate,
          zoomLevel: 19,
        })
      }
    })
    blueDot.on("state-change", (state) => {
      console.debug("BlueDot state-change:", state)
    })

    blueDot.enable({
      debug: true,
      timeout: 30000,
    })

    // blueDot.follow("position-only")
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
