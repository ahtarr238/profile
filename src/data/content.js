import cms from './cms.json'

export const profile = {
  name: 'Ahtar Maulana Gurning',
  short: 'ahtar',
  role: 'Solution engineer',
  location: 'Bogor, West Java',
  school: 'SMK Wikrama',
  photo: '/images/ahtar.webp',
}

// The tilted band of words
export const band = ['solution engineer', 'web apps', 'react', 'laravel', 'tailwind css', 'flutter']

// Words for this section are in src/i18n/dict.js (about.*); these are the numbers.
export const about = {
  // Counted from this page and the old portfolio (Ocean Space and Berkah Global Andalan are the company sites)
  stats: [
    // `count` stats show how many items are published (About.jsx); `value` is a placeholder
    // `key` picks the label from src/i18n/dict.js (about.stats.*)
    { value: '6', key: 'projects', label: 'projects featured', count: 'projects' },
    { value: '7', key: 'certificates', label: 'certificates earned', count: 'certificates' },
    { value: '6', key: 'tools', label: 'tools in my stack' },
    { value: '2', key: 'companies', label: 'company websites' },
  ],
}

// Real tool icons (devicon, MIT), stored in /public/icons
export const tools = [
  { name: 'React', icon: '/icons/react-original.svg' },
  { name: 'Tailwind CSS', icon: '/icons/tailwindcss-original.svg' },
  { name: 'Laravel', icon: '/icons/laravel-original.svg' },
  { name: 'Flutter', icon: '/icons/flutter-original.svg' },
  { name: 'Dart', icon: '/icons/dart-original.svg' },
  { name: 'JavaScript', icon: '/icons/javascript-original.svg' },
]

// Projects and certificates live in cms.json, which /admin edits through GitHub commits.
// Only published items reach the page; certificates show newest first.
const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const httpsOnly = (u) => (/^https:\/\/[^\s"'<>]+$/.test(u || '') ? u : undefined)
// same-site paths only (/uploads/..., /images/...); never //host or /\host, which browsers read as another site
const sitePath = (u) => (/^\/[^/\\\s"'<>][^\s"'<>]*$/.test(u || '') ? u : undefined)

export const certificates = cms.certificates
  .filter((c) => c.published)
  .sort((a, b) => b.issued_on.localeCompare(a.issued_on))
  .map((c) => ({
    id: c.id,
    title: c.title,
    issuer: c.issuer,
    date: dateFmt.format(new Date(`${c.issued_on}T00:00:00Z`)),
    issuedOn: c.issued_on, // the page formats this in the visitor's language
    image: sitePath(c.image),
    alt: c.alt || c.title,
    verify: httpsOnly(c.verify),
  }))
  .filter((c) => c.image)

export const projects = cms.projects
  .filter((p) => p.published)
  .map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    tags: p.tags || [],
    // optional Bahasa Indonesia versions, used when the visitor picks ID (empty = English shows)
    titleId: p.title_id || undefined,
    descriptionId: p.description_id || undefined,
    tagsId: p.tags_id?.length ? p.tags_id : undefined,
    role: p.role || undefined,
    video: sitePath(p.video),
    poster: sitePath(p.poster),
  }))

export const contact = {
  // the note and labels are in src/i18n/dict.js (contact.*)
  email: 'ahtarmaulana23@gmail.com',
  phone: '+62 8786 4322 667',
  phoneHref: 'tel:+6287864322667',
  location: 'Bogor, West Java',
}

export const socials = [
  { label: 'GitHub', href: 'https://github.com/ahtarr238' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ahtar-maulana-9b0506328' },
]

// section ids, in page order; their names are in src/i18n/dict.js (nav.*)
export const nav = [{ id: 'about' }, { id: 'projects' }, { id: 'certificates' }, { id: 'contact' }]
