import Api from "@nrs/apis"
import { takeLatest, call, cancelled, put } from "redux-saga/effects"
import { verifySession, verifySessionSuccess } from "@nrs/slices/sessionSlice"

function* verifySessionFunc(action) {
  try {
    let { sessionId } = action.payload
    console.log("verify..., ", sessionId)
    // ShowLoading()
    const request = {
      session: sessionId,
    }

    const result = yield call(Api.verifySession, request)
    if (result) {
      console.log("verify result: ", result)
      yield put(verifySessionSuccess({ result }))
    } else {
      // should show an error
      //   yield put(
      //     openPopUp({
      //       popupType: Error,
      //       errorCode: StatusCode.InvalidMemberCode,
      //     })
      //   )
    }
  } catch (err) {
    console.log(err)
    yield cancelled()
  } finally {
    yield cancelled()
    // HideLoading()
  }
}
export default function* rootSaga() {
  yield takeLatest(verifySession.type, verifySessionFunc)
}
