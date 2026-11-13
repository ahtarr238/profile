import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { cleanSeo, injectSeo, robotsTxt, SITE_URL } from './tools/seo-head.mjs'

// the seo block, read fresh each time so a publish from /admin (a new build) picks it up
const CMS_FILE = fileURLToPath(new URL('./src/data/cms.json', import.meta.url))
const readSeo = () => JSON.parse(readFileSync(CMS_FILE, 'utf8')).seo || {}

// Hidden items (published: false) are dropped before cms.json is bundled, so they never ship
// in the site's JavaScript. (They are still in the repo itself: see docs/admin-setup.md.)
function publishedOnly() {
  return {
    name: 'cms-published-only',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/data/cms.json')) return null
      const cms = JSON.parse(code)
      for (const key of Object.keys(cms)) if (Array.isArray(cms[key])) cms[key] = cms[key].filter((item) => item.published)
      delete cms.seo // only index.html needs it (seoHtml below), not the site's JavaScript
      return { code: JSON.stringify(cms), map: null }
    },
  }
}

// title, description, link previews and JSON-LD from cms.json's seo block, into index.html
// (dev and build alike). Runs first, so the font preload below finds the </title> it writes.
function seoHtml() {
  return {
    name: 'seo-html',
    transformIndexHtml: { order: 'pre', handler: (html) => injectSeo(html, readSeo()) },
  }
}

// robots.txt and sitemap.xml, written at build time so the sitemap date is always the deploy date
function seoFiles() {
  return {
    name: 'seo-files',
    apply: 'build',
    // the hero word "ahtar." is the largest thing on screen: fetch its font with the page, not after the CSS
    transformIndexHtml(html, ctx) {
      const font = Object.keys(ctx.bundle || {}).find((f) => /outfit-latin-wght-normal-[\w-]+\.woff2$/.test(f))
      if (!font) return html
      return html.replace('</title>', `</title>\n    <link rel="preload" href="/${font}" as="font" type="font/woff2" crossorigin />`)
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10)
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robotsTxt(readSeo()),
      })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <image:image><image:loc>${cleanSeo(readSeo()).shareImage}</image:loc></image:image>
    <image:image><image:loc>${SITE_URL}/images/ahtar.webp</image:loc></image:image>
  </url>
</urlset>
`,
      })
    },
  }
}

// `npm run dev` runs the public read-only endpoints from api/ too, so the GitHub grid and the
// guestbook look on localhost the way they do live. Without the Redis variables (they live on
// Vercel), the guestbook simply has no notes and refuses new ones; the admin's endpoints stay
// live-only on purpose.
const DEV_API = ['/api/github-activity', '/api/guestbook']
function devApi() {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || '').split('?')[0]
        if (!DEV_API.includes(path)) return next()
        try {
          const mod = await server.ssrLoadModule(`${path}.js`)
          await mod.default(req, res)
        } catch (e) {
          res.statusCode = 500
          res.end(String(e?.message || e))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [publishedOnly(), seoHtml(), seoFiles(), devApi(), react(), tailwindcss()],
  // @/ is src/ (the admin's shadcn components import through it)
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Inline PostCSS config so Vite doesn't pick up a postcss.config from a parent folder.
  // Tailwind v4 runs through its Vite plugin above.
  css: { postcss: { plugins: [] } },
})
