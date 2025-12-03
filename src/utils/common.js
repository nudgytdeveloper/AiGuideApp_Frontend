import { fromJS, is } from "immutable"
import { useRef } from "react"

export function ArrayEqual(left, right) {
  return is(fromJS(left), fromJS(right))
}
export const resolveLabel = (clsVal, labelMap) => {
  // snap floats like 6.999999 to 7 deterministically
  const idx = Math.floor(Number(clsVal) + 1e-6)
  if (Array.isArray(labelMap) && idx >= 0 && idx < labelMap.length) {
    return labelMap[idx]
  }
  return String(idx)
}
export function useThrottle(ms = 250) {
  const lastRef = useRef(0)
  return () => {
    const now = Date.now()
    if (now - lastRef.current >= ms) {
      lastRef.current = now
      return true
    }
    return false
  }
}
export function extractJson(text) {
  if (!text) return null

  text = text.replace(/^json\s*/i, "")
  text = text.replace(/```json/i, "").replace(/```/g, "")
  text = text.trim()

  try {
    return JSON.parse(text)
  } catch (err) {
    console.error("LLM JSON parse error:", err, text)
    return null
  }
}
