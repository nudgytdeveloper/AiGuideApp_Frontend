import { createSlice } from "@reduxjs/toolkit"
import { fromJS } from "immutable"

const initialState = fromJS({
  position: null,
})

const navigationSlice = createSlice({
  name: "detection",
  initialState,
  reducers: {
    setPosition: (state, action) => {
      return state.merge(
        fromJS({
          position: action.payload,
        })
      )
    },
  },
})

export const { setPosition } = navigationSlice.actions

export default navigationSlice.reducer
