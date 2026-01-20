import { createSlice } from "@reduxjs/toolkit"
import { fromJS } from "immutable"
import { AIChat } from "@nrs/constants/PageType"

const initialState = fromJS({
  errorCode: null,
  message: null,
  selectedPageType: AIChat,
  popUp: [],
  isLoading: true,
  isLiveFeedEnabled: false,
  language: null
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
          selectedPageType: action.payload
        })
      )
    },
    setIsLoading: (state, action) => {
      return state.merge(
        fromJS({
          ...action.payload
        })
      )
    },
    setIsLiveFeedEnabled: (state, action) => {
      return state.merge(
        fromJS({
          isLiveFeedEnabled: action.payload
        })
      )
    },
    setLanguage: (state, action) => {
      return state.merge(
        fromJS({
          language: action.payload
        })
      )
    }
  }
})

export const {
  openPopUp,
  closePopup,
  openPopUpSuccess,
  closePopupSuccess,
  setPageType,
  setIsLoading,
  setIsLiveFeedEnabled,
  setLanguage
} = commonSlice.actions

export default commonSlice.reducer
