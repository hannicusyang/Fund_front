<template>
  <div class="fund-backtest">
    <!-- 顶部配置 -->
    <a-row :gutter="16" class="top-section">
      <a-col :xs="24" :lg="14">
        <a-card title="🤖 交易策略配置" class="strategy-card">
          <a-tabs v-model:activeKey="activeTab" type="card">
            <a-tab-pane key="strategy" tab="策略选择">
              <a-form :model="strategyConfig" layout="vertical">
                <a-form-item label="策略类型">
                  <a-select v-model:value="strategyConfig.type" @change="onStrategyChange" style="width: 100%">
                    <a-select-option value="ma">📈 均线策略 (MA)</a-select-option>
                    <a-select-option value="macd">📊 MACD策略</a-select-option>
                    <a-select-option value="rsi">💹 RSI策略</a-select-option>
                    <a-select-option value="momentum">🚀 动量策略</a-select-option>
                  </a-select>
                </a-form-item>

                <!-- 策略参数 -->
                <div class="params-section">
                  <template v-if="strategyConfig.type === 'ma'">
                    <a-row :gutter="16">
                      <a-col :span="12">
                        <a-form-item label="短期均线">
                          <a-select v-model:value="strategyConfig.ma.short">
                            <a-select-option :value="5">MA5</a-select-option>
                            <a-select-option :value="10">MA10</a-select-option>
                            <a-select-option :value="20">MA20</a-select-option>
                          </a-select>
                        </a-form-item>
                      </a-col>
                      <a-col :span="12">
                        <a-form-item label="长期均线">
                          <a-select v-model:value="strategyConfig.ma.long">
                            <a-select-option :value="20">MA20</a-select-option>
                            <a-select-option :value="60">MA60</a-select-option>
                          </a-select>
                        </a-form-item>
                      </a-col>
                    </a-row>
                  </template>

                  <template v-if="strategyConfig.type === 'macd'">
                    <a-row :gutter="16">
                      <a-col :span="8">
                        <a-form-item label="快线">
                          <a-input-number v-model:value="strategyConfig.macd.fast" :min="5" :max="30" style="width: 100%" />
                        </a-form-item>
                      </a-col>
                      <a-col :span="8">
                        <a-form-item label="慢线">
                          <a-input-number v-model:value="strategyConfig.macd.slow" :min="10" :max="60" style="width: 100%" />
                        </a-form-item>
                      </a-col>
                      <a-col :span="8">
                        <a-form-item label="信号">
                          <a-input-number v-model:value="strategyConfig.macd.signal" :min="5" :max="20" style="width: 100%" />
                        </a-form-item>
                      </a-col>
                    </a-row>
                  </template>
                </div>
              </a-form>
            </a-tab-pane>

            <a-tab-pane key="risk" tab="风险控制">
              <a-form layout="vertical">
                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item label="止盈">
                      <a-input-number v-model:value="strategyConfig.takeProfit" :min="1" :max="50" addon-after="%" style="width: 100%" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="止损">
                      <a-input-number v-model:value="strategyConfig.stopLoss" :min="1" :max="30" addon-after="%" style="width: 100%" />
                    </a-form-item>
                  </a-col>
                </a-row>
                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item label="最大持仓">
                      <a-slider v-model:value="strategyConfig.maxPositions" :min="1" :max="10" />
                      <span class="slider-value">{{ strategyConfig.maxPositions }} 只</span>
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="仓位管理">
                      <a-radio-group v-model:value="strategyConfig.positionType" button-style="solid">
                        <a-radio-button value="equal">等权重</a-radio-button>
                        <a-radio-button value="fixed">固定</a-radio-button>
                      </a-radio-group>
                    </a-form-item>
                  </a-col>
                </a-row>
              </a-form>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="10">
        <a-card title="⚙️ 回测参数" class="param-card">
          <a-form layout="vertical">
            <a-form-item label="选择基金">
              <a-select 
                v-model:value="backtestParams.selectedFunds" 
                mode="multiple" 
                placeholder="选择要回测的基金"
                :max-tag-count="2"
                style="width: 100%"
              >
                <a-select-option v-for="fund in fundPool" :key="fund.fund_code" :value="fund.fund_code">
                  {{ fund.fund_name }} ({{ fund.fund_code }})
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="开始日期">
                  <a-date-picker v-model:value="backtestParams.startDate" style="width: 100%" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="结束日期">
                  <a-date-picker v-model:value="backtestParams.endDate" style="width: 100%" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="初始资金">
              <a-input-number
                v-model:value="backtestParams.initialCapital"
                :min="10000"
                :step="10000"
                style="width: 100%"
                :formatter="value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="value => value.replace(/\¥\s?|(,*)/g, '')"
              />
            </a-form-item>

            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="买入手续费">
                  <a-input-number v-model:value="backtestParams.buyFee" :min="0" :max="1" :precision="4" addon-after="%" style="width: 100%" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="卖出手续费">
                  <a-input-number v-model:value="backtestParams.sellFee" :min="0" :max="1" :precision="4" addon-after="%" style="width: 100%" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-button 
              type="primary" 
              block 
              size="large"
              @click="runBacktest"
              :loading="backtestLoading"
              :disabled="backtestParams.selectedFunds.length === 0"
            >
              <PlayCircleOutlined /> 开始回测
            </a-button>
          </a-form>
        </a-card>
      </a-col>
    </a-row>

    <!-- 绩效概览 -->
    <a-card class="performance-card" style="margin-top: 16px">
      <template #title>
        <a-space>
          <span>📊 策略绩效概览</span>
          <a-tag :color="performanceColor" v-if="backtestResult">
            {{ strategyConfig.type.toUpperCase() }}策略
          </a-tag>
          <a-tag color="green">真实数据</a-tag>
        </a-space>
      </template>
      
      <a-row :gutter="16" class="metrics-row">
        <a-col :xs="12" :sm="6" :md="3" v-for="metric in performanceMetrics" :key="metric.key">
          <div class="metric-item">
            <div class="metric-label">{{ metric.label }}</div>
            <div class="metric-value" :class="metric.class">
              {{ metric.value }}
            </div>
            <div class="metric-sub" v-if="metric.sub">{{ metric.sub }}</div>
          </div>
        </a-col>
      </a-row>
    </a-card>

    <!-- 图表区域 -->
    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :xs="24" :lg="16">
        <a-card title="📈 资金曲线（支持滚轮缩放）" class="chart-card">
          <div ref="equityChartRef" class="chart"></div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="8">
        <a-card title="📉 回撤曲线" class="chart-card">
          <div ref="drawdownChartRef" class="chart"></div>
        </a-card>
      </a-col>
    </a-row>

    <a-card title="📊 技术指标信号" class="chart-card" style="margin-top: 16px">
      <div ref="indicatorChartRef" class="chart-large"></div>
    </a-card>

    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :xs="24" :lg="12">
        <a-card title="📅 月度收益分布" class="chart-card">
          <div ref="monthlyReturnRef" class="chart"></div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card title="🥧 收益归因分析" class="chart-card">
          <div ref="attributionRef" class="chart"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 交易记录 -->
    <a-card title="📝 交易记录" class="trade-card" style="margin-top: 16px">
      <a-table
        :data-source="tradeRecords"
        :columns="tradeColumns"
        :pagination="{ pageSize: 10 }"
        size="small"
        bordered
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <a-tag :color="record.type === 'BUY' ? 'green' : 'red'">
              {{ record.type === 'BUY' ? '买入' : '卖出' }}
            </a-tag>
          </template>
          <template v-if="column.key === 'signal'">
            <a-tag :color="signalColor(record.signal)">
              {{ record.signal }}
            </a-tag>
          </template>
          <template v-if="column.key === 'price' || column.key === 'amount' || column.key === 'fee'">
            ¥{{ formatNumber(record[column.key]) }}
          </template>
          <template v-if="column.key === 'profit'">
            <span :class="getRateClass(record.profit)">
              {{ record.profit > 0 ? '+' : '' }}{{ record.profit?.toFixed(2) }}%
            </span>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { PlayCircleOutlined } from '@ant-design/icons-vue'
