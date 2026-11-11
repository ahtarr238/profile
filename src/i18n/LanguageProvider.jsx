import { useCallback, useEffect, useMemo, useState } from 'react'
import { dict, LANGS } from './dict'
import { LangContext } from './context'

const KEY = 'ahtar-lang'

// First visit: follow the browser. Indonesian browsers get Bahasa Indonesia, everyone else
// (search engine crawlers included) gets English, which is what the page's SEO tags describe.
function initialLang() {
  try {
    const saved = localStorage.getItem(KEY)
    if (LANGS.includes(saved)) return saved
  } catch {
    // storage blocked: fall through to the browser language
  }
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en']
  return prefs.some((l) => /^(id|in|ms)\b/i.test(l)) ? 'id' : 'en'
}

const get = (tree, path) => path.split('.').reduce((node, k) => (node == null ? undefined : node[k]), tree)
const fill = (s, vars) => (typeof s === 'string' && vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s)


export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next) => {
    if (!LANGS.includes(next)) return
    setLangState(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // not remembered, still switched
    }
  }, [])

  const value = useMemo(() => {
    /** Text for a key in the current language (English if the Indonesian entry is missing). */
    const t = (key, vars) => fill(get(dict[lang], key) ?? get(dict.en, key) ?? key, vars)
    /** The localized field of a CMS item: item.description_id in Indonesian when filled in. */
    const pick = (item, field) => (lang === 'id' && item?.[`${field}Id`]?.length ? item[`${field}Id`] : item?.[field])
    /** A date like "Nov 11, 2026" or "11 Nov 2026". */
    const date = (iso) =>
      new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${iso}T00:00:00Z`),
      )
    return { lang, setLang, t, pick, date }
  }, [lang, setLang])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

