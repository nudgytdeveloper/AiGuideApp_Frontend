import * as tf from "@tensorflow/tfjs"

export async function initTF(backend = "webgl") {
  await tf.setBackend(backend)
  await tf.ready()
}

export class CVJSDetector {
  constructor(baseUrl = "/models/sc_exhibit", cfg = {}) {
    this.baseUrl = baseUrl
    this.inputSize = cfg.inputSize || 320 // check your export README (often 320 or 416)
    this.confThresh = cfg.confThresh || 0.4
    this.iouThresh = cfg.iouThresh || 0.45 // not used if model already did NMS
    this.labels = []
    this.model = null
    this._printedOnce = false
  }

  async load() {
    this.model = await tf.loadGraphModel(`${this.baseUrl}/model.json`)
    try {
      const txt = await fetch(`${this.baseUrl}/labels.txt`).then((r) =>
        r.text()
      )
      this.labels = txt.split(/\r?\n/).filter(Boolean)
    } catch {
      // labels.txt optional
    }
  }

  /**
   * Detect objects on an HTMLVideoElement / HTMLImageElement / HTMLCanvasElement.
   * Pass the *display* size you draw at: { dispW, dispH } to keep boxes aligned.
   */
  async detect(src, { dispW, dispH } = {}) {
    const sW = dispW ?? (src.videoWidth || src.width)
    const sH = dispH ?? (src.videoHeight || src.height)

    // --- letterbox to square input size (match Custom Vision export) ---
    const scale = Math.min(this.inputSize / sW, this.inputSize / sH)
    const newW = Math.round(sW * scale)
    const newH = Math.round(sH * scale)
    const padX = (this.inputSize - newW) / 2
    const padY = (this.inputSize - newH) / 2

    const input = tf.tidy(() => {
      const img = tf.browser.fromPixels(src)
      const resized = tf.image.resizeBilinear(img, [newH, newW])
      const padded = tf.pad(resized, [
        [padY, this.inputSize - newH - padY],
        [padX, this.inputSize - newW - padX],
        [0, 0],
      ])
      // NHWC, 0..1, with batch dim
      return padded.expandDims(0).toFloat().div(255)
    })

    // --- run model (prefer async for NMS ops) ---
    let outs
    try {
      const names = this.model.outputNodes || undefined // may be undefined
      outs = await this.model.executeAsync(input, names)
    } catch {
      // fallback if no async ops
      outs = this.model.execute(input)
    }

    // Normalize outputs to array of tensors
    const tensors = Array.isArray(outs)
      ? outs
      : outs instanceof tf.Tensor
      ? [outs]
      : Object.values(outs)

    // One-time debug to see shapes/names (helpful if mapping fails)
    if (!this._printedOnce) {
      try {
        const names = this.model.outputNodes || []
        console.table(
          tensors.map((t, i) => ({
            i,
            name: names[i] || `(idx ${i})`,
            shape: JSON.stringify(t.shape),
          }))
        )
      } catch {}
      this._printedOnce = true
    }

    // Try name-based selection first
    const names = this.model.outputNodes || []
    const findByName = (subs) => {
      const idx = names.findIndex((n) =>
        subs.some((s) => (n || "").toLowerCase().includes(s))
      )
      return idx >= 0 ? tensors[idx] : undefined
    }
    let boxesT = findByName(["box", "boxes"])
    let scoresT = findByName(["score", "scores"])
    let clsT = findByName(["class", "classes", "labels", "label"])

    // Fallback: shape heuristics
    const maybeBoxes = (t) =>
      (t.shape.length === 3 && t.shape[2] === 4) ||
      (t.shape.length === 2 && t.shape[1] === 4)
    const maybeScores = (t) =>
      t.shape.length === 2 && (t.shape[0] === 1 || t.shape[1] === 1)
    const maybeClasses = (t) =>
      t.shape.length === 2 && (t.shape[0] === 1 || t.shape[1] === 1)

    if (!boxesT) boxesT = tensors.find(maybeBoxes)
    if (!scoresT)
      scoresT = tensors.filter((t) => t !== boxesT).find(maybeScores)
    if (!clsT)
      clsT = tensors
        .filter((t) => t !== boxesT && t !== scoresT)
        .find(maybeClasses)

    if (!boxesT || !scoresT || !clsT) {
      tf.dispose([input, outs, ...tensors])
      throw new Error(
        "Detector: failed to map outputs (boxes/scores/classes). Check console.table for shapes."
      )
    }

    const [boxesArrRaw, scoresArrRaw, classesArrRaw] = await Promise.all([
      boxesT.array(),
      scoresT.array(),
      clsT.array(),
    ])

    tf.dispose([input, outs, ...tensors])

    // Flatten possible batch dimension
    const boxesArr = Array.isArray(boxesArrRaw[0][0])
      ? boxesArrRaw[0]
      : boxesArrRaw // [N,4]
    const scoresArr = Array.isArray(scoresArrRaw[0])
      ? scoresArrRaw[0]
      : scoresArrRaw // [N]
    const classesArr = Array.isArray(classesArrRaw[0])
      ? classesArrRaw[0]
      : classesArrRaw // [N]

    // --- map boxes back to display coordinates (undo letterbox + scale) ---
    const dets = []
    const N = Math.min(boxesArr.length, scoresArr.length, classesArr.length)
    for (let i = 0; i < N; i++) {
      const score = scoresArr[i]
      if (score < this.confThresh) continue

      // Custom Vision exports usually give [ymin, xmin, ymax, xmax] normalized 0..1 of the model input
      const [ymin, xmin, ymax, xmax] = boxesArr[i]

      const x1 = (xmin * this.inputSize - padX) / scale
      const y1 = (ymin * this.inputSize - padY) / scale
      const x2 = (xmax * this.inputSize - padX) / scale
      const y2 = (ymax * this.inputSize - padY) / scale

      const w = Math.max(0, x2 - x1)
      const h = Math.max(0, y2 - y1)
      if (w < 2 || h < 2) continue

      const clsIdx = Math.round(classesArr[i])
      dets.push({
        x: Math.max(0, x1),
        y: Math.max(0, y1),
        w,
        h,
        score,
        label: this.labels[clsIdx] ?? `cls_${clsIdx}`,
      })
    }

    return dets
  }

  draw(canvas, dets, { offsetX = 0, offsetY = 0 } = {}) {
    const ctx = canvas.getContext("2d")
    ctx.lineWidth = 2
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif"

    dets.forEach((d) => {
      const x = d.x + offsetX
      const y = d.y + offsetY
      ctx.strokeStyle = "#00FF00"
      ctx.strokeRect(x, y, d.w, d.h)

      const text = `${d.label} ${Math.round(d.score * 100)}%`
      const tw = ctx.measureText(text).width + 8
      ctx.fillStyle = "rgba(0,0,0,0.55)"
      ctx.fillRect(x, Math.max(0, y - 18), tw, 18)
      ctx.fillStyle = "#fff"
      ctx.fillText(text, x + 4, Math.max(12, y - 4))
    })
  }
}

export default CVJSDetector
