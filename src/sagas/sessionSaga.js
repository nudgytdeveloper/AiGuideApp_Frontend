import Api from "@nrs/apis"
import { takeLatest, call, cancelled, put } from "redux-saga/effects"
import {
  endSession,
  endSessionSuccess,
  verifySession,
  verifySessionSuccess,
} from "@nrs/slices/sessionSlice"
import { BadRequest, NotFound } from "@nrs/constants/StatusCode"
import * as PopupType from "@nrs/constants/PopupType"
import { openPopUp, setIsLoading } from "@nrs/slices/commonSlice"
import { setConversationHistory } from "@nrs/slices/chatSlice"

function* verifySessionFunc(action) {
  try {
    let { sessionId } = action.payload
    console.log("verify..., ", sessionId)
    // ShowLoading()
    const param = {
      session: sessionId,
    }

    const result = yield call(Api.verifySession, param)
    if (result) {
      console.log("result: ", result.data)
      yield put(
        verifySessionSuccess({
          sessionId: result.id,
          status: result.data.status,
          end_reason: result.data.end_reason,
        })
      )
      yield put(
        setConversationHistory({ conversationHistory: result.data.chat_data })
      )
      yield put(setIsLoading({ isLoading: false }))
    } else {
      console.log("Error while verifying..")
      yield put(
        openPopUp({
          popupType: PopupType.Error,
          errorCode: BadRequest,
          message: "Error while fetching session verification api...",
        })
      )
      yield put(setIsLoading({ isLoading: false }))
    }
  } catch (err) {
    console.log("Error here: ", err)
    yield put(
      openPopUp({
        popupType: PopupType.Error,
        errorCode: NotFound,
        message:
          "Session is expired or not exist. Kindly get started on Hologram again.",
      })
    )
    yield put(setIsLoading({ isLoading: false }))
    // console.log(err)
    yield cancelled()
  } finally {
    yield cancelled()
    // HideLoading()
  }
}

function* endSessionFunc(action) {
  try {
    let { sessionId } = action.payload
    console.log("ending session..., ", sessionId)
    const param = {
      session: sessionId,
    }

    const result = yield call(Api.endSession, param)
    if (result) {
      console.log("end session result: ", result.data)
      yield put(
        endSessionSuccess({
          sessionId: result.id,
          status: result.data.status,
          end_reason: result.data.end_reason,
        })
      )
      yield put(
        openPopUp({
          popupType: PopupType.Error,
          errorCode: NotFound,
          message: "Your session has ended successfully.",
        })
      )
    } else {
      console.log("Error while ending..")
      yield put(
        openPopUp({
          popupType: PopupType.Error,
          errorCode: BadRequest,
          message: "Error while end session verification api...",
        })
      )
    }
  } catch (err) {
    yield put(
      openPopUp({
        popupType: PopupType.Error,
        errorCode: NotFound,
        message: `Error while ending session: ${err}`,
      })
    )
    yield cancelled()
  } finally {
    yield cancelled()
  }
}
export default function* rootSaga() {
  yield takeLatest(verifySession.type, verifySessionFunc)
  yield takeLatest(endSession.type, endSessionFunc)
}
