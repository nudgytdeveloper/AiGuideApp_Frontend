import React, { useEffect, useMemo } from "react"
import { useMap, Marker, useMapViewEvent } from "@mappedin/react-sdk"
import { BlueDot } from "@mappedin/blue-dot"

const MapOverlay = () => {
  const { mapData, mapView } = useMap(),
    blueDot = new BlueDot(mapView)

  let startSpace, path

  const spaces = useMemo(() => {
    if (!mapData) return []
    return mapData.getByType("space")?.filter((space) => space?.name) || []
  }, [mapData])

  useEffect(() => {
    if (!mapData || !mapView) return
    spaces.forEach((space) => {
      mapView.updateState(space, {
        interactive: true,
        hoverColor: "#ff9900",
      })
    })
    console.debug(
      `[MarkerOverlay] Applied interactive+hoverColor to ${spaces.length} spaces`
    )
  }, [mapData, mapView, spaces])

  //   useEffect(() => {
  //     if (mapData) {
  //       blueDot.enable({
  //         debug: true,
  //         accuracyRing: {
  //           opacity: 0.2,
  //         },
  //         heading: {
  //           color: "aqua",
  //           opacity: 1,
  //         },
  //         inactiveColor: "wheat",
  //         timeout: 20000,
  //       })
  //     }
  //     return () => {
  //       blueDot.disable()
  //     }
  //   }, [])

  useMapViewEvent(
    "click",
    (event) => {
      //   console.debug("CLICK lat:", event.coordinate.latitude)
      //   console.debug("CLICK lng:", event.coordinate.longitude)
      console.debug("CLICK space:", event.spaces[0])
      if (!startSpace && event.spaces[0]) {
        startSpace = event.spaces[0]
        console.debug("setting start space")
      } else if (!path && event.spaces[0] && startSpace) {
        console.debug("detect end space")
        const directions = mapView.getDirections(startSpace, event.spaces[0])
        if (directions) {
          console.debug("draw Directions...")
          mapView.Navigation.draw(directions)
        }
      }
    },
    [mapView]
  )
  // Hover not working on mobile app view but only works on desktop
  useMapViewEvent(
    "hover",
    (event) => {
      if (event?.target) {
        console.debug(
          "HOVER target:",
          event.target.name || event.target.id || event.target
        )
      }
    },
    [mapView]
  )

  if (!mapData) return null

  return (
    <>
      {spaces.map((space) => (
        <Marker
          key={space.id || space.externalId}
          target={space}
          options={{ interactive: true }}
        >
          <div
            style={{
              borderRadius: "10px",
              backgroundColor: "#fff",
              padding: "5px",
              boxShadow: "0px 0px 1px rgba(0, 0, 0, 0.25)",
              fontFamily: "sans-serif",
              fontSize: "11px",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {space.name}
          </div>
        </Marker>
      ))}
    </>
  )
}

export default MapOverlay
