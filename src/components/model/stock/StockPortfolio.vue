<template>
  <div class="stock-portfolio-container">
    <!-- 股票池管理 -->
    <a-row :gutter="16">
      <!-- 左侧：股票池 -->
      <a-col :xs="24" :lg="8">
        <a-card title="📋 股票池" class="pool-card">
          <template #extra>
            <a-space>
              <a-button size="small" @click="showAddStockModal">
                <PlusOutlined /> 添加
              </a-button>
              <a-button size="small" danger @click="clearPool" :disabled="portfolioStocks.length === 0">
                <ClearOutlined /> 清空
              </a-button>
            </a-space>
          </template>

          <a-empty v-if="portfolioStocks.length === 0" description="股票池为空">
            <template #extra>
              <a-button type="primary" @click="showAddStockModal">添加股票</a-button>
            </template>
          </a-empty>

          <a-list v-else :data-source="portfolioStocks" size="small">
            <template #renderItem="{ item, index }">
              <a-list-item>
                <a-list-item-meta
                  :title="`${item.name} (${item.code})`"
                  :description="`最新价: ¥${item.price?.toFixed(2)} | 权重: ${item.weight}%`"
                >
                  <template #avatar>
                    <a-avatar :style="{ backgroundColor: getStockColor(index) }">
                      {{ item.name[0] }}
                    </a-avatar>
                  </template>
                </a-list-item-meta>
                <template #actions>
                  <a-input-number
                    v-model:value="item.weight"
                    :min="0"
                    :max="100"
                    :step="5"
                    size="small"
                    style="width: 70px"
                    suffix="%"
                    @change="onWeightChange"
                  />
                  <a-button type="link" danger size="small" @click="removeStock(index)">
                    删除
                  </a-button>
                </template>
              </a-list-item>
            </template>
          </a-list>

          <!-- 权重提示 -->
          <a-alert
            v-if="totalWeight !== 100"
            :message="`总权重: ${totalWeight}% (需等于100%)`"
            :type="totalWeight > 100 ? 'error' : 'warning'"
            show-icon
            style="margin-top: 12px"
          />
        </a-card>

        <!-- 优化策略 -->
        <a-card title="⚙️ 优化策略" class="strategy-card">
          <a-form layout="vertical">
            <a-form-item label="配置策略">
              <a-radio-group v-model:value="strategyType" @change="applyStrategy">
                <a-radio-button value="equal">等权重</a-radio-button>
                <a-radio-button value="mv">均值-方差优化</a-radio-button>
                <a-radio-button value="rp">风险平价</a-radio-button>
                <a-radio-button value="custom">自定义</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-form-item label="约束条件" v-if="strategyType !== 'equal'">
              <a-row :gutter="8">
                <a-col :span="12">
                  <a-input-number
                    v-model:value="constraints.minWeight"
                    :min="0"
                    :max="50"
                    addon-before="最小权重"
                    addon-after="%"
                    style="width: 100%"
                  />
                </a-col>
                <a-col :span="12">
                  <a-input-number
                    v-model:value="constraints.maxWeight"
                    :min="10"
                    :max="100"
                    addon-before="最大权重"
                    addon-after="%"
                    style="width: 100%"
                  />
                </a-col>
              </a-row>
            </a-form-item>

            <a-form-item label="目标函数" v-if="strategyType === 'mv'">
              <a-radio-group v-model:value="constraints.objective">
                <a-radio value="sharpe">最大化夏普比率</a-radio>
                <a-radio value="return">最大化收益</a-radio>
                <a-radio value="risk">最小化风险</a-radio>
              </a-radio-group>
            </a-form-item>

            <a-form-item>
              <a-button type="primary" block :disabled="portfolioStocks.length < 2" @click="optimizePortfolio">
                <CalculatorOutlined /> 运行优化
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>

      <!-- 右侧：组合分析 -->
      <a-col :xs="24" :lg="16">
        <!-- 组合指标概览 -->
        <a-card title="📊 组合绩效指标" class="metrics-card">
          <a-row :gutter="[16, 16]">
            <a-col :xs="12" :sm="8" :md="6">
              <div class="metric-item">
                <div class="metric-label">预期年化收益</div>
                <div class="metric-value" :class="getReturnClass(portfolioMetrics.annualReturn)">
                  {{ portfolioMetrics.annualReturn >= 0 ? '+' : '' }}{{ portfolioMetrics.annualReturn?.toFixed(2) }}%
                </div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="6">
              <div class="metric-item">
                <div class="metric-label">年化波动率</div>
                <div class="metric-value">{{ portfolioMetrics.volatility?.toFixed(2) }}%</div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="6">
              <div class="metric-item">
                <div class="metric-label">夏普比率</div>
                <div class="metric-value" :class="getSharpeClass(portfolioMetrics.sharpeRatio)">
                  {{ portfolioMetrics.sharpeRatio?.toFixed(2) }}
                </div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="6">
              <div class="metric-item">
                <div class="metric-label">最大回撤</div>
                <div class="metric-value text-down">{{ portfolioMetrics.maxDrawdown?.toFixed(2) }}%</div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="6">
              <div class="metric-item">
                <div class="metric-label">贝塔系数</div>
                <div class="metric-value">{{ portfolioMetrics.beta?.toFixed(2) }}</div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="6">
              <div class="metric-item">
                <div class="metric-label">阿尔法</div>
                <div class="metric-value" :class="getReturnClass(portfolioMetrics.alpha)">
                  {{ portfolioMetrics.alpha >= 0 ? '+' : '' }}{{ portfolioMetrics.alpha?.toFixed(2) }}%
                </div>
              </div>
            </a-col>
          </a-row>
        </a-card>

        <!-- 图表区域 -->
        <a-row :gutter="16" style="margin-top: 16px">
          <!-- 权重分布饼图 -->
          <a-col :xs="24" :md="12">
            <a-card title="🥧 权重分布" class="chart-card">
              <div ref="pieChartRef" class="chart pie-chart"></div>
            </a-card>
          </a-col>

          <!-- 风险收益散点图 -->
          <a-col :xs="24" :md="12">
            <a-card title="📈 风险收益分布" class="chart-card">
              <div ref="scatterChartRef" class="chart scatter-chart"></div>
            </a-card>
          </a-col>
        </a-row>

        <!-- 相关性矩阵 -->
        <a-card title="🔗 相关性矩阵" class="correlation-card" style="margin-top: 16px">
          <div ref="correlationChartRef" class="chart correlation-chart"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 添加股票弹窗 -->
    <a-modal
      v-model:open="addStockModalVisible"
      title="添加股票到组合"
      @ok="confirmAddStock"
      @cancel="() => { addStockModalVisible = false; newStockCode = '' }"
    >
      <a-input-search
        v-model:value="newStockCode"
        placeholder="输入股票代码"
        enter-button="搜索"
        @search="searchStock"
        :loading="searchLoading"
      />

      <a-list v-if="searchResults.length > 0" :data-source="searchResults" size="small" style="margin-top: 16px">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta
              :title="`${item.name} (${item.code})`"
              :description="`最新价: ¥${item.price?.toFixed(2)}`"
            />
            <template #actions>
              <a-button type="primary" size="small" @click="selectStock(item)">选择</a-button>
            </template>
          </a-list-item>
        </template>
      </a-list>

      <a-alert v-if="selectedStock" :message="`已选择: ${selectedStock.name}`" type="success" show-icon style="margin-top: 16px" />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ClearOutlined, CalculatorOutlined } from '@ant-design/icons-vue'
