import React, { useState, useMemo, useCallback, useEffect } from "react"
import { MapView, useMapData, useMap } from "@mappedin/react-sdk"
/**
 * This component lives *inside* <MapView /> and can talk to the map.
 * We'll render the route, and show turn-by-turn steps.
 */
const NavigatorOverlay = () => {
  const { mapView, mapData } = useMap() // gives you both mapView + hydrated mapData after MapView mounts. :contentReference[oaicite:7]{index=7}

  // Extract all "spaces" (rooms / exhibits / halls etc.)
  // We'll memoize so we don't recompute on every render.
  const spaces = useMemo(() => {
    // mapData.getByType('space') returns an array of spaces in the venue. :contentReference[oaicite:8]{index=8}
    return (
      mapData
        .getByType("space")
        // filter only named public spaces you might want to navigate between
        .filter((s) => !!s.name)
        .sort((a, b) => a.name.localeCompare(b.name))
    )
  }, [mapData])

  const [startId, setStartId] = useState("")
  const [endId, setEndId] = useState("")
  const [instructions, setInstructions] = useState([])

  // helper to look up a space object by id
  const getSpaceById = useCallback(
    (id) => spaces.find((s) => s.id === id),
    [spaces]
  )

  // Clear any existing path / markers before drawing a new one.
  // mapView.Navigation draws start pin, animated arrows, pulses, etc. for you. :contentReference[oaicite:9]{index=9}
  const clearRoute = useCallback(() => {
    if (!mapView) return
    // mapView.clear() is exposed on MapView v6 to remove added elements
    // like Navigation / Paths / Markers. (The v6 docs describe `clear(): void`
    // to remove added elements.) :contentReference[oaicite:10]{index=10}
    mapView.clear && mapView.clear()
    setInstructions([])
  }, [mapView])

  const handleRoute = useCallback(
    async (e) => {
      e.preventDefault()
      if (!mapView || !mapData) return
      if (!startId || !endId) return

      // find the actual space objects
      const startSpace = getSpaceById(startId)
      const endSpace = getSpaceById(endId)

      if (!startSpace || !endSpace) return

      // Ask Mappedin to compute indoor directions between the 2 spaces.
      // This gives us walking path coordinates + step-by-step nav.
      // mapData.getDirections(origin, destination) returns "directions". :contentReference[oaicite:11]{index=11}
      const directions = await mapData.getDirections(startSpace, endSpace, {
        // optional: request accessible route (avoid stairs/escalators)
        // accessible: true,
        smoothing: true, // smooth jaggy lines if your venue geometry is tight. :contentReference[oaicite:12]{index=12}
      })

      if (!directions) return

      // Draw the visual route on the 3D map:
      // - Start person icon
      // - Animated arrow path (multi-floor aware)
      // - Destination pin
      // - Clickable floor-change markers for elevators/stairs
      // mapView.Navigation.draw(directions, optionalCustomOptions) :contentReference[oaicite:13]{index=13}
      clearRoute()
      mapView.Navigation.draw(directions)

      // Store turn-by-turn text instructions so we can render them in UI.
      // directions.instructions is an array of steps like
      // "Turn right and go 10 meters". :contentReference[oaicite:14]{index=14}
      setInstructions(directions.instructions || [])
    },
    [mapView, mapData, startId, endId, getSpaceById, clearRoute]
  )

  // Click-to-set start or end:
  // You can let the visitor tap the map to pick "start here".
  // We'll listen for map clicks and store that as start point if not chosen yet.
  useEffect(() => {
    if (!mapView || !mapData) return

    const handleClick = async (evt) => {
      const clickedCoord = evt.coordinate
      // Find nearest space to the click and set it as start if empty.
      if (!startId) {
        // Ask mapData.getDirections(clickedCoord, endSpace) later.
        // We'll treat the clicked coordinate itself as a "start".
        // To keep the example simple, just ignore for now unless we want that UX.
      }
    }

    mapView.on && mapView.on("click", handleClick) // v6 MapView emits 'click' with { coordinate } etc. :contentReference[oaicite:15]{index=15}
    return () => {
      mapView.off && mapView.off("click", handleClick)
    }
  }, [mapView, mapData, startId])

  return <></>
}
export default NavigatorOverlay
