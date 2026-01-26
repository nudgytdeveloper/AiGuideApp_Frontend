import React, { useEffect, useMemo } from "react"
import confetti from "canvas-confetti"
import "@nrs/css/BadgeUnlockOverlay.css"

export default function BadgeUnlockOverlay({
  open,
  title = "Badge Unlocked!",
  subtitle = "You’re officially a Space Scientist.",
  badgeText = "Space\nScientist",
  onClose
}) {
  // fire confetti once when open becomes true
  useEffect(() => {
    if (!open) return

    const durationMs = 900
    const end = Date.now() + durationMs

    const tick = () => {
      const timeLeft = end - Date.now()
      if (timeLeft <= 0) return

      confetti({
        particleCount: 18,
        spread: 70,
        startVelocity: 34,
        origin: { x: 0.2, y: 0.6 }
      })
      confetti({
        particleCount: 18,
        spread: 70,
        startVelocity: 34,
        origin: { x: 0.8, y: 0.6 }
      })

      requestAnimationFrame(tick)
    }

    tick()
  }, [open])

  const badgeLines = useMemo(() => String(badgeText).split("\n"), [badgeText])

  if (!open) return null

  return (
    <div
      className="badgeUnlock-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="badgeUnlock-card">
        <div className="badgeUnlock-badgeWrap">
          <div className="badgeUnlock-badge">
            <div className="badgeUnlock-shine" />
            <div className="badgeUnlock-star s1">★</div>
            <div className="badgeUnlock-star s2">★</div>
            <div className="badgeUnlock-star s3">★</div>

            <div className="badgeUnlock-badgeInner">
              <div className="badgeUnlock-badgeTitle">
                {badgeLines.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
              <div className="badgeUnlock-ribbon">UNLOCKED</div>
            </div>
          </div>
        </div>

        <div className="badgeUnlock-text">
          <div className="badgeUnlock-title">{title}</div>
          <div className="badgeUnlock-sub">{subtitle}</div>
        </div>

        <button className="badgeUnlock-cta" onClick={onClose}>
          Awesome! 🚀
        </button>
      </div>
    </div>
  )
}
