import Api from "@nrs/apis"
import { takeLatest, call, cancelled, put } from "redux-saga/effects"
import { verifySession, verifySessionSuccess } from "@nrs/slices/sessionSlice"
import { BadRequest, NotFound } from "@nrs/constants/StatusCode"
import * as PopupType from "@nrs/constants/PopupType"
import { openPopUp, setIsLoading } from "@nrs/slices/commonSlice"

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
      console.log("verify result: ", result)
      yield put(verifySessionSuccess({ result }))
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
    console.log("Error here")
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
export default function* rootSaga() {
  yield takeLatest(verifySession.type, verifySessionFunc)
}
