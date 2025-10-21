// src/components/IndoorMap.jsx
import { useEffect, useMemo, useRef, useState } from "react"
import {
  getVenue,
  showVenue,
  E_SDK_EVENT,
  OfflineSearch,
} from "@mappedin/mappedin-js"
import "@mappedin/mappedin-js/lib/mappedin.css"

export default function IndoorMap({
  venueSlug = "your-venue-slug", // e.g., science-centre-singapore
}) {
  const containerRef = useRef(null)
  const [mapView, setMapView] = useState(null)
  const [venue, setVenue] = useState(null)
  const [selected, setSelected] = useState({ start: null, end: null })

  // Fetch a short-lived access token from your backend
  const fetchAccessToken = async () => {
    const r = await fetch("/api/mappedin-token")
    const { accessToken } = await r.json()
    return accessToken
  }

  // Load the venue and render the MapView
  useEffect(() => {
    let disposed = false

    ;(async () => {
      const accessToken = await fetchAccessToken()

      const v = await getVenue({
        accessToken,
        venue: venueSlug,
      })

      if (disposed) return
      setVenue(v)

      const mv = await showVenue(containerRef.current, v, {
        // optional TMapViewOptions here
      })
      if (disposed) return

      // show all floating labels (optional)
      mv.FloatingLabels.labelAllLocations()

      // hook clicks -> pick nearest location to click
      mv.on(E_SDK_EVENT.CLICK, async (payload) => {
        // payload contains click info; pick a location if available
        const loc = payload?.locations?.[0] ?? null
        if (!loc) return

        if (!selected.start) {
          setSelected({ start: loc, end: null })
          // visually highlight start
          mv.Markers.add(loc, { label: "Start" })
        } else if (!selected.end) {
          setSelected((s) => ({ ...s, end: loc }))

          // compute directions and draw a journey
          const directions = await selected.start.directionsTo(loc)
          mv.Journey.draw(directions) // draw path
        } else {
          // reset for a new route selection
          mv.Journey.clear()
          mv.Markers.removeAll()
          setSelected({ start: loc, end: null })
          mv.Markers.add(loc, { label: "Start" })
        }
      })

      setMapView(mv)
    })()

    return () => {
      disposed = true
      if (mapView) {
        mapView.destroy()
      }
    }
  }, [venueSlug])

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    />
  )
}
