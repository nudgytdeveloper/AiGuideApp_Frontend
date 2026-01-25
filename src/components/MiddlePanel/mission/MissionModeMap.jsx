import React, { useMemo, useState, useCallback, useRef, useEffect } from "react"
import confetti from "canvas-confetti"
import MissionMarkers from "@nrs/components/MiddlePanel/mission/MissionMarkers"
import MissionHUD from "@nrs/components/MiddlePanel/mission/MissionHUD"
import "@nrs/css/Mission.css"
import MissionHighlights from "@nrs/components/MiddlePanel/mission/MissionHighlights"

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

const MissionModeMap = () => {
  const mission = DEFAULT_MISSION
  const [activeZoneId, setActiveZoneId] = useState(null)
  const [completed, setCompleted] = useState(() => new Set()) // zoneIds
  const [lastFeedback, setLastFeedback] = useState(null) // { type, title, text }
  const mapRootRef = useRef(null)

  const completedCount = completed.size
  const total = mission.zones.length
  const allDone = completedCount === total

  const openZone = useCallback(
    (zoneId) => {
      if (completed.has(zoneId)) {
        setLastFeedback({
          type: "info",
          title: "Already completed!",
          text: "Pick another zone 👀"
        })
        return
      }
      setActiveZoneId(zoneId)
      setLastFeedback(null)
    },
    [completed]
  )

  const closeModal = () => setActiveZoneId(null)

  const activeZone = useMemo(
    () => mission.zones.find((z) => z.id === activeZoneId) || null,
    [activeZoneId, mission.zones]
  )

  const onAnswer = (index) => {
    if (!activeZone) return
    const isCorrect = index === activeZone.answerIndex

    if (isCorrect) {
      const next = new Set(completed)
      next.add(activeZone.id)
      setCompleted(next)

      // confetti burst
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })

      setLastFeedback({
        type: "success",
        title: "Correct! 🎉",
        text: activeZone.funFact
      })
      setActiveZoneId(null)
    } else {
      setLastFeedback({
        type: "error",
        title: "Almost!",
        text: activeZone.wrongHint
      })
    }
  }

  const onFinish = () => {
    setLastFeedback({
      type: "success",
      title: "Mission Completed 🏅",
      text: "Badge unlocked! You’re officially a Space Scientist."
    })
    // TODO: persist progress + push to leaderboard endpoint
  }

  return (
    <>
      {/* Map UI Layer */}
      <div className="mission-map-layer">
        <MissionHUD
          title={mission.title}
          completedCount={completedCount}
          total={total}
          allDone={allDone}
          onFinish={onFinish}
        />

        {lastFeedback ? <Toast feedback={lastFeedback} /> : null}
        <MissionHighlights zones={mission.zones} completed={completed} />
        <MissionMarkers
          zones={mission.zones}
          completed={completed}
          onZonePress={openZone}
        />

        {activeZone ? (
          <QuestionModal
            title={activeZone.label}
            question={activeZone.question}
            options={activeZone.options}
            onClose={closeModal}
            onAnswer={onAnswer}
          />
        ) : null}
      </div>
    </>
  )
}

function QuestionModal({ title, question, options, onClose, onAnswer }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="q">{question}</div>

        <div className="opts">
          {options.map((opt, idx) => (
            <button key={opt} className="opt" onClick={() => onAnswer(idx)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Toast({ feedback }) {
  return (
    <div className={`toast ${feedback.type}`}>
      <div className="toast-title">{feedback.title}</div>
      <div className="toast-text">{feedback.text}</div>
    </div>
  )
}

export default MissionModeMap
