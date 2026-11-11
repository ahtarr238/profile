import { createContext, useContext } from 'react'

export const LangContext = createContext(null)

/** { lang, setLang, t(key, vars), pick(item, field), date(iso) } from <LanguageProvider>. */
export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>')
  return ctx
}
