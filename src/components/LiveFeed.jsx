import React, { useCallback, useEffect, useRef, useState } from "react"

const LiveFeed = ({
  width = 100,
  height = 70,
  autoStart = true,
  hideOnError = false,
  mirror = true,
}) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setReady(false)
  }, [])

  const start = useCallback(async () => {
    setError("")
    setReady(false)

    if (!window.isSecureContext && location.hostname !== "localhost") {
      setError("Camera requires HTTPS.")
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera API not supported.")
      return
    }

    const base = {
      audio: false,
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    }

    try {
      let stream = await navigator.mediaDevices
        .getUserMedia(base)
        .catch(() => null)

      // Fallback: pick a specific camera if facingMode failed
      if (!stream) {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cams = devices.filter((d) => d.kind === "videoinput")
        const frontish =
          cams.find((d) => /front|user|face/i.test(d.label)) ?? cams[0]
        if (!frontish) throw new Error("No camera found.")
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { deviceId: { exact: frontish.deviceId } },
        })
      }

      streamRef.current = stream
      const v = videoRef.current
      if (v) {
        v.srcObject = stream
        await v.play().catch(() => {}) // some browsers need a gesture
      }
      setReady(true)
    } catch (e) {
      stop()
      setError(
        e?.name === "NotAllowedError"
          ? "Permission denied."
          : e?.message || "Unable to start camera."
      )
    }
  }, [stop])

  useEffect(() => {
    if (autoStart) start()
    return stop
  }, [autoStart, start, stop])

  // Hide completely if requested and not ready / errored
  if (hideOnError && (!ready || error)) return null

  return (
    <div className="video-preview" style={{ width, height }}>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{
          transform: mirror ? "scaleX(-1)" : "none",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: 12,
        }}
      />
      {!hideOnError && error && (
        <button
          onClick={start}
          title={error}
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "rgba(0,0,0,0.4)",
            color: "#fff",
            border: "none",
          }}
        >
          Enable camera
        </button>
      )}
    </div>
  )
}

export default LiveFeed
