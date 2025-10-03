import Api from "@nrs/apis"
import { validateSession, verifySessionSuccess } from "@nrs/slices/sessionSlice"

function* verifySessionFunc(sessionId) {
  try {
    // ShowLoading()
    const request = {
      sessionId: sessionId,
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
  yield takeLatest(validateSession.type, verifySessionFunc)
}
