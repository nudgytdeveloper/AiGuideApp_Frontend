import React, { useEffect, useRef, useState, useCallback } from "react"
import Webcam from "react-webcam"
import * as tf from "@tensorflow/tfjs"
import "@tensorflow/tfjs-backend-webgl"
import "@tensorflow/tfjs-backend-wasm"
import * as cvstfjs from "@microsoft/customvision-tfjs"
import { useDispatch } from "react-redux"
import { setExhibit } from "@nrs/slices/detectionSlice"
import { resolveLabel } from "@nrs/utils/common"
import Toast from "@nrs/components/Common/Toast"
import ExhibitInfoPanel from "@nrs/components/MiddlePanel/exhibit/ExhibitInfoPanel"
import { useVlmDescription } from "@nrs/hooks/useVlmDescription" // adjust path
// static styles put ourside detector.. so.. no new objects on each render
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

const ExhibitDetector = ({
  modelUrl = "/models/sc_exhibit/model.json",
  labelsUrl = "/models/sc_exhibit/labels.txt",
  threshold = 0.5,
  persistMs = 600,
  maxDetections = 20,
  inputSize = 320,
  debug = false,
  dispatchThreshold = 0.9, // show label when prob >= 0.9
  minDispatchIntervalMs = 10000, // throttle per label to avoid spamming
}) => {
  const dispatch = useDispatch(),
    lastEmitRef = useRef({}) // { [label]: perfNowMs }
  // instance related state
  const webcamRef = useRef(null)
  const overlayRef = useRef(null)
  const captureFrameFnRef = useRef(null) // for VLM hook
  // status related state
  const startedRef = useRef(false)
  const rafRef = useRef(null)
  const inflightRef = useRef(false)
  const activeRef = useRef(true)
  // machine vision related state
  const modelRef = useRef(null)
  const [labels, setLabels] = useState([])
  const labelsRef = useRef([])
  const lastRef = useRef({ ts: 0, preds: [] })
  // machine vision UI related state
  const [showToast, setShowToast] = useState(false)
  const [detectedLabel, setDetectedLabel] = useState("")
  const showToastRef = useRef(showToast)
  const detectedLabelRef = useRef(detectedLabel)

  useEffect(() => {
    showToastRef.current = showToast
  }, [showToast])

  useEffect(() => {
    detectedLabelRef.current = detectedLabel
  }, [detectedLabel])
  // previously its ask ai - ai thinking state & VLM descriptive mode state., now i change to VLM hook since used custom hook
  const {
    aiThinking,
    aiThinkingMessage,
    vlmDescription,
    setVlmDescription,
    describeAuto,
    describeManual,
    setAIStopThinking,
    aiThinkingRef,
  } = useVlmDescription({
    threshold,
    dispatchThreshold,
  })
  // ask ai UI / animation state
  const [showAskAi, setShowAskAi] = useState(false)
  const askAiTimerRef = useRef(null)
  const [askAiPulse, setAskAiPulse] = useState(false)
  const askAiPulseTimerRef = useRef(null)
  const askAiShownAtRef = useRef(0)

  const hudRef = useRef({
    backend: "boot",
    model: "loading",
    preds: 0,
    error: "",
  })

  const hideLabelTimerRef = useRef(null)

  const updateHud = useCallback((patch) => {
    hudRef.current = { ...hudRef.current, ...patch }
  }, [])

  // offscreen canvas + cached contexts..
  const scratchRef = useRef(null)
  const scratchCtxRef = useRef(null)
  const overlayCtxRef = useRef(null)

  const handleToastClose = useCallback(() => {
    setShowToast(false)
  }, [])

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

    let ctx = overlayCtxRef.current
    if (!ctx) {
      ctx = canvas.getContext("2d")
      overlayCtxRef.current = ctx
    }
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
    return
  }

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
        const label = resolveLabel(cls, labelMap)
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

  // load labels
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
        if (!ignore) {
          setLabels(arr)
          labelsRef.current = arr
        }
      } catch (e) {
        console.error(e)
      }
    }
    go()
    return () => {
      ignore = true
    }
  }, [labelsUrl])

  // main detection + VLM loop
  useEffect(() => {
    let objectModel
    let onLoadedMeta = null

    const resolveUrl = (u) => {
      if (/^https?:\/\//i.test(u)) return u
      const base = "/"
      return base.replace(/\/+$/, "") + "/" + u.replace(/^\/+/, "")
    }

    const start = async () => {
      if (startedRef.current) return
      startedRef.current = true
      activeRef.current = true

      updateHud({ backend: tf.getBackend() })

      const resolvedModelUrl = resolveUrl(modelUrl)
      try {
        const probe = await fetch(resolvedModelUrl, { cache: "no-store" })
        if (!probe.ok) {
          updateHud({
            model: "failed",
            error: `model.json HTTP ${probe.status}`,
          })
          return
        }
        const dir = resolvedModelUrl.substring(
          0,
          resolvedModelUrl.lastIndexOf("/") + 1
        )
        const wprobe = await fetch(dir + "weights.bin", { cache: "no-store" })
        if (!wprobe.ok) {
          updateHud({
            model: "failed",
            error: `weights.bin HTTP ${wprobe.status}`,
          })
          return
        }
      } catch (e) {
        updateHud({ model: "failed", error: String(e) })
        return
      }

      // load model
      try {
        objectModel = new cvstfjs.ObjectDetectionModel()
        await objectModel.loadModelAsync(resolvedModelUrl)
        modelRef.current = objectModel
        updateHud({ model: "loaded", error: "" })
      } catch (e) {
        updateHud({
          model: "failed",
          error: `loadModelAsync: ${String(e)}`,
        })
        return
      }

      // wait for webcam metadata
      const video = webcamRef.current?.video
      if (!video) return
      await new Promise((resolve) => {
        const ready = () =>
          video.videoWidth > 0 && video.videoHeight > 0 && resolve()
        if (video.readyState >= 2) ready()
        else {
          onLoadedMeta = () => resolve()
          video.onloadedmetadata = onLoadedMeta
        }
        setTimeout(resolve, 2000)
      })

      // init / reuse scratch canvas & 2D ctx
      if (!scratchRef.current)
        scratchRef.current = document.createElement("canvas")
      const sc = scratchRef.current
      sc.width = inputSize
      sc.height = inputSize
      if (!scratchCtxRef.current) {
        scratchCtxRef.current = sc.getContext("2d", {
          willReadFrequently: false,
        })
      }
      const sctx = scratchCtxRef.current

      // capture frame from scratch canvas as JPEG blob
      const captureFrameAsBlob = () =>
        new Promise((resolve, reject) => {
          try {
            sc.toBlob(
              (blob) => {
                if (!blob) return reject(new Error("Failed to capture frame"))
                resolve(blob)
              },
              "image/jpeg",
              0.9
            )
          } catch (e) {
            reject(e)
          }
        })

      // expose to hook callers (auto/manual)
      captureFrameFnRef.current = captureFrameAsBlob

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

        if (
          !inflightRef.current &&
          modelRef.current &&
          !aiThinkingRef.current
        ) {
          inflightRef.current = true
          try {
            const img = sctx.getImageData(0, 0, inputSize, inputSize)
            let raw = await modelRef.current.executeAsync(img)
            const mapped = normalizePredictions(raw, labelsRef.current)
            lastRef.current = { ts: performance.now(), preds: mapped }

            if (mapped && mapped.length) {
              const top = mapped.reduce(
                (best, cur) =>
                  cur.probability > best.probability ? cur : best,
                mapped[0]
              )
              const prob = Number(top.probability || 0)

              const bb = top.boundingBox || {
                left: 0,
                top: 0,
                width: 0,
                height: 0,
              }
              const cx = lb.dx + Math.round((bb.left + bb.width / 2) * lb.drawW)
              const cy = lb.dy + Math.round((bb.top + bb.height / 2) * lb.drawH)
              const boxCenter = { x: cx, y: cy }

              if (prob >= dispatchThreshold) {
                setAIStopThinking()
                setVlmDescription("")
                const key = String(top.tagName || "object")
                const now = performance.now()
                const last = lastEmitRef.current[key] || 0
                if (now - last >= minDispatchIntervalMs) {
                  const payload = {
                    label: key,
                    confidence: prob,
                    bbox: {
                      left: Number(bb.left || 0),
                      top: Number(bb.top || 0),
                      width: Number(bb.width || 0),
                      height: Number(bb.height || 0),
                    },
                    at: Date.now(),
                    source: "camera",
                  }
                  setVlmDescription("")
                  setDetectedLabel(payload.label)
                  if (!showToastRef.current) setShowToast(true)
                  dispatch(setExhibit(payload.label))
                  lastEmitRef.current[key] = now
                  if (hideLabelTimerRef.current)
                    clearTimeout(hideLabelTimerRef.current)
                  hideLabelTimerRef.current = setTimeout(() => {
                    setDetectedLabel("")
                  }, 5000)
                  if (debug) console.log("[dispatch] mergeExhibit", payload)
                }
              } else if (prob >= threshold) {
                // no exhibit label; instead call VLM to describe
                if (detectedLabelRef.current) {
                  setDetectedLabel("")
                  if (hideLabelTimerRef.current)
                    clearTimeout(hideLabelTimerRef.current)
                }

                const captureFn = captureFrameFnRef.current
                if (captureFn) {
                  await describeAuto({
                    prob,
                    boxCenter,
                    captureFrameAsBlob: captureFn,
                  })
                }
              }
            }

            if (debug) {
              const vw = v.videoWidth || 0
              const vh = v.videoHeight || 0
              console.debug(
                "[prod-debug] video:",
                vw,
                vh,
                "mapped:",
                (lastRef.current.preds || []).length,
                raw
              )
            }
          } catch (e) {
            const currentErr = hudRef.current.error
            if (!currentErr) {
              updateHud({
                error: `executeAsync(canvas): ${String(e)}`,
              })
            }

            try {
              let raw2 = await modelRef.current.executeAsync(v)
              const mapped2 = normalizePredictions(raw2, labelsRef.current)
              lastRef.current = { ts: performance.now(), preds: mapped2 }
            } catch (e2) {
              console.error(e2)
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
          const hud = hudRef.current
          ctx.save()
          ctx.fillStyle = "rgba(0,0,0,0.85)"
          ctx.fillRect(10, 10, 260, hud.error ? 90 : 70)
          ctx.fillStyle = "white"
          ctx.font =
            "14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          ctx.fillText(`backend: ${hud.backend}`, 18, 30)
          ctx.fillText(`model:   ${hud.model}`, 18, 50)
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
      updateHud({ model: "failed", error: String(e) })
      console.error(e)
    })

    return () => {
      activeRef.current = false
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
      }
      rafRef.current = null
      inflightRef.current = false
      startedRef.current = false

      const video = webcamRef.current?.video
      if (video && onLoadedMeta && video.onloadedmetadata === onLoadedMeta) {
        video.onloadedmetadata = null
      }

      modelRef.current = null
      overlayCtxRef.current = null
      if (scratchRef.current) {
        try {
          scratchRef.current.width = 0
          scratchRef.current.height = 0
        } catch (e) {}
      }
      scratchCtxRef.current = null
      scratchRef.current = null
      captureFrameFnRef.current = null
    }
  }, [
    modelUrl,
    threshold,
    persistMs,
    maxDetections,
    inputSize,
    debug,
    dispatchThreshold,
    minDispatchIntervalMs,
    updateHud,
    dispatch,
    describeAuto,
    setVlmDescription,
    setAIStopThinking,
    aiThinkingRef,
  ])

  // Ask AI button timing logic (5s show, pulse after 10s)
  useEffect(() => {
    if (askAiTimerRef.current) {
      clearTimeout(askAiTimerRef.current)
      askAiTimerRef.current = null
    }
    if (askAiPulseTimerRef.current) {
      clearInterval(askAiPulseTimerRef.current)
      askAiPulseTimerRef.current = null
    }

    setAskAiPulse(false)

    if (detectedLabel || aiThinking || vlmDescription) {
      setShowAskAi(false)
      return
    }

    askAiTimerRef.current = setTimeout(() => {
      setShowAskAi(true)
      askAiShownAtRef.current = Date.now()
      askAiPulseTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - askAiShownAtRef.current
        if (elapsed >= 10000) {
          setAskAiPulse(true)
        }
      }, 500)
    }, 5000)

    return () => {
      if (askAiTimerRef.current) clearTimeout(askAiTimerRef.current)
      if (askAiPulseTimerRef.current) clearInterval(askAiPulseTimerRef.current)
    }
  }, [detectedLabel, aiThinking, vlmDescription])

  // cleanup for label timer only (VLM timers are handled inside hook)
  useEffect(() => {
    return () => {
      if (hideLabelTimerRef.current) clearTimeout(hideLabelTimerRef.current)
    }
  }, [])

  return (
    <div style={containerStyle}>
      {detectedLabel && (
        <div
          style={{
            position: "absolute",
            top: 70,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 3,
            padding: "6px 12px",
            borderRadius: 999,
            background: "#7b2cbf",
            color: "#fff",
            fontSize: 16,
            fontWeight: "bold",
            whiteSpace: "pre-line",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          {detectedLabel}
        </div>
      )}
      {!detectedLabel && aiThinking && (
        <div className="ai-thinking-pill">{aiThinkingMessage}</div>
      )}
      {!detectedLabel && vlmDescription && (
        <div
          style={{
            position: "absolute",
            top: 70,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 3,
            padding: "8px 14px",
            borderRadius: 16,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: 14,
            maxWidth: "80%",
            whiteSpace: "normal",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          {vlmDescription}
        </div>
      )}
      {showAskAi && (
        <div
          className={`ai-thinking-pill ask-ai ${
            askAiPulse ? "ask-ai-pulse" : ""
          }`}
          onClick={async () => {
            setShowAskAi(false)
            setAskAiPulse(false)
            const captureFn = captureFrameFnRef.current
            if (captureFn) {
              await describeManual({ captureFrameAsBlob: captureFn })
            }
          }}
        >
          Ask AI
        </div>
      )}

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
      {detectedLabel && detectedLabel !== "" ? (
        <div className="detector-exhibit-info">
          <ExhibitInfoPanel label={detectedLabel} />
        </div>
      ) : null}
      {/* <Toast
        message={"Exhibit detected.\nYour location is set."}
        show={showToast}
        duration={5000}
        onClose={handleToastClose}
      /> */}
    </div>
  )
}

export default ExhibitDetector
