// src/plugins/echarts.js
import { createApp } from 'vue'
import ECharts from 'vue-echarts'
import { use } from 'echarts/core'
// 引入必要的组件
import { CanvasRenderer } from 'echarts/renderers' // 渲染器
import { BarChart, LineChart, PieChart } from 'echarts/charts' // 图表类型
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'

// 注册核心组件和渲染器
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])
// 全局注册组件（可选，你也可以在单个组件内局部注册）
export default function registerECharts(app) {
  app.component('v-chart', ECharts)
}