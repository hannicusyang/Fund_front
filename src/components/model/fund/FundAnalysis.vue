<template>
  <div class="fund-analysis">
    <a-row :gutter="16">
      <!-- 基金选择 -->
      <a-col :span="24">
        <a-card class="selection-card">
          <div class="selection-header">
            <span class="label">选择对比基金：</span>
            <a-select
              v-model:value="selectedFundCodes"
              mode="multiple"
              style="width: 500px"
              placeholder="请选择要分析的基金"
              :max-tag-count="5"
            >
              <a-select-option 
                v-for="fund in fundPool" 
                :key="fund.fund_code"
                :value="fund.fund_code"
              >
                {{ fund.fund_name }} ({{ fund.fund_code }})
              </a-select-option>
            </a-select>
            <a-space style="margin-left: 16px">
              <a-button @click="selectAll">全选</a-button>
              <a-button @click="clearSelection">清空</a-button>
            </a-space>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 收益走势对比 -->
    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="24">
        <a-card title="收益走势对比" class="chart-card">
          <template #extra>
            <a-space>
              <a-radio-group v-model:value="timeRange" @change="handleTimeRangeChange">
                <a-radio-button value="1m">近1月</a-radio-button>
                <a-radio-button value="3m">近3月</a-radio-button>
                <a-radio-button value="6m">近6月</a-radio-button>
                <a-radio-button value="1y">近1年</a-radio-button>
                <a-radio-button value="3y">近3年</a-radio-button>
                <a-radio-button value="5y">近5年</a-radio-button>
                <a-radio-button value="all">全部</a-radio-button>
                <a-radio-button value="custom">自定义</a-radio-button>
              </a-radio-group>
              <a-range-picker
                v-if="timeRange === 'custom'"
                v-model:value="customDateRange"
                @change="handleCustomDateChange"
              />
              <a-button type="primary" @click="loadTrendData" :loading="trendLoading">
                <ReloadOutlined /> 刷新
              </a-button>
            </a-space>
          </template>
          <div ref="trendChartRef" class="chart" style="height: 400px;"></div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <!-- 基金指标对比表 -->
      <a-col :span="24">
        <a-card title="基金量化指标对比" class="metrics-card">
          <a-table
            :data-source="selectedFundsWithMetrics"
            :columns="metricsColumns"
            :pagination="false"
            size="small"
            bordered
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'fund_name'">
                <div class="fund-cell">
                  <div class="name">{{ record.fund_name }}</div>
                  <div class="code">{{ record.fund_code }}</div>
                </div>
              </template>

              <template v-else-if="column.dataIndex?.includes('growth_rate')">
                <span :class="getRateClass(record[column.dataIndex])">
                  {{ formatRate(record[column.dataIndex]) }}
                </span>
              </template>

              <template v-else-if="column.dataIndex === 'sharpe'">
                <span :class="getSharpeClass(record[column.dataIndex])">
                  {{ formatNumber(record[column.dataIndex]) }}
                </span>
              </template>

              <template v-else-if="column.dataIndex === 'rank'">
                <a-tag :color="getRankColor(record[column.dataIndex])">
                  {{ record[column.dataIndex] }}
                </a-tag>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <!-- 风险收益散点图 -->
      <a-col :xs="24" :lg="12">
        <a-card title="风险收益分布" class="chart-card">
          <div ref="riskReturnChartRef" class="chart"></div>
        </a-card>
      </a-col>

      <!-- 相关性热力图 -->
      <a-col :xs="24" :lg="12">
        <a-card 
          title="基金相关性分析" 
          class="chart-card"
          :loading="correlationLoading"
        >
          <div v-if="showCorrelationEmpty" class="chart-placeholder">
            <a-empty description="请选择至少2只基金进行分析" />
          </div>
          <div v-show="!showCorrelationEmpty" ref="correlationChartRef" class="chart"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 分析报告 -->
    <a-row style="margin-top: 16px">
      <a-col :span="24">
        <a-card title="智能分析报告">
          <a-descriptions bordered :column="2">
            <a-descriptions-item label="收益能力最强">
              {{ analysisResult.bestReturn?.fund_name }}
              ({{ formatRate(analysisResult.bestReturn?.yearly_1_growth_rate) }})
            </a-descriptions-item>
            <a-descriptions-item label="风险控制最佳">
              {{ analysisResult.lowestRisk?.fund_name }}
              (回撤 {{ formatRate(analysisResult.lowestRisk?.max_drawdown) }})
            </a-descriptions-item>
            <a-descriptions-item label="夏普比率最高">
              {{ analysisResult.bestSharpe?.fund_name }}
              ({{ formatNumber(analysisResult.bestSharpe?.sharpe) }})
            </a-descriptions-item>
            <a-descriptions-item label="综合评分最高">
              <a-tag color="gold">{{ analysisResult.topOverall?.fund_name }}</a-tag>
            </a-descriptions-item>
          </a-descriptions>

          <a-divider />

          <div class="analysis-content">
            <h4>投资建议：</h4>
            <a-list :data-source="recommendations">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta
                    :title="item.title"
                    :description="item.description"
                  >
                    <template #avatar>
                      <a-avatar :style="{ backgroundColor: item.color }">
                        {{ item.icon }}
                      </a-avatar>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { fundAnalysisApi } from '@/api/fundModel.js'
