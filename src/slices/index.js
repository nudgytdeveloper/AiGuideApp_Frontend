import sessionReducer from "@nrs/slices/sessionSlice"
import commonReducer from "@nrs/slices/commonSlice"

const rootReducer = {
  session: sessionReducer,
  common: commonReducer,
  //TODO: append more reducers here
}

export default rootReducer
