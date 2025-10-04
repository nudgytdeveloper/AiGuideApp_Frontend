import { post, get } from "./utils/fetch.js"
const prefix = import.meta.env.VITE_API_PREFIX

const Api = {
  verifySession: (payload) => {
    return get(`${prefix}/access`, payload)
  },
}

export default Api
