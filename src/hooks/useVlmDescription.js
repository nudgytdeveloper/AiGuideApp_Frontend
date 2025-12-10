import { useState, useRef, useCallback, useEffect } from "react"

export function useVlmDescription(options) {
  const {
    threshold,
    dispatchThreshold,
    autoHideMs = 10000,
    minIntervalMs = 5000,
    maxCacheAgeMs = 15000,
    cameraMoveThresholdPx = 40,
  } = options

  const [aiThinking, setAiThinking] = useState(false)
  const [aiThinkingMessage, setAiThinkingMessage] = useState("AI is thinking…")
  const [vlmDescription, setVlmDescription] = useState("")

  // Exposed so detector loop can gate work without re-renders
  const aiThinkingRef = useRef(false)

  const aiThinkingTimerRef = useRef(null)
  const vlmHideTimerRef = useRef(null)

  const vlmStateRef = useRef({
    lastCallTs: 0,
    inFlight: false,
    lastResult: null, // { description }
    lastBoxCenter: null, // { x, y } | null
  })

  const setAIStopThinking = useCallback(() => {
    setAiThinking(false)
    aiThinkingRef.current = false
    if (aiThinkingTimerRef.current) {
      clearTimeout(aiThinkingTimerRef.current)
      aiThinkingTimerRef.current = null
    }
    setAiThinkingMessage("AI is thinking…")
  }, [])

  const cameraMovedSignificantly = useCallback(
    (lastCenter, newCenter) => {
      if (!lastCenter || !newCenter) return true
      const dx = newCenter.x - lastCenter.x
      const dy = newCenter.y - lastCenter.y
      return dx * dx + dy * dy > cameraMoveThresholdPx * cameraMoveThresholdPx
    },
    [cameraMoveThresholdPx]
  )

  const callVlmApi = useCallback(async (blob) => {
    const formData = new FormData()
    formData.append("image", blob, "frame.jpg")

    const prefix = import.meta.env.VITE_API_PREFIX
    const res = await fetch(`${prefix}/api/analyze-frame`, {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      throw new Error(`VLM Error HTTP ${res.status}`)
    }

    const data = await res.json()
    return data.result
  }, [])

  const runVlmInternal = useCallback(
    async ({ captureFrameAsBlob, boxCenter, isAuto }) => {
      const state = vlmStateRef.current
      const now = performance.now()

      // Auto gray-zone mode: respect throttle + caching
      if (isAuto) {
        if (
          state.lastResult &&
          now - state.lastCallTs < maxCacheAgeMs &&
          !cameraMovedSignificantly(state.lastBoxCenter, boxCenter)
        ) {
          return state.lastResult
        }

        if (state.inFlight) return null
        if (now - state.lastCallTs < minIntervalMs) return null
      } else {
        // Manual: still avoid double-firing
        if (state.inFlight) return null
      }

      state.inFlight = true
      state.lastCallTs = now
      state.lastBoxCenter = boxCenter

      setAiThinking(true)
      aiThinkingRef.current = true
      setAiThinkingMessage("AI is thinking…")

      if (aiThinkingTimerRef.current) {
        clearTimeout(aiThinkingTimerRef.current)
        aiThinkingTimerRef.current = null
      }
      aiThinkingTimerRef.current = setTimeout(() => {
        setAiThinkingMessage("Analyzing the exhibit…")
      }, 3000)

      try {
        const blob = await captureFrameAsBlob()
        const rawText = await callVlmApi(blob)
        let description = typeof rawText === "string" ? rawText : ""
        description = description.replace(/\*\*(.*?)\*\*/g, "$1")

        const result = { description }
        state.lastResult = result

        if (description) {
          setVlmDescription(description)

          if (vlmHideTimerRef.current) {
            clearTimeout(vlmHideTimerRef.current)
          }
          vlmHideTimerRef.current = setTimeout(() => {
            setVlmDescription("")
            vlmHideTimerRef.current = null
          }, autoHideMs)
        }

        return result
      } catch (e) {
        console.error("VLM error:", e)
        return null
      } finally {
        state.inFlight = false
        setAIStopThinking()
      }
    },
    [
      autoHideMs,
      maxCacheAgeMs,
      minIntervalMs,
      cameraMoveThresholdPx,
      cameraMovedSignificantly,
      callVlmApi,
      setAIStopThinking,
    ]
  )

  // Auto gray-zone VLM: threshold <= prob < dispatchThreshold
  const describeAuto = useCallback(
    async ({ prob, boxCenter, captureFrameAsBlob }) => {
      if (prob < threshold || prob >= dispatchThreshold) {
        return null
      }
      return runVlmInternal({
        captureFrameAsBlob,
        boxCenter,
        isAuto: true,
      })
    },
    [threshold, dispatchThreshold, runVlmInternal]
  )

  // Manual “Ask AI”
  const describeManual = useCallback(
    async ({ captureFrameAsBlob }) => {
      // Let UI render the pill before heavy work
      await new Promise((resolve) => {
        requestAnimationFrame(() => resolve(null))
      })

      return runVlmInternal({
        captureFrameAsBlob,
        boxCenter: null,
        isAuto: false,
      })
    },
    [runVlmInternal]
  )

  useEffect(() => {
    return () => {
      if (aiThinkingTimerRef.current) clearTimeout(aiThinkingTimerRef.current)
      if (vlmHideTimerRef.current) clearTimeout(vlmHideTimerRef.current)
    }
  }, [])

  return {
    aiThinking,
    aiThinkingMessage,
    vlmDescription,
    setVlmDescription,
    describeAuto,
    describeManual,
    setAIStopThinking,
    aiThinkingRef,
  }
}
