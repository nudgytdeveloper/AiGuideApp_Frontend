import React, { useEffect } from "react"

const Toast = ({ message, show, duration = 3000, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onClose && onClose(), duration)
      return () => clearTimeout(timer)
    }
  }, [show, duration, onClose])

  return (
    show && (
      <div className="toast-overlay">
        <div className="toast-message">
          {message.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    )
  )
}

export default Toast
