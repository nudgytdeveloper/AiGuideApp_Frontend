import { createSlice } from "@reduxjs/toolkit"
import { fromJS } from "immutable"

const initialState = fromJS({
  position: null,
  destination: null,
})

const navigationSlice = createSlice({
  name: "navigation",
  initialState,
  reducers: {
    setPosition: (state, action) => {
      return state.merge(
        fromJS({
          position: action.payload,
        })
      )
    },
    setDestination: (state, action) => {
      return state.merge(
        fromJS({
          destination: action.payload,
        })
      )
    },
  },
})

export const { setPosition, setDestination } = navigationSlice.actions

export default navigationSlice.reducer
