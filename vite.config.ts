import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // includeAssets removed — globPatterns already precaches *.{ico,png,svg,woff2}
      // Having both caused every icon to appear twice in the SW precache manifest
      manifest: {
        name: 'Ronin Daily',
        short_name: 'Ronin',
        description: 'Daily mission. No excuses.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Precache static assets with stable filenames.
        // PNGs are excluded from the glob — pwa-192/512 are added automatically
        // via manifest.icons, so globbing *.png would create duplicate entries.
        // apple-touch-icon.png is listed explicitly so it is still precached.
        // HTML and JS/CSS are excluded and served network-first (see below).
        globPatterns: ['**/*.{ico,svg,woff2}', 'apple-touch-icon.png'],
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // HTML navigation — always try network first so new deploys
            // are seen on the very next page load, not after a SW cycle.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // JS + CSS bundles — network-first so updated bundles are
            // fetched on each load; cached for offline fallback.
            urlPattern: /\.(?:js|css)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
