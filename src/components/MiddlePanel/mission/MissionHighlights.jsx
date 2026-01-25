import React, { useEffect, useMemo, useRef } from "react"
import { useMap } from "@mappedin/react-sdk"

function norm(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

const PURPLE = "rgb(123, 44, 191)"

/** Always convert any GeoJSON (Geometry | Feature | FeatureCollection) → FeatureCollection */
function toFeatureCollection(input) {
  if (!input) return null

  // FeatureCollection
  if (input.type === "FeatureCollection" && Array.isArray(input.features)) {
    return input
  }

  // Feature
  if (input.type === "Feature" && input.geometry) {
    return { type: "FeatureCollection", features: [input] }
  }

  // Geometry
  if (input.type && input.coordinates) {
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: input }]
    }
  }

  return null
}

export default function MissionHighlights({ zones, completed }) {
  const { mapView, mapData } = useMap()
  const shapesRef = useRef([])

  const spaces = useMemo(() => {
    if (!mapData) return []
    return mapData.getByType("space")?.filter((s) => s?.name) || []
  }, [mapData])

  const spaceByName = useMemo(() => {
    const m = new Map()
    for (const s of spaces) m.set(norm(s.name), s)
    return m
  }, [spaces])

  useEffect(() => {
    // v6 guard
    const shapesApi = mapView?.Shapes
    if (!shapesApi?.add || !shapesApi?.remove) return

    // cleanup existing
    for (const sh of shapesRef.current) {
      try {
        shapesApi.remove(sh)
      } catch {}
    }
    shapesRef.current = []

    // add new
    for (const z of zones) {
      const targetName = z.spaceName || z.label
      const space = spaceByName.get(norm(targetName))
      if (!space?.geoJSON) continue

      const fc = toFeatureCollection(space.geoJSON)
      if (!fc) continue

      const done = completed?.has?.(z.id)
      const opacity = done ? 0.18 : 0.32

      try {
        const added = shapesApi.add(fc, {
          color: PURPLE,
          opacity,
          altitude: 0.15
        })

        // Some versions return a single handle, others return an array
        if (Array.isArray(added)) shapesRef.current.push(...added)
        else if (added) shapesRef.current.push(added)
      } catch (e) {
        console.warn(
          "[MissionHighlights] Shapes.add failed for:",
          targetName,
          e
        )
      }
    }

    return () => {
      for (const sh of shapesRef.current) {
        try {
          shapesApi.remove(sh)
        } catch {}
      }
      shapesRef.current = []
    }
  }, [mapView, zones, spaceByName, completed])

  return null
}
