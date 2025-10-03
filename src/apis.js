import { post } from "./utils/fetch.js"
const prefix = `${API_PREFIX}`

const Api = {
  verifySession: (payload) => {
    return post(`${prefix}/access`, payload)
  },
  //#endregion
}

export default Api
