import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import ui from '@nuxt/ui/vite'

// https://vite.dev/config/
export default defineConfig({
  // The workspace shares one .env at the repo root (see .env.example) rather than
  // a per-app file.
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  plugins: [vue(), vueDevTools(), ui()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
