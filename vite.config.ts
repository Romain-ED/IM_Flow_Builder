import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // GitHub Pages serves this as a project site under /IM_Flow_Builder/, not
  // at the domain root, so production builds need every asset URL prefixed
  // with that sub-path. The dev server keeps base "/" so `npm run dev`
  // behaves exactly as before. See src/utils/assetUrl.ts for how
  // scenario-authored "/assets/..." paths pick this up at runtime.
  const base = command === 'build' ? '/IM_Flow_Builder/' : '/'

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        base,
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Business Messaging Flow Simulator',
          short_name: 'Msg Simulator',
          description:
            'Interactive, browser-only prototyping tool for conversational business messaging journeys (RCS, WhatsApp Business).',
          theme_color: '#0f172a',
          background_color: '#f8fafc',
          display: 'standalone',
          start_url: base,
          scope: base,
          icons: [
            { src: 'pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Everything the app needs is already bundled at build time, so a
          // simple precache-all strategy is enough for full offline use —
          // no runtime network dependency to design around. jpg/jpeg was
          // missing here until a real (non-placeholder) photo asset was
          // added — a real bug: that asset was silently excluded from
          // offline precaching (and, separately, from Workbox's precache
          // manifest checks entirely, which is exactly how a mislabeled
          // PNG saved as ".jpg" went unnoticed until it broke image
          // loading — fixed alongside this by renaming the file to match
          // its real content).
          globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,ico,woff2}'],
          // Workbox's default cap (2 MiB) is too small for a real
          // marketing photo (the Beerlao event promo is ~2.5 MB) — raised
          // with headroom for future real assets, not tuned to one file.
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      }),
    ],
  }
})
