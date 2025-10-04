import { all, fork } from "redux-saga/effects"
import sessionSaga from "@nrs/sagas/sessionSaga"
/**
 * please add your root saga here after you create new saga
 */
export default function* rootSaga() {
  try {
    yield all([
      fork(sessionSaga),
      // TODO: append more sagas here ...
    ])
  } catch (error) {
    console.debug("Error", error)
  }
}
