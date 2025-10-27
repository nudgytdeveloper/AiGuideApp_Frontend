import React, { useEffect, useMemo, useRef } from "react"
import { useMap, Marker, useMapViewEvent } from "@mappedin/react-sdk"
import { BlueDot } from "@mappedin/blue-dot"

const MapOverlay = () => {
  const { mapData, mapView } = useMap(),
    startSpaceRef = useRef(null)

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
  }, [mapData, mapView, spaces])
  // TODO: Error Occur when enable blue dot code here..
  // useEffect(() => {
  //   if (!mapView) return
  //   const blueDot = new BlueDot(mapView)
  //   blueDot.enable({ debug: true })
  //   return () => blueDot.disable()
  // }, [mapView])

  useMapViewEvent(
    "click",
    async (event) => {
      const clickedSpace = event?.spaces?.[0]
      if (!clickedSpace) return

      console.debug("clicked space:", clickedSpace)
      console.debug(
        "clicked space full:",
        JSON.stringify(clickedSpace, null, 2)
      )

      // choose the first nav target inside this space
      const clickedTarget = clickedSpace?.navigationTargets?.[0]
      if (!clickedTarget) {
        console.warn("No navigation target for clicked space")
        return
      }

      if (!startSpaceRef.current) {
        // first click = start
        startSpaceRef.current = clickedTarget
        console.debug("setting start space:", clickedSpace.name)
        return
      }

      // second click = end
      console.debug("detect end space:", clickedSpace.name)

      try {
        const directions = await mapView.getDirections({
          from: startSpaceRef.current,
          to: clickedTarget,
        })

        // depending on SDK build this may be .path or .coordinates
        const pathCoords = directions?.path || directions?.coordinates

        if (!pathCoords || pathCoords.length === 0) {
          console.warn("No valid path returned.")
          return
        }

        console.debug("drawing path...")
        mapView.addPath(pathCoords, {
          color: "#4B7BE5",
          width: 4,
        })
      } catch (err) {
        console.error("Error while getting directions:", err)
      } finally {
        // reset so next click starts a new route
        startSpaceRef.current = null
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