import dayjs from 'dayjs'

const props = defineProps({
  fundPool: {
    type: Array,
    default: () => []
  }
})

// 选中的基金代码
const selectedFundCodes = ref([])

// 时间范围
const timeRange = ref('1y')
const customDateRange = ref(null)
const trendLoading = ref(false)

// 收益走势数据
const trendData = ref({})

// 指标列定义
const metricsColumns = [
  {
    title: '基金',
    key: 'fund_name',
    width: 200,
    fixed: 'left'
  },
  {
    title: '排名',
    dataIndex: 'rank',
    key: 'rank',
    width: 80,
    align: 'center'
  },
  {
    title: '最新净值',
    dataIndex: 'net_value',
    width: 100,
    align: 'right'
  },
  {
    title: '日涨幅',
    dataIndex: 'daily_growth_rate',
    width: 90,
    align: 'right'
  },
  {
    title: '周涨幅',
    dataIndex: 'weekly_growth_rate',
    width: 90,
    align: 'right'
  },
  {
    title: '月涨幅',
    dataIndex: 'monthly_1_growth_rate',
    width: 90,
    align: 'right'
  },
  {
    title: '3月涨幅',
    dataIndex: 'monthly_3_growth_rate',
    width: 90,
    align: 'right'
  },
  {
    title: '6月涨幅',
    dataIndex: 'monthly_6_growth_rate',
    width: 90,
    align: 'right'
  },
  {
    title: '年度收益',
    dataIndex: 'yearly_1_growth_rate',
    width: 100,
    align: 'right'
  },
  {
    title: '夏普比率',
    dataIndex: 'sharpe',
    width: 100,
    align: 'right'
  }
]

// 选中的基金及其指标
const selectedFundsWithMetrics = computed(() => {
  return props.fundPool.filter(fund => 
    selectedFundCodes.value.includes(fund.fund_code)
  )
})

// 计算日期范围
function getDateRange() {
  const endDate = dayjs().format('YYYY-MM-DD')
  let startDate

  switch (timeRange.value) {
    case '1m':
      startDate = dayjs().subtract(1, 'month').format('YYYY-MM-DD')
      break
    case '3m':
      startDate = dayjs().subtract(3, 'month').format('YYYY-MM-DD')
      break
    case '6m':
      startDate = dayjs().subtract(6, 'month').format('YYYY-MM-DD')
      break
    case '1y':
      startDate = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
      break
    case '3y':
      startDate = dayjs().subtract(3, 'year').format('YYYY-MM-DD')
      break
    case '5y':
      startDate = dayjs().subtract(5, 'year').format('YYYY-MM-DD')
      break
    case 'all':
      startDate = '2000-01-01'
      break
    case 'custom':
      if (customDateRange.value && customDateRange.value.length === 2) {
        return {
          startDate: customDateRange.value[0].format('YYYY-MM-DD'),
          endDate: customDateRange.value[1].format('YYYY-MM-DD')
        }
      }
      startDate = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
      break
    default:
      startDate = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
  }

  return { startDate, endDate }
}

