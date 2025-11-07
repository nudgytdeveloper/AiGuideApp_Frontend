import React, { useEffect, useRef, useState } from "react"
import Webcam from "react-webcam"
import * as tf from "@tensorflow/tfjs"
import * as cvstfjs from "@microsoft/customvision-tfjs"

const ExhibitDetector = ({
  modelUrl = "/models/sc_exhibit/model.json",
  labelsUrl = "/models/sc_exhibit/labels.txt",
  threshold = 0.5,
  backend = "webgl",
  persistMs = 1200,
  maxDetections = 20,
  debug = true,
}) => {
  const webcamRef = useRef(null)
  const overlayRef = useRef(null)

  // control single render loop + concurrent calls
  const startedRef = useRef(false)
  const rafRef = useRef(null)
  const inflightRef = useRef(false)
  const activeRef = useRef(true)

  // model + labels
  const modelRef = useRef(null)
  const [labels, setLabels] = useState([])

  // keep last results to avoid flicker
  const lastRef = useRef({ ts: 0, preds: [] })

  // ---------- helpers ----------
  const syncOverlayToContainer = (canvas) => {
    const container = canvas.parentElement || canvas
    const rect = container.getBoundingClientRect()
    const cwCss = Math.max(1, Math.round(rect.width))
    const chCss = Math.max(1, Math.round(rect.height))
    const dpr = Math.max(1, window.devicePixelRatio || 1)

    if (canvas.style.width !== `${cwCss}px`) canvas.style.width = `${cwCss}px`
    if (canvas.style.height !== `${chCss}px`) canvas.style.height = `${chCss}px`

    const cwBmp = Math.max(1, Math.round(cwCss * dpr))
    const chBmp = Math.max(1, Math.round(chCss * dpr))
    if (canvas.width !== cwBmp) canvas.width = cwBmp
    if (canvas.height !== chBmp) canvas.height = chBmp

    const ctx = canvas.getContext("2d")
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { ctx, cwCss, chCss }
  }

  const computeLetterbox = (video, cwCss, chCss) => {
    const vidW = video.videoWidth || 640
    const vidH = video.videoHeight || 480
    const scale = Math.min(cwCss / vidW, chCss / vidH)
    const drawW = Math.max(1, Math.round(vidW * scale))
    const drawH = Math.max(1, Math.round(vidH * scale))
    const dx = Math.floor((cwCss - drawW) / 2)
    const dy = Math.floor((chCss - drawH) / 2)
    return { vidW, vidH, drawW, drawH, dx, dy }
  }

  const drawBox = (ctx, cwCss, chCss, x, y, w, h, tag) => {
    const X = Math.max(0, Math.round(x))
    const Y = Math.max(0, Math.round(y))
    const W = Math.max(1, Math.min(Math.round(w), cwCss - X))
    const H = Math.max(1, Math.min(Math.round(h), chCss - Y))
    ctx.fillStyle = "rgba(0,255,0,0.26)"
    ctx.fillRect(X, Y, W, H)
    ctx.lineWidth = 6
    ctx.strokeStyle = "rgba(255,255,255,0.95)"
    ctx.strokeRect(X, Y, W, H)
    ctx.lineWidth = 2.5
    ctx.strokeStyle = "rgba(0,0,0,0.9)"
    ctx.strokeRect(X + 1.5, Y + 1.5, W - 3, H - 3)

    if (tag) {
      ctx.save()
      ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial"
      const tw = Math.ceil(ctx.measureText(tag).width) + 8
      const th = 20
      const lx = X
      const ly = Math.max(0, Y - th - 2)
      ctx.fillStyle = "rgba(0,0,0,0.75)"
      ctx.fillRect(lx, ly, tw, th)
      ctx.fillStyle = "white"
      ctx.fillText(tag, lx + 6, ly + th - 6)
      ctx.restore()
    }
  }

  // Attempt to parse model outputs into a unified array of {prob, label, box:{l,t,w,h} (0..1)}
  const normalizePredictions = (raw, labelMap) => {
    // 1) “Nice” Custom Vision format?
    if (Array.isArray(raw) && raw.length && raw[0] && raw[0].boundingBox) {
      return raw
        .map((p) => ({
          probability: Number(p.probability || 0),
          tagName: String(p.tagName || ""),
          boundingBox: {
            left: Number(p.boundingBox?.left || 0),
            top: Number(p.boundingBox?.top || 0),
            width: Number(p.boundingBox?.width || 0),
            height: Number(p.boundingBox?.height || 0),
          },
        }))
        .filter((p) => p.probability >= threshold)
    }

    // 2) Raw triple arrays: [boxes, scores, classes]
    if (
      Array.isArray(raw) &&
      raw.length === 3 &&
      Array.isArray(raw[0]) &&
      Array.isArray(raw[1]) &&
      Array.isArray(raw[2])
    ) {
      const boxes = raw[0] || []
      const scores = raw[1] || []
      const classes = raw[2] || []

      const out = []
      const N = Math.min(boxes.length, scores.length, classes.length)
      for (let i = 0; i < N; i++) {
        const prob = Number(scores[i] || 0)
        if (prob < threshold) continue
        const clsIndex = Number(classes[i] || 0)
        const label =
          (labelMap && labelMap[clsIndex]) != null
            ? labelMap[clsIndex]
            : String(clsIndex)

        const b = boxes[i] || []
        let left = 0,
          top = 0,
          width = 0,
          height = 0

        if (Array.isArray(b) && b.length === 4) {
          const [a, b2, c, d] = b.map((v) => Number(v) || 0)

          // Heuristic:
          // If c>a and d>b2 and all <=1 => likely [ymin, xmin, ymax, xmax]
          if (a <= 1 && b2 <= 1 && c <= 1 && d <= 1 && c > a && d > b2) {
            top = a
            left = b2
            height = Math.max(0, c - a)
            width = Math.max(0, d - b2)
          } else {
            // otherwise assume [left, top, width, height] (all normalized 0..1)
            left = a
            top = b2
            width = c
            height = d
          }
        }

        out.push({
          probability: prob,
          tagName: label,
          boundingBox: { left, top, width, height },
        })
      }
      return out
    }

    // Unknown format
    return []
  }

  // load labels.txt (optional)
  useEffect(() => {
    let ignore = false
    const go = async () => {
      if (!labelsUrl) return
      try {
        const res = await fetch(labelsUrl, { cache: "no-store" })
        if (!res.ok) return
        const text = await res.text()
        // labels.txt: one label per line
        const arr = text
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean)
        if (!ignore) setLabels(arr)
      } catch {}
    }
    go()
    return () => {
      ignore = true
    }
  }, [labelsUrl])

  // main effect
  useEffect(() => {
    let objectModel

    const start = async () => {
      if (startedRef.current) return
      startedRef.current = true
      activeRef.current = true

      // Backend
      try {
        await tf.setBackend(backend)
        await tf.ready()
      } catch (e) {
        try {
          await tf.setBackend("wasm")
          await tf.ready()
        } catch {}
      }

      // Load model
      // Use Custom Vision helper if available; otherwise tf.loadGraphModel would also work.
      objectModel = new cvstfjs.ObjectDetectionModel()
      await objectModel.loadModelAsync(modelUrl)
      modelRef.current = objectModel

      // Wait for webcam
      const video = webcamRef.current?.video
      if (!video) return
      await new Promise((resolve) => {
        const ready = () =>
          video.videoWidth > 0 && video.videoHeight > 0 && resolve()
        if (video.readyState >= 2) {
          ready()
        } else {
          video.onloadedmetadata = () => resolve()
        }
        setTimeout(resolve, 1500)
      })

      const tick = async () => {
        if (!activeRef.current) return
        const videoEl = webcamRef.current?.video
        const overlay = overlayRef.current
        if (!videoEl || !overlay) return

        // size/clear
        const { ctx, cwCss, chCss } = syncOverlayToContainer(overlay)
        ctx.clearRect(0, 0, cwCss, chCss)

        const lb = computeLetterbox(videoEl, cwCss, chCss)

        if (debug) {
          ctx.save()
          ctx.lineWidth = 3
          ctx.strokeStyle = "rgba(255,215,0,0.9)"
          ctx.strokeRect(1.5, 1.5, cwCss - 3, chCss - 3)
          ctx.restore()
        }

        // run detection (drop frame if previous call not finished)
        if (!inflightRef.current && modelRef.current) {
          inflightRef.current = true
          try {
            const raw = await modelRef.current.executeAsync(videoEl)
            // normalize to common shape
            const mapped = normalizePredictions(raw, labels)
            lastRef.current = { ts: performance.now(), preds: mapped }
          } catch (e) {
            // if a specific backend flakes, we keep the loop running
            // console.warn("executeAsync error:", e)
          } finally {
            inflightRef.current = false
          }
        }

        // draw last results if “fresh”
        const age = performance.now() - lastRef.current.ts
        const preds = age <= persistMs ? lastRef.current.preds : []
        if (preds.length) {
          // draw up to maxDetections
          let drawn = 0
          for (const p of preds) {
            if (drawn >= maxDetections) break
            const prob = Number(p.probability || 0)
            const tag = String(p.tagName || "object")
            const bb = p.boundingBox || { left: 0, top: 0, width: 0, height: 0 }
            const x = lb.dx + Math.round(bb.left * lb.drawW)
            const y = lb.dy + Math.round(bb.top * lb.drawH)
            const w = Math.max(1, Math.round(bb.width * lb.drawW))
            const h = Math.max(1, Math.round(bb.height * lb.drawH))
            drawBox(ctx, cwCss, chCss, x, y, w, h, `${tag} ${prob.toFixed(2)}`)
            drawn++
          }
        }

        // tiny status
        if (debug) {
          ctx.save()
          ctx.fillStyle = "rgba(0,0,0,0.6)"
          ctx.fillRect(8, 8, 200, 42)
          ctx.fillStyle = "white"
          ctx.font =
            "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          ctx.fillText(`preds:${(lastRef.current.preds || []).length}`, 14, 24)
          ctx.fillText(
            `age:${Math.max(
              0,
              (performance.now() - lastRef.current.ts) | 0
            )}ms`,
            14,
            38
          )
          ctx.restore()
        }

        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    start().catch(console.error)

    return () => {
      activeRef.current = false
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      inflightRef.current = false
      startedRef.current = false
      modelRef.current = null
    }
  }, [modelUrl, labels, threshold, backend, persistMs, maxDetections, debug])

  // Layout: webcam video behind, overlay canvas on top
  const containerStyle = {
    position: "relative",
    width: "100%",
    height: "100%",
    background: "#000",
    overflow: "hidden",
    borderRadius: 12,
  }
  const layerStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
  }

  return (
    <div style={containerStyle}>
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored={false}
        videoConstraints={{ facingMode: "environment" }}
        style={{ ...layerStyle, zIndex: 1 }}
      />
      <canvas
        ref={overlayRef}
        style={{ ...layerStyle, zIndex: 2, pointerEvents: "none" }}
      />
    </div>
  )
}

export default ExhibitDetector
