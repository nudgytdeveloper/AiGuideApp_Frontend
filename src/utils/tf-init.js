// src/tf-init.js
import * as tf from "@tensorflow/tfjs"
import "@tensorflow/tfjs-backend-webgl"
import "@tensorflow/tfjs-backend-wasm"
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm"

setWasmPaths("/tfwasm/")

const isIOS = () => {
  const ua = navigator.userAgent || ""
  const isiThing = /iP(hone|ad|od)/.test(ua)
  const iPadOSDesktop =
    (navigator.platform === "MacIntel" || navigator.platform === "iPad") &&
    navigator.maxTouchPoints > 1
  return isiThing || iPadOSDesktop
}

// Try WASM with a given feature set, return true on success
async function tryWasm({ simd, threads }) {
  // Tell TFJS what it *may* use. (It will pick the matching .wasm file.)
  if (typeof simd === "boolean") tf.env().set("WASM_HAS_SIMD_SUPPORT", simd)
  if (typeof threads === "boolean")
    tf.env().set("WASM_HAS_MULTITHREAD_SUPPORT", threads)

  try {
    await tf.setBackend("wasm")
    await tf.ready()
    // probe a tiny tensor to ensure backend actually works
    tf.tidy(() => tf.ones([1]).add(tf.ones([1])))
    console.log("[tf-init] WASM ok (simd:", simd, "threads:", threads, ")")
    return true
  } catch (e) {
    console.warn(
      "[tf-init] WASM init failed for simd:",
      simd,
      "threads:",
      threads,
      "->",
      e
    )
    return false
  }
}

export const tfReady = (async () => {
  if (isIOS()) {
    console.log("SET WASM")
    // 1) Try the fastest (requires COOP/COEP + SharedArrayBuffer)
    if (await tryWasm({ simd: true, threads: true })) return tf.getBackend()

    // 2) Try SIMD only (no threads)
    if (await tryWasm({ simd: true, threads: false })) return tf.getBackend()

    // 3) Try base wasm (no SIMD, no threads) — works without special headers
    if (await tryWasm({ simd: false, threads: false })) return tf.getBackend()

    // 4) If all WASM variants fail, fall back to WebGL (your iPhone previously ran it)
    try {
      await tf.setBackend("webgl")
      await tf.ready()
      console.log("[tf-init] fallback to webgl")
      return tf.getBackend()
    } catch (e) {
      await tf.setBackend("cpu")
      await tf.ready()
      console.log("[tf-init] fallback to cpu")
      return tf.getBackend()
    }
  } else {
    // Non-iOS: keep your original preference (WebGL)
    try {
      await tf.setBackend("webgl")
      await tf.ready()
      return tf.getBackend()
    } catch {
      // safe fallback chain
      try {
        await tf.setBackend("wasm")
        await tf.ready()
        return tf.getBackend()
      } catch {
        await tf.setBackend("cpu")
        await tf.ready()
        return tf.getBackend()
      }
    }
  }
})()
