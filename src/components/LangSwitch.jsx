import { motion } from 'motion/react'
import { useLang } from '../i18n/context'

const ease = [0.22, 1, 0.36, 1]
const OPTIONS = [
  { id: 'en', short: 'EN', name: 'English' },
  { id: 'id', short: 'ID', name: 'Bahasa Indonesia' },
]

/** EN | ID pill. The marker slides to the chosen language. `size="sm"` is the compact one for the header. */
export default function LangSwitch({ className = '', layoutId = 'lang-switch', size = 'md' }) {
  const { lang, setLang, t } = useLang()
  const sm = size === 'sm'
  return (
    <div role="group" aria-label={t('lang.label')} className={`inline-flex rounded-full border border-sky-soft/20 p-[3px] ${className}`}>
      {OPTIONS.map((o) => {
        const on = lang === o.id
        return (
          <button
            key={o.id}
            type="button"
            lang={o.id}
            onClick={() => setLang(o.id)}
            aria-pressed={on}
            aria-label={o.name}
            title={o.name}
            // the visible pill is small; the ::after keeps a full 44px tall touch area around it
            className={`relative inline-flex items-center justify-center rounded-full font-medium tracking-[0.04em] transition-colors duration-200 ease-out after:absolute after:-inset-y-2.5 after:inset-x-0 ${
              sm ? 'h-6 min-w-8 px-2 text-[11px]' : 'h-8 min-w-10 px-2.5 text-[12px]'
            } ${on ? 'text-ground' : 'text-mist hover:text-sky-soft'}`}
          >
            {on && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-sky-soft" transition={{ duration: 0.35, ease }} />}
            <span className="relative">{o.short}</span>
          </button>
        )
      })}
    </div>
  )
}
