import React, { useEffect, useMemo, useRef } from "react"
import { useMap, Marker, useMapViewEvent } from "@mappedin/react-sdk"
import { BlueDot } from "@mappedin/blue-dot"

const MapOverlay = () => {
  const { mapData, mapView } = useMap()

  // store first click between renders
  const startCoordRef = useRef(null)

  const spaces = useMemo(() => {
    if (!mapData) return []
    return mapData.getByType("space")?.filter((s) => s?.name) || []
  }, [mapData])

  useEffect(() => {
    if (!mapData || !mapView) return
    spaces.forEach((space) => {
      mapView.updateState(space, {
        interactive: true,
        hoverColor: "#ff9900",
      })
    })

    for (const poi of mapData.getByType("point-of-interest")) {
      // Label the point of interest if it's on the map floor currently shown.
      if (poi.floor.id === mapView.currentFloor.id) {
        mapView.Labels.add(poi.coordinate, poi.name)
      }
    }
  }, [mapData, mapView, spaces])

  // enable BlueDot (optional, keep if it's stable for you)
  // useEffect(() => {
  //   if (!mapView) return
  //   const blueDot = new BlueDot(mapView)

  //   blueDot.enable({
  //     debug: true,
  //     accuracyRing: { opacity: 0.2 },
  //     heading: { color: "aqua", opacity: 1 },
  //     inactiveColor: "wheat",
  //     timeout: 20000,
  //   })

  //   return () => {
  //     blueDot.disable()
  //   }
  // }, [mapView])

  useMapViewEvent(
    "click",
    async (event) => {
      const clickedSpace = event?.spaces?.[0]
      // console.debug("event: ", event)
      if (!clickedSpace) return

      console.debug(
        "clicked space full:",
        JSON.stringify(clickedSpace, null, 2)
      )

      const targetCoord = clickedSpace.center
      if (
        !targetCoord ||
        !targetCoord.latitude ||
        !targetCoord.longitude ||
        !targetCoord.floorId
      ) {
        console.warn("No routable center coord for clicked space")
        return
      }

      // first click -> set start point
      if (!startCoordRef.current) {
        startCoordRef.current = targetCoord
        console.debug("Start set at:", clickedSpace.name, startCoordRef.current)
        return
      }

      // second click -> attempt route
      console.debug("Routing to:", clickedSpace.name, targetCoord)

      try {
        console.debug("try 0")
        // Try modern object signature first here..
        let directions
        try {
          console.debug("try 1")
          directions = await mapView.getDirections({
            from: startCoordRef.current,
            to: targetCoord,
          })
        } catch (e1) {
          console.debug("catch 1")
          // Fallback to 2-arg signature (older SDK builds)
          directions = await mapView.getDirections(
            startCoordRef.current,
            targetCoord
          )
        }
        if (!directions) {
          console.warn("No directions returned.")
          return
        }
        mapView.Navigation.draw(directions)
      } catch (err) {
        console.error("Error while getting directions:", err)
      } finally {
        // reset so next tap begins a new route
        startCoordRef.current = null
      }
    },
    [mapView]
  )

  // hover debug (desktop only)
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