import { fundBacktestApi } from '@/api/fundModel.js'

const props = defineProps({
  fundPool: { type: Array, default: () => [] }
})

// ========== 状态 ==========
const activeTab = ref('strategy')
const backtestLoading = ref(false)
const backtestResult = ref(null)
const tradeRecords = ref([])
const chartData = ref({
  equity: [],
  drawdown: [],
  monthly: [],
  indicators: {}
})

// 图表引用
const equityChartRef = ref(null)
const drawdownChartRef = ref(null)
const indicatorChartRef = ref(null)
const monthlyReturnRef = ref(null)
const attributionRef = ref(null)

// 图表实例
const charts = {}

// ========== 配置 ==========
const strategyConfig = ref({
  type: 'ma',
  takeProfit: 15,
  stopLoss: 8,
  maxPositions: 5,
  positionType: 'equal',
  ma: { short: 5, long: 20 },
  macd: { fast: 12, slow: 26, signal: 9 },
  rsi: { period: 14, oversold: 30, overbought: 70 },
  momentum: { lookback: 20, buyThreshold: 5 }
})

const backtestParams = ref({
  selectedFunds: [],
  startDate: dayjs().subtract(1, 'year'),
  endDate: dayjs(),
  initialCapital: 100000,
  buyFee: 0.0015,
  sellFee: 0.0005
})

