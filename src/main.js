import App from './App.vue'
import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import { createPinia } from 'pinia'
import router from './router' // ✅ 修复：相对路径
import registerECharts from './plugins/echarts.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(registerECharts)
app.use(Antd)
app.use(router) // 路由必须 use
app.mount('#app')