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
    { value: '6', label: 'projects featured' },
    { value: '7', label: 'certificates earned' },
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

// Newest first. `verify` is the issuer's public verification page, when there is one.
export const certificates = [
  {
    id: 'myskill-claude-agent',
    title: 'AI Agent with Claude AI Specialization',
    issuer: 'MySkill / Education Alliance Finland · 5 courses',
    date: 'Nov 11, 2026',
    image: '/images/cert-myskill-claude-agent.webp',
    alt: 'MySkill Certificate of Skill Specialization in AI Agent with Claude AI, 5 courses completed',
  },
  {
    id: 'myskill-react-spec',
    title: 'Frontend React Specialization',
    issuer: 'MySkill / Education Alliance Finland · 19 courses',
    date: 'Nov 11, 2026',
    image: '/images/cert-myskill-react-spec.webp',
    alt: 'MySkill Certificate of Skill Specialization in Frontend React, 19 courses completed',
  },
  {
    id: 'dicoding-financial',
    title: 'Introduction to Financial Literacy',
    issuer: 'Dicoding Indonesia · Coding Camp by DBS Foundation',
    date: 'Jan 2, 2026',
    image: '/images/cert-dicoding-financial.webp',
    alt: 'Dicoding certificate for Introduction to Financial Literacy',
    verify: 'https://www.dicoding.com/certificates/2VX3VK2LQPYQ',
  },
  {
    id: 'myskill-react',
    title: 'Introduction to React',
    issuer: 'MySkill / Education Alliance Finland',
    date: 'Oct 15, 2025',
    image: '/images/cert-myskill-react.webp',
    alt: 'MySkill certificate for Introduction to React',
  },
  {
    id: 'myskill-flutter',
    title: 'Introduction to Dart and Flutter',
    issuer: 'MySkill / Education Alliance Finland',
    date: 'Sep 30, 2025',
    image: '/images/cert-myskill-flutter.webp',
    alt: 'MySkill certificate for Introduction to Dart and Flutter',
  },
  {
    id: 'dicoding-ai',
    title: 'Belajar Dasar AI',
    issuer: 'Dicoding Indonesia',
    date: 'Sep 30, 2025',
    image: '/images/cert-dicoding-ai.webp',
    alt: 'Dicoding certificate for Belajar Dasar AI',
    verify: 'https://www.dicoding.com/certificates/1OP872LV8ZQK',
  },
  {
    id: 'dicoding-web',
    title: 'Belajar Dasar Pemrograman Web',
    issuer: 'Dicoding Indonesia',
    date: 'Oct 7, 2024',
    image: '/images/cert-dicoding-web.webp',
    alt: 'Dicoding certificate for Belajar Dasar Pemrograman Web',
  },
]

// Intro videos made with the brag-slim skill in each project's folder, compressed into /public/videos
export const projects = [
  {
    id: 'oceanspace',
    title: 'Ocean Space Company Website',
    description:
      'The company website for Ocean Space, an Indonesian group in phone distribution, retail and lifestyle. Partners can explore its four businesses, job seekers can find open roles, and anyone can contact the team.',
    tags: ['Company website', 'Careers', 'English and Indonesian'],
    video: '/videos/oceanspace.mp4',
    poster: '/videos/oceanspace.jpg',
  },
  {
    id: 'lms-legal',
    title: 'LMS Legal',
    description:
      'A web app that keeps a company’s contracts, permits and deeds in one place, shows at a glance what is active, expiring soon or already expired, and sends the person in charge a WhatsApp reminder before anything runs out.',
    tags: ['Document archive', 'Reminders', 'Legal teams'],
    video: '/videos/lms-legal.mp4',
    poster: '/videos/lms-legal.jpg',
  },
  {
    id: 'ontime',
    title: 'Ontime: Selfie Attendance',
    description:
      'An attendance app for companies. Staff, interns and freelancers check in each morning with a quick selfie, the office sees who is in, on time or late, and the monthly report downloads to Excel in one click.',
    tags: ['Attendance', 'Selfie check-in', 'Monthly reports'],
    video: '/videos/ontime.mp4',
    poster: '/videos/ontime.jpg',
  },
  {
    id: 'nouvo-ai',
    title: 'Nouvo AI',
    description:
      'A calm personal workspace where an AI helper named Simon takes on each task in your projects, and every task keeps its own tab and conversation.',
    tags: ['AI helper', 'Task workspace', 'Personal project'],
    video: '/videos/nouvo-ai.mp4',
    poster: '/videos/nouvo-ai.jpg',
  },
  {
    id: 'chisel',
    title: 'Chisel',
    description:
      'Chisel lets Roblox creators describe their game idea in plain words, then makes the changes for them right inside Roblox Studio, step by step.',
    tags: ['Roblox game creation', 'Plain-language building', 'Creator tool'],
    video: '/videos/chisel.mp4',
    poster: '/videos/chisel.jpg',
  },
  {
    id: 'oceanmall',
    title: 'OceanMall Online Store',
    role: 'Contributor', // team project: Ahtar contributed, he did not build it alone
    description:
      'An online gadget and lifestyle store where shoppers in Indonesia browse products, add them to a cart, check out and follow their orders, on the web or on their phone. I contributed to this project as part of the team.',
    tags: ['Online shopping', 'Store website', 'Phone shopping'],
    video: '/videos/oceanmall.mp4',
    poster: '/videos/oceanmall.jpg',
  },
]

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
