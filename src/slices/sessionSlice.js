import { createSlice } from "@reduxjs/toolkit"
import { fromJS } from "immutable"

const initialState = fromJS({
  sessionId: null,
  status: null,
  end_reason: null,
})

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    verifySession: (state) => {
      return state
    },
    verifySessionSuccess: (state, actions) => {
      return state.merge(
        fromJS({
          ...actions.payload,
        })
      )
    },
    endSession: (state) => {
      return state
    },
    endSessionSuccess: (state, actions) => {
      return state.merge(
        fromJS({
          ...actions.payload,
        })
      )
    },
  },
})

export const {
  verifySession,
  verifySessionSuccess,
  endSession,
  endSessionSuccess,
} = sessionSlice.actions

export default sessionSlice.reducer
