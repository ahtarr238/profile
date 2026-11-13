import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

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
      return { code: JSON.stringify(cms), map: null }
    },
  }
}

const SITE_URL = 'https://ahtar.oceanspace.co.id'

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
        source: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <image:image><image:loc>${SITE_URL}/og.jpg</image:loc></image:image>
    <image:image><image:loc>${SITE_URL}/images/ahtar.webp</image:loc></image:image>
  </url>
</urlset>
`,
      })
    },
  }
}

export default defineConfig({
  plugins: [publishedOnly(), seoFiles(), react(), tailwindcss()],
  // @/ is src/ (the admin's shadcn components import through it)
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Inline PostCSS config so Vite doesn't pick up a postcss.config from a parent folder.
  // Tailwind v4 runs through its Vite plugin above.
  css: { postcss: { plugins: [] } },
})
