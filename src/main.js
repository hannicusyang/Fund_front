// src/main.js

import { createApp } from 'vue'
import App from './App.vue'

// ✅ 1. 引入完整 Ant Design Vue JS
import Antd from 'ant-design-vue'

// ✅ 2. 【关键】全局引入 CSS 样式（v4 用 reset.css）
import 'ant-design-vue/dist/reset.css' // ← 这是 v4 的标准样式文件

import { createPinia } from 'pinia'
import router from './router'
import registerECharts from './plugins/echarts.js'

const app = createApp(App)
app.use(createPinia())
app.use(registerECharts)
app.use(Antd) // 全局注册所有组件
app.use(router)

app.mount('#app')