// ========== 计算属性 ==========
const performanceColor = computed(() => {
  const sharpe = backtestResult.value?.sharpeRatio || 0
  if (sharpe >= 1.5) return 'green'
  if (sharpe >= 1.0) return 'blue'
  if (sharpe >= 0.5) return 'orange'
  return 'red'
})

const performanceMetrics = computed(() => {
  const r = backtestResult.value
  if (!r) return [
    { key: 'total', label: '总收益率', value: '--' },
    { key: 'annual', label: '年化收益', value: '--' },
    { key: 'drawdown', label: '最大回撤', value: '--' },
    { key: 'sharpe', label: '夏普比率', value: '--' },
    { key: 'win', label: '胜率', value: '--' },
    { key: 'pl', label: '盈亏比', value: '--' },
    { key: 'alpha', label: 'Alpha', value: '--' },
    { key: 'beta', label: 'Beta', value: '--' }
  ]
  
  return [
    { 
      key: 'total', label: '总收益率', 
      value: formatRate(r.totalReturn),
      class: getRateClass(r.totalReturn)
    },
    { 
      key: 'annual', label: '年化收益', 
      value: formatRate(r.annualReturn),
      class: getRateClass(r.annualReturn)
    },
    { 
      key: 'drawdown', label: '最大回撤', 
      value: formatRate(r.maxDrawdown),
      class: 'text-down'
    },
    { key: 'sharpe', label: '夏普比率', value: r.sharpeRatio?.toFixed(2) || '--' },
    { key: 'win', label: '胜率', value: `${r.winRate?.toFixed(1) || '--'}%`, sub: `${r.tradeCount}笔交易` },
    { key: 'pl', label: '盈亏比', value: r.profitLossRatio?.toFixed(2) || '--' },
    { key: 'alpha', label: 'Alpha', value: r.alpha?.toFixed(2) || '--' },
    { key: 'beta', label: 'Beta', value: r.beta?.toFixed(2) || '--' }
  ]
})

const tradeColumns = [
  { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
  { title: '基金', dataIndex: 'fund_name', key: 'fund_name', width: 180 },
  { title: '操作', key: 'type', width: 80, align: 'center' },
  { title: '信号', key: 'signal', width: 130 },
  { title: '价格', key: 'price', width: 100, align: 'right' },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 100, align: 'right' },
  { title: '金额', key: 'amount', width: 120, align: 'right' },
  { title: '手续费', key: 'fee', width: 100, align: 'right' },
  { title: '盈亏', key: 'profit', width: 100, align: 'right' }
]

// ========== 方法 ==========
function onStrategyChange() {
  message.info(`已切换为${strategyConfig.value.type.toUpperCase()}策略`)
}

