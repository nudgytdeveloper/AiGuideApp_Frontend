import React, { useEffect, useRef, useState } from "react"
import Webcam from "react-webcam"
import * as tf from "@tensorflow/tfjs"
import "@tensorflow/tfjs-backend-webgl"
import * as cvstfjs from "@microsoft/customvision-tfjs"

const ExhibitDetector = ({
  modelUrl = "/models/sc_exhibit/model.json",
  labelsUrl = "/models/sc_exhibit/labels.txt",
  threshold = 0.25,
  persistMs = 600,
  maxDetections = 20,
  debug = true,
  inputSize = 320,
}) => {
  const webcamRef = useRef(null)
  const overlayRef = useRef(null)

  const startedRef = useRef(false)
  const rafRef = useRef(null)
  const inflightRef = useRef(false)
  const activeRef = useRef(true)

  const modelRef = useRef(null)
  const lastRef = useRef({ ts: 0, preds: [] })

  const [hud, setHud] = useState({
    backend: "boot",
    model: "loading",
    preds: 0,
    error: "",
  })
  const [labels, setLabels] = useState([])

  const syncOverlayToContainer = (canvas) => {
    const rect = (canvas.parentElement || canvas).getBoundingClientRect()
    const cwCss = Math.max(1, Math.round(rect.width))
    const chCss = Math.max(1, Math.round(rect.height))
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.style.width = `${cwCss}px`
    canvas.style.height = `${chCss}px`
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
    return { drawW, drawH, dx, dy }
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

  // Normalize model outputs into: [{probability, tagName, boundingBox:{left,top,width,height}}]
  const normalizePredictions = (raw, labelMap) => {
    if (Array.isArray(raw) && raw.length && raw[0]?.boundingBox) {
      return raw.filter((p) => Number(p.probability || 0) >= threshold)
    }
    if (Array.isArray(raw) && raw.length === 3) {
      const [boxes, scores, classes] = raw
      const out = []
      const N = Math.min(
        boxes?.length || 0,
        scores?.length || 0,
        classes?.length || 0
      )
      for (let i = 0; i < N; i++) {
        const prob = Number(scores[i] || 0)
        if (prob < threshold) continue
        const cls = Number(classes[i] || 0)
        const label = labelMap?.[cls] ?? String(cls)
        const b = boxes[i] || []
        let left = 0,
          top = 0,
          width = 0,
          height = 0
        if (Array.isArray(b) && b.length === 4) {
          const [a, b2, c, d] = b.map((v) => Number(v) || 0)
          if (a <= 1 && b2 <= 1 && c <= 1 && d <= 1 && c > a && d > b2) {
            top = a
            left = b2
            height = Math.max(0, c - a)
            width = Math.max(0, d - b2)
          } else {
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
    return []
  }

  // Load labels.txt (optional)
  useEffect(() => {
    let ignore = false
    const go = async () => {
      if (!labelsUrl) return
      try {
        const res = await fetch(labelsUrl, { cache: "no-store" })
        if (!res.ok) return
        const txt = await res.text()
        const arr = txt
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

  useEffect(() => {
    let objectModel

    const start = async () => {
      if (startedRef.current) return
      startedRef.current = true
      activeRef.current = true

      // Try webgl → cpu
      let chosen = ""
      try {
        await tf.setBackend("webgl")
        await tf.ready()
        chosen = tf.getBackend()
      } catch {
        await tf.setBackend("cpu")
        await tf.ready()
        chosen = tf.getBackend()
      }
      setHud((h) => ({ ...h, backend: chosen }))

      // Load model
      try {
        objectModel = new cvstfjs.ObjectDetectionModel()
        await objectModel.loadModelAsync(modelUrl)
        modelRef.current = objectModel
        setHud((h) => ({ ...h, model: "loaded" }))
      } catch (e) {
        setHud((h) => ({
          ...h,
          model: "failed",
          error: "Model load failed (check URL/CORS)",
        }))
        console.error("Model load error:", e)
        return
      }

      // Wait for webcam
      const video = webcamRef.current?.video
      if (!video) return
      await new Promise((resolve) => {
        const ready = () =>
          video.videoWidth > 0 && video.videoHeight > 0 && resolve()
        if (video.readyState >= 2) ready()
        else video.onloadedmetadata = () => resolve()
        setTimeout(resolve, 2000)
      })

      const tick = async () => {
        if (!activeRef.current) return
        const v = webcamRef.current?.video
        const overlay = overlayRef.current
        if (!v || !overlay) return

        const { ctx, cwCss, chCss } = syncOverlayToContainer(overlay)
        ctx.clearRect(0, 0, cwCss, chCss)

        const lb = computeLetterbox(v, cwCss, chCss)

        if (!inflightRef.current && modelRef.current) {
          inflightRef.current = true
          try {
            // const raw = await modelRef.current.executeAsync(v)
            // const input = tf.tidy(() =>
            //   tf.image
            //     .resizeBilinear(tf.browser.fromPixels(v), [320, 320])
            //     .expandDims(0)
            // )
            // const raw = await modelRef.current.executeAsync(input)
            // tf.dispose(input)
            // const mapped = normalizePredictions(raw, labels)
            let raw
            try {
              const input = tf.tidy(() => {
                const t = tf.browser.fromPixels(v) // HxWx3 uint8
                const r = tf.image.resizeBilinear(
                  t,
                  [inputSize, inputSize],
                  true
                )
                const f = r.toFloat().div(255) // normalize
                return f.expandDims(0) // 1xHxWx3
              })
              raw = await modelRef.current.executeAsync(input)
              tf.dispose(input)
            } catch (e) {
              // fallback: try the video element directly once
              console.warn(
                "executeAsync with tensor failed, trying video element:",
                e
              )
              raw = await modelRef.current.executeAsync(v)
            }

            // map/threshold
            const mapped = normalizePredictions(raw, labels)

            // TEMP DEBUG: lower threshold once if still empty
            if (!mapped.length && threshold > 0.01) {
              const mappedLoose = normalizePredictions(raw, labels)
              lastRef.current = { ts: performance.now(), preds: mappedLoose }
            } else {
              lastRef.current = { ts: performance.now(), preds: mapped }
            }

            // optional logging to confirm shapes in prod
            if (debug) {
              const vw = v.videoWidth || 0,
                vh = v.videoHeight || 0
              console.log(
                "[prod-debug] video:",
                vw,
                vh,
                "mapped preds:",
                lastRef.current.preds.length,
                "raw:",
                raw
              )
            }
            lastRef.current = { ts: performance.now(), preds: mapped }
            setHud((h) => ({ ...h, preds: mapped.length }))
          } catch (e) {
            // If WebGL flakes on some devices, swap to WASM once
            if (tf.getBackend() !== "webgl") {
              try {
                await tf.setBackend("cpu")
                await tf.ready()
                setHud((h) => ({ ...h, backend: "cpu" }))
              } catch {}
            }
          } finally {
            inflightRef.current = false
          }
        }

        const age = performance.now() - lastRef.current.ts
        const preds = age <= persistMs ? lastRef.current.preds : []
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
          drawBox(
            ctx,
            cwCss,
            chCss,
            x,
            y,
            w,
            h,
            `${tag} ${(prob * 100).toFixed(1)}%`
          )
          drawn++
        }

        if (debug) {
          ctx.save()
          ctx.fillStyle = "rgba(0,0,0,0.6)"
          ctx.fillRect(8, 8, 220, 56)
          ctx.fillStyle = "white"
          ctx.font =
            "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          ctx.fillText(`backend: ${hud.backend}`, 14, 24)
          ctx.fillText(`model:   ${hud.model}`, 14, 38)
          ctx.fillText(`preds:   ${hud.preds}`, 14, 52)
          ctx.restore()
        }

        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    start().catch((e) => {
      setHud((h) => ({ ...h, error: String(e) }))
      console.error(e)
    })

    return () => {
      activeRef.current = false
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      inflightRef.current = false
      startedRef.current = false
      modelRef.current = null
    }
  }, [
    modelUrl,
    threshold,
    persistMs,
    maxDetections,
    labels,
    debug,
    hud.backend,
    hud.model,
    hud.preds,
  ])

  // Layout
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
