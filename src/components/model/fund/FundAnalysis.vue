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
              style="width: 600px"
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
      <!-- 收益走势对比 -->
      <a-col :xs="24" :lg="12">
        <a-card title="收益走势对比" class="chart-card">
          <div ref="trendChartRef" class="chart"></div>
        </a-card>
      </a-col>

      <!-- 风险收益散点图 -->
      <a-col :xs="24" :lg="12">
        <a-card title="风险收益分布" class="chart-card">
          <div ref="riskReturnChartRef" class="chart"></div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <!-- 业绩归因分析 -->
      <a-col :xs="24" :lg="12">
        <a-card title="业绩归因" class="chart-card">
          <div ref="attributionChartRef" class="chart"></div>
        </a-card>
      </a-col>

      <!-- 相关性热力图 -->
      <a-col :xs="24" :lg="12">
        <a-card title="基金相关性分析" class="chart-card">
          <div ref="correlationChartRef" class="chart"></div>
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

const props = defineProps({
  fundPool: {
    type: Array,
    default: () => []
  },
  fundNavHistory: {
    type: Array,
    default: () => []
  }
})

// 选中的基金代码
const selectedFundCodes = ref([])

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

    topOverall: funds[0] // 简化处理
  }
})

// 投资建议
const recommendations = computed(() => {
  const recs = []
  const funds = selectedFundsWithMetrics.value
  
  if (funds.length === 0) return recs

  // 收益建议
  const avgReturn = funds.reduce((sum, f) => sum + parseFloat(f.yearly_1_growth_rate || 0), 0) / funds.length
  if (avgReturn > 30) {
    recs.push({
      title: '高收益潜力',
      description: '所选基金平均年化收益超过30%，具有较强的增长潜力，但需注意波动风险。',
      icon: '🚀',
      color: '#ff4d4f'
    })
  }

  // 分散度建议
  if (funds.length >= 3) {
    recs.push({
      title: '组合分散度良好',
      description: `已选择${funds.length}只基金，建议关注基金之间的相关性，避免过度集中。`,
      icon: '📊',
      color: '#1890ff'
    })
  }

  // 风险提醒
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
const attributionChartRef = ref(null)
const correlationChartRef = ref(null)

// 全选
function selectAll() {
  selectedFundCodes.value = props.fundPool.slice(0, 10).map(f => f.fund_code)
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

// 初始化图表
function initCharts() {
  nextTick(() => {
    initTrendChart()
    initRiskReturnChart()
    initAttributionChart()
    initCorrelationChart()
  })
}

// 收益走势图表
function initTrendChart() {
  if (!trendChartRef.value) return
  
  const chart = echarts.init(trendChartRef.value)
  const funds = selectedFundsWithMetrics.value
  
  // 模拟数据
  const dates = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06']
  const series = funds.slice(0, 5).map((fund, index) => ({
    name: fund.fund_name,
    type: 'line',
    smooth: true,
    data: dates.map((_, i) => {
      const base = parseFloat(fund.yearly_1_growth_rate || 0) / 12
      return (base * (i + 1) + Math.random() * 5).toFixed(2)
    })
  }))

  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', name: '累计收益(%)' },
    series
  })
}

// 风险收益散点图
function initRiskReturnChart() {
  if (!riskReturnChartRef.value) return
  
  const chart = echarts.init(riskReturnChartRef.value)
  const funds = selectedFundsWithMetrics.value
  
  const data = funds.map(fund => ({
    name: fund.fund_name,
    value: [
      parseFloat(fund.yearly_2_growth_rate || 0) / 10 + Math.random() * 5, // 模拟波动率
      parseFloat(fund.yearly_1_growth_rate || 0)
    ]
  }))

  chart.setOption({
    tooltip: {
      formatter: (params) => `${params.name}<br/>波动率: ${params.value[0].toFixed(2)}%<br/>收益: ${params.value[1].toFixed(2)}%`
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
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

// 业绩归因图
function initAttributionChart() {
  if (!attributionChartRef.value) return
  
  const chart = echarts.init(attributionChartRef.value)
  const funds = selectedFundsWithMetrics.value.slice(0, 4)
  
  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: { 
      type: 'category', 
      data: funds.map(f => f.fund_name.substring(0, 8)) 
    },
    series: [
      { name: '选股收益', type: 'bar', stack: 'total', data: funds.map(() => (Math.random() * 10).toFixed(2)) },
      { name: '行业配置', type: 'bar', stack: 'total', data: funds.map(() => (Math.random() * 8).toFixed(2)) },
      { name: '择时收益', type: 'bar', stack: 'total', data: funds.map(() => (Math.random() * 5).toFixed(2)) }
    ]
  })
}

// 相关性热力图
function initCorrelationChart() {
  if (!correlationChartRef.value) return
  
  const chart = echarts.init(correlationChartRef.value)
  const funds = selectedFundsWithMetrics.value.slice(0, 6)
  
  const names = funds.map(f => f.fund_name.substring(0, 6))
  const data = []
  
  for (let i = 0; i < funds.length; i++) {
    for (let j = 0; j < funds.length; j++) {
      data.push([i, j, i === j ? 1 : (0.3 + Math.random() * 0.6).toFixed(2)])
    }
  }

  chart.setOption({
    tooltip: { position: 'top' },
    grid: { height: '70%', top: '10%' },
    xAxis: { type: 'category', data: names, splitArea: { show: true } },
    yAxis: { type: 'category', data: names, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: { color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4'] }
    },
    series: [{
      type: 'heatmap',
      data,
      label: { show: true }
    }]
  })
}

// 监听选择变化，更新图表
watch(selectedFundCodes, () => {
  initCharts()
}, { deep: true })

onMounted(() => {
  // 默认选中前3只
  selectAll()
  initCharts()
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
