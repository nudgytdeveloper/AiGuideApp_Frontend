import sessionReducer from "@nrs/slices/sessionSlice"
import commonReducer from "@nrs/slices/commonSlice"
import chatReducer from "@nrs/slices/chatSlice"

const rootReducer = {
  session: sessionReducer,
  common: commonReducer,
  chat: chatReducer,
  //TODO: append more reducers here
}

export default rootReducer
