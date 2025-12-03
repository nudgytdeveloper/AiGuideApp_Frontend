import { Assistant, System, User } from "@nrs/constants/RoleType"
import { useEffect, useRef } from "react"

const NAV_CONFIDENCE_THRESHOLD = 0.8

const ConversationHistory = (props) => {
  const listRef = useRef(null)

  const filteredMessage = props.messages?.filter(
    (m) => m.get("role") !== System
  )

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight // autoscroll to bottom
  }, [props.messages])

  return (
    <div className="conversation-history" ref={listRef}>
      {filteredMessage &&
        filteredMessage.map((m, i) => {
          const role = m.get("role")
          const content = m.get("content")
          if (!content) return null

          const isAssistant = role === Assistant
          const nav = m.get("nav")
          const showNavBtn =
            isAssistant &&
            nav &&
            nav.get("intent") === "navigate" &&
            nav.get("confidence") >= NAV_CONFIDENCE_THRESHOLD
          return (
            <div
              key={i}
              className={`bubble-row ${
                role === User ? "user-row" : "assistant-row"
              }`}
            >
              <div className={`bubble ${role === User ? User : ""}`}>
                {content}
              </div>

              {showNavBtn && (
                <button
                  className="bubble-nav-btn"
                  onClick={() => props.onNavigate && props.onNavigate(nav)}
                >
                  Navigate
                </button>
              )}
            </div>
          )
        })}
    </div>
  )
}

export default ConversationHistory
