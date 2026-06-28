import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({

  base: '/health-sheet-tool/',

  plugins: [

    vue(),

    tailwindcss(),

    VitePWA({

      registerType: 'autoUpdate',

      manifest: {

        name: 'Health OS',

        short_name: 'Health OS',

        theme_color: '#ffffff',

        background_color: '#ffffff',

        display: 'standalone',

        start_url: '/health-sheet-tool/',

        icons: [

          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },

          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }

        ]

      }

    })

  ]

})