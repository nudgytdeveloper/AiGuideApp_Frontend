import { BAD_WORDS } from "@nrs/constants/BadWords"
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
  if (!text) return { reply: "" }
  // If already an object (some might pass parsed JSON)
  if (typeof text === "object") {
    return {
      reply: text.reply ?? text.text ?? text.content ?? ""
    }
  }

  let s = String(text)
  s = s.replace(/^json\s*/i, "")
  s = s.replace(/```json/i, "").replace(/```/g, "")
  s = s.trim()
  // strict JSON parse first
  try {
    const obj = JSON.parse(s)
    // Normalize to ensure reply exists
    return {
      ...obj,
      reply: obj?.reply ?? obj?.text ?? obj?.content ?? ""
    }
  } catch (err) {
    console.error("LLM JSON parse error:", err, s)
    // Fallback: treat as plain text reply instead of returning null
    return { reply: s }
  }
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function buildLoosePattern(word, { maxGap = 2 } = {}) {
  const clean = escapeRegExp(word)
  // allow up to N non-letters between letters (prevents spanning across sentences)
  const gap = `[^a-zA-Z]{0,${maxGap}}`
  const core = clean.split("").join(gap)

  // boundaries: not preceded/followed by a letter
  return `(?<![a-zA-Z])${core}(?![a-zA-Z])`
}

export function censorBadWords(text = "") {
  let result = text

  BAD_WORDS.forEach((word) => {
    const pattern = buildLoosePattern(word, { maxGap: 2 })
    const regex = new RegExp(pattern, "gi")

    result = result.replace(regex, (match) => "*".repeat(match.length))
  })

  return result
}
