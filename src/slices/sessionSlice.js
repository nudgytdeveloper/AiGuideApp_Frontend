import { createSlice } from "@reduxjs/toolkit"
import { fromJS } from "immutable"

const initialState = fromJS({
  sessionId: null,
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
  },
})

export const { verifySession, verifySessionSuccess } = sessionSlice.actions

export default sessionSlice.reducer
