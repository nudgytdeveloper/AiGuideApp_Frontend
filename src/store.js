import { configureStore } from "@reduxjs/toolkit"
import sessionReducer from "@nrs/slices/sessionSlice"

export const store = configureStore({
  reducer: {
    session: sessionReducer,
  },
})
