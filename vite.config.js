import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// ---------------------------------------------------------------------------
// Vite 构建配置
// - 使用 @ 指向 src，保证所有引用路径稳定
// - 对体积较大的依赖做手动分包，避免单文件 vendor 过大、首屏拖慢
// ---------------------------------------------------------------------------
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true,
    port: 5173,
    open: '/dev.html'
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      // 根目录 index.html 是「双击即用」的自包含成品，
      // 真正的开发入口是 dev.html，避免把 4MB 内联产物当构建入口。
      input: fileURLToPath(new URL('./dev.html', import.meta.url)),
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-ui': ['element-plus', '@element-plus/icons-vue'],
          'vendor-charts': ['echarts']
        }
      }
    }
  }
})
