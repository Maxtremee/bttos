import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  build: {
    target: ['chrome68'],
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  base: './',
  server: {
    proxy: {
      '/proxy/usher': {
        target: 'https://usher.ttvnw.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/usher/, ''),
      },
    },
  },
})
