import { takeLatest, call, cancelled, put, select } from "redux-saga/effects"
import {
  setConversationHistory,
  setConversationHistorySuccess,
} from "@nrs/slices/chatSlice"
import { fromJS } from "immutable"

function* setChatHistoryFunc(action) {
  try {
    // TODO: set conversation history on firebase as well
    const { role, content, timestamp } = action.payload
    const state = yield select((state) => state.chat),
      chatHistory = state.get("conversationHistory"),
      limit = window.global.maxHistoryLength

    const newChat = fromJS({
        role,
        content,
        timestamp: timestamp ?? Date.now(),
      }),
      newChatHistory = chatHistory.push(newChat)
    // keep the first + last N
    let nextHistory = newChatHistory
    if (newChatHistory.size > limit + 1) {
      const first = chatHistory.first()
      const tail = newChatHistory.slice(-limit)
      nextHistory = List([first, ...tail.toArray()])
    }
    console.debug("next history: ", nextHistory?.toJS())
    yield put(
      setConversationHistorySuccess({ conversationHistory: nextHistory })
    )
  } catch (err) {
    console.log(err)
    yield cancelled()
  } finally {
    yield cancelled()
  }
}
export default function* rootSaga() {
  yield takeLatest(setConversationHistory.type, setChatHistoryFunc)
}