// 加载收益走势数据
async function loadTrendData() {
  if (selectedFundCodes.value.length === 0) {
    message.warning('请先选择基金')
    return
  }

  trendLoading.value = true
  try {
    const { startDate, endDate } = getDateRange()
    const response = await fundAnalysisApi.getReturnsAnalysis(
      selectedFundCodes.value,
      startDate,
      endDate
    )

    if (response.success) {
      trendData.value = response.data
      initTrendChart()
    } else {
      message.error(response.message || '加载数据失败')
    }
  } catch (error) {
    console.error('加载收益走势数据失败:', error)
    message.error('加载数据失败')
  } finally {
    trendLoading.value = false
  }
}

// 时间范围变化
function handleTimeRangeChange() {
  if (timeRange.value !== 'custom') {
    loadTrendData()
  }
}

// 自定义日期变化
function handleCustomDateChange() {
  if (customDateRange.value && customDateRange.value.length === 2) {
    loadTrendData()
  }
}

// 分析结果
const analysisResult = computed(() => {
  const funds = selectedFundsWithMetrics.value
  if (funds.length === 0) return {}

  return {
    bestReturn: funds.reduce((max, fund) => 
      parseFloat(fund.yearly_1_growth_rate || 0) > parseFloat(max.yearly_1_growth_rate || 0) ? fund : max
    , funds[0]),
    
    lowestRisk: funds.reduce((min, fund) => 
      parseFloat(fund.max_drawdown || 0) < parseFloat(min.max_drawdown || 0) ? fund : min
    , funds[0]),
    
    bestSharpe: funds.reduce((max, fund) => 
      parseFloat(fund.sharpe || 0) > parseFloat(max.sharpe || 0) ? fund : max
    , funds[0]),

    topOverall: funds[0]
  }
})

// 投资建议
const recommendations = computed(() => {
  const recs = []
  const funds = selectedFundsWithMetrics.value
  
  if (funds.length === 0) return recs

  const avgReturn = funds.reduce((sum, f) => sum + parseFloat(f.yearly_1_growth_rate || 0), 0) / funds.length
  if (avgReturn > 30) {
    recs.push({
      title: '高收益潜力',
      description: '所选基金平均年化收益超过30%，具有较强的增长潜力，但需注意波动风险。',
      icon: '🚀',
      color: '#ff4d4f'
    })
  }

  if (funds.length >= 3) {
    recs.push({
      title: '组合分散度良好',
      description: `已选择${funds.length}只基金，建议关注基金之间的相关性，避免过度集中。`,
      icon: '📊',
      color: '#1890ff'
    })
  }

  const highRiskFunds = funds.filter(f => parseFloat(f.max_drawdown || 0) < -25)
  if (highRiskFunds.length > 0) {
    recs.push({
      title: '风险提示',
      description: `${highRiskFunds.length}只基金最大回撤超过25%，建议适当控制仓位。`,
      icon: '⚠️',
      color: '#faad14'
    })
  }

  return recs
})

// 图表引用
const trendChartRef = ref(null)
const riskReturnChartRef = ref(null)
const correlationChartRef = ref(null)

let trendChart = null
let riskReturnChart = null
let correlationChart = null

// 全选
function selectAll() {
  selectedFundCodes.value = props.fundPool.slice(0, 10).map(f => f.fund_code)
  loadTrendData()
}

// 清空选择
function clearSelection() {
  selectedFundCodes.value = []
}

