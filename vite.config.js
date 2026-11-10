import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Inline PostCSS config so Vite doesn't pick up a postcss.config from a parent folder.
  // Tailwind v4 runs through its Vite plugin above.
  css: { postcss: { plugins: [] } },
})
