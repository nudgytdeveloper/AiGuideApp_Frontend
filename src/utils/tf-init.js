// tf-init.js (or .ts)
// Ensure this file runs BEFORE any code that imports cvstfjs or calls tf.ready()

import * as tf from "@tensorflow/tfjs"
import "@tensorflow/tfjs-backend-wasm"
import "@tensorflow/tfjs-backend-webgl"
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm"

setWasmPaths("/tfwasm/")

// Robust iOS/iPadOS detection (iPad desktop mode too)
const isIOS = () => {
  const ua = navigator.userAgent || ""
  const isiThing = /iP(hone|ad|od)/.test(ua)
  const iPadOSDesktop =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
  return isiThing || iPadOSDesktop
}

// Export a single promise you can await elsewhere
export const tfReady = (async () => {
  // IMPORTANT: set backend BEFORE calling tf.ready()
  if (isIOS()) {
    console.debug("SET WASM")
    await tf.setBackend("wasm")
  } else {
    console.debug("SET WEBGL")
    await tf.setBackend("webgl")
  }
  await tf.ready()
  // Optional: verify what's actually active
  console.log("[tf-init] backend:", tf.getBackend())
  return tf.getBackend()
})()