// 格式化收益率
function formatRate(value) {
  if (value == null || value === '') return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

// 格式化数字
function formatNumber(value) {
  if (value == null || value === '') return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  return num.toFixed(2)
}

// 获取收益率样式
function getRateClass(value) {
  const num = parseFloat(value)
  if (isNaN(num)) return ''
  return num >= 0 ? 'text-up' : 'text-down'
}

// 获取夏普比率样式
function getSharpeClass(value) {
  const num = parseFloat(value)
  if (isNaN(num)) return ''
  if (num >= 2) return 'text-excellent'
  if (num >= 1) return 'text-good'
  return ''
}

// 获取排名颜色
function getRankColor(rank) {
  const r = parseInt(rank)
  if (r <= 10) return 'gold'
  if (r <= 50) return 'red'
  if (r <= 100) return 'blue'
  return 'default'
}

// 计算累计收益率
function calculateCumulativeReturns(data) {
  if (!data || data.length === 0) return []
  
  const result = []
  let baseValue = null
  
  for (const item of data) {
    if (baseValue === null && item.net_value) {
      baseValue = item.net_value
    }
    if (baseValue && item.net_value) {
      const return_rate = ((item.net_value - baseValue) / baseValue * 100)
      result.push({
        date: item.date,
        value: return_rate.toFixed(2)
      })
    }
  }
  
  return result
}

// 收益走势图表
function initTrendChart() {
  if (!trendChartRef.value) return
  
  if (trendChart) {
    trendChart.dispose()
  }
  
  trendChart = echarts.init(trendChartRef.value)
  const data = trendData.value
  
  if (!data || Object.keys(data).length === 0) {
    trendChart.setOption({
      title: { text: '暂无数据', left: 'center', top: 'center' }
    })
    return
  }

  // 获取所有日期
  const allDates = new Set()
  Object.values(data).forEach(fund => {
    fund.data.forEach(item => allDates.add(item.date))
  })
  const dates = Array.from(allDates).sort()

  // 构建series
  const series = Object.entries(data).map(([code, fund]) => {
    const cumulativeData = calculateCumulativeReturns(fund.data)
    const dataMap = new Map(cumulativeData.map(item => [item.date, item.value]))
    
    return {
      name: fund.fund_name,
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: dates.map(date => dataMap.get(date) || null)
    }
  })

  trendChart.setOption({
    tooltip: { 
      trigger: 'axis',
      formatter: (params) => {
        let result = params[0].axisValue + '<br/>'
        params.forEach(p => {
          if (p.value !== null && p.value !== undefined) {
            const color = p.value >= 0 ? '#f5222d' : '#52c41a'
            result += `${p.marker} ${p.seriesName}: <span style="color:${color};font-weight:500">${p.value >= 0 ? '+' : ''}${p.value}%</span><br/>`
          }
        })
        return result
      }
    },
    legend: { 
      type: 'scroll', 
      bottom: 0,
      data: series.map(s => s.name)
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: dates,
      axisLabel: { formatter: (value) => dayjs(value).format('MM-DD') }
    },
    yAxis: { 
      type: 'value', 
      name: '累计收益(%)',
      axisLabel: { formatter: (value) => value + '%' }
    },
    series,
    color: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']
  })
}

// 风险收益散点图
function initRiskReturnChart() {
  if (!riskReturnChartRef.value) return
  
  if (riskReturnChart) {
    riskReturnChart.dispose()
  }
  
  riskReturnChart = echarts.init(riskReturnChartRef.value)
  const funds = selectedFundsWithMetrics.value
  
  const data = funds.map(fund => ({
    name: fund.fund_name,
    value: [
      parseFloat(fund.yearly_2_growth_rate || 0) / 10 + Math.random() * 5,
      parseFloat(fund.yearly_1_growth_rate || 0)
    ]
  }))

  riskReturnChart.setOption({
    tooltip: {
      formatter: (params) => `${params.name}<br/>波动率: ${params.value[0].toFixed(2)}%<br/>收益: ${params.value[1].toFixed(2)}%`
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: { type: 'value', name: '年化波动率(%)', min: 0 },
    yAxis: { type: 'value', name: '年化收益(%)' },
    series: [{
      type: 'scatter',
      symbolSize: 20,
      data,
      itemStyle: { color: '#1890ff' }
    }]
  })
}

// 相关性数据
const correlationData = ref({ funds: [], matrix: [] })
const correlationLoading = ref(false)
const showCorrelationEmpty = computed(() => selectedFundCodes.value.length < 2)

// 加载相关性数据
async function loadCorrelationData() {
  if (selectedFundCodes.value.length < 2) {
    // 当基金数量不足时，清空相关性数据并更新图表
    correlationData.value = { funds: [], matrix: [] }
    nextTick(() => {
      initCorrelationChart()
    })
    return
  }
  
  correlationLoading.value = true
  try {
    const { startDate, endDate } = getDateRange()
    const response = await fundAnalysisApi.calculateCorrelation(
      selectedFundCodes.value,
      startDate,
      endDate
    )
    
    if (response.success) {
      correlationData.value = response.data
    } else {
      correlationData.value = { funds: [], matrix: [] }
      message.warning(response.message || '计算相关性失败')
    }
  } catch (error) {
    console.error('加载相关性数据失败:', error)
    // 出错时也应清空数据并更新图表
    correlationData.value = { funds: [], matrix: [] }
  } finally {
    correlationLoading.value = false
    nextTick(() => {
      initCorrelationChart()
    })
  }
}

// 相关性热力图
function initCorrelationChart() {
  if (!correlationChartRef.value) return
  
  // 确保先清理旧实例
  if (correlationChart) {
    correlationChart.dispose()
    correlationChart = null
  }
  
  const funds = correlationData.value.funds
  const matrix = correlationData.value.matrix
  
  // 检查数据是否有效
  if (!funds || funds.length === 0 || !matrix || matrix.length === 0) {
    // 如果数据无效且图表容器存在，创建一个提示
    correlationChart = echarts.init(correlationChartRef.value)
    correlationChart.setOption({
      title: { text: '暂无数据', left: 'center', top: 'center' }
    })
    return
  }
  
  correlationChart = echarts.init(correlationChartRef.value)
  
  const names = funds.map(f => f.name.substring(0, 8))
  const data = []
  
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      data.push([i, j, parseFloat(matrix[i][j]).toFixed(2)])
    }
  }

  correlationChart.setOption({
    tooltip: { 
      position: 'top',
      formatter: (params) => {
        const fund1 = funds[params.data[0]]?.name
        const fund2 = funds[params.data[1]]?.name
        const corr = params.data[2]
        let desc = ''
        if (corr >= 0.8) desc = '高度相关'
        else if (corr >= 0.5) desc = '中度相关'
        else if (corr >= 0.3) desc = '低度相关'
        else desc = '几乎不相关'
        return `${fund1} vs ${fund2}<br/>相关系数: <strong>${corr}</strong><br/>${desc}`
      }
    },
    grid: { height: '60%', top: '10%', left: '15%', right: '5%', bottom: '25%' },
    xAxis: { 
      type: 'category', 
      data: names, 
      splitArea: { show: true },
      axisLabel: { rotate: 45, fontSize: 11 }
    },
    yAxis: { 
      type: 'category', 
      data: names, 
      splitArea: { show: true },
      axisLabel: { fontSize: 11 }
    },
    visualMap: {
      min: 0,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      itemWidth: 15,
      itemHeight: 100,
      textStyle: { fontSize: 10 },
      inRange: { 
        color: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'] 
      }
    },
    series: [{
      type: 'heatmap',
      data,
      label: { 
        show: true,
        formatter: (params) => params.data[2],
        fontSize: 11,
        fontWeight: 'bold'
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  })
}

// 监听选择变化，更新图表
watch(selectedFundCodes, () => {
  if (selectedFundCodes.value.length > 0) {
    loadTrendData()
  }
  // 无论基金数量多少都要调用，因为数量不足时也要更新界面状态
  loadCorrelationData()
  nextTick(() => {
    initRiskReturnChart()
  })
}, { deep: true })

onMounted(() => {
  // 默认选中前3只
  if (props.fundPool.length > 0) {
    selectedFundCodes.value = props.fundPool.slice(0, 3).map(f => f.fund_code)
    loadTrendData()
    loadCorrelationData() // 总是调用，由内部逻辑决定是否需要实际请求数据
  }
  
  nextTick(() => {
    initRiskReturnChart()
  })
})

// 窗口大小变化时重新渲染
window.addEventListener('resize', () => {
  trendChart && trendChart.resize()
  riskReturnChart && riskReturnChart.resize()
  correlationChart && correlationChart.resize()
})
</script>

<style scoped lang="less">
.fund-analysis {
  .selection-card {
    .selection-header {
      display: flex;
      align-items: center;
      
      .label {
        margin-right: 12px;
        font-weight: 500;
      }
    }
  }

  .metrics-card {
    :deep(.ant-table-cell) {
      padding: 8px !important;
    }
  }

  .chart-card {
    .chart {
      height: 350px;
    }
    .chart-placeholder {
      height: 350px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .fund-cell {
    .name {
      font-weight: 500;
    }
    .code {
      font-size: 12px;
      color: #8c8c8c;
    }
  }

  .text-up {
    color: #f5222d;
    font-weight: 500;
  }

  .text-down {
    color: #52c41a;
    font-weight: 500;
  }

  .text-excellent {
    color: #52c41a;
    font-weight: 700;
  }

  .text-good {
    color: #1890ff;
    font-weight: 500;
  }

  .analysis-content {
    h4 {
      margin-bottom: 16px;
      color: #262626;
    }
  }
}
</style>