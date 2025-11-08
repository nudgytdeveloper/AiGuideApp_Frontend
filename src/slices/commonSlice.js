import { createSlice } from "@reduxjs/toolkit"
import { fromJS } from "immutable"
import { AIChat } from "@nrs/constants/PageType"

const initialState = fromJS({
  errorCode: null,
  message: null,
  selectedPageType: AIChat,
  popUp: [],
  isLoading: true,
  exhibit: null,
})

const commonSlice = createSlice({
  name: "common",
  initialState,
  reducers: {
    openPopUp: (state) => {
      return state
    },
    openPopUpSuccess: (state, action) => {
      return state.merge(fromJS({ ...action.payload }))
    },
    closePopup: (state) => {
      return state
    },
    closePopupSuccess: (state, action) => {
      return state.merge(fromJS({ ...action.payload }))
    },
    setPageType: (state, action) => {
      return state.merge(
        fromJS({
          selectedPageType: action.payload,
        })
      )
    },
    setIsLoading: (state, action) => {
      return state.merge(
        fromJS({
          ...action.payload,
        })
      )
    },
    setExhibit: (state, action) => {
      return state.merge(
        fromJS({
          exhibit: action.payload,
        })
      )
    },
  },
})

export const {
  openPopUp,
  closePopup,
  openPopUpSuccess,
  closePopupSuccess,
  setPageType,
  setIsLoading,
  setExhibit,
} = commonSlice.actions

export default commonSlice.reducer
