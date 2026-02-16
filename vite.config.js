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
    host: '::',   // 监听所有IPv4和IPv6地址
    port: 5173,
    open: false,       // 不自动打开浏览器（NAS 无 GUI）
    strictPort: false,
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
    strictPort: true,
    allowedHosts: ['hannicusworld.asia']
  }
})