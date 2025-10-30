import React, { useEffect, useMemo, useRef } from "react"
import { useMap, Marker, useMapViewEvent } from "@mappedin/react-sdk"
import { BlueDot } from "@mappedin/blue-dot"

const MapOverlay = () => {
  const { mapData, mapView } = useMap(),
    startCoordRef = useRef(null)
  const myBlueDot = useRef(null)

  const spaces = useMemo(() => {
    if (!mapData) return []
    return mapData.getByType("space")?.filter((s) => s?.name) || []
  }, [mapData])

  const pois = useMemo(() => {
    if (!mapData) return []
    return mapData.getByType("point-of-interest") || []
  }, [mapData])

  console.debug("pois: ", pois)

  useEffect(() => {
    if (!mapData || !mapView) return

    if (mapView) {
      const initialFloorId = mapView.currentFloor?.id
      if (initialFloorId) {
        const initialLatitude = 1.3332786823115224,
          initialLongitude = 103.73628759945123,
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
  }, [mapData, mapView, spaces])

  // BlueDot
  useEffect(() => {
    if (!mapView) return

    // 1) Shim BOTH roots with a small mpp to enlarge visuals (bigger pixels)
    const enlargeMpp = () => 0.05 // ~5 cm / pixel -> large on screen
    try {
      if (typeof mapView.getMetersPerPixel !== "function") {
        Object.defineProperty(mapView, "getMetersPerPixel", {
          value: enlargeMpp,
          configurable: true,
        })
      } else {
        // overwrite anyway for demo sizing
        mapView.getMetersPerPixel = enlargeMpp
      }
    } catch {}

    try {
      if (typeof mapView.Camera?.getMetersPerPixel !== "function") {
        Object.defineProperty(mapView.Camera, "getMetersPerPixel", {
          value: enlargeMpp,
          configurable: true,
        })
      } else {
        mapView.Camera.getMetersPerPixel = enlargeMpp
      }
    } catch {}

    const blueDot = new BlueDot(mapView)

    blueDot.on("position-update", (u) => console.log("[BlueDot] update:", u))
    blueDot.on("state-change", (s) => console.log("[BlueDot] state:", s))

    blueDot.enable({
      debug: true,
      preventOutOfBounds: false,
      accuracyRing: { opacity: 0.5, color: "rgba(0,128,255,0.5)" },
      heading: { opacity: 1 },
      inactiveColor: "rgba(0,0,255,0.6)",
    })

    // 3) Ensure we’re on the same floor that the dot is on
    const floorId = mapView.currentFloor?.id
    if (floorId) {
      try {
        mapView.setFloor?.(floorId)
      } catch {}
      blueDot.update({
        floorOrFloorId: floorId, // use string id
        latitude: 1.3332786823115224,
        longitude: 103.73628759945123,
        accuracy: 4,
      })
    }

    blueDot.follow("position-only")

    // return () => blueDot.disable()
  }, [mapView])

  useMapViewEvent(
    "click",
    async (event) => {
      console.debug("event:", event)

      const clickedMarker = event?.markers?.[0]
      let poiName = ""
      let poiCoord = null

      if (clickedMarker) {
        if (
          clickedMarker.coordinate &&
          clickedMarker.coordinate.latitude &&
          clickedMarker.coordinate.longitude &&
          clickedMarker.coordinate.floorId
        ) {
          poiCoord = clickedMarker.coordinate
          poiName = clickedMarker.name || "(POI)"
        } else {
          const matchFromPois = pois.find(
            (p) =>
              p.id === clickedMarker.id ||
              p.externalId === clickedMarker.id ||
              p.name === clickedMarker.name
          )

          if (
            matchFromPois &&
            matchFromPois.coordinate &&
            matchFromPois.coordinate.latitude &&
            matchFromPois.coordinate.longitude &&
            matchFromPois.coordinate.floorId
          ) {
            poiCoord = matchFromPois.coordinate
            poiName = matchFromPois.name || "(POI)"
          }
        }
      }
      const clickedSpace = event?.spaces?.[0]
      let spaceName = ""
      let spaceCoord = null

      if (clickedSpace) {
        spaceName = clickedSpace.name || "(Space)"
        spaceCoord = clickedSpace.center
      }
      const targetCoord = poiCoord || spaceCoord
      const targetName = poiCoord ? poiName : spaceName

      if (
        !targetCoord ||
        !targetCoord.latitude ||
        !targetCoord.longitude ||
        !targetCoord.floorId
      ) {
        console.warn("No routable coord from click (POI or space).")
        return
      }

      console.debug("resolved target:", targetName, targetCoord)
      if (!startCoordRef.current) {
        startCoordRef.current = targetCoord
        console.debug("Start set at:", targetName, startCoordRef.current)
        return
      }
      console.debug("Routing to:", targetName, targetCoord)

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
    [mapView, pois]
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
      {/* {spaces.map((space) => (
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
      ))} */}
      {pois.map((poi) => (
        <Marker key={poi.id} target={poi} options={{ interactive: true }}>
          <div
            style={{
              borderRadius: "8px",
              backgroundColor: "#000",
              color: "#fff",
              padding: "3px 5px",
              fontFamily: "sans-serif",
              fontSize: "10px",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {poi.name}
          </div>
        </Marker>
      ))}
    </>
  )
}

export default MapOverlay
