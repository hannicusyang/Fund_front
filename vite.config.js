// vite.config.js
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// ❌ 临时注释掉这两行
// import Components from 'unplugin-vue-components/vite'
// import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    // ❌ 临时注释掉这一块
    // Components({
    //   resolvers: [AntDesignVueResolver({ importStyle: 'css' })],
    // }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false,
    strictPort: false,
    allowedHosts: ['fund.hannicusworld.asia', 'localhost'],
    hmr: {
      host: '0.0.0.0',
      port: 5173,
      clientPort: 5173
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '::',
    port: 11717,
    strictPort: false,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:51717',
        changeOrigin: true
      }
    }
  }
})