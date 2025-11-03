import ExhibitDetector from "@nrs/components/MiddlePanel/exhibit/ExhibitDetector"
import React from "react"

const LiveScan = () => {
  return (
    <div className="live-scan-containers">
      {/* <iframe
        className="live-scan-iframe"
        title="Live Scan"
        src="https://singaporesciencecenterpwa.onrender.com/machine-vision-exhibit"
        allow="camera *; microphone *; clipboard-read *; clipboard-write *; fullscreen *; display-capture *"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      /> */}
      <ExhibitDetector />
    </div>
  )
}

export default LiveScan
