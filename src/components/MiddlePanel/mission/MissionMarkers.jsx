import { Marker, useMap } from "@mappedin/react-sdk"
import React, { useMemo } from "react"

function norm(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

const MissionMarkers = ({ zones, completed }) => {
  const { mapData } = useMap()

  const spaces = useMemo(() => {
    if (!mapData) return []
    return mapData.getByType("space")?.filter((s) => s?.name) || []
  }, [mapData])

  const spaceByName = useMemo(() => {
    const m = new Map()
    for (const s of spaces) m.set(norm(s.name), s)
    return m
  }, [spaces])

  return (
    <>
      {zones.map((z) => {
        const targetName = z.spaceName || z.label
        const space = spaceByName.get(norm(targetName))
        if (!space) return null

        const done = completed.has(z.id)

        return (
          <Marker key={z.id} target={space} options={{ interactive: true }}>
            <div className={`zone-marker ${done ? "done" : ""}`}>
              <div className="label">
                {z.label == "Mechanics Alive" ? "Hall C" : z.label}
              </div>
            </div>
          </Marker>
        )
      })}
    </>
  )
}

export default MissionMarkers
