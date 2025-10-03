import micIcon from "@nrs/assets/img/mic.png"

const BottomPanel = () => {
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
  return <></>
  //   return (
  //     <footer className="chat-box">
  //       <input
  //         id="chatbox"
  //         name="chatbox"
  //         type="text"
  //         placeholder="Type your message..."
  //         onKeyPress={handleKeyPress}
  //         disabled={isProcessing}
  //       />
  //       <button
  //         className={`mic-btn ${isListening ? "listening" : ""} ${
  //           isProcessing ? "processing" : ""
  //         }`}
  //         onClick={startListening}
  //         disabled={isListening || isProcessing}
  //       >
  //         <img src={micIcon} alt="Mic" />
  //       </button>
  //     </footer>
  //   )
}

export default BottomPanel
