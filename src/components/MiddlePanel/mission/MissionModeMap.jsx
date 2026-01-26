import React, { useMemo, useState, useCallback, useEffect, useRef } from "react"
import confetti from "canvas-confetti"
import { useMap, useMapViewEvent } from "@mappedin/react-sdk"
import MissionMarkers from "@nrs/components/MiddlePanel/mission/MissionMarkers"
import MissionHUD from "@nrs/components/MiddlePanel/mission/MissionHUD"
import MissionHighlights from "@nrs/components/MiddlePanel/mission/MissionHighlights"
import "@nrs/css/Mission.css"
import BadgeUnlockOverlay from "@nrs/components/MiddlePanel/mission/BadgeUnlockOverlay"

const DEFAULT_MISSION = {
  id: "mission-space-scientist",
  title: "Mission: Become a Space Scientist",
  zones: [
    {
      id: "zone-1",
      label: "Mechanics Alive",
      spaceName: "Mechanics Alive",
      question: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Mercury"],
      answerIndex: 1,
      funFact: "Mars looks red because of iron oxide (rust) on its surface.",
      wrongHint: "Almost! Let’s go to this exhibit and look for the clue 👀"
    },
    {
      id: "zone-2",
      label: "HALL A",
      spaceName: "HALL A",
      question: "What do astronauts wear to breathe in space?",
      options: ["Diving mask", "Space suit", "Winter jacket", "Raincoat"],
      answerIndex: 1,
      funFact:
        "A space suit is like a mini spacecraft—oxygen, pressure, cooling, everything.",
      wrongHint: "Not quite—look around the area for the answer 👨‍🚀"
    },
    {
      id: "zone-3",
      label: "Hall B",
      spaceName: "Hall B",
      question: "What keeps planets in orbit around the Sun?",
      options: ["Magnetism", "Gravity", "Wind", "Waves"],
      answerIndex: 1,
      funFact:
        "Gravity is the invisible force that shapes orbits across the universe.",
      wrongHint: "Close—head to the exhibit and look for the big clue 🔍"
    }
  ]
}

function norm(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

/**
 * Extract polygons from GeoJSON (Polygon | MultiPolygon | Feature | FeatureCollection)
 * Returns: Array of polygons, each polygon = Array of rings, ring = Array<[lng,lat]>
 */
function extractPolygons(geojson) {
  if (!geojson) return []
  const feats =
    geojson.type === "FeatureCollection"
      ? geojson.features || []
      : geojson.type === "Feature"
        ? [geojson]
        : geojson.type && geojson.coordinates
          ? [{ type: "Feature", properties: {}, geometry: geojson }]
          : []

  const polys = []
  for (const f of feats) {
    const g = f?.geometry
    if (!g) continue

    if (g.type === "Polygon") {
      polys.push(g.coordinates) // [ring1, ring2...]
    } else if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates) polys.push(poly)
    }
  }
  return polys
}

/** Ray-casting point-in-ring. ring is Array<[lng,lat]> */
function pointInRing(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1]
    const xj = ring[j][0],
      yj = ring[j][1]

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Point in polygon with holes:
 * - inside outer ring
 * - NOT inside any hole rings
 */
function pointInPolygon(lng, lat, polygonRings) {
  if (!polygonRings?.length) return false
  const outer = polygonRings[0]
  if (!pointInRing(lng, lat, outer)) return false
  for (let h = 1; h < polygonRings.length; h++) {
    if (pointInRing(lng, lat, polygonRings[h])) return false
  }
  return true
}

function pointInAnyGeoJSON(lng, lat, geojson) {
  const polys = extractPolygons(geojson)
  for (const polyRings of polys) {
    if (pointInPolygon(lng, lat, polyRings)) return true
  }
  return false
}

// haptics helpers
const canVibrate =
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
function vibrate(pattern) {
  try {
    if (canVibrate) navigator.vibrate(pattern)
  } catch {}
}

