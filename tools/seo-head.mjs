// Builds the page's search and link-preview tags from the "seo" block in src/data/cms.json,
// which /admin edits. vite.config.js puts the result between <!-- seo:start --> and
// <!-- seo:end --> in index.html on every build (and in dev), so crawlers get plain HTML.
//
// Everything here comes from a file someone can edit in a browser, so every value is checked
// and escaped: text is HTML-escaped, links must be https, file paths must be the site's own,
// and the JSON-LD can't close its <script> tag.

export const SITE_URL = 'https://ahtar.oceanspace.co.id'
const SHARE_W = 1200
const SHARE_H = 630

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
const text = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const https = (u) => (/^https:\/\/[^\s"'<>]+$/.test(u || '') ? u : '')
// a path on this site ("/og.jpg", "/uploads/seo/…") becomes a full URL; anything else is dropped
const own = (p) => (/^\/[\w./-]+$/.test(p || '') && !p.includes('..') ? `${SITE_URL}${p}` : '')
const code = (s) => (/^[\w-]{10,100}$/.test(s || '') ? s : '')
const country = (s) => (/^[A-Z]{2}$/.test(s || '') ? s : '')
// JSON that can sit inside <script> without ending it early
const LS = String.fromCharCode(0x2028) // line and paragraph separators: valid in JSON, not in old JS
const PS = String.fromCharCode(0x2029)
const BS = String.fromCharCode(92) // a backslash, spelled out so the source holds no escape sequences
const safeJson = (v) =>
  JSON.stringify(v, null, 2)
    .split('<').join(`${BS}u003c`)
    .split(LS).join(`${BS}u2028`)
    .split(PS).join(`${BS}u2029`)

/** The seo block with every field present, checked and trimmed. */
export function cleanSeo(raw = {}) {
  const p = raw.person || {}
  const name = text(p.name, 80) || 'Ahtar Maulana Gurning'
  const title = text(raw.title, 120) || name
  const description = text(raw.description, 320)
  return {
    title,
    description,
    shareTitle: text(raw.share_title, 120) || title,
    shareDescription: text(raw.share_description, 320) || description,
    shareImage: own(raw.share_image) || `${SITE_URL}/og.jpg`,
    shareImageAlt: text(raw.share_image_alt, 300),
    indexable: raw.indexable !== false,
    google: code(raw.google_verification),
    bing: code(raw.bing_verification),
    person: {
      name,
      alternateName: text(p.alternate_name, 60),
      jobTitle: text(p.job_title, 80),
      description: text(p.description, 320),
      image: own(p.image),
      email: /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(p.email || '') ? p.email : '',
      locality: text(p.locality, 60),
      region: text(p.region, 60),
      country: country(p.country),
      school: text(p.school, 120),
      skills: (Array.isArray(p.skills) ? p.skills : []).map((s) => text(s, 40)).filter(Boolean).slice(0, 20),
      links: (Array.isArray(p.links) ? p.links : []).map(https).filter(Boolean).slice(0, 10),
    },
  }
}

/** The tags that go between <!-- seo:start --> and <!-- seo:end -->. */
export function seoHead(raw) {
  const s = cleanSeo(raw)
  const p = s.person
  const url = `${SITE_URL}/`
  const person = {
    '@type': 'Person',
    '@id': `${url}#person`,
    name: p.name,
    ...(p.alternateName && { alternateName: p.alternateName }),
    ...(p.jobTitle && { jobTitle: p.jobTitle }),
    ...(p.description && { description: p.description }),
    url,
    ...(p.image && { image: p.image }),
    ...(p.email && { email: `mailto:${p.email}` }),
    ...((p.locality || p.region || p.country) && {
      address: {
        '@type': 'PostalAddress',
        ...(p.locality && { addressLocality: p.locality }),
        ...(p.region && { addressRegion: p.region }),
        ...(p.country && { addressCountry: p.country }),
      },
    }),
    ...(p.school && { affiliation: { '@type': 'EducationalOrganization', name: p.school } }),
    ...(p.skills.length && { knowsAbout: p.skills }),
    ...(p.links.length && { sameAs: p.links }),
  }
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      person,
      { '@type': 'WebSite', '@id': `${url}#website`, url, name: p.name, inLanguage: 'en', publisher: { '@id': `${url}#person` } },
      { '@type': 'ProfilePage', '@id': `${url}#profile`, url, name: s.title, isPartOf: { '@id': `${url}#website` }, mainEntity: { '@id': `${url}#person` } },
    ],
  }
  const lines = [
    `<title>${esc(s.title)}</title>`,
    s.description && `<meta name="description" content="${esc(s.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta name="author" content="${esc(p.name)}" />`,
    `<meta name="robots" content="${s.indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}" />`,
    s.google && `<meta name="google-site-verification" content="${esc(s.google)}" />`,
    s.bing && `<meta name="msvalidate.01" content="${esc(s.bing)}" />`,
    '<!-- link previews (WhatsApp, LinkedIn, Facebook, X, Discord) -->',
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(p.name)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(s.shareTitle)}" />`,
    s.shareDescription && `<meta property="og:description" content="${esc(s.shareDescription)}" />`,
    `<meta property="og:image" content="${esc(s.shareImage)}" />`,
    ['.jpg', '.jpeg'].some((x) => s.shareImage.toLowerCase().endsWith(x)) && `<meta property="og:image:type" content="image/jpeg" />`,
    `<meta property="og:image:width" content="${SHARE_W}" />`,
    `<meta property="og:image:height" content="${SHARE_H}" />`,
    s.shareImageAlt && `<meta property="og:image:alt" content="${esc(s.shareImageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(s.shareTitle)}" />`,
    s.shareDescription && `<meta name="twitter:description" content="${esc(s.shareDescription)}" />`,
    `<meta name="twitter:image" content="${esc(s.shareImage)}" />`,
    '<!-- who this site is about, for search engines (data only, never executed) -->',
    `<script type="application/ld+json">\n${safeJson(graph)}\n</script>`,
  ]
  return lines.filter(Boolean).join('\n    ') // the optional tags left out are '' or false
}

const isoDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : '')

/**
 * The page's content as plain HTML inside <noscript>, for crawlers and browsers that don't run
 * JavaScript (Bing often, and most AI search crawlers): who this is, every published project
 * with its description, and every certificate. Built from cms.json, so it never drifts from the site.
 */
export function seoNoscript(raw, cms = {}) {
  const s = cleanSeo(raw)
  const p = s.person
  const pad = '\n        '
  const bio = p.description || s.description
  const out = [`<h1>${esc(p.name)}${p.jobTitle ? `, ${esc(p.jobTitle)}` : ''}</h1>`, bio && `<p>${esc(bio)}</p>`].filter(Boolean)
  const where = [p.school && `Studying at ${esc(p.school)}`, [p.locality, p.region].filter(Boolean).map(esc).join(', ')].filter(Boolean)
  if (where.length) out.push(`<p>${where.join(' · ')}</p>`)
  if (p.skills.length) out.push(`<p>Works with ${p.skills.map(esc).join(', ')}.</p>`)

  const projects = (Array.isArray(cms.projects) ? cms.projects : []).filter((x) => x && x.published)
  if (projects.length) {
    out.push('<h2>Projects</h2>', '<ul>')
    for (const x of projects) {
      const title = text(x.title, 160)
      const role = text(x.role, 40)
      const description = text(x.description, 1200)
      const tags = (Array.isArray(x.tags) ? x.tags : []).map((t) => text(t, 40)).filter(Boolean)
      out.push(
        `  <li><strong>${esc(title)}</strong>${role ? ` (${esc(role)})` : ''}${description ? `: ${esc(description)}` : ''}${tags.length ? ` <em>${tags.map(esc).join(' · ')}</em>` : ''}</li>`,
      )
    }
    out.push('</ul>')
  }

  const certificates = (Array.isArray(cms.certificates) ? cms.certificates : [])
    .filter((x) => x && x.published)
    .sort((a, b) => String(b.issued_on).localeCompare(String(a.issued_on)))
  if (certificates.length) {
    out.push('<h2>Certificates</h2>', '<ul>')
    for (const x of certificates) {
      const date = isoDate(x.issued_on)
      out.push(`  <li>${esc(text(x.title, 160))}${x.issuer ? `, ${esc(text(x.issuer, 160))}` : ''}${date ? ` (${date.slice(0, 4)})` : ''}</li>`)
    }
    out.push('</ul>')
  }
  return out.join(pad)
}

/** robots.txt: hidden from search entirely when "Show in search results" is off. */
export function robotsTxt(raw) {
  const s = cleanSeo(raw)
  return s.indexable
    ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
    : `User-agent: *\nDisallow: /\n`
}

/** Puts the generated tags between the markers in index.html. */
export function injectSeo(html, raw, cms = {}) {
  return html
    // function replacers: a "$&" typed into a title must stay text, not become a replace pattern
    .replace(/<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, () => `<!-- seo:start -->\n    ${seoHead(raw)}\n    <!-- seo:end -->`)
    .replace(/<!-- seo:noscript -->[\s\S]*?<!-- \/seo:noscript -->/, () => `<!-- seo:noscript -->\n        ${seoNoscript(raw, cms)}\n        <!-- /seo:noscript -->`)
}
