import { createSlice } from "@reduxjs/toolkit"
import { fromJS } from "immutable"

const initialState = fromJS({
  exhibit: null,
})

const detectionSlice = createSlice({
  name: "detection",
  initialState,
  reducers: {
    setExhibit: (state, action) => {
      return state.merge(
        fromJS({
          exhibit: action.payload,
        })
      )
    },
  },
})

export const { setExhibit } = detectionSlice.actions

export default detectionSlice.reducer
