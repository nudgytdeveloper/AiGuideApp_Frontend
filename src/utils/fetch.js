/**
 * please refer to https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 * options:
    {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, cors, *same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, same-origin, *omit
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            // "Content-Type": "application/x-www-form-urlencoded",
        },
        redirect: "follow", // manual, *follow, error
        referrer: "no-referrer", // no-referrer, *client
        body: JSON.stringify(options)
    }
 */
const defaultOptions = {
  // mode: 'cors',
  cache: "no-cache",
  credentials: "omit",
}

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response.json()
  }
  const err = new Error(response.statusText)
  err.response = response
  throw err
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1
  }
}

/**
 * this is a flexibale http request method via fetch
 * @param {String} url request url
 * @param {JSON} options request options
 * @param {Object} data request payload
 * @param {boolean} isFormPost is for form post
 */
async function request(url, options, data, isFormPost = false) {
  options.body = isFormPost ? new URLSearchParams(data) : JSON.stringify(data)
  const fetchResponse = await fetch(url, options),
    response = await checkStatus(fetchResponse)
  return response
}

/**
 * get request
 * @param {String} url request url
 */
function get(url, params) {
  const qs =
    params && Object.keys(params).length
      ? `?${new URLSearchParams(params).toString()}`
      : ""

  return request(
    url + qs,
    Object.assign(defaultOptions, {
      method: "GET",
      headers: { Accept: "application/json" },
    })
  )
}

/**
 * post request with JSON data
 * @param {String} url request url
 * @param {JSON} data request json data
 */
function post(url, data) {
  return request(
    url,
    Object.assign(defaultOptions, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
      },
    }),
    data
  )
}

/**
 * post request with form data
 * @param {String} url request url
 * @param {JSON} data request form data
 */
function formPost(url, data) {
  return request(
    url,
    Object.assign(defaultOptions, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
    }),
    data,
    true
  )
}

export { get, post, formPost }
