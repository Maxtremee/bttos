import { defineConfig, type Plugin } from 'vite'
import solid from 'vite-plugin-solid'
import legacy from '@vitejs/plugin-legacy'

// Strip type="module" from script tags — webOS doesn't serve correct MIME types for ES modules
function stripModuleType(): Plugin {
  return {
    name: 'strip-module-type',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/ type="module"/g, '').replace(/ crossorigin/g, '')
    },
  }
}

export default defineConfig({
  plugins: [
    solid(),
    legacy({
      targets: ['chrome >= 68'],
      renderModernChunks: false,
    }),
    stripModuleType(),
  ],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    cssTarget: 'chrome68',
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
