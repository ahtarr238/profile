import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

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

export default defineConfig({
  plugins: [publishedOnly(), react(), tailwindcss()],
  // Inline PostCSS config so Vite doesn't pick up a postcss.config from a parent folder.
  // Tailwind v4 runs through its Vite plugin above.
  css: { postcss: { plugins: [] } },
})
