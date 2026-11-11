import cms from './cms.json'

export const profile = {
  name: 'Ahtar Maulana Gurning',
  short: 'ahtar',
  role: 'Solution engineer',
  location: 'Bogor, West Java',
  school: 'SMK Wikrama',
  photo: '/images/ahtar.webp',
}

export const hero = {
  tags: ['Solution engineering', 'Web apps', 'UI/UX'],
  lead: 'Solution engineer from Bogor. I build web apps end to end with React, Tailwind CSS and Laravel.',
}

// The tilted band of words
export const band = ['solution engineer', 'web apps', 'react', 'laravel', 'tailwind css', 'flutter']

export const about = {
  who: 'Ahtar Maulana Gurning',
  whoLine: 'Informatics student at SMK Wikrama, Bogor',
  paragraphs: [
    'Coding started as a curiosity at school. It turned into the work I want to do: building web apps that are useful and good to use.',
    'I take a problem from the first question to the shipped page. I work out how the app should behave, design the screens and write the code on both sides, with React and Tailwind CSS on the front and Laravel behind it.',
    'One of those apps is live today: the company website for Berkah Global Andalan.',
  ],
  note: 'solution engineer',
  // Counted from this page and the old portfolio (Ocean Space and Berkah Global Andalan are the company sites)
  stats: [
    // `count` stats show how many items are published (About.jsx); `value` is a placeholder
    { value: '6', label: 'projects featured', count: 'projects' },
    { value: '7', label: 'certificates earned', count: 'certificates' },
    { value: '6', label: 'tools in my stack' },
    { value: '2', label: 'company websites' },
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
    role: p.role || undefined,
    video: sitePath(p.video),
    poster: sitePath(p.poster),
  }))

export const contact = {
  note: 'Four quick questions, most of them one tap. Your answers land straight in my WhatsApp or inbox, and I reply personally.',
  email: 'ahtarmaulana23@gmail.com',
  phone: '+62 8786 4322 667',
  phoneHref: 'tel:+6287864322667',
  location: 'Bogor, West Java',
}

export const socials = [
  { label: 'GitHub', href: 'https://github.com/ahtarr238' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ahtar-maulana-9b0506328' },
]

export const nav = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'contact', label: 'Contact' },
]
