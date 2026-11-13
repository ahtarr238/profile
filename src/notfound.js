// The 404 page's only script: the site's fonts, and Bahasa Indonesia for people who chose it on
// the site (or whose browser lists it), the same rule as src/i18n/LanguageProvider.jsx.
import '@fontsource-variable/outfit'
import '@fontsource-variable/instrument-sans'

let lang = 'en'
try {
  const saved = localStorage.getItem('ahtar-lang')
  if (saved === 'en' || saved === 'id') lang = saved
  else {
    const prefs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en']
    if (prefs.some((l) => /^(id|in|ms)\b/i.test(l))) lang = 'id'
  }
} catch {
  // no storage: stay in English
}

if (lang === 'id') {
  document.documentElement.lang = 'id'
  document.title = 'Halaman tidak ditemukan · ahtar.'
  for (const el of document.querySelectorAll('[data-id]')) el.textContent = el.dataset.id
}
