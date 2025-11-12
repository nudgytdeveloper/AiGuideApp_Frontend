import sessionReducer from "@nrs/slices/sessionSlice"
import commonReducer from "@nrs/slices/commonSlice"
import chatReducer from "@nrs/slices/chatSlice"
import detectionReducer from "@nrs/slices/detectionSlice"
import navigationReducer from "@nrs/slices/navigationSlice"

const rootReducer = {
  session: sessionReducer,
  common: commonReducer,
  chat: chatReducer,
  detection: detectionReducer,
  navigation: navigationReducer,
  //TODO: append more reducers here
}
export default rootReducer
