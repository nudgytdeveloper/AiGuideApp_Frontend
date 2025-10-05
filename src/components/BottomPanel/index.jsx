import micIcon from "@nrs/assets/img/mic.png"
import { ArrayEqual } from "@nrs/utils/common"
import { useSelector } from "react-redux"

const BottomPanel = () => {
  const [isListening, isProcessing, conversationHistory] = useSelector(
    (state) => {
      const chatState = state.chat
      return [
        chatState.get("isListening"),
        chatState.get("isProcessing"),
        chatState.get("conversationHistory"),
      ]
    },
    ArrayEqual
  )

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

  return (
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
  )
}

export default BottomPanel
