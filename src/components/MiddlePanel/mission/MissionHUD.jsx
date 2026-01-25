import React from "react"

const MissionHUD = ({ title, completedCount, total, allDone, onFinish }) => {
  return (
    <div className="mission-hud">
      <div className="mission-title">{title}</div>
      <div className="mission-progress">
        <div className="bar">
          <div
            className="fill"
            style={{ width: `${(completedCount / total) * 100}%` }}
          />
        </div>
        <div className="count">
          {completedCount}/{total} completed
        </div>
      </div>

      {allDone ? (
        <button className="finish-btn" onClick={onFinish}>
          Unlock Badge 🏅
        </button>
      ) : null}
    </div>
  )
}
export default MissionHUD
