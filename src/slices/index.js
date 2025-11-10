import sessionReducer from "@nrs/slices/sessionSlice"
import commonReducer from "@nrs/slices/commonSlice"
import chatReducer from "@nrs/slices/chatSlice"
import detectionReducer from "@nrs/slices/detectionSlice"

const rootReducer = {
  session: sessionReducer,
  common: commonReducer,
  chat: chatReducer,
  detection: detectionReducer,
  //TODO: append more reducers here
}

export default rootReducer
