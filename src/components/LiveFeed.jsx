import React, { useCallback, useEffect, useRef, useState } from "react"
import * as faceapi from "face-api.js"

const LiveFeed = ({
  width = 100,
  height = 70,
  autoStart = true,
  hideOnError = false,
  mirror = true,

  // emo recognition's variables (all optional, safe defaults)
  modelBaseUrl = "/models/faceapi",
  detectFps = 8, // how often to run expression detection
  detectorInputSize = 160, // 128/160/224; higher = more accurate/slower
}) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")

  // emotion recognition vars
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [expression, setExpression] = useState({ label: "", prob: 0 })
  const rafRef = useRef(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setReady(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
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
        await v.play().catch(() => {}) // handling foor some browsers which need a gesture
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

  // load face-api models once
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelBaseUrl),
          faceapi.nets.faceLandmark68Net.loadFromUri(modelBaseUrl),
          faceapi.nets.faceExpressionNet.loadFromUri(modelBaseUrl),
        ])
        if (alive) setModelsLoaded(true)
      } catch (e) {
        // Don’t break existing behavior; just surface error in title
        setModelsLoaded(false)
        console.warn("face-api model load failed:", e)
      }
    })()
    return () => {
      alive = false
    }
  }, [modelBaseUrl])

  // detection loop on the SAME <video>
  useEffect(() => {
    if (!ready || !modelsLoaded || error) return

    const opts = new faceapi.TinyFaceDetectorOptions({
      inputSize: detectorInputSize,
      scoreThreshold: 0.5,
    })

    const LABELS = [
      "angry",
      "disgusted",
      "fearful",
      "happy",
      "neutral",
      "sad",
      "surprised",
    ]
    const interval = 1000 / Math.max(1, detectFps)
    let last = 0
    let running = true

    const loop = async (t) => {
      if (!running) return
      if (t - last >= interval) {
        last = t
        try {
          const det = await faceapi
            .detectSingleFace(videoRef.current, opts)
            .withFaceLandmarks()
            .withFaceExpressions()

          if (det?.expressions) {
            let best = -1,
              label = ""
            for (const k of LABELS) {
              const p = det.expressions[k] ?? 0
              if (p > best) {
                best = p
                label = k
              }
            }
            setExpression({ label, prob: best })
          }
        } catch (_) {
          // swallow per-frame errors
          console.debug("frame error")
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [ready, modelsLoaded, error, detectFps, detectorInputSize])

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

      {/* TODO: tiny overlay for emotion recognition, Remove this once Kath finished emotion gesture on avatar */}
      {ready && modelsLoaded && !error && expression.label && (
        <div
          style={{
            position: "absolute",
            left: 6,
            bottom: 6,
            padding: "2px 6px",
            borderRadius: 8,
            fontSize: 10,
            color: "#fff",
            background: "rgba(0,0,0,0.5)",
            textTransform: "capitalize",
            pointerEvents: "none",
          }}
        >
          {expression.label} {(expression.prob * 100).toFixed(0)}%
        </div>
      )}
    </div>
  )
}

export default LiveFeed
