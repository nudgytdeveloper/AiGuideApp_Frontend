import React, { useMemo, useState, useCallback, useEffect, useRef } from "react"
import confetti from "canvas-confetti"
import { useMap, useMapViewEvent } from "@mappedin/react-sdk"
import MissionMarkers from "@nrs/components/MiddlePanel/mission/MissionMarkers"
import MissionHUD from "@nrs/components/MiddlePanel/mission/MissionHUD"
import MissionHighlights from "@nrs/components/MiddlePanel/mission/MissionHighlights"
import "@nrs/css/Mission.css"
import BadgeUnlockOverlay from "@nrs/components/MiddlePanel/mission/BadgeUnlockOverlay"
import { DEFAULT_MISSION } from "@nrs/constants/MissionList"
import { norm, pointInAnyGeoJSON, vibrate } from "@nrs/utils/mission"
// import mechanicsGif from "@nrs/assets/img/hint.gif"
// import ZoneGifMarker from "@nrs/components/MiddlePanel/mission/ZoneGifMarker"

const MissionModeMap = () => {
  const mission = DEFAULT_MISSION
  const { mapView, mapData } = useMap()

  const [activeZoneId, setActiveZoneId] = useState(null)
  const [completed, setCompleted] = useState(() => {
    try {
      const raw = sessionStorage.getItem("completed")
      const arr = raw ? JSON.parse(raw) : []
      return new Set(Array.isArray(arr) ? arr : [])
    } catch {
      return new Set()
    }
  })
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
  const isQuizDoneBefore = sessionStorage.getItem("quizDone") === true
  const allDone = completedCount === total || isQuizDoneBefore

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
    setTimeout(() => {
      showFeedback(
        {
          type: "info",
          title: "Start you journey   ",
          text: "☝️ Click on the purple highlighted zone and start your mission journey! 🔬🧑‍🔬👩‍🔬"
        },
        5000
      )
    }, 1000)
  }, [mapView])

  useEffect(() => {
    if (completed.size === mission.zones.length && mission.zones.length > 0) {
      setShowBadge(true)
    }
  }, [completed, mission.zones.length])

  useEffect(() => {
    sessionStorage.setItem("completed", JSON.stringify([...completed]))
    sessionStorage.setItem(
      "quizDone",
      String(completed.size === mission.zones.length)
    )
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
        text: "Badge unlocked! You’re officially a Future Scientist."
      },
      10000
    )
    setShowBadge(true)
  }

  // const mechanicsSpace = missionSpaceByZoneId.get("zone-1")

  return (
    <>
      <BadgeUnlockOverlay
        open={showBadge}
        title="Badge Unlocked! 🏅"
        subtitle="You’re officially a Future Scientist."
        badgeText={"Future\nScientist"}
        onClose={() => setShowBadge(false)}
      />
      {/* <ZoneGifMarker space={mechanicsSpace} src={mechanicsGif} /> */}
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
