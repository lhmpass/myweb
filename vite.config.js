import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './', // 相对路径：支持 file:// 直接双击 index.html 离线打开
  plugins: [vue(), viteSingleFile()], // 所有 JS/CSS 内联进 index.html，绕过 file:// 的模块加载限制
  server: { port: 5173, host: true }
})