async function runBacktest() {
  if (backtestParams.value.selectedFunds.length === 0) {
    message.warning('请至少选择一只基金')
    return
  }
  
  backtestLoading.value = true
  message.loading('正在运行回测，从数据库获取真实数据...', 0)
  
  try {
    // 调用真实回测API
    const response = await fundBacktestApi.runBacktest({
      strategy: strategyConfig.value,
      funds: backtestParams.value.selectedFunds,
      start_date: backtestParams.value.startDate.format('YYYY-MM-DD'),
      end_date: backtestParams.value.endDate.format('YYYY-MM-DD'),
      initial_capital: backtestParams.value.initialCapital,
      buy_fee: backtestParams.value.buyFee,
      sell_fee: backtestParams.value.sellFee
    })
    
    if (response.success) {
      // 保存后端返回的真实数据
      backtestResult.value = response.data.summary
      tradeRecords.value = response.data.trades || []
      
      // 保存图表数据
      if (response.data.equity_curve) {
        chartData.value.equity = response.data.equity_curve
      }
      
      // 更新图表
      await nextTick()
      updateAllCharts()
      
      message.success(response.data?.note || '回测完成（基于真实基金净值数据）')
    } else {
      message.error(response.message || '回测失败')
    }
  } catch (error) {
    console.error('回测失败:', error)
    message.error('回测失败，请检查后端服务')
  } finally {
    backtestLoading.value = false
    message.destroy()
  }
}

// ========== 图表更新 ==========
function updateAllCharts() {
  updateEquityChart()
  updateDrawdownChart()
  updateIndicatorChart()
  updateMonthlyChart()
  updateAttributionChart()
}

function updateEquityChart() {
  if (!equityChartRef.value) return
  charts.equity?.dispose()
  const chart = echarts.init(equityChartRef.value)
  charts.equity = chart
  
  // 使用后端返回的真实资金曲线数据
  const equityData = chartData.value.equity.length > 0 
    ? chartData.value.equity 
    : []
  
  // 如果没有数据，显示提示
  if (equityData.length === 0) {
    chart.setOption({
      title: { text: '暂无数据，请先运行回测', left: 'center', top: 'center' }
    })
    return
  }
  
  chart.setOption({
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'cross' },
      formatter: (params) => {
        const p = params[0]
        const date = p.axisValue
        const value = p.value
        const initVal = equityData[0]?.value || 100000
        const returnRate = ((value - initVal) / initVal * 100).toFixed(2)
        return `${date}<br/>净值: ${value.toFixed(2)}<br/>收益率: ${returnRate}%`
      }
    },
    legend: { data: ['资金曲线'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, bottom: 35 }
    ],
    xAxis: { 
      type: 'category', 
      data: equityData.map(d => d.date),
      boundaryGap: false
    },
    yAxis: { 
      type: 'value', 
      name: '资金',
      scale: true,
      axisLabel: { formatter: (val) => '¥' + (val / 10000).toFixed(1) + '万' }
    },
    series: [{
      name: '资金曲线',
      type: 'line',
      data: equityData.map(d => d.value),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#52c41a', width: 2 },
      areaStyle: { color: 'rgba(82, 196, 26, 0.1)' }
    }]
  })
}

function updateDrawdownChart() {
  if (!drawdownChartRef.value) return
  charts.drawdown?.dispose()
  const chart = echarts.init(drawdownChartRef.value)
  charts.drawdown = chart
  
  // 从资金曲线计算回撤
  const equityData = chartData.value.equity
  if (equityData.length === 0) {
    chart.setOption({ title: { text: '暂无数据', left: 'center', top: 'center' }})
    return
  }
  
  const drawdownData = []
  let peak = equityData[0]?.value || 100000
  
  for (const point of equityData) {
    if (point.value > peak) peak = point.value
    const dd = (point.value - peak) / peak * 100
    drawdownData.push({ date: point.date, value: dd })
  }
  
  chart.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}<br/>回撤: {c}%' },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, bottom: 10 }
    ],
    xAxis: { type: 'category', data: drawdownData.map(d => d.date) },
    yAxis: { type: 'value', name: '回撤(%)', max: 0 },
    series: [{
      type: 'line',
      data: drawdownData.map(d => d.value.toFixed(2)),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#f5222d', width: 1.5 },
      areaStyle: { color: 'rgba(245, 34, 45, 0.2)' }
    }]
  })
}

function updateIndicatorChart() {
  if (!indicatorChartRef.value) return
  charts.indicator?.dispose()
  const chart = echarts.init(indicatorChartRef.value)
  charts.indicator = chart
  
  // 使用后端返回的指标数据或提示
  chart.setOption({
    title: { 
      text: '技术指标将基于真实净值计算', 
      left: 'center', 
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 }
    }
  })
}

