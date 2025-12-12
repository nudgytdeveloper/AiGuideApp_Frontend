import React, { useEffect, useMemo, useState } from "react"
import "@nrs/css/Setting.css"

const LANGS = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ms", label: "Bahasa Melayu" },
]

const Setting = ({ isOpen, onClose, onEndJourney }) => {
  const [liveVideo, setLiveVideo] = useState(false)
  const [langValue, setlangValue] = useState("en")

  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleToggleLiveVideo = () => {
    setLiveVideo((v) => !v)
  }

  const handleChangeLang = (code) => {
    setlangValue(code)
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2 className="settings-title">Setting</h2>
          <button
            type="button"
            className="settings-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-row">
            <span className="settings-row-label">Live Video Feed</span>

            <button
              type="button"
              className="settings-toggle"
              onClick={handleToggleLiveVideo}
              aria-pressed={liveVideo}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Language</div>
          <div className="settings-language-row">
            {LANGS.map((lang) => (
              <button
                type="button"
                key={lang.code}
                className={
                  "settings-lang-pill" +
                  (langValue === lang.code ? " settings-lang-pill-active" : "")
                }
                onClick={() => handleChangeLang(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="settings-end-journey-btn"
          onClick={onEndJourney}
        >
          End Journey
        </button>
      </div>
    </div>
  )
}

export default Setting
