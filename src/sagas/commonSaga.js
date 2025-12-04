import { takeLatest, cancelled, put, select } from "redux-saga/effects"
import {
  closePopup,
  closePopupSuccess,
  openPopUp,
  openPopUpSuccess,
} from "@nrs/slices/commonSlice"
import { Error, Success } from "@nrs/constants/PopupType"

function* openPopupDialog({ payload }) {
  try {
    const state = yield select((state) => state.common)
    const { message, errorCode } = payload
    let popUp = state.get("popUp"),
      newPayload = {}
    if (popUp.findIndex((pu) => pu === payload.popupType) === -1) {
      popUp = popUp.push(payload.popupType)
      //Add more popup condition if necessary for upcoming modules
      newPayload.popUp = popUp
      newPayload.message = message
      if (errorCode) newPayload.errorCode = errorCode
      yield put(
        openPopUpSuccess({
          ...newPayload,
        })
      )
    }
  } catch (err) {
    console.debug(err)
    yield cancelled()
  } finally {
    yield cancelled()
  }
}

function* closePopupDialog({ payload }) {
  try {
    const commonState = yield select((state) => state.common)
    let popUp = commonState.get("popUp"),
      errorCode = commonState.get("errorCode"),
      message = commonState.get("message")

    popUp = popUp.filter((pu) => pu !== payload.popupType)

    //Add more popup logic
    switch (payload.popupType) {
      case Success:
      case Error: {
        errorCode = null
        message = null
        break
      }
    }
    yield put(
      closePopupSuccess({
        popUp,
        errorCode,
        message,
      })
    )
  } catch (err) {
    console.debug(err)
  } finally {
    yield cancelled()
  }
}

export default function* rootSaga() {
  yield takeLatest(openPopUp.type, openPopupDialog)
  yield takeLatest(closePopup.type, closePopupDialog)
}