import * as echarts from 'echarts'

// 响应式数据
const portfolioStocks = ref([])
const strategyType = ref('equal')
const constraints = ref({
  minWeight: 5,
  maxWeight: 40,
  objective: 'sharpe'
})
const addStockModalVisible = ref(false)
const newStockCode = ref('')
const searchLoading = ref(false)
const searchResults = ref([])
const selectedStock = ref(null)

// 图表引用
const pieChartRef = ref(null)
const scatterChartRef = ref(null)
const correlationChartRef = ref(null)
let charts = {}

// 颜色配置
const COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc']

// 模拟股票数据库 - 硬编码
const STOCK_DATABASE = [
  { code: '600519', name: '贵州茅台', price: 1680.50, return: 0.15, volatility: 0.25 },
  { code: '000001', name: '平安银行', price: 10.50, return: 0.08, volatility: 0.30 },
  { code: '000858', name: '五粮液', price: 145.50, return: 0.12, volatility: 0.28 },
  { code: '300750', name: '宁德时代', price: 185.50, return: 0.25, volatility: 0.45 },
  { code: '002415', name: '海康威视', price: 32.80, return: 0.10, volatility: 0.32 },
  { code: '601318', name: '中国平安', price: 42.50, return: 0.06, volatility: 0.28 },
  { code: '600036', name: '招商银行', price: 32.80, return: 0.09, volatility: 0.25 },
  { code: '002594', name: '比亚迪', price: 245.80, return: 0.30, volatility: 0.50 },
  { code: '600276', name: '恒瑞医药', price: 45.50, return: -0.05, volatility: 0.35 },
  { code: '000333', name: '美的集团', price: 58.20, return: 0.11, volatility: 0.26 }
]