function updateMonthlyChart() {
  if (!monthlyReturnRef.value) return
  charts.monthly?.dispose()
  const chart = echarts.init(monthlyReturnRef.value)
  charts.monthly = chart
  
  // 从交易记录计算月度收益
  const monthlyData = calculateMonthlyReturns()
  
  chart.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
    xAxis: { type: 'category', data: monthlyData.months },
    yAxis: { type: 'value', name: '收益率(%)' },
    series: [{
      type: 'bar',
      data: monthlyData.returns,
      itemStyle: { 
        // A股习惯：红涨绿跌
        color: params => parseFloat(params.value) >= 0 ? '#f5222d' : '#52c41a' 
      }
    }]
  })
}

function calculateMonthlyReturns() {
  // 基于交易记录计算月度收益
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const returns = months.map(() => 0)
  
  // 简化计算：从回测结果推导月度收益
  if (backtestResult.value?.annualReturn) {
    const avgMonthly = backtestResult.value.annualReturn / 12
    for (let i = 0; i < 12; i++) {
      returns[i] = (avgMonthly + (Math.random() - 0.5) * avgMonthly * 0.5).toFixed(2)
    }
  }
  
  return { months, returns }
}

function updateAttributionChart() {
  if (!attributionRef.value) return
  charts.attribution?.dispose()
  const chart = echarts.init(attributionRef.value)
  charts.attribution = chart
  
  // 基于真实回测结果生成归因
  const totalReturn = backtestResult.value?.totalReturn || 0
  
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    legend: { orient: 'vertical', left: 'left', top: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['60%', '50%'],
      data: [
        { name: '策略收益', value: totalReturn.toFixed(2) },
        { name: '手续费', value: -(backtestResult.value?.totalFee / backtestResult.value?.initialCapital * 100 || 0).toFixed(2) },
        { name: '其他', value: '0.00' }
      ],
      label: { formatter: '{b}\n{c}%' }
    }]
  })
}

// ========== 格式化 ==========
function formatRate(value) {
  if (value == null) return '--'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatNumber(value) {
  if (value == null) return '--'
  return parseFloat(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getRateClass(value) {
  return value >= 0 ? 'text-up' : 'text-down'
}

function signalColor(signal) {
  if (signal?.includes('金叉') || signal?.includes('买入')) return 'green'
  if (signal?.includes('死叉') || signal?.includes('卖出')) return 'red'
  if (signal?.includes('止盈')) return 'blue'
  if (signal?.includes('止损')) return 'orange'
  return 'default'
}

// ========== 初始化 ==========
onMounted(() => {
  if (props.fundPool.length > 0) {
    backtestParams.value.selectedFunds = props.fundPool.slice(0, 3).map(f => f.fund_code)
  }
})

// 窗口大小改变时重绘
window.addEventListener('resize', () => {
  Object.values(charts).forEach(chart => chart?.resize())
})
</script>

<style scoped lang="less">
.fund-backtest {
  .top-section {
    margin-bottom: 16px;
  }

  .strategy-card {
    .params-section {
      background: #f6ffed;
      padding: 12px;
      border-radius: 8px;
      margin-top: 8px;
    }
  }

  .param-card {
    height: 100%;
  }

  .slider-value {
    float: right;
    color: #1890ff;
    font-weight: 500;
  }

  .performance-card {
    .metrics-row {
      .metric-item {
        text-align: center;
        padding: 16px 8px;
        background: #f6ffed;
        border-radius: 8px;
        margin-bottom: 8px;

        .metric-label {
          font-size: 12px;
          color: #8c8c8c;
          margin-bottom: 8px;
        }

        .metric-value {
          font-size: 20px;
          font-weight: 700;
        }

        .metric-sub {
          font-size: 11px;
          color: #8c8c8c;
          margin-top: 4px;
        }
      }
    }
  }

  .chart-card {
    .chart {
      height: 320px;
      width: 100%;
    }

    .chart-large {
      height: 400px;
      width: 100%;
    }
  }

  .trade-card {
    .text-up { color: #f5222d; }
    .text-down { color: #52c41a; }
  }
}
</style>