const MissionModeMap = () => {
  const mission = DEFAULT_MISSION
  const { mapView, mapData } = useMap()

  const [activeZoneId, setActiveZoneId] = useState(null)
  const [completed, setCompleted] = useState(() => new Set())
  const [lastFeedback, setLastFeedback] = useState(null)
  const [showBadge, setShowBadge] = useState(false)
  const [wrongFlash, setWrongFlash] = useState(null) // format: { idx: number, nonce: number } or null

  // top-layer confetti canvas
  const confettiCanvasRef = useRef(null)
  const confettiInstanceRef = useRef(null)

  //shake state for wrong answers
  const [shakeModal, setShakeModal] = useState(false)
  const shakeTimerRef = useRef(null)

  // auto-hide toast timer (keeps UI clean + avoids covering)
  const toastTimerRef = useRef(null)

  const completedCount = completed.size
  const total = mission.zones.length
  const allDone = completedCount === total

  const spaces = useMemo(() => {
    if (!mapData) return []
    return mapData.getByType("space")?.filter((s) => s?.name) || []
  }, [mapData])

  const spaceByName = useMemo(() => {
    const m = new Map()
    for (const s of spaces) m.set(norm(s.name), s)
    return m
  }, [spaces])

  const missionSpaceByZoneId = useMemo(() => {
    const m = new Map()
    for (const z of mission.zones) {
      const targetName = z.spaceName || z.label
      const sp = spaceByName.get(norm(targetName))
      if (sp) m.set(z.id, sp)
    }
    return m
  }, [mission.zones, spaceByName])

  //init confetti instance once when canvas is available
  useEffect(() => {
    const canvas = confettiCanvasRef.current
    if (!canvas) return
    if (confettiInstanceRef.current) return
    try {
      confettiInstanceRef.current = confetti.create(canvas, {
        resize: true,
        useWorker: true
      })
    } catch {
      confettiInstanceRef.current = null
    }
  }, [])

  // helper to fire confetti on the top canvas (fallback to default)
  const fireConfetti = useCallback((opts) => {
    const inst = confettiInstanceRef.current
    if (inst) {
      try {
        inst(opts)
        return
      } catch {}
    }
    try {
      confetti(opts)
    } catch {}
  }, [])

  // cleanup timers
  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  // only mission spaces interactive
  useEffect(() => {
    if (!mapView) return
    // turn off all
    for (const s of spaces) {
      try {
        mapView.updateState(s, { interactive: false })
      } catch {}
    }
    // turn on mission only
    for (const z of mission.zones) {
      const sp = missionSpaceByZoneId.get(z.id)
      if (sp) {
        try {
          mapView.updateState(sp, { interactive: true })
        } catch {}
      }
    }
  }, [mapView, spaces, mission.zones, missionSpaceByZoneId])

  useEffect(() => {
    if (!mapView) return
    const position = {
      latitude: 1.3326774043321263,
      longitude: 103.73591848407528
    }
    if (position?.latitude && position?.longitude) {
      mapView.Camera.animateTo(
        { center: position, zoomLevel: 18 },
        { duration: 1000 }
      )
    }
    mapView.Camera.setMinZoomLevel(17.5)
    mapView.Camera.setMaxZoomLevel(20)
  }, [mapView])

  useEffect(() => {
    if (completed.size === mission.zones.length && mission.zones.length > 0) {
      setShowBadge(true)
    }
  }, [completed, mission.zones.length])

  const closeModal = () => {
    setActiveZoneId(null)
    setShakeModal(false)
    setWrongFlash(null)
  }

  const activeZone = useMemo(
    () => mission.zones.find((z) => z.id === activeZoneId) || null,
    [activeZoneId, mission.zones]
  )

  // show toast with optional auto-hide
  const showFeedback = useCallback((payload, autoHideMs = 0) => {
    setLastFeedback(payload)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    if (autoHideMs > 0) {
      toastTimerRef.current = setTimeout(
        () => setLastFeedback(null),
        autoHideMs
      )
    }
  }, [])

  // trigger shake
  const triggerShake = useCallback(() => {
    setShakeModal(true)
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current)
    shakeTimerRef.current = setTimeout(() => setShakeModal(false), 520)
  }, [])

  const openZone = useCallback(
    (zoneId) => {
      if (completed.has(zoneId)) {
        showFeedback(
          {
            type: "info",
            title: "Already completed!",
            text: "Pick another zone 👀"
          },
          4000
        )
        return
      }
      setTimeout(() => {
        setActiveZoneId(zoneId)
        setLastFeedback(null)
        setWrongFlash(null)
      }, 100)
    },
    [completed, showFeedback]
  )

  const zoomToSpace = useCallback(
    (space) => {
      if (!mapView?.Camera?.animateTo || !space) return

      const focus =
        space.center || space.focusTarget || space.anchorTarget || null

      const zoom = 19.5

      try {
        mapView.Camera.animateTo({
          center: focus,
          zoomLevel: zoom
        })
      } catch (e) {
        // falll back
        try {
          mapView.Camera.animateTo({ center: focus, zoomLevel: zoom })
        } catch {}
      }
    },
    [mapView]
  )

  const zoomAndOpenZone = useCallback(
    (zoneId, space) => {
      zoomToSpace(space)
      openZone(zoneId)
    },
    [zoomToSpace, openZone]
  )

  const resolveZoneFromSpace = useCallback(
    (space) => {
      if (!space) return null
      // check for id fist
      for (const z of mission.zones) {
        const sp = missionSpaceByZoneId.get(z.id)
        if (sp && sp.id === space.id) return z
      }
      // fallback: name match
      const n = norm(space.name)
      return (
        mission.zones.find((z) => norm(z.spaceName || z.label) === n) || null
      )
    },
    [mission.zones, missionSpaceByZoneId]
  )

  useMapViewEvent(
    "click",
    (event) => {
      const clickedMarker = event?.markers?.[0]
      if (clickedMarker?.target && clickedMarker.target.__type === "space") {
        const zone = resolveZoneFromSpace(clickedMarker.target)
        if (zone) {
          zoomAndOpenZone(zone.id, clickedMarker.target)
          return
        }
      }

      const clickedSpace = event?.spaces?.[0]
      if (clickedSpace) {
        const zone = resolveZoneFromSpace(clickedSpace)
        if (zone) {
          zoomAndOpenZone(zone.id, clickedSpace)
          return
        }
      }

      //click on highlight overlay (Shapes layer blocks hit results)
      const c = event?.coordinate
      if (!c?.longitude || !c?.latitude) return

      for (const z of mission.zones) {
        const sp = missionSpaceByZoneId.get(z.id)
        if (!sp?.geoJSON) continue
        if (pointInAnyGeoJSON(c.longitude, c.latitude, sp.geoJSON)) {
          zoomAndOpenZone(z.id, sp)
          return
        }
      }
    },
    [mission.zones, missionSpaceByZoneId, resolveZoneFromSpace, zoomAndOpenZone]
  )

  const onAnswer = (index) => {
    if (!activeZone) return
    const isCorrect = index === activeZone.answerIndex

    if (isCorrect) {
      const next = new Set(completed)
      next.add(activeZone.id)
      setCompleted(next)

      // confetti always on top (via fixed canvas)
      fireConfetti({
        particleCount: 140,
        spread: 80,
        startVelocity: 45,
        origin: { y: 0.6 }
      })

      vibrate(20)
      showFeedback(
        {
          type: "success",
          title: "Correct! 🎉",
          text: activeZone.funFact
        },
        8000
      )
      setActiveZoneId(null)
    } else {
      // wrong answer feedback = shake + vibrate + toast (auto-hide)
      setWrongFlash({ idx: index, nonce: Date.now() })
      triggerShake()
      vibrate([30, 40, 30])
      showFeedback(
        {
          type: "error",
          title: "Almost!",
          text: activeZone.wrongHint
        },
        4000
      )
    }
  }

  const onFinish = () => {
    showFeedback(
      {
        type: "success",
        title: "Mission Completed 🏅",
        text: "Badge unlocked! You’re officially a Space Scientist."
      },
      10000
    )
    setShowBadge(true)
  }

  return (
    <>
      <BadgeUnlockOverlay
        open={showBadge}
        title="Badge Unlocked! 🏅"
        subtitle="You’re officially a Space Scientist."
        badgeText={"Space\nScientist"}
        onClose={() => setShowBadge(false)}
      />
      <div className="mission-map-layer">
        <MissionHUD
          title={mission.title}
          completedCount={completedCount}
          total={total}
          allDone={allDone}
          onFinish={onFinish}
        />

        <MissionHighlights zones={mission.zones} completed={completed} />
        <MissionMarkers
          zones={mission.zones}
          completed={completed}
          onZonePress={() => {}}
        />

        {activeZone ? (
          <QuestionModal
            title={activeZone.label}
            question={activeZone.question}
            options={activeZone.options}
            onClose={closeModal}
            onAnswer={onAnswer}
            shake={shakeModal}
            wrongFlash={wrongFlash}
          />
        ) : null}
        {lastFeedback ? (
          <Toast feedback={lastFeedback} top={!!activeZone} />
        ) : null}
      </div>

      {/*fixed top-layer confetti canvas (always above badge/modal/map) */}
      <canvas
        ref={confettiCanvasRef}
        className="confetti-canvas"
        aria-hidden="true"
      />
    </>
  )
}

function QuestionModal({
  title,
  question,
  options,
  onClose,
  onAnswer,
  shake,
  wrongFlash
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal ${shake ? "shake" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="q">{question}</div>

        <div className="opts">
          {options.map((opt, idx) => {
            const isWrong = wrongFlash?.idx === idx
            const k = `${opt}-${idx}-${isWrong ? wrongFlash.nonce : 0}`

            return (
              <button
                key={k}
                className={`opt ${isWrong ? "wrong" : ""}`}
                onClick={() => onAnswer(idx)}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Toast({ feedback, top }) {
  const style = top
    ? {
        top: `calc(12px + env(safe-area-inset-top))`,
        bottom: "auto",
        zIndex: 9999,
        maxWidth: 520,
        margin: "0 auto"
      }
    : { zIndex: 9999 }

  return (
    <div className={`toast ${feedback.type}`} style={style}>
      <div className="toast-title">{feedback.title}</div>
      <div className="toast-text">{feedback.text}</div>
    </div>
  )
}

export default MissionModeMap
