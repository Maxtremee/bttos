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
})
