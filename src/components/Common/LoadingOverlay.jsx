import React, { useEffect, useState, useRef } from "react"

export default function LoadingOverlay({ isLoading, fadeMs = 300 }) {
  const [shouldRender, setShouldRender] = useState(isLoading)
  const overlayRef = useRef(null)

  useEffect(() => {
    if (isLoading) setShouldRender(true)
    else {
      const t = setTimeout(() => setShouldRender(false), fadeMs)
      return () => clearTimeout(t)
    }
  }, [isLoading, fadeMs])

  if (!shouldRender) return null

  return (
    <div
      ref={overlayRef}
      className={`overlay ${isLoading ? "show" : "hide"}`}
      style={{ "--fade-ms": `${fadeMs}ms` }}
    >
      <div className="spinner" />
    </div>
  )
}
