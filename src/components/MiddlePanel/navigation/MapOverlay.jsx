import React, { useEffect, useMemo, useRef } from "react"
import { useMap, Marker, useMapViewEvent } from "@mappedin/react-sdk"
import { BlueDot } from "@mappedin/blue-dot"

const MapOverlay = () => {
  const { mapData, mapView } = useMap(),
    startCoordRef = useRef(null)

  const spaces = useMemo(() => {
    if (!mapData) return []
    return mapData.getByType("space")?.filter((s) => s?.name) || []
  }, [mapData])

  const pois = useMemo(() => {
    if (!mapData) return []
    return mapData.getByType("point-of-interest") || []
  }, [mapData])

  // console.debug("pois: ", pois)

  useEffect(() => {
    if (!mapData || !mapView) return

    if (mapView) {
      const initialFloorId = mapView.currentFloor?.id
      if (initialFloorId) {
        const initialLatitude = 1.3333282986523136,
          initialLongitude = 103.736594744561,
          centerCoord = {
            latitude: initialLatitude,
            longitude: initialLongitude,
            floorId: initialFloorId,
          }
        mapView.Camera.set({ center: centerCoord, zoomLevel: 18 })
      }
    }

    spaces.forEach((space) => {
      mapView.updateState(space, {
        interactive: true,
        hoverColor: "#ff9900",
      })
    })

    for (const poi of pois) {
      if (poi.floor.id === mapView.currentFloor.id) {
        mapView.Labels.add(poi.coordinate, poi.name)
      }
    }
  }, [mapData, mapView, spaces])

  // BlueDot
  useEffect(() => {
    if (!mapView) return

    const blueDot = new BlueDot(mapView)

    try {
      blueDot.on?.("position-update", (update) => {
        console.debug("[BlueDot] position-update:", update)
      })
      blueDot.on?.("state-change", (state) => {
        console.debug("[BlueDot] state-change:", state)
      })
    } catch (err) {
      console.warn("[BlueDot] attaching listeners failed:", err)
    }

    blueDot.enable({
      debug: true,
    })

    blueDot.follow?.("position-only")

    return () => {
      blueDot.disable()
    }
  }, [mapView])

  useMapViewEvent(
    "click",
    async (event) => {
      const clickedSpace = event?.spaces?.[0]
      console.debug("event: ", event)
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

      // first click == set start point
      if (!startCoordRef.current) {
        startCoordRef.current = targetCoord
        console.debug("Start set at:", clickedSpace.name, startCoordRef.current)
        return
      }

      // second click == attempt route
      console.debug("Routing to:", clickedSpace.name, targetCoord)

      try {
        let directions
        try {
          directions = await mapView.getDirections({
            from: startCoordRef.current,
            to: targetCoord,
          })
        } catch (e1) {
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
