import React, { useEffect, useRef, useState } from "react"
import Webcam from "react-webcam"
import * as tf from "@tensorflow/tfjs"
import "@tensorflow/tfjs-backend-webgl"
import "@tensorflow/tfjs-backend-wasm"
import * as cvstfjs from "@microsoft/customvision-tfjs"

const ExhibitDetector = ({
  modelUrl = "/models/sc_exhibit/model.json",
  labelsUrl = "/models/sc_exhibit/labels.txt",
  threshold = 0.05,
  persistMs = 600,
  maxDetections = 20,
  inputSize = 320,
  debug = true,
}) => {
  const webcamRef = useRef(null)
  const overlayRef = useRef(null)

  const startedRef = useRef(false)
  const rafRef = useRef(null)
  const inflightRef = useRef(false)
  const activeRef = useRef(true)

  const modelRef = useRef(null)
  const [labels, setLabels] = useState([])
  const lastRef = useRef({ ts: 0, preds: [] })

  const [hud, setHud] = useState({
    backend: "boot",
    model: "loading",
    preds: 0,
    error: "",
  })

  // offscreen canvas used as model input
  const scratchRef = useRef(null)
  const isiOS = /iP(hone|ad|od)/.test(navigator.userAgent)

  const syncOverlayToContainer = (canvas) => {
    const rect = (canvas.parentElement || canvas).getBoundingClientRect()
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

  // Normalize predictions:
  // 1) CV objects [{ probability, tagName, boundingBox:{left,top,width,height} }]
  // 2) Raw triple [boxes, scores, classes]
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

    const resolveUrl = (u) => {
      if (/^https?:\/\//i.test(u)) return u
      const base = "/"
      return base.replace(/\/+$/, "") + "/" + u.replace(/^\/+/, "")
    }

    const start = async () => {
      if (startedRef.current) return
      startedRef.current = true
      activeRef.current = true

      setHud((h) => ({ ...h, backend: tf.getBackend() }))

      // Preflight model URLs
      const resolvedModelUrl = resolveUrl(modelUrl)
      try {
        const probe = await fetch(resolvedModelUrl, { cache: "no-store" })
        if (!probe.ok) {
          setHud((h) => ({
            ...h,
            model: "failed",
            error: `model.json HTTP ${probe.status}`,
          }))
          return
        }
        const dir = resolvedModelUrl.substring(
          0,
          resolvedModelUrl.lastIndexOf("/") + 1
        )
        const wprobe = await fetch(dir + "weights.bin", { cache: "no-store" })
        if (!wprobe.ok) {
          setHud((h) => ({
            ...h,
            model: "failed",
            error: `weights.bin HTTP ${wprobe.status}`,
          }))
          return
        }
      } catch (e) {
        setHud((h) => ({ ...h, model: "failed", error: String(e) }))
        return
      }

      // Load model
      try {
        objectModel = new cvstfjs.ObjectDetectionModel()
        await objectModel.loadModelAsync(resolvedModelUrl)
        modelRef.current = objectModel
        setHud((h) => ({ ...h, model: "loaded", error: "" }))
      } catch (e) {
        setHud((h) => ({
          ...h,
          model: "failed",
          error: `loadModelAsync: ${String(e)}`,
        }))
        return
      }

      // Wait video
      const video = webcamRef.current?.video
      if (!video) return
      await new Promise((resolve) => {
        const ready = () =>
          video.videoWidth > 0 && video.videoHeight > 0 && resolve()
        if (video.readyState >= 2) ready()
        else video.onloadedmetadata = () => resolve()
        setTimeout(resolve, 2000)
      })

      //  ensure scratch canvas exists & sized..
      if (!scratchRef.current)
        scratchRef.current = document.createElement("canvas")
      const sc = scratchRef.current
      sc.width = inputSize
      sc.height = inputSize
      const sctx = sc.getContext("2d", { willReadFrequently: false })

      const tick = async () => {
        if (!activeRef.current) return
        const v = webcamRef.current?.video
        const overlay = overlayRef.current
        if (!v || !overlay) return

        const { ctx, cwCss, chCss } = syncOverlayToContainer(overlay)
        ctx.clearRect(0, 0, cwCss, chCss)

        const lb = computeLetterbox(v, cwCss, chCss)

        // draw webcam → offscreen square
        sctx.drawImage(v, 0, 0, inputSize, inputSize)

        // inference on canvas element (preferred by CV TFJS)
        if (!inflightRef.current && modelRef.current) {
          inflightRef.current = true
          try {
            const img = sctx.getImageData(0, 0, inputSize, inputSize)
            let raw = await modelRef.current.executeAsync(img)
            const mapped = normalizePredictions(raw, labels)
            lastRef.current = { ts: performance.now(), preds: mapped }
            setHud((h) => ({ ...h, preds: mapped.length }))
            if (debug) {
              const vw = v.videoWidth || 0,
                vh = v.videoHeight || 0
              console.log(
                "[prod-debug] video:",
                vw,
                vh,
                "mapped:",
                mapped.length,
                raw
              )
            }
          } catch (e) {
            setHud((h) => ({
              ...h,
              error: h.error || `executeAsync(canvas): ${String(e)}`,
            }))
            // as a minimal fallback try the video element once
            try {
              let raw2 = await modelRef.current.executeAsync(v)
              const mapped2 = normalizePredictions(raw2, labels)
              lastRef.current = { ts: performance.now(), preds: mapped2 }
              setHud((h) => ({ ...h, preds: mapped2.length }))
            } catch {}
          } finally {
            inflightRef.current = false
          }
        }

        // draw persisted predictions
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

        // HUD
        if (debug) {
          ctx.save()
          ctx.fillStyle = "rgba(0,0,0,0.85)"
          ctx.fillRect(10, 10, 260, hud.error ? 90 : 70)
          ctx.fillStyle = "white"
          ctx.font =
            "14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          ctx.fillText(`backend: ${hud.backend}`, 18, 30)
          ctx.fillText(`model:   ${hud.model}`, 18, 50)
          ctx.fillText(`preds:   ${hud.preds}`, 18, 70)
          if (hud.error) {
            const msg =
              hud.error.length > 42 ? hud.error.slice(0, 42) + "…" : hud.error
            ctx.fillText(`err: ${msg}`, 18, 90)
          }
          ctx.restore()
        }

        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    start().catch((e) => {
      setHud((h) => ({ ...h, model: "failed", error: String(e) }))
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
    labels,
    threshold,
    persistMs,
    maxDetections,
    inputSize,
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