// 初始化添加几只股票
portfolioStocks.value = [
  { ...STOCK_DATABASE[0], weight: 30 },
  { ...STOCK_DATABASE[1], weight: 25 },
  { ...STOCK_DATABASE[2], weight: 25 },
  { ...STOCK_DATABASE[4], weight: 20 }
]

// 计算总权重
const totalWeight = computed(() => {
  return portfolioStocks.value.reduce((sum, s) => sum + (s.weight || 0), 0)
})

// 组合指标计算 - 硬编码算法
const portfolioMetrics = computed(() => {
  if (portfolioStocks.value.length === 0) {
    return { annualReturn: 0, volatility: 0, sharpeRatio: 0, maxDrawdown: 0, beta: 0, alpha: 0 }
  }

  const weights = portfolioStocks.value.map(s => s.weight / 100)
  const returns = portfolioStocks.value.map(s => s.return)
  
  // 计算组合收益 (加权平均)
  const annualReturn = weights.reduce((sum, w, i) => sum + w * returns[i], 0) * 100
  
  // 计算组合波动率 (简化计算)
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  const volatility = Math.sqrt(variance) * 100 * Math.sqrt(12) // 年化
  
  // 夏普比率 (假设无风险利率 2.5%)
  const riskFreeRate = 0.025
  const sharpeRatio = volatility > 0 ? (annualReturn/100 - riskFreeRate) / (volatility/100) : 0
  
  // 最大回撤 (模拟计算)
  const maxDrawdown = volatility * 0.5
  
  // 贝塔系数 (相对于市场)
  const beta = 0.8 + Math.random() * 0.4 // 0.8 - 1.2
  
  // 阿尔法
  const marketReturn = 0.08
  const alpha = annualReturn/100 - riskFreeRate - beta * (marketReturn - riskFreeRate)
  
  return {
    annualReturn,
    volatility,
    sharpeRatio,
    maxDrawdown: -maxDrawdown,
    beta,
    alpha: alpha * 100
  }
})

// 显示添加股票弹窗
const showAddStockModal = () => {
  addStockModalVisible.value = true
  newStockCode.value = ''
  searchResults.value = []
  selectedStock.value = null
}

// 搜索股票
const searchStock = () => {
  if (!newStockCode.value) return
  
  searchLoading.value = true
  
  // 模拟搜索
  setTimeout(() => {
    const code = newStockCode.value.trim()
    const results = STOCK_DATABASE.filter(s => 
      s.code.includes(code) || s.name.includes(code)
    )
    
    // 如果没有精确匹配，显示所有
    searchResults.value = results.length > 0 ? results : STOCK_DATABASE.slice(0, 5)
    searchLoading.value = false
  }, 300)
}

// 选择股票
const selectStock = (stock) => {
  selectedStock.value = stock
}

// 确认添加
const confirmAddStock = () => {
  if (!selectedStock.value) {
    message.warning('请先选择股票')
    return
  }
  
  // 检查是否已存在
  if (portfolioStocks.value.some(s => s.code === selectedStock.value.code)) {
    message.warning('该股票已在组合中')
    return
  }
  
  // 添加股票，默认权重为剩余权重平均分配
  const remainingWeight = Math.max(0, 100 - totalWeight.value)
  const defaultWeight = portfolioStocks.value.length > 0 ? remainingWeight / (portfolioStocks.value.length + 1) : 100
  
  portfolioStocks.value.push({
    ...selectedStock.value,
    weight: Math.round(defaultWeight)
  })
  
  message.success(`已添加 ${selectedStock.value.name}`)
  addStockModalVisible.value = false
  
  // 重新平衡权重
  rebalanceWeights()
}

