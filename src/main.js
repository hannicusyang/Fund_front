// src/main.js

import { createApp } from 'vue'
import App from './App.vue'

// ✅ 1. 引入完整 Ant Design Vue JS
import Antd from 'ant-design-vue'

// ✅ 2. 【关键】全局引入 CSS 样式（即使之前说找不到，现在试试这个路径）
// import 'ant-design-vue/dist/antd.css'
//
// // ✅ 3. 如果上面 still 报错，就用这个备用方案（直接从 lib 引入）
// // import 'ant-design-vue/lib/spin/style/css'
// // import 'ant-design-vue/lib/card/style/css'
// // import 'ant-design-vue/lib/descriptions/style/css'
// // ... 但太麻烦，所以优先用 dist/antd.css

import { createPinia } from 'pinia'
import router from './router'
import registerECharts from './plugins/echarts.js'

const app = createApp(App)
app.use(createPinia())
app.use(registerECharts)
app.use(Antd) // 全局注册所有组件
app.use(router)

app.mount('#app')