import React from "react"

const Popup = ({ message, onClose }) => {
  return (
    <div className="popup-overlay">
      <div className="popup-box">
        <p className="popup-message">{message}</p>
        <button className="popup-button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  )
}

export default Popup
