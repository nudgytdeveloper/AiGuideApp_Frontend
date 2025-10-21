import { useEffect, useRef } from "react"

const ConversationHistory = (props) => {
  const listRef = useRef(null),
    filteredMessage = props.messages?.filter((m) => m.get("role") !== "system")

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight // autoscroll to bottom
  }, [props.messages])

  return (
    <div className="conversation-history" ref={listRef}>
      {filteredMessage &&
        filteredMessage?.map((m, i) =>
          m.get("content") == "" ? null : (
            <div
              key={i}
              className={`bubble ${m.get("role") === "user" ? "user" : ""}`}
            >
              {m.get("content")}
            </div>
          )
        )}
    </div>
  )
}

export default ConversationHistory
