import { all, fork } from "redux-saga/effects"
import sessionSaga from "@nrs/sagas/sessionSaga"
import commonSaga from "@nrs/sagas/commonSaga"
/**
 * please add your root saga here after you create new saga
 */
export default function* rootSaga() {
  try {
    yield all([
      fork(sessionSaga),
      fork(commonSaga),
      // TODO: append more sagas here ...
    ])
  } catch (error) {
    console.debug("Error", error)
  }
}
