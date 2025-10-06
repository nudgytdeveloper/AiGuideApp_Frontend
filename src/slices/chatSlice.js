import { createSlice } from "@reduxjs/toolkit"
import { fromJS } from "immutable"

const initialState = fromJS({
  isProcessing: false,
  isListening: false,
  conversationHistory: [
    {
      role: "system",
      content:
        "You are the AI Assistant for a Singaporean company called Nudgyt. You are nice and friendly.",
    },
  ],
  lastInteractionTime: Date.now(),
})

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setIsProcessing: (state, action) => {
      return state.merge(
        fromJS({
          isProcessing: action.payload,
        })
      )
    },
    setIsListening: (state, action) => {
      return state.merge(
        fromJS({
          isListening: action.payload,
        })
      )
    },
    setConversationHistory: (state) => {
      return state
    },
    setConversationHistorySuccess: (state, action) => {
      return state.merge(
        fromJS({
          ...action.payload,
        })
      )
    },
    setLastInteractionTime: (state, action) => {
      return state.merge(
        fromJS({
          lastInteractionTime: action.payload,
        })
      )
    },
  },
})

export const {
  setIsProcessing,
  setIsListening,
  setConversationHistory,
  setConversationHistorySuccess,
  setLastInteractionTime,
} = chatSlice.actions

export default chatSlice.reducer
