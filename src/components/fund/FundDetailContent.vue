<!-- src/components/fund/FundDetailContent.vue -->
<template>
  <div v-if="!loading">
    <!-- 基金基本信息 -->
    <a-descriptions title="基金基本信息" bordered :column="2" size="small">
      <a-descriptions-item label="基金代码">{{ introData.fund_code }}</a-descriptions-item>
      <a-descriptions-item label="基金名称">{{ introData.fund_name }}</a-descriptions-item>
      <a-descriptions-item label="成立日期">{{ introData.foundation_date }}</a-descriptions-item>
      <a-descriptions-item label="基金经理">{{ introData.fund_manager }}</a-descriptions-item>
      <a-descriptions-item label="管理费率">{{ introData.management_fee }}%</a-descriptions-item>
      <a-descriptions-item label="托管费率">{{ introData.custodian_fee }}%</a-descriptions-item>
    </a-descriptions>

    <!-- 实时估值 -->
    <a-card title="实时估值" style="margin-top: 16px">
      <p v-if="realtimeData.length > 0">
        当前估值：{{ realtimeData[0].price }}（{{ formatPercent(realtimeData[0].growth) }}）
      </p>
      <p v-else>暂无实时数据</p>
    </a-card>

    <!-- 净值走势图 -->
    <a-card title="历史净值走势" style="margin-top: 16px">
      <div ref="chartRef" style="width: 100%; height: 400px"></div>
    </a-card>
  </div>

  <a-spin v-else tip="加载中..." style="margin-top: 100px" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import * as echarts from 'echarts'
import { fundApi } from '@/api/fund'

// 接收基金代码（由父组件传递）
const props = defineProps({
  fundCode: {
    type: String,
    required: true
  }
})

const loading = ref(true)
const introData = ref({})
const realtimeData = ref([])
let chart = null
const chartRef = ref(null)

// 获取基金介绍
const loadIntro = async () => {
  try {
    const res = await fundApi.getIntro(props.fundCode)
    introData.value = res.data
  } catch (error) {
    message.error('加载基金信息失败')
    console.error(error)
  }
}

// 获取历史净值 + 实时估值
const loadPriceData = async () => {
  try {
    const [priceRes, realtimeRes] = await Promise.all([
      fundApi.getPrice(props.fundCode),
      fundApi.getRealtimePrice(props.fundCode)
    ])
    const priceData = priceRes.data
    realtimeData.value = realtimeRes.data || []

    // 渲染图表
    await nextTick()
    renderChart(priceData.price_date, priceData.price)
  } catch (error) {
    message.error('加载净值数据失败')
    console.error(error)
  }
}

// 渲染 ECharts
const renderChart = (dates, prices) => {
  if (!chartRef.value) return

  if (!chart) {
    chart = echarts.init(chartRef.value)
  }

  // 计算均线（5日）
  const ma5 = calculateMA(5, prices)

  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['净值', '5日均线'] },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: [
      {
        name: '净值',
        type: 'line',
        data: prices,
        smooth: true
      },
      {
        name: '5日均线',
        type: 'line',
        data: ma5,
        smooth: true,
        lineStyle: { type: 'dashed' }
      }
    ]
  })
}

// 计算移动平均线
const calculateMA = (dayCount, data) => {
  const result = []
  for (let i = 0; i < data.length; i++) {
    if (i < dayCount - 1) {
      result.push('-')
    } else {
      let sum = 0
      for (let j = 0; j < dayCount; j++) {
        sum += parseFloat(data[i - j])
      }
      result.push((sum / dayCount).toFixed(4))
    }
  }
  return result
}

const formatPercent = (value) => {
  if (value == null) return '--'
  return `${(value * 100).toFixed(2)}%`
}

// 初始化
onMounted(async () => {
  await Promise.all([loadIntro(), loadPriceData()])
  loading.value = false
})

// 销毁图表
onUnmounted(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>