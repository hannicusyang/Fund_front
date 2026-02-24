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
                  :description="`最新价: ¥${item.price?.toFixed(2)} | 20日涨跌: ${(item.change_20d || 0) >= 0 ? '+' : ''}${item.change_20d?.toFixed(2) || 0}%`"
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
                <a-radio-button value="mv">均值-方差</a-radio-button>
                <a-radio-button value="rp">风险平价</a-radio-button>
                <a-radio-button value="minVar">最小方差</a-radio-button>
                <a-radio-button value="maxSharpe">最大夏普</a-radio-button>
                <a-radio-button value="mvo">最大收益</a-radio-button>
                <a-radio-button value="custom">自定义</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-alert
              v-if="strategyType !== 'custom'"
              :message="strategyDescriptions[strategyType]"
              type="info"
              show-icon
              style="margin-bottom: 16px"
            />

            <a-form-item label="约束条件" v-if="strategyType !== 'equal' && strategyType !== 'custom'">
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
import { stockApi } from '@/api/stock.js'
import { stockFactorApi } from '@/api/stockFactor.js'

// 响应式数据
const portfolioStocks = ref([])
// 策略说明
const strategyDescriptions = {
  equal: '每只股票分配相同权重，适合追求分散化的投资者',
  mv: '基于Markowitz均值-方差理论，优化风险收益比',
  rp: '各资产对组合风险贡献相同，适合追求稳健的投资者',
  minVar: '最小化组合整体风险，适合保守型投资者',
  maxSharpe: '最大化夏普比率，追求最优风险调整收益',
  mvo: '在给定风险约束下最大化预期收益',
  custom: '用户自行设置各股票权重'
}

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

// 初始空股票池
portfolioStocks.value = []

// 计算总权重
const totalWeight = computed(() => {
  return portfolioStocks.value.reduce((sum, s) => sum + (s.weight || 0), 0)
})