// 删除股票
const removeStock = (index) => {
  portfolioStocks.value.splice(index, 1)
  rebalanceWeights()
}

// 清空股票池
const clearPool = () => {
  portfolioStocks.value = []
  message.info('已清空股票池')
}

// 权重变化处理
const onWeightChange = () => {
  nextTick(() => {
    updateCharts()
  })
}

// 重新平衡权重
const rebalanceWeights = () => {
  if (portfolioStocks.value.length === 0) return
  
  const equalWeight = Math.floor(100 / portfolioStocks.value.length)
  const remainder = 100 - equalWeight * portfolioStocks.value.length
  
  portfolioStocks.value.forEach((stock, index) => {
    stock.weight = equalWeight + (index < remainder ? 1 : 0)
  })
  
  updateCharts()
}

// 应用策略
const applyStrategy = () => {
  if (portfolioStocks.value.length < 2) return
  
  switch (strategyType.value) {
    case 'equal':
      rebalanceWeights()
      break
    case 'mv':
      applyMeanVariance()
      break
    case 'rp':
      applyRiskParity()
      break
    default:
      break
  }
}

// 均值-方差优化 - 硬编码简化算法
const applyMeanVariance = () => {
  // 简化：根据收益风险比分配权重
  const totalReturn = portfolioStocks.value.reduce((sum, s) => sum + s.return, 0)
  
  portfolioStocks.value.forEach(stock => {
    const ratio = totalReturn > 0 ? stock.return / totalReturn : 1 / portfolioStocks.value.length
    stock.weight = Math.max(constraints.value.minWeight, 
                           Math.min(constraints.value.maxWeight, 
                                   Math.round(ratio * 100)))
  })
  
  // 归一化到100%
  normalizeWeights()
  message.success('已应用均值-方差优化')
}

// 风险平价 - 硬编码简化算法
const applyRiskParity = () => {
  // 简化：波动率越低权重越高
  const inverseVols = portfolioStocks.value.map(s => 1 / (s.volatility || 0.3))
  const totalInverseVol = inverseVols.reduce((a, b) => a + b, 0)
  
  portfolioStocks.value.forEach((stock, i) => {
    const ratio = totalInverseVol > 0 ? inverseVols[i] / totalInverseVol : 1 / portfolioStocks.value.length
    stock.weight = Math.round(ratio * 100)
  })
  
  normalizeWeights()
  message.success('已应用风险平价策略')
}

// 归一化权重
const normalizeWeights = () => {
  const currentTotal = totalWeight.value
  if (currentTotal === 0 || currentTotal === 100) return
  
  const factor = 100 / currentTotal
  portfolioStocks.value.forEach(stock => {
    stock.weight = Math.round(stock.weight * factor)
  })
  
  // 处理舍入误差
  const diff = 100 - totalWeight.value
  if (diff !== 0 && portfolioStocks.value.length > 0) {
    portfolioStocks.value[0].weight += diff
  }
}

// 运行优化
const optimizePortfolio = () => {
  if (portfolioStocks.value.length < 2) {
    message.warning('请至少添加2只股票')
    return
  }
  
  loading.value = true
  
  setTimeout(() => {
    applyStrategy()
    loading.value = false
    message.success('组合优化完成')
    updateCharts()
  }, 500)
}

// 更新图表
const updateCharts = () => {
  nextTick(() => {
    renderPieChart()
    renderScatterChart()
    renderCorrelationChart()
  })
}

// 饼图
const renderPieChart = () => {
  if (!pieChartRef.value) return
  
  if (!charts.pie) {
    charts.pie = echarts.init(pieChartRef.value)
  }
  
  const data = portfolioStocks.value.map((s, i) => ({
    name: s.name,
    value: s.weight,
    itemStyle: { color: COLORS[i % COLORS.length] }
  }))
  
  charts.pie.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    legend: { orient: 'vertical', left: 'left', type: 'scroll' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{c}%' },
      data
    }]
  })
}

