import micIcon from "@nrs/assets/img/mic.png"
import ConversationHistory from "@nrs/components/BottomPanel/ConversationHistory"
import { AIChat, Navigation } from "@nrs/constants/PageType"
import { Assistant, System, User } from "@nrs/constants/RoleType"
import {
  addConversationHistory,
  setConversationHistory,
  setIsListening,
  setIsProcessing,
  setLastInteractionTime,
} from "@nrs/slices/chatSlice"
import { setPageType } from "@nrs/slices/commonSlice"
import { setDestination } from "@nrs/slices/navigationSlice"
import { ArrayEqual, censorBadWords, extractJson } from "@nrs/utils/common"
import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

const BottomPanel = () => {
  const [
      isListening,
      isProcessing,
      conversationHistory,
      lastInteractionTime,
      selectedPageType,
    ] = useSelector((state) => {
      const chatState = state.chat
      return [
        chatState.get("isListening"),
        chatState.get("isProcessing"),
        chatState.get("conversationHistory"),
        chatState.get("lastInteractionTime"),
        state.common.get("selectedPageType"),
      ]
    }, ArrayEqual),
    dispatch = useDispatch(),
    [inputValue, setInputValue] = useState("")

  // =========================
  // Whisper STT via Render
  // =========================
  const sttUrl =
    import.meta.env.VITE_STT_URL ||
    "https://stt-multilang.onrender.com/transcribe"

  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const chunksRef = useRef([])
  const stopTimerRef = useRef(null)
  const [isSttBusy, setIsSttBusy] = useState(false)

  // VAD (voice activity detection) refs
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const vadRafRef = useRef(null)

  const speechStartedRef = useRef(false)
  const lastVoiceAtRef = useRef(0)
  const startedAtRef = useRef(0)

  const VAD = {
    // How sensitive speech detection is
    threshold: 0.02, // 0.01–0.03 typical; lower = more sensitive
    minSpeechMs: 250, // require at least this before allowing stop
    silenceStopMs: 800, // stop after this much silence *after speech started*
    hardMaxMs: 12000, // absolute max recording time (safety)
    warmupMs: 250, // ignore first bit (mic clicks)
  }

  const startVadLoop = () => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = audioCtx

    const source = audioCtx.createMediaStreamSource(mediaStreamRef.current)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.85
    analyserRef.current = analyser

    source.connect(analyser)

    const buf = new Uint8Array(analyser.fftSize)

    speechStartedRef.current = false
    lastVoiceAtRef.current = 0
    startedAtRef.current = Date.now()

    const tick = () => {
      const now = Date.now()
      const elapsed = now - startedAtRef.current

      // hard cap safety
      if (elapsed > VAD.hardMaxMs) {
        stopWhisperRecording()
        return
      }

      // get time-domain samples
      analyser.getByteTimeDomainData(buf)

      // RMS energy 0..~1
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / buf.length)

      // Ignore the first warmup window to avoid false triggers
      if (elapsed > VAD.warmupMs) {
        const isVoice = rms > VAD.threshold

        if (isVoice) {
          if (!speechStartedRef.current) speechStartedRef.current = true
          lastVoiceAtRef.current = now
        } else if (speechStartedRef.current) {
          // only stop after we heard some speech (minSpeechMs)
          const spokenFor = now - startedAtRef.current
          const silentFor = now - (lastVoiceAtRef.current || now)

          if (spokenFor >= VAD.minSpeechMs && silentFor >= VAD.silenceStopMs) {
            stopWhisperRecording()
            return
          }
        }
      }

      vadRafRef.current = requestAnimationFrame(tick)
    }

    vadRafRef.current = requestAnimationFrame(tick)
  }

  const startWhisperRecording = async () => {
    if (isProcessing || isSttBusy || isListening) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
            ? "audio/ogg;codecs=opus"
            : ""

      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = rec
      chunksRef.current = []

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      rec.onstart = () => {
        dispatch(setIsListening(true))
      }

      rec.onstop = async () => {
        dispatch(setIsListening(false))

        // stop mic tracks
        mediaStreamRef.current?.getTracks()?.forEach((t) => t.stop())
        mediaStreamRef.current = null

        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        })

        // If user tapped stop quickly, blob can be too small
        if (!blob || blob.size < 8000) {
          chunksRef.current = []
          return
        }

        setIsSttBusy(true)
        try {
          const fd = new FormData()
          fd.append(
            "file",
            blob,
            blob.type.includes("ogg") ? "audio.ogg" : "audio.webm",
          )

          const res = await fetch(sttUrl, {
            method: "POST",
            body: fd,
          })

          if (!res.ok) {
            const txt = await res.text().catch(() => "")
            throw new Error(`STT error ${res.status}: ${txt || res.statusText}`)
          }

          const data = await res.json()
          const transcript = (data?.text || "").trim()

          if (transcript) {
            addToConversationHistory(User, transcript)
          } else {
            // No speech detected; ignore silently or show message if you want
            console.warn("STT: no speech detected")
          }
        } catch (err) {
          console.error("STT failed:", err)
        } finally {
          setIsSttBusy(false)
          chunksRef.current = []
          mediaRecorderRef.current = null
        }
      }

      rec.start()
      startVadLoop()
    } catch (err) {
      console.error("Mic permission / start recording error:", err)
      dispatch(setIsListening(false))
      mediaStreamRef.current?.getTracks()?.forEach((t) => t.stop())
      mediaStreamRef.current = null
      mediaRecorderRef.current = null
      chunksRef.current = []
    }
  }

  const stopWhisperRecording = () => {
    clearTimeout(stopTimerRef.current) // ok to keep even if unused
    // stop VAD loop
    if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current)
    vadRafRef.current = null
    // close audio context
    try {
      analyserRef.current = null
      audioCtxRef.current?.close?.()
    } catch {}
    audioCtxRef.current = null

    const rec = mediaRecorderRef.current
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop()
      } catch {}
    } else {
      dispatch(setIsListening(false))
    }
  }

  // Mic button handler (toggle)
  const startListening = () => {
    if (isListening) {
      stopWhisperRecording()
    } else {
      startWhisperRecording()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(stopTimerRef.current)
      try {
        mediaRecorderRef.current?.stop?.()
      } catch {}
      mediaStreamRef.current?.getTracks()?.forEach((t) => t.stop())
      if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current)
      try {
        audioCtxRef.current?.close?.()
      } catch {}
    }
  }, [])

  // -------------------------
  // Existing text input flow
  // -------------------------
  const handleTextSubmit = () => {
    const input = document.getElementById("chatbox")
    const text = input.value.trim()
    if (text) {
      addToConversationHistory(User, text)
      input.value = ""
      setInputValue("")
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleTextSubmit()
    }
  }

  const handleNavigateClick = (nav) => {
    if (!nav) return
    if (nav.confidence < 0.8) return

    dispatch(setPageType(Navigation))
    dispatch(setDestination(nav.get("targetDisplayName")))
  }

  // Add message to conversation history
  const addToConversationHistory = (role, content) => {
    const currentTime = Date.now()
    // Check if conversation has timed out
    if (currentTime - lastInteractionTime > window.global.conversationTimeout) {
      resetConversationHistory()
    }
    dispatch(setLastInteractionTime(currentTime))
    dispatch(
      addConversationHistory({
        role: role,
        content: censorBadWords(content),
        timestamp: currentTime,
      }),
    )

    if (role === User) {
      processWithLLM(content)
    }
  }

  // Reset conversation history
  const resetConversationHistory = () => {
    dispatch(
      setConversationHistory({
        conversationHistory: [
          {
            role: System,
            content: `You are Laura, a highly experienced and detailed tour guide for the Singapore Science Center. You are warm, friendly and helpful with guests at the Science Center. Your goal is to answer guests' questions about the Science Center and its exhibits to the best of your ability. You are always concise and give short, simple responses to questions.

CONVERSATION MANAGEMENT HEURISTICS:
1. Always ask questions to learn more about the user.
2. Always pause after saying something to give the user time to respond.
3. Only ask one question at a time.
4. Always clarify your understanding with the user before making a recommendation.
5. Be engaging, knowledgeable, and maintain a professional yet friendly tone.
6. Provide specific recommendations to Science Center exhibits based on guests' recommendations. 
7. Acknowledge user emotions and respond with empathy

ENGAGEMENT STRATEGIES:
- Use curiosity-driven questions
- Share relevant insights or perspectives
- Offer to explore topics more deeply
- Connect current discussion with events and exhibits from the Science Center website.
- Invite the user to share their thoughts or experiences in the Science Center.`,
            timestamp: Date.now(),
          },
        ],
      }),
    )
  }

  // Process with LLM
  const processWithLLM = async (userMessage) => {
    if (isProcessing) return

    dispatch(setIsProcessing(true))

    try {
      const messages = conversationHistory
        .map((msg) => ({
          role: msg.get("role"),
          content: msg.get("content"),
        }))
        .toJS()
      messages.push({ role: User, content: userMessage })
      const prefix = import.meta.env.VITE_API_PREFIX

      const response = await fetch(`${prefix}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      })

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`)

      const data = await response.json()
      const raw =
        data?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || "")
          .join("") || "(no response from model)" // Openai format: data.choices[0].message.content
      const payload = extractJson(raw)
      const aiResponse = payload.reply

      dispatch(
        addConversationHistory({
          role: Assistant,
          content: aiResponse,
          nav: payload.nav ?? null,
          timestamp: Date.now(),
        }),
      )

      speakResponseWithElevenLabs(aiResponse)
    } catch (error) {
      console.error("Error calling LLM:", error)

      const fallbackResponse =
        "I'm sorry, I'm having trouble connecting to my AI service right now. Can you try again?"
      dispatch(
        addConversationHistory({
          role: Assistant,
          content: fallbackResponse,
          timestamp: Date.now(),
        }),
      )
      speakResponseWithElevenLabs(fallbackResponse)
    } finally {
      dispatch(setIsProcessing(false))
    }
  }

  // Text to speech with ElevenLabs
  const speakResponseWithElevenLabs = async (text) => {
    try {
      const ELEVENLABS_API_KEY =
        "81c412f72d891a703d429dfffca68f139fa678a58ea7a4f48bc522193006f8c1"
      const VOICE_ID = "ljEOxtzNoGEa58anWyea"

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2", //eleven_flash_v2_5 // eleven_multilingual_v2
            voice_settings: {
              stability: 0.8,
              similarity_boost: 0.6,
              style: 0.2,
              use_speaker_boost: false,
            },
          }),
        },
      )

      if (!response.ok)
        throw new Error(`ElevenLabs API error: ${response.status}`)

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audio.play()
      audio.onended = () => URL.revokeObjectURL(audioUrl)
    } catch (error) {
      console.error("Error with ElevenLabs TTS:", error)
      speakResponseFallback(text)
    }
  }

  const speakResponseFallback = (text) => {
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8
    utterance.lang = "en-US"

    const voices = window.speechSynthesis.getVoices()
    const englishVoices = voices.filter(
      (voice) => voice.lang.startsWith("en-") || voice.lang === "en",
    )
    const preferredVoice = englishVoices.find(
      (voice) =>
        voice.name.includes("Samantha") ||
        voice.name.includes("Karen") ||
        voice.name.toLowerCase().includes("female"),
    )

    utterance.voice = preferredVoice || englishVoices[0] || null
    window.speechSynthesis.speak(utterance)
  }

  const micDisabled = isProcessing || isSttBusy

  return (
    <>
      {selectedPageType == AIChat ? (
        <ConversationHistory
          messages={conversationHistory}
          onNavigate={handleNavigateClick}
        />
      ) : null}

      <footer className="chat-box">
        <div className="input-wrapper">
          <input
            id="chatbox"
            name="chatbox"
            type="text"
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isProcessing}
          />
          {inputValue.trim().length > 0 && (
            <button
              className="send-btn"
              onClick={handleTextSubmit}
              disabled={isProcessing}
            >
              ▶
            </button>
          )}
        </div>

        <button
          className={`mic-btn ${isListening ? "listening" : ""} ${
            micDisabled ? "processing" : ""
          } ${isListening || micDisabled ? "running" : ""}`}
          onClick={startListening}
          disabled={micDisabled}
          title={isListening ? "Stop" : "Speak"}
        >
          {isListening ? (
            <span className="stop-icon" />
          ) : (
            <img src={micIcon} alt="Mic" />
          )}
        </button>
      </footer>
    </>
  )
}

export default BottomPanel
