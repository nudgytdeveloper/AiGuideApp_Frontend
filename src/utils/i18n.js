/* eslint-disable no-console */
// import { fromJS } from 'immutable'
import en from "../locales/en"
const { get: _get } = require("lodash")

const SupportLanguages = {}
for (let [key, value] of Object.entries(window.global.supportLanguages)) {
  SupportLanguages[key] = value.split(",")
}
const DEFAULT_LOCALE = "en"
const locales = {
  en: en,
  hans: {},
}
const LocaleMap = new Map([
  ["hans", (code) => SupportLanguages.en.includes(code)],
  [DEFAULT_LOCALE, () => DEFAULT_LOCALE],
])
/**
 * get resouce for specify locale
 * @param {string} lang locale
 * @returns Promise
 */
const getResource = (lang) => {
  let res = locales[lang]
  if (Object.getOwnPropertyNames(res).length === 0) {
    return import(`../locales/${lang}`)
      .then((data) => {
        console.debug(`${lang} loaded`)
        return data.default
      })
      .catch((err) => {
        console.error(err)
        return locales[DEFAULT_LOCALE]
      })
  }
  return res
}
/**
 * current locale
 */
let locale = sessionStorage.getItem("lang") || DEFAULT_LOCALE
/**
 * cached resource by current locale
 */
let resource = locales[locale]

/**
 * async function to change current locale
 * @param {String} lang lang code
 */
const setLocale = async (lang) => {
  lang = lang || navigator.language || navigator.userLanguage
  for (const it of LocaleMap) {
    if (it[1](lang)) {
      lang = it[0]
      break
    }
  }
  locale = lang
  resource = await getResource(locale)
  locales[locale] = resource
  sessionStorage.setItem("lang", lang)
}

function _t(res, key, ...args) {
  let msg = _get(res, key)
  if (msg === undefined) {
    msg = _get(locales[DEFAULT_LOCALE], key)
    if (msg === undefined) {
      msg = key
      console.error(`the key [${key}] of locale [${locale}] is not found`)
    } else {
      console.warn(
        `the key [${key}] of locale [${locale}] is not found, use default locales`
      )
    }
  }
  if (args && args.length > 0) {
    return _format(msg, ...args)
  }
  return msg
}

/**
 * default translator
 * @param {string} key
 * @param  {...any} args
 */
const t = (key, ...args) => {
  return _t(resource, key, ...args)
}

/**
 * almost same to t, can dynamically translate by locale
 * @param {string} lang locale name
 */
const t2 = async (lang) => {
  // use dynamical resouce instead of global
  let res = await getResource(lang)
  return (key, ...args) => {
    return _t(res, key, ...args)
  }
}

/**
 *
 * @param {String} msg original message
 * @param  {...any} args
 */
function _format(msg, ...args) {
  if (typeof args[0] === "object") {
    // args is a json object
    args = args[0]
  }
  if (typeof msg === "string")
    return msg.replace(/\{(\d+|\w+)\}/g, function (_, i) {
      return args[i]
    })
  console.error(`typeof msg [${typeof msg}] is not supported`)
  return msg.toString()
}

// const $$locales = fromJS(locales)
export { t, t2, setLocale, DEFAULT_LOCALE }
