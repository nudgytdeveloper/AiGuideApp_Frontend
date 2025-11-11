import micIcon from "@nrs/assets/img/mic.png"
import ConversationHistory from "@nrs/components/BottomPanel/ConversationHistory"
import { AIChat } from "@nrs/constants/PageType"
import {
  addConversationHistory,
  setIsListening,
  setIsProcessing,
  setLastInteractionTime,
} from "@nrs/slices/chatSlice"
import { ArrayEqual } from "@nrs/utils/common"
import { useEffect, useRef } from "react"
import { useDispatch } from "react-redux"
import { useSelector } from "react-redux"

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
    recognitionRef = useRef(null)

  // Start listening - triggered by mic button
  const startListening = () => {
    if (recognitionRef.current && !isListening && !isProcessing) {
      recognitionRef.current.start()
    }
  }

  const handleTextSubmit = () => {
    const input = document.getElementById("chatbox")
    const text = input.value.trim()
    if (text) {
      addToConversationHistory("user", text)
      input.value = ""
    }
  }

  // Handle Enter key in text input
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleTextSubmit()
    }
  }

  // Initialize Speech Recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = "en-US"

      recognition.onstart = () => {
        dispatch(setIsListening(true))
      }

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        addToConversationHistory("user", transcript)
      }

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error)
        dispatch(setIsListening(false))
      }

      recognition.onend = () => {
        dispatch(setIsListening(false))
      }

      recognitionRef.current = recognition
    } else {
      console.warn("Speech recognition not supported in this browser")
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

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
        content: content,
        timestamp: currentTime,
      })
    )

    if (role === "user") {
      processWithLLM(content)
    }
  }

  // Reset conversation history
  const resetConversationHistory = () => {
    dispatch(
      setConversationHistory({
        conversationHistory: [
          {
            role: "system",
            content: window.global.aiChatContent,
            timestamp: Date.now(),
          },
        ],
      })
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
      messages.push({ role: "user", content: userMessage })
      const prefix = import.meta.env.VITE_API_PREFIX

      const response = await fetch(`${prefix}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const aiResponse = data.choices[0].message.content

      dispatch(
        addConversationHistory({
          role: "assistant",
          content: aiResponse,
          timestamp: Date.now(),
        })
      )

      speakResponseWithElevenLabs(aiResponse)
    } catch (error) {
      console.error("Error calling LLM:", error)

      const fallbackResponse =
        "I'm sorry, I'm having trouble connecting to my AI service right now. Can you try again?"
      dispatch(
        addConversationHistory({
          role: "assistant",
          content: fallbackResponse,
          timestamp: Date.now(),
        })
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
            text: text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`)
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      audio.play()

      // Clean up the URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
      }
    } catch (error) {
      console.error("Error with ElevenLabs TTS:", error)
      // Fallback to browser TTS if ElevenLabs fails
      speakResponseFallback(text)
    }
  }

  // Fallback text to speech using browser's built-in TTS
  const speakResponseFallback = (text) => {
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8
    utterance.lang = "en-US"

    const voices = window.speechSynthesis.getVoices()
    const englishVoices = voices.filter(
      (voice) => voice.lang.startsWith("en-") || voice.lang === "en"
    )

    const preferredVoice = englishVoices.find(
      (voice) =>
        voice.name.includes("Samantha") ||
        voice.name.includes("Karen") ||
        voice.name.toLowerCase().includes("female")
    )

    if (preferredVoice || englishVoices[0]) {
      utterance.voice = preferredVoice || englishVoices[0]
    }

    window.speechSynthesis.speak(utterance)
  }

  return (
    <>
      {selectedPageType == AIChat ? (
        <ConversationHistory messages={conversationHistory} />
      ) : null}
      <footer className="chat-box">
        <input
          id="chatbox"
          name="chatbox"
          type="text"
          placeholder="Type your message..."
          onKeyPress={handleKeyPress}
          disabled={isProcessing}
        />
        <button
          className={`mic-btn ${isListening ? "listening" : ""} ${
            isProcessing ? "processing" : ""
          }`}
          onClick={startListening}
          disabled={isListening || isProcessing}
        >
          <img src={micIcon} alt="Mic" />
        </button>
      </footer>
    </>
  )
}

export default BottomPanel
