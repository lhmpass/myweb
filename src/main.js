import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as Icons from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './assets/style.css'

const app = createApp(App)
// 全量注册图标，模板里可直接 <el-icon><User /></el-icon>
for (const [name, comp] of Object.entries(Icons)) {
  app.component(name, comp)
}
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