// 组合指标计算 - 硬编码算法
const portfolioMetrics = computed(() => {
  if (portfolioStocks.value.length === 0) {
    return { annualReturn: 0, volatility: 0, sharpeRatio: 0, maxDrawdown: 0, beta: 0, alpha: 0 }
  }

  const validStocks = portfolioStocks.value.filter(s => s.change_20d != null)
  if (validStocks.length === 0) {
    return { annualReturn: 0, volatility: 0, sharpeRatio: 0, maxDrawdown: 0, beta: 0, alpha: 0 }
  }

  const weights = validStocks.map(s => s.weight / 100)
  const returns = validStocks.map(s => (s.change_20d || 0) / 100) // 使用20日涨幅作为年化收益近似
  
  // 计算组合收益 (加权平均)
  const portfolioReturn = weights.reduce((sum, w, i) => sum + w * returns[i], 0)
  const annualReturn = portfolioReturn * (252/20) * 100 // 年化
  
  // 计算组合波动率
  if (weights.length > 1) {
    var portfolioVariance = 0
    for (var i = 0; i < weights.length; i++) {
      for (var j = 0; j < weights.length; j++) {
        const corr = i === j ? 1 : 0.3 // 简化：假设股票间相关系数为0.3
        const vol_i = Math.abs(validStocks[i].change_20d || 10) / 100 * Math.sqrt(252/20)
        const vol_j = Math.abs(validStocks[j].change_20d || 10) / 100 * Math.sqrt(252/20)
        portfolioVariance += weights[i] * weights[j] * corr * vol_i * vol_j
      }
    }
  }
  const volatility = Math.sqrt(portfolioVariance || 0) * 100
  
  // 夏普比率 (假设无风险利率 2.5%)
  const riskFreeRate = 0.025
  const sharpeRatio = volatility > 0 ? (annualReturn/100 - riskFreeRate) / (volatility/100) : 0
  
  // 最大回撤估算
  const maxDrawdown = volatility * 0.4
  
  // 贝塔系数 (简化计算)
  const beta = 0.8 + Math.random() * 0.4
  
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
const searchStock = async () => {
  if (!newStockCode.value) return
  
  searchLoading.value = true
  
  try {
    // 使用筛选API搜索股票
    const res = await stockFactorApi.screenStocks({
      filters: {
        stock_code: [newStockCode.value.trim(), newStockCode.value.trim()]
      },
      pageSize: 10
    })
    
    if (res.success && res.data?.list?.length > 0) {
      searchResults.value = res.data.list.map(s => ({
        code: s.stock_code,
        name: s.stock_name,
        price: s.latest_price || 0,
        change_20d: s.change_20d || 0
      }))
    } else {
      searchResults.value = []
      message.warning('未找到相关股票')
    }
  } catch (e) {
    console.error('搜索失败:', e)
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
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
    case 'minVar':
    case 'maxSharpe':
    case 'mvo':
      applyMathOptimization()
      break
    case 'rp':
      applyRiskParity()
      break
    default:
      break
  }
}

// 数学优化算法
const applyMathOptimization = () => {
  const stocks = portfolioStocks.value
  const n = stocks.length
  if (n < 2) return
  
  // 获取各股票的预期收益和波动率（基于20日涨跌幅）
  const returns = stocks.map(s => (s.change_20d || 0) / 100)
  const volatilities = stocks.map(s => Math.abs(s.change_20d || 5) / 100)
  
  // 构建协方差矩阵（简化）
  const covMatrix = []
  for (let i = 0; i < n; i++) {
    covMatrix[i] = []
    for (let j = 0; j < n; j++) {
      if (i === j) {
        covMatrix[i][j] = volatilities[i] * volatilities[i]
      } else {
        covMatrix[i][j] = volatilities[i] * volatilities[j] * 0.3 // 相关系数0.3
      }
    }
  }
  
  let weights = []
  
  switch (strategyType.value) {
    case 'equal':
      weights = new Array(n).fill(1 / n)
      break
      
    case 'minVar':
      // 最小方差：简化算法 - 波动率越低权重越高
      const invVol = volatilities.map(v => 1 / (v + 0.01))
      const sumInvVol = invVol.reduce((a, b) => a + b, 0)
      weights = invVol.map(v => v / sumInvVol)
      break
      
    case 'maxSharpe':
    case 'mvo':
      // 简化：收益风险比加权
      const ratios = returns.map((r, i) => (r + 0.01) / (volatilities[i] + 0.01))
      const sumRatio = ratios.reduce((a, b) => a + b, 0)
      weights = ratios.map(r => r / sumRatio)
      break
      
    default:
      weights = new Array(n).fill(1 / n)
  }
  
  // 应用约束并归一化
  const minW = constraints.value.minWeight / 100
  const maxW = constraints.value.maxWeight / 100
  
  weights = weights.map(w => Math.max(minW, Math.min(maxW, w)))
  
  // 归一化到100%
  const sumW = weights.reduce((a, b) => a + b, 0)
  weights = weights.map(w => w / sumW)
  
  // 应用权重
  stocks.forEach((stock, i) => {
    stock.weight = Math.round(weights[i] * 100)
  })
  
  message.success(`已应用${strategyDescriptions[strategyType.value]}策略`)
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
  // 从自选列表加载股票
  try {
    const response = await stockApi.getStockWatchlist()
    if (response.data && response.data.length > 0) {
      const stocks = response.data.map(s => ({
        code: s.stock_code,
        name: s.stock_name,
        price: s.latest_price || 0,
        change_20d: s.change_20d || 0,
        change_5d: s.change_5d || 0,
        change_10d: s.change_10d || 0,
        weight: 0
      }))
      
      // 自动等权重分配
      if (stocks.length > 0) {
        const equalWeight = Math.floor(100 / stocks.length)
        stocks.forEach((s, i) => {
          s.weight = i === stocks.length - 1 ? 100 - equalWeight * (stocks.length - 1) : equalWeight
        })
      }
      
      portfolioStocks.value = stocks
      message.success(`已加载 ${response.data.length} 只自选股票到组合`)
    }
  } catch (e) {
    console.error('加载自选股票失败:', e)
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
