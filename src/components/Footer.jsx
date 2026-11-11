import { ArrowUp } from 'lucide-react'
import { nav, profile, socials } from '../data/content'
import { scrollToId, useLenisInstance } from '../hooks/useLenis'
import { useLang } from '../i18n/context'

export default function Footer() {
  const lenis = useLenisInstance()
  const { t } = useLang()
  return (
    <footer className="relative overflow-hidden border-t border-sky-soft/10">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-6 pt-10 md:flex-row md:items-center md:justify-between md:px-10">
        <ul className="flex flex-wrap gap-x-6 text-[14px] text-mist">
          {nav.map((n) => (
            <li key={n.id}>
              <a
                href={`#${n.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  scrollToId(lenis, n.id)
                }}
                className="inline-flex min-h-11 items-center transition-colors duration-150 ease-out hover:text-sky-soft"
              >
                {t(`nav.${n.id}`)}
              </a>
            </li>
          ))}
          {socials.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center transition-colors duration-150 ease-out hover:text-sky-soft">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-6 text-[14px] text-mist">
          <span>© 2026 {profile.name}</span>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault()
              scrollToId(lenis, 'top')
            }}
            className="inline-flex min-h-11 items-center gap-2 transition-colors duration-150 ease-out hover:text-sky-soft"
          >
            {t('footer.top')}
            <ArrowUp size={16} strokeWidth={1.5} aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* the name again, cut by the bottom edge. Drawn with CSS content: it's decoration, so it
          stays out of the page text that readers and search engines see (and out of contrast checks) */}
      <p
        aria-hidden="true"
        data-word={profile.short}
        className="font-display mx-auto -mb-[0.32em] max-w-[1320px] px-6 pt-6 text-[clamp(112px,25vw,380px)] leading-[0.8] font-medium tracking-[-0.055em] text-tile select-none before:content-[attr(data-word)] after:text-coral/40 after:content-['.'] md:px-10"
      />
    </footer>
  )
}