// 散点图
const renderScatterChart = () => {
  if (!scatterChartRef.value) return
  
  if (!charts.scatter) {
    charts.scatter = echarts.init(scatterChartRef.value)
  }
  
  const data = portfolioStocks.value.map(s => [s.volatility * 100, s.return * 100, s.weight, s.name])
  
  charts.scatter.setOption({
    tooltip: {
      formatter: (params) => {
        return `${params.data[3]}<br/>波动率: ${params.data[0].toFixed(2)}%<br/>收益: ${params.data[1].toFixed(2)}%<br/>权重: ${params.data[2]}%`
      }
    },
    xAxis: { name: '波动率(%)', type: 'value', scale: true },
    yAxis: { name: '收益率(%)', type: 'value', scale: true },
    series: [{
      type: 'scatter',
      symbolSize: (data) => Math.sqrt(data[2]) * 3,
      data,
      itemStyle: {
        color: (params) => COLORS[params.dataIndex % COLORS.length],
        opacity: 0.8
      }
    }]
  })
}

// 相关性热力图
const renderCorrelationChart = () => {
  if (!correlationChartRef.value) return
  
  if (!charts.correlation) {
    charts.correlation = echarts.init(correlationChartRef.value)
  }
  
  const n = portfolioStocks.value.length
  if (n === 0) return
  
  // 模拟相关性矩阵
  const data = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const value = i === j ? 1 : 0.3 + Math.random() * 0.5
      data.push([i, j, parseFloat(value.toFixed(2))])
    }
  }
  
  charts.correlation.setOption({
    tooltip: { position: 'top' },
    grid: { height: '70%', top: '10%' },
    xAxis: {
      type: 'category',
      data: portfolioStocks.value.map(s => s.name),
      splitArea: { show: true }
    },
    yAxis: {
      type: 'category',
      data: portfolioStocks.value.map(s => s.name),
      splitArea: { show: true }
    },
    visualMap: {
      min: 0,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: { color: ['#f0f9e8', '#bae4bc', '#7bccc4', '#43a2ca', '#0868ac'] }
    },
    series: [{
      type: 'heatmap',
      data,
      label: { show: true }
    }]
  })
}

// 获取颜色
const getStockColor = (index) => {
  return COLORS[index % COLORS.length]
}

// 样式类
const getReturnClass = (value) => {
  return value >= 0 ? 'text-up' : 'text-down'
}

const getSharpeClass = (value) => {
  if (value >= 1.5) return 'text-excellent'
  if (value >= 1.0) return 'text-good'
  if (value >= 0.5) return 'text-normal'
  return 'text-poor'
}

// 监听股票变化
watch(portfolioStocks, () => {
  updateCharts()
}, { deep: true })

// 初始化
onMounted(async () => {
  // 尝试从localStorage加载股票数据
  const savedStocks = localStorage.getItem('portfolio_stocks')
  if (savedStocks) {
    try {
      const stocks = JSON.parse(savedStocks)
      if (stocks.length > 0) {
        // 获取最新价格
        for (const stock of stocks) {
          stock.price = stock.price || 0
        }
        portfolioStocks.value = stocks
        message.success(`已加载 ${stocks.length} 只股票到组合`)
      }
    } catch (e) {
      console.error('加载组合数据失败:', e)
    }
  }
  updateCharts()
  window.addEventListener('resize', () => {
    Object.values(charts).forEach(chart => chart?.resize())
  })
})

// loading状态
const loading = ref(false)
</script>

<style scoped lang="less">
.stock-portfolio-container {
  padding: 16px;

  .pool-card, .strategy-card, .metrics-card, .chart-card, .correlation-card {
    margin-bottom: 16px;
  }

  .metric-item {
    text-align: center;
    padding: 12px 8px;
    background: #f6ffed;
    border-radius: 8px;

    .metric-label {
      font-size: 12px;
      color: #8c8c8c;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 20px;
      font-weight: 700;

      &.text-up { color: #f5222d; }
      &.text-down { color: #52c41a; }
      &.text-excellent { color: #52c41a; }
      &.text-good { color: #1890ff; }
      &.text-normal { color: #faad14; }
      &.text-poor { color: #f5222d; }
    }
  }

  .chart {
    height: 300px;
    width: 100%;
  }

  .correlation-chart {
    height: 400px;
  }
}

// 移动端适配
@media (max-width: 768px) {
  .stock-portfolio-container {
    padding: 8px;

    .metric-item .metric-value {
      font-size: 16px;
    }

    .chart {
      height: 250px;
    }
  }
}
</style>
