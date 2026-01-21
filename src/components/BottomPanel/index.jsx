import micIcon from "@nrs/assets/img/mic.png"
import ConversationHistory from "@nrs/components/BottomPanel/ConversationHistory"
import { AIChat, Navigation } from "@nrs/constants/PageType"
import { Assistant, System, User } from "@nrs/constants/RoleType"
import {
  addConversationHistory,
  setConversationHistory,
  setIsListening,
  setIsProcessing,
  setLastInteractionTime
} from "@nrs/slices/chatSlice"
import { setPageType } from "@nrs/slices/commonSlice"
import { setDestination } from "@nrs/slices/navigationSlice"
import { ArrayEqual, censorBadWords, extractJson } from "@nrs/utils/common"
import { useEffect, useRef, useState } from "react"
import { useDispatch } from "react-redux"
import { useSelector } from "react-redux"

const BottomPanel = () => {
  const [
      isListening,
      isProcessing,
      conversationHistory,
      lastInteractionTime,
      selectedPageType,
      selectedLang
    ] = useSelector((state) => {
      const chatState = state.chat,
        commonState = state.common
      return [
        chatState.get("isListening"),
        chatState.get("isProcessing"),
        chatState.get("conversationHistory"),
        chatState.get("lastInteractionTime"),
        commonState.get("selectedPageType"),
        commonState.get("language")
      ]
    }, ArrayEqual),
    dispatch = useDispatch(),
    recognitionRef = useRef(null),
    [inputValue, setInputValue] = useState("")

  // Start listening - triggered by mic button
  const startListening = () => {
    if (recognitionRef.current && !isListening && !isProcessing) {
      recognitionRef.current.start()
    } else if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      dispatch(setIsListening(false))
    }
  }

  const handleTextSubmit = () => {
    const input = document.getElementById("chatbox")
    const text = input.value.trim()
    if (text) {
      addToConversationHistory("user", text)
      input.value = ""
      setInputValue("")
    }
  }

  // Handle Enter key in text input
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleTextSubmit()
    }
  }
  const handleNavigateClick = (nav) => {
    if (!nav) return
    if (nav.confidence < 0.8) return

    console.log("navigate to map and start navigation directly...")
    dispatch(setPageType(Navigation))

    console.log("target name: ", nav.get("targetDisplayName"))
    dispatch(setDestination(nav.get("targetDisplayName")))
  }

  // Initialize Speech Recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = selectedLang ? selectedLang.get("code") : "en-US"

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
  }, [selectedLang])

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
        timestamp: currentTime
      })
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
            timestamp: Date.now()
          }
        ]
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
          content: msg.get("content")
        }))
        .toJS()
      messages.push({ role: User, content: userMessage })
      const prefix = import.meta.env.VITE_API_PREFIX

      const response = await fetch(`${prefix}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, lang: selectedLang?.get("code") })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: x${response.status}`)
      }

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
          timestamp: Date.now()
        })
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
          timestamp: Date.now()
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
            "xi-api-key": ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2", //eleven_flash_v2_5 // eleven_multilingual_v2
            voice_settings: {
              stability: 0.8,
              similarity_boost: 0.6,
              style: 0.2,
              use_speaker_boost: false
            }
          })
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
            isProcessing ? "processing" : ""
          } ${isListening || isProcessing ? "running" : ""}`}
          onClick={startListening}
          disabled={isProcessing}
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
