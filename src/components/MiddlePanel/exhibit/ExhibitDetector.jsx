import React, { useRef, useEffect } from "react"
import { initTF, CVJSDetector } from "@nrs/utils/detector"

const ExhibitDetector = ({
  modelBaseUrl = "/models/sc_exhibit",
  inputSize = 320,
  confThresh = 0.1,
  backend = "webgl", // "webgl" | "wasm" | "cpu"
}) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const stopStreamRef = useRef(() => {})

  useEffect(() => {
    let active = true
    let det

    const start = async () => {
      // 0) Init TF once (shared singleton recommended elsewhere)
      await initTF(backend)

      // 1) Load detector
      det = new CVJSDetector(modelBaseUrl, { inputSize, confThresh })
      await det.load()

      // 2) Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      const v = videoRef.current
      const c = canvasRef.current
      v.srcObject = stream

      // store stop method for cleanup
      stopStreamRef.current = () => {
        stream.getTracks().forEach((t) => t.stop())
      }

      // 3) Wait until video reports intrinsic size
      await new Promise((resolve) => {
        const ready = () => v.videoWidth > 0 && v.videoHeight > 0 && resolve()
        v.onloadedmetadata = () => {
          v.play()
            .then(ready)
            .catch(() => {})
        }
        // double-safety: poll briefly in case events are missed
        const id = setInterval(() => {
          ready()
        }, 50)
        setTimeout(() => {
          clearInterval(id)
        }, 2000)
      })

      // 4) The render/detect loop (safe sizes + letterbox)
      const loop = async () => {
        if (!active) return
        const v = videoRef.current
        const c = canvasRef.current
        if (!v || !c) return

        // Use the container’s rect as the display target
        const container = c.parentElement || c
        const rect = container.getBoundingClientRect()

        // Clamp to >= 1 to avoid WebGL zero-dimension textures
        const cw = Math.max(1, Math.round(rect.width))
        const ch = Math.max(1, Math.round(rect.height))

        // Sync canvas buffer to displayed size
        if (c.width !== cw) c.width = cw
        if (c.height !== ch) c.height = ch

        const ctx = c.getContext("2d")
        ctx.clearRect(0, 0, cw, ch)

        // Letterbox draw to preserve aspect ratio of the camera frame
        const vidW = v.videoWidth || 640
        const vidH = v.videoHeight || 480
        const scale = Math.min(cw / vidW, ch / vidH)
        const drawW = Math.max(1, Math.round(vidW * scale))
        const drawH = Math.max(1, Math.round(vidH * scale))
        const dx = Math.floor((cw - drawW) / 2)
        const dy = Math.floor((ch - drawH) / 2)

        // Draw the current camera frame
        ctx.drawImage(v, dx, dy, drawW, drawH)

        // Run detection using the *drawn* size (not the raw video size)
        try {
          const dets = await det.detect(v, { dispW: drawW, dispH: drawH })
          console.debug("detected...: ", dets)
          // Shift boxes by letterbox offsets so they align visually
          det.draw(c, dets, { offsetX: dx, offsetY: dy })
        } catch (e) {
          // Optional: fallback to WASM once if WebGL shader compile fails
          if (
            String(e).includes("compile fragment shader") ||
            String(e).includes("GL_INVALID_VALUE")
          ) {
            try {
              await initTF("wasm")
            } catch {}
          }
          // swallow this frame’s error and continue
        }

        requestAnimationFrame(loop)
      }

      requestAnimationFrame(loop)
    }

    start().catch(console.error)

    return () => {
      active = false
      try {
        stopStreamRef.current?.()
      } catch {}
    }
  }, [modelBaseUrl, inputSize, confThresh, backend])

  // Inline styles so it works without extra CSS
  const containerStyle = {
    position: "relative",
    width: "100%",
    // aspectRatio: "3 / 4", // adjust to your UI; container drives canvas size
    height: "100%",
    background: "#000",
    overflow: "hidden",
    borderRadius: "12px",
  }
  const layerStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain", // important: avoid stretching
  }

  return (
    <div className="live-scan-container" style={containerStyle}>
      <video ref={videoRef} style={layerStyle} playsInline muted />
      <canvas
        ref={canvasRef}
        style={{ ...layerStyle, pointerEvents: "none" }}
      />
    </div>
  )
}
export default ExhibitDetector
