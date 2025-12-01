import { getExhibitInfoByLabel } from "@nrs/constants/Exhibits"
import React from "react"

const ExhibitInfoPanel = ({ label }) => {
  const exhibit = getExhibitInfoByLabel(label)

  if (!label || !exhibit) return null

  return (
    <div className="exhibit-info-panel">
      <div className="exhibit-header">
        <h3>{exhibit.title}</h3>
        {exhibit.hall && <span className="exhibit-hall">{exhibit.hall}</span>}
      </div>

      <p className="exhibit-short">{exhibit.shortDescription}</p>

      {exhibit.longDescription && (
        <p className="exhibit-long">{exhibit.longDescription}</p>
      )}
    </div>
  )
}

export default ExhibitInfoPanel
