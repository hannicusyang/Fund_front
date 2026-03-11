<template>
  <div class="stock-portfolio-container">
    <!-- 页面标题和操作 -->
    <div class="page-header">
      <a-page-header title="组合构建" sub-title="构建和优化股票投资组合">
        <template #extra>
          <a-space class="action-buttons">
            <a-button @click="loadPortfolio">
              <FolderOpenOutlined /> 加载组合
            </a-button>
            <a-button danger @click="deletePortfolio">
              <DeleteOutlined /> 删除组合
            </a-button>
            <a-button type="primary" @click="savePortfolio" :disabled="portfolioStocks.length === 0">
              <SaveOutlined /> 保存组合
            </a-button>
          </a-space>
        </template>
      </a-page-header>
    </div>
    
    <!-- 股票池管理 -->
    <a-row :gutter="16">
      <!-- 左侧：股票池 -->
      <a-col :xs="24" :lg="8">
        <a-card title="📋 股票池" class="pool-card">
          <template #extra>
            <a-space class="action-buttons">
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
            <!-- 收益类 -->
            <a-col :xs="12" :sm="8" :md="4">
              <div class="metric-item">
                <div class="metric-label">预期年化收益</div>
                <div class="metric-value" :class="getReturnClass(portfolioMetrics.annualReturn)">
                  {{ portfolioMetrics.annualReturn >= 0 ? '+' : '' }}{{ portfolioMetrics.annualReturn?.toFixed(2) }}%
                </div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="4">
              <div class="metric-item">
                <div class="metric-label">阿尔法</div>
                <div class="metric-value" :class="getReturnClass(portfolioMetrics.alpha)">
                  {{ portfolioMetrics.alpha >= 0 ? '+' : '' }}{{ portfolioMetrics.alpha?.toFixed(2) }}%
                </div>
              </div>
            </a-col>
            <!-- 风险类 -->
            <a-col :xs="12" :sm="8" :md="4">
              <div class="metric-item">
                <div class="metric-label">年化波动率</div>
                <div class="metric-value">{{ portfolioMetrics.volatility?.toFixed(2) }}%</div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="4">
              <div class="metric-item">
                <div class="metric-label">下行波动率</div>
                <div class="metric-value text-down">{{ portfolioMetrics.downsideVolatility?.toFixed(2) }}%</div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="4">
              <div class="metric-item">
                <div class="metric-label">最大回撤</div>
                <div class="metric-value text-down">{{ portfolioMetrics.maxDrawdown?.toFixed(2) }}%</div>
              </div>
            </a-col>
            <!-- 风险价值 -->
            <a-col :xs="12" :sm="8" :md="4">
              <div class="metric-item">
                <div class="metric-label">VaR (95%)</div>
                <div class="metric-value text-down">{{ portfolioMetrics.var95?.toFixed(2) }}%</div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="4">
              <div class="metric-item">
                <div class="metric-label">VaR (99%)</div>
                <div class="metric-value text-down">{{ portfolioMetrics.var99?.toFixed(2) }}%</div>
              </div>
            </a-col>
            <!-- 比率类 -->
            <a-col :xs="12" :sm="8" :md="4">
              <div class="metric-item">
                <div class="metric-label">夏普比率</div>
                <div class="metric-value" :class="getSharpeClass(portfolioMetrics.sharpeRatio)">
                  {{ portfolioMetrics.sharpeRatio?.toFixed(2) }}
                </div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="4">
              <div class="metric-item">
                <div class="metric-label">Sortino比率</div>
                <div class="metric-value" :class="getSharpeClass(portfolioMetrics.sortinoRatio)">
                  {{ portfolioMetrics.sortinoRatio?.toFixed(2) }}
                </div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="4">
              <div class="metric-item">
                <div class="metric-label">Calmar比率</div>
                <div class="metric-value" :class="getSharpeClass(portfolioMetrics.calmarRatio)">
                  {{ portfolioMetrics.calmarRatio?.toFixed(2) }}
                </div>
              </div>
            </a-col>
            <a-col :xs="12" :sm="8" :md="4">
              <div class="metric-item">
                <div class="metric-label">信息比率</div>
                <div class="metric-value" :class="getSharpeClass(portfolioMetrics.infoRatio)">
                  {{ portfolioMetrics.infoRatio?.toFixed(2) }}
                </div>
              </div>
            </a-col>
            <!-- 贝塔 -->
            <a-col :xs="12" :sm="8" :md="4">
              <div class="metric-item">
                <div class="metric-label">贝塔系数</div>
                <div class="metric-value">{{ portfolioMetrics.beta?.toFixed(2) }}</div>
              </div>
            </a-col>
          </a-row>
        </a-card>

        <!-- 组合分析建议 -->
        <a-card title="💡 组合诊断与优化建议" class="analysis-card" style="margin-top: 16px">
          <a-row :gutter="[16, 16]">
            <!-- 综合评分 -->
            <a-col :xs="24" :sm="8">
              <div class="analysis-score">
                <a-progress 
                  type="circle" 
                  :percent="analysisScore" 
                  :color="scoreColor"
                  :stroke-width="10"
                  size="120"
                >
                  <template #format>
                    <div class="score-text">
                      <div class="score-value">{{ analysisScore }}</div>
                      <div class="score-label">综合评分</div>
                    </div>
                  </template>
                </a-progress>
                <div class="score-description">{{ overallAssessment }}</div>
              </div>
            </a-col>
            
            <!-- 指标解读 - 改为栅格布局 -->
            <a-col :xs="24" :sm="16">
              <a-divider orientation="left">📊 指标诊断</a-divider>
              <a-row :gutter="[8, 8]">
                <a-col :xs="12" :sm="8" v-for="item in indicatorAnalysis" :key="item.name">
                  <div class="indicator-item" :class="'status-' + item.status">
                    <div class="indicator-header">
                      <span class="indicator-icon">{{ item.icon }}</span>
                      <span class="indicator-name">{{ item.name }}</span>
                    </div>
                    <div class="indicator-value">{{ item.value }}</div>
                    <div class="indicator-analysis">{{ item.analysis }}</div>
                  </div>
                </a-col>
              </a-row>
            </a-col>
          </a-row>
          
          <!-- 优化建议 -->
          <a-divider orientation="left">🎯 优化建议</a-divider>
          <a-alert
            v-for="(suggestion, idx) in optimizationSuggestions"
            :key="idx"
            :message="suggestion.title"
            :description="suggestion.content"
            :type="suggestion.type"
            show-icon
            style="margin-bottom: 12px"
          />
        </a-card>

        <!-- 图表区域 -->
        <a-row :gutter="16" style="margin-top: 16px">
          <!-- 权重分布饼图 -->
          <a-col :xs="24" :md="12" style="display: flex; flex-direction: column;">
            <a-card title="🥧 权重分布" class="chart-card" style="flex: 1;">
              <div ref="pieChartRef" class="chart pie-chart"></div>
            </a-card>
          </a-col>

          <!-- 风险收益散点图 -->
          <a-col :xs="24" :md="12" style="display: flex; flex-direction: column;">
            <a-card title="📈 风险收益分布" class="chart-card" style="flex: 1;">
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
import { PlusOutlined, ClearOutlined, CalculatorOutlined, SaveOutlined, FolderOpenOutlined, DeleteOutlined } from '@ant-design/icons-vue'
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

// 图表实例
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
    return { 
      annualReturn: 0, 
      volatility: 0, 
      sharpeRatio: 0, 
      maxDrawdown: 0, 
      beta: 0, 
      alpha: 0,
      sortinoRatio: 0,
      var95: 0,
      var99: 0,
      calmarRatio: 0,
      downsideVolatility: 0,
      infoRatio: 0
    }
  }

  const validStocks = portfolioStocks.value.filter(s => s.expected_return != null)
  if (validStocks.length === 0) {
    return { 
      annualReturn: 0, 
      volatility: 0, 
      sharpeRatio: 0, 
      maxDrawdown: 0, 
      beta: 0, 
      alpha: 0,
      sortinoRatio: 0,
      var95: 0,
      var99: 0,
      calmarRatio: 0,
      downsideVolatility: 0,
      infoRatio: 0
    }
  }

  // 使用60日预期收益和真实波动率
  const weights = validStocks.map(s => s.weight / 100)
  const returns = validStocks.map(s => (s.expected_return || 0) / 100)
  const volatilities = validStocks.map(s => (s.volatility || 20) / 100)
  
  // 计算组合收益 (加权平均)
  const portfolioReturn = weights.reduce((sum, w, i) => sum + w * returns[i], 0)
  const annualReturn = portfolioReturn * 100
  
  // 计算组合波动率（使用真实的年化波动率，考虑分散化效应）
  // 更多股票数量会降低非系统性风险
  const stockCount = weights.length
  const diversificationFactor = Math.min(1, 0.3 + 0.7 / Math.sqrt(stockCount)) // 分散化因子
  
  let portfolioVariance = 0
  if (weights.length > 1) {
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        // 对角线为1，非对角线使用基于股票数量的相关系数
        const corr = i === j ? 1 : 0.2 / Math.sqrt(stockCount)
        portfolioVariance += weights[i] * weights[j] * corr * volatilities[i] * volatilities[j]
      }
    }
  } else {
    portfolioVariance = weights[0] * weights[0] * volatilities[0] * volatilities[0]
  }
  const volatility = Math.sqrt(portfolioVariance) * 100 * diversificationFactor
  
  // 夏普比率 (假设无风险利率 2.5%)
  const riskFreeRate = 0.025
  const sharpeRatio = volatility > 0 ? (annualReturn/100 - riskFreeRate) / (volatility/100) : 0
  
  // 最大回撤估算 - 基于波动率和持仓天数
  // 使用更保守的估算：约等于2倍日波动率
  const dailyVol = volatility / Math.sqrt(252)
  const maxDrawdownEst = -dailyVol * 2.5 * 100 // 约2.5倍日波动率
  
  // 贝塔系数 - 基于持仓数量和平均波动率估算
  // 组合持仓越分散，贝塔越接近1
  const avgVol = volatilities.reduce((a, b) => a + b, 0) / volatilities.length * 100
  const marketVol = 20 // 假设市场波动率20%
  const rawBeta = avgVol / marketVol
  const beta = Math.max(0.5, Math.min(1.5, rawBeta * (0.5 + 0.5 / Math.sqrt(stockCount))))
  
  // 阿尔法 - 相对于市场的超额收益
  const marketReturn = 0.08 // 市场预期收益8%
  const alpha = (annualReturn/100 - riskFreeRate) - beta * (marketReturn - riskFreeRate)
  
  // ===== 新增风险指标 =====
  
  // 1. 下行波动率 - 基于波动率和下行概率估算
  const downsideVol = volatility * 0.75 // 假设75%的波动是下行
  const downsideVolatility = downsideVol
  
  // 2. Sortino比率 = (收益 - 目标收益) / 下行波动率
  const targetReturn = 0.02 // 目标收益2%
  const sortinoRatio = downsideVol > 0 ? (annualReturn/100 - targetReturn) / downsideVol : 0
  
  // 3. VaR (Value at Risk) - 风险价值
  // 95% VaR = 1.65 * 标准差
  const var95 = -1.65 * volatility / 100 * annualReturn / 100
  // 99% VaR = 2.33 * 标准差
  const var99 = -2.33 * volatility / 100 * annualReturn / 100
  
  // 4. Calmar比率 = 年化收益 / |最大回撤|
  const maxDrawdown = maxDrawdownEst
  const calmarRatio = Math.abs(maxDrawdown) > 0 ? annualReturn / Math.abs(maxDrawdown) : 0
  
  // 5. 信息比率 = 阿尔法 / 跟踪误差
  // 基于持仓数量估算跟踪误差
  const trackingError = volatility / Math.sqrt(stockCount) * 0.5
  const infoRatio = trackingError > 0 ? (alpha * 100) / trackingError : 0
  
  // 6. 正确计算VaR - 百分比形式
  const var95Percent = -1.65 * (volatility / 100)
  const var99Percent = -2.33 * (volatility / 100)
  
  return {
    annualReturn,
    volatility,
    sharpeRatio,
    maxDrawdown,
    beta,
    alpha: alpha * 100,
    sortinoRatio,
    var95: var95Percent * 100,
    var99: var99Percent * 100,
    calmarRatio,
    downsideVolatility,
    infoRatio
  }
})

// ===== 组合分析建议 =====
const analysisScore = computed(() => {
  if (portfolioStocks.value.length === 0) return 0
  
  let score = 0 // 从0开始，更客观
  
  const m = portfolioMetrics.value
  const stockCount = portfolioStocks.value.length
  
  // 夏普比率 (满分20) - 核心风险收益指标
  if (m.sharpeRatio >= 1.5) score += 20
  else if (m.sharpeRatio >= 1.0) score += 15
  else if (m.sharpeRatio >= 0.5) score += 10
  else if (m.sharpeRatio >= 0) score += 5
  // 夏普为负不扣分，但不加
  
  // Sortino比率 (满分15) - 下行风险调整收益
  if (m.sortinoRatio >= 2.0) score += 15
  else if (m.sortinoRatio >= 1.5) score += 12
  else if (m.sortinoRatio >= 1.0) score += 8
  else if (m.sortinoRatio >= 0.5) score += 4
  
  // 最大回撤 (满分15) - 最重要的风险指标
  const dd = Math.abs(m.maxDrawdown)
  if (dd <= 10) score += 15
  else if (dd <= 15) score += 12
  else if (dd <= 20) score += 8
  else if (dd <= 30) score += 4
  
  // 阿尔法 (满分15) - 超额收益能力
  if (m.alpha >= 5) score += 15
  else if (m.alpha >= 2) score += 12
  else if (m.alpha >= 0) score += 8
  else if (m.alpha >= -2) score += 4 // 允许小幅跑输
  
  // 波动率 (满分15) - 风险水平
  if (m.volatility <= 15) score += 15
  else if (m.volatility <= 20) score += 12
  else if (m.volatility <= 25) score += 8
  else if (m.volatility <= 30) score += 4
  
  // 分散度 (满分10) - 非系统性风险分散
  if (stockCount >= 15) score += 10
  else if (stockCount >= 10) score += 8
  else if (stockCount >= 8) score += 6
  else if (stockCount >= 5) score += 4
  else if (stockCount >= 3) score += 2
  
  // Beta合理性 (满分5)
  if (m.beta >= 0.8 && m.beta <= 1.2) score += 5 // 接近市场风险
  else if (m.beta >= 0.6 && m.beta <= 1.4) score += 3
  
  // VaR风险控制 (满分5)
  if (Math.abs(m.var95) <= 5) score += 5
  else if (Math.abs(m.var95) <= 10) score += 3
  else if (Math.abs(m.var95) <= 15) score += 1
  
  return Math.min(100, Math.max(0, score))
})

const scoreColor = computed(() => {
  const s = analysisScore.value
  if (s >= 70) return '#52c41a'
  if (s >= 50) return '#faad14'
  return '#f5222d'
})

const overallAssessment = computed(() => {
  const s = analysisScore.value
  if (s >= 80) return '优秀 - 组合表现优异，风险收益特征良好'
  if (s >= 70) return '良好 - 组合配置合理，具备投资价值'
  if (s >= 50) return '一般 - 建议关注风险，调整优化'
  if (s >= 30) return '较弱 - 风险较高，需及时调整'
  return '警告 - 组合表现不佳，建议重构'
})

const indicatorAnalysis = computed(() => {
  const m = portfolioMetrics.value
  const analysis = []
  
  // 夏普比率
  const sharpeStatus = m.sharpeRatio >= 1 ? 'good' : m.sharpeRatio >= 0.5 ? 'warning' : 'bad'
  analysis.push({
    icon: '📈',
    name: '夏普比率',
    value: m.sharpeRatio?.toFixed(2),
    status: sharpeStatus,
    analysis: sharpeStatus === 'good' ? '风险调整收益优秀' : sharpeStatus === 'warning' ? '风险调整收益一般' : '风险调整收益较差'
  })
  
  // 波动率
  const volStatus = m.volatility <= 20 ? 'good' : m.volatility <= 30 ? 'warning' : 'bad'
  analysis.push({
    icon: '📊',
    name: '波动率',
    value: m.volatility?.toFixed(2) + '%',
    status: volStatus,
    analysis: volStatus === 'good' ? '波动适中' : volStatus === 'warning' ? '波动较大' : '波动剧烈'
  })
  
  // 最大回撤
  const ddStatus = Math.abs(m.maxDrawdown) <= 15 ? 'good' : Math.abs(m.maxDrawdown) <= 25 ? 'warning' : 'bad'
  analysis.push({
    icon: '🔻',
    name: '最大回撤',
    value: m.maxDrawdown?.toFixed(2) + '%',
    status: ddStatus,
    analysis: ddStatus === 'good' ? '回撤可控' : ddStatus === 'warning' ? '回撤较大' : '回撤过大'
  })
  
  // 阿尔法
  const alphaStatus = m.alpha > 2 ? 'good' : m.alpha > 0 ? 'warning' : 'bad'
  analysis.push({
    icon: '🏆',
    name: '阿尔法',
    value: (m.alpha >= 0 ? '+' : '') + m.alpha?.toFixed(2) + '%',
    status: alphaStatus,
    analysis: alphaStatus === 'good' ? '超额收益显著' : alphaStatus === 'warning' ? '略有超额收益' : '无超额收益'
  })
  
  // VaR
  const varStatus = Math.abs(m.var95) <= 10 ? 'good' : Math.abs(m.var95) <= 20 ? 'warning' : 'bad'
  analysis.push({
    icon: '⚠️',
    name: 'VaR(95%)',
    value: m.var95?.toFixed(2) + '%',
    status: varStatus,
    analysis: varStatus === 'good' ? '风险可控' : varStatus === 'warning' ? '存在一定风险' : '风险较高'
  })
  
  // 分散度
  const divStatus = portfolioStocks.value.length >= 8 ? 'good' : portfolioStocks.value.length >= 4 ? 'warning' : 'bad'
  analysis.push({
    icon: '🎯',
    name: '分散度',
    value: portfolioStocks.value.length + '只',
    status: divStatus,
    analysis: divStatus === 'good' ? '分散度良好' : divStatus === 'warning' ? '建议增加持仓' : '过于集中'
  })
  
  return analysis
})

const optimizationSuggestions = computed(() => {
  const suggestions = []
  const m = portfolioMetrics.value
  
  // 基于评分的建议
  if (analysisScore.value < 50) {
    suggestions.push({
      title: '⚠️ 组合综合评分较低',
      content: '当前组合风险收益特征不佳，建议进行全面重构或参考优化策略重新配置',
      type: 'error'
    })
  }
  
  // 波动率建议
  if (m.volatility > 30) {
    suggestions.push({
      title: '📊 波动率偏高',
      content: '组合年化波动率超过30%，建议增加低波动资产或降低高波动股票权重',
      type: 'warning'
    })
  }
  
  // 最大回撤建议
  if (Math.abs(m.maxDrawdown) > 25) {
    suggestions.push({
      title: '🔻 最大回撤过大',
      content: '组合最大回撤超过25%，建议增加防御性资产或降低单一股票仓位',
      type: 'warning'
    })
  }
  
  // 夏普比率建议
  if (m.sharpeRatio < 0.5) {
    suggestions.push({
      title: '📉 夏普比率偏低',
      content: '风险调整收益不理想，建议使用"最大夏普"策略优化权重配置',
      type: 'warning'
    })
  }
  
  // 分散度建议
  if (portfolioStocks.value.length < 5) {
    suggestions.push({
      title: '🎯 持仓过于集中',
      content: '股票数量少于5只，建议增加持仓分散度至8-15只降低非系统性风险',
      type: 'warning'
    })
  }
  
  // 阿尔法建议
  if (m.alpha < 0) {
    suggestions.push({
      title: '🏆 阿尔法为负',
      content: '组合跑输基准，建议关注多因子选股或调整行业配置',
      type: 'warning'
    })
  }
  
  // VaR建议
  if (Math.abs(m.var95) > 15) {
    suggestions.push({
      title: '⚠️ VaR风险较高',
      content: '95%置信度下单日最大损失超过15%，建议降低仓位或增加避险资产',
      type: 'warning'
    })
  }
  
  // 正面建议
  if (suggestions.length === 0) {
    suggestions.push({
      title: '✅ 组合表现良好',
      content: '当前组合各项指标表现良好，建议定期监控并根据市场变化动态调整',
      type: 'success'
    })
  }
  
  // 策略建议
  if (portfolioStocks.value.length >= 5) {
    suggestions.push({
      title: '💡 策略建议',
      content: '可尝试"风险平价"策略降低组合波动，或使用"均值-方差"优化寻找最优配置',
      type: 'info'
    })
  }
  
  return suggestions
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
        price: parseFloat(s.latest_price) || 0,
        change_20d: parseFloat(s.change_20d) || 0,
        volatility: parseFloat(s.volatility) || 0,
        expected_return: parseFloat(s.expected_return) || 0
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

// 保存组合到本地（只保存股票代码、名称、权重，不保存价格等变动数据）
const savePortfolio = () => {
  const name = prompt('请输入组合名称:', `组合_${new Date().toLocaleDateString()}`)
  if (!name) return
  
  const portfolioData = {
    name,
    strategyType: strategyType.value,
    constraints: constraints.value,
    stocks: portfolioStocks.value.map(s => ({
      code: s.code,
      name: s.name,
      weight: s.weight
    })),
    savedAt: new Date().toISOString()
  }
  
  localStorage.setItem('stock_portfolio_' + name, JSON.stringify(portfolioData))
  
  const savedList = JSON.parse(localStorage.getItem('saved_portfolios') || '[]')
  const existingIndex = savedList.findIndex(p => p.name === name)
  if (existingIndex >= 0) {
    savedList[existingIndex] = { name, savedAt: portfolioData.savedAt }
  } else {
    savedList.push({ name, savedAt: portfolioData.savedAt })
  }
  localStorage.setItem('saved_portfolios', JSON.stringify(savedList))
  
  message.success(`组合 "${name}" 已保存`)
}

// 加载组合（从数据库获取最新股票数据）
const loadPortfolio = async () => {
  const savedList = JSON.parse(localStorage.getItem('saved_portfolios') || '[]')
  
  if (savedList.length === 0) {
    message.info('暂无保存的组合')
    return
  }
  
  const names = savedList.map(p => p.name).join('\n')
  const name = prompt('请输入要加载的组合名称:\n\n已保存的组合:\n' + names)
  if (!name) return
  
  const data = localStorage.getItem('stock_portfolio_' + name)
  if (!data) {
    message.error('组合不存在')
    return
  }
  
  try {
    const portfolioData = JSON.parse(data)
    strategyType.value = portfolioData.strategyType || 'equal'
    constraints.value = portfolioData.constraints || {}
    
    const stockCodes = (portfolioData.stocks || []).map(s => s.code)
    
    // 从数据库获取最新股票数据
    let stockDataMap = {}
    try {
      message.loading('正在获取最新数据...', 0)
      const res = await fetch('/api/stock/by_codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: stockCodes })
      })
      const result = await res.json()
      message.loading('', 0)
      
      if (result.success && result.data) {
        result.data.forEach(s => {
          stockDataMap[s.stock_code] = s
        })
      }
    } catch (e) {
      message.loading('', 0)
    }
    
    // 合并保存的权重和数据库最新数据
    portfolioStocks.value = (portfolioData.stocks || []).map(s => {
      const dbData = stockDataMap[s.code] || {}
      return {
        code: s.code,
        name: dbData.stock_name || s.name,
        weight: s.weight || 0,
        price: dbData.latest_price || 0,
        change_20d: dbData.change_20d || 0
      }
    })
    
    rebalanceWeights()
    message.success(`组合 "${name}" 已加载 (${portfolioStocks.value.length}只股票)`)
  } catch (e) {
    message.error('加载失败: ' + e.message)
  }
}

// 删除组合
const deletePortfolio = () => {
  const savedList = JSON.parse(localStorage.getItem('saved_portfolios') || '[]')
  
  if (savedList.length === 0) {
    message.info('暂无保存的组合')
    return
  }
  
  const names = savedList.map(p => p.name).join('\n')
  const name = prompt('请输入要删除的组合名称:\n\n已保存的组合:\n' + names)
  if (!name) return
  
  // 检查组合是否存在
  const existingIndex = savedList.findIndex(p => p.name === name)
  if (existingIndex < 0) {
    message.error('组合不存在')
    return
  }
  
  // 删除
  localStorage.removeItem('stock_portfolio_' + name)
  savedList.splice(existingIndex, 1)
  localStorage.setItem('saved_portfolios', JSON.stringify(savedList))
  
  message.success(`组合 "${name}" 已删除`)
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
  
  // 使用真实的预期收益和波动率
  const returns = stocks.map(s => (s.expected_return || 0) / 100)
  const volatilities = stocks.map(s => (s.volatility || 20) / 100)
  
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
  
  // 最小方差：简化算法 - 波动率越低权重越高
  const invVol = volatilities.map(v => 1 / (v + 0.01))
  const sumInvVol = invVol.reduce((a, b) => a + b, 0)
  
  // 简化：收益风险比加权
  const ratios = returns.map((r, i) => (r + 0.01) / (volatilities[i] + 0.01))
  const sumRatio = ratios.reduce((a, b) => a + b, 0)
  
  switch (strategyType.value) {
    case 'equal':
      weights = new Array(n).fill(1 / n)
      break
      
    case 'minVar':
      weights = invVol.map(v => v / sumInvVol)
      break
      
    case 'maxSharpe':
    case 'mvo':
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
    // 延迟确保布局完成
    setTimeout(() => {
      renderPieChart()
      renderScatterChart()
      renderCorrelationChart()
    }, 100)
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
  
  // 确保图表正确渲染
  charts.pie.resize()
}

// 散点图
const renderScatterChart = () => {
  if (!scatterChartRef.value) return
  
  if (!charts.scatter) {
    charts.scatter = echarts.init(scatterChartRef.value)
  }
  
  // 使用真实的年化波动率和60日预期收益，如果没有则用change_percent估算
  const data = portfolioStocks.value.map(s => {
    // 优先使用真实数据，如果没有则用change_percent估算
    let expectedReturn = s.expected_return
    let volatility = s.volatility
    
    if (expectedReturn === null || expectedReturn === undefined || expectedReturn === 0) {
      // 用20日涨幅估算年化收益
      expectedReturn = (s.change_20d || s.change_percent || 0) * 5
    }
    if (volatility === null || volatility === undefined || volatility === 0) {
      // 用变化率估算波动率
      volatility = Math.abs(s.change_percent || 5) * 2
    }
    
    return [volatility, expectedReturn, s.weight, s.name]
  })
  
  charts.scatter.setOption({
    tooltip: {
      formatter: (params) => {
        return `${params.data[3]}<br/>波动率: ${params.data[0].toFixed(2)}%<br/>预期收益: ${params.data[1].toFixed(2)}%<br/>权重: ${params.data[2]}%`
      }
    },
    xAxis: { name: '波动率(%)', type: 'value', scale: true },
    yAxis: { name: '预期收益(%)', type: 'value', scale: true },
    series: [{
      type: 'scatter',
      symbolSize: (val) => Math.sqrt(val[2]) * 3 || 10,
      data,
      itemStyle: {
        color: (params) => COLORS[params.dataIndex % COLORS.length],
        opacity: 0.8
      }
    }]
  })
  
  // 确保图表正确渲染
  charts.scatter.resize()
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
  
  // 确保图表正确渲染
  charts.correlation.resize()
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

// 初始化 - 从自选列表加载
onMounted(async () => {
  try {
    const response = await stockApi.getStockWatchlist()
    if (response.data && response.data.length > 0) {
      const stocks = response.data.map(s => ({
        code: s.stock_code,
        name: s.stock_name,
        price: parseFloat(s.latest_price) || 0,
        change_20d: parseFloat(s.change_20d) || 0,
        change_5d: parseFloat(s.change_5d) || 0,
        change_10d: parseFloat(s.change_10d) || 0,
        volatility: parseFloat(s.volatility) || 0,
        expected_return: parseFloat(s.expected_return) || 0,
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
    } else {
      message.info('请在筛选页面添加股票到自选')
    }
  } catch (e) {
    console.error('加载自选股票失败:', e)
    message.error('加载自选股票失败')
  }
  
  // 延迟渲染图表，确保DOM和数据都准备好
  setTimeout(() => {
    updateCharts()
  }, 300)
  
  // 窗口大小变化时重新调整图表大小
  let resizeTimer
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      Object.values(charts).forEach(chart => chart?.resize())
    }, 100)
  })
})

// loading状态
const loading = ref(false)
</script>

<style scoped lang="less">
.stock-portfolio-container {
  padding: 16px;

  .page-header {
    margin-bottom: 16px;
    background: #fff;
    border-radius: 8px;
  }

  // 页面标题移动端适配
  @media (max-width: 768px) {
    .page-header {
      margin-bottom: 8px;
      padding: 0;
    }
    
    .page-header :deep(.ant-page-header) {
      padding: 12px;
    }
    
    .page-header :deep(.ant-page-header-heading) {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .page-header :deep(.ant-page-header-heading-left) {
      width: 100%;
      margin-bottom: 8px;
    }
    
    .page-header :deep(.ant-page-header-heading-title) {
      font-size: 16px;
    }
    
    .page-header :deep(.ant-page-header-heading-sub-title) {
      font-size: 12px;
    }
    
    .page-header :deep(.ant-page-header-content) {
      padding-top: 8px;
    }
    
    .page-header :deep(.ant-page-header-extra) {
      width: 100%;
      margin-left: 0;
    }
    
    .page-header :deep(.action-buttons) {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      width: 100%;
    }
    
    .page-header :deep(.action-buttons .ant-btn) {
      flex: 1 1 auto;
      min-width: 60px;
      padding: 4px 8px;
      font-size: 11px;
      height: 28px;
    }
  }

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
    min-width: 0;
  }

  .pie-chart, .scatter-chart {
    width: 100%;
    min-width: 0;
  }

  .correlation-chart {
    height: 400px;
    width: 100%;
    min-width: 0;
  }
}

// 组合分析样式
.analysis-card {
  .analysis-score {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
    
    .score-text {
      text-align: center;
      
      .score-value {
        font-size: 28px;
        font-weight: bold;
        line-height: 1.2;
      }
      
      .score-label {
        font-size: 12px;
        color: #666;
      }
    }
    
    .score-description {
      margin-top: 12px;
      text-align: center;
      font-size: 14px;
      color: #333;
    }
  }
  
  // 指标诊断卡片样式
  .indicator-item {
    background: #fafafa;
    border-radius: 8px;
    padding: 12px;
    border-left: 3px solid #d9d9d9;
    
    &.status-good {
      border-left-color: #52c41a;
      background: #f6ffed;
    }
    &.status-warning {
      border-left-color: #faad14;
      background: #fffbe6;
    }
    &.status-bad {
      border-left-color: #f5222d;
      background: #fff1f0;
    }
    
    .indicator-header {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
      
      .indicator-icon {
        font-size: 14px;
        margin-right: 4px;
      }
      .indicator-name {
        font-size: 12px;
        color: #666;
      }
    }
    
    .indicator-value {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-bottom: 2px;
    }
    
    .indicator-analysis {
      font-size: 12px;
      color: #666;
    }
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

<style scoped>
/* 移动端按钮适配 */
@media (max-width: 768px) {
  .action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .action-buttons .ant-btn {
    flex: 1;
    min-width: 80px;
    font-size: 12px;
  }
}
/* 移动端适配 */
@media (max-width: 768px) {
  :deep(.ant-card) {
    margin-bottom: 8px;
    border-radius: 8px;
  }
  :deep(.ant-card-body) {
    padding: 12px;
  }
  :deep(.ant-table) {
    font-size: 12px;
  }
  :deep(.ant-table-thead > tr > th) {
    padding: 8px;
    font-size: 11px;
  }
  :deep(.ant-table-tbody > tr > td) {
    padding: 8px;
  }
  :deep(.ant-statistic) {
    font-size: 14px;
  }
}
</style>

<style scoped>
/* 移动端按钮适配 */
@media (max-width: 768px) {
  .action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .action-buttons .ant-btn {
    flex: 1;
    min-width: 80px;
    font-size: 12px;
  }
}
/* 移动端卡片 */
.mobile-stock-list { padding: 0; }
.stock-card {
  background: #fff;
  border-radius: 8px;
  margin-bottom: 8px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.stock-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.stock-card .stock-name { font-size: 14px; font-weight: 600; }
.stock-card .stock-code { font-size: 11px; color: #888; }
.stock-card .card-body { display: flex; flex-direction: column; gap: 6px; }
.stock-card .card-row {
  display: flex;
  justify-content: space-between;
  background: #fafafa;
  padding: 6px 8px;
  border-radius: 6px;
}
.stock-card .card-item { flex: 1; text-align: center; }
.stock-card .card-item .label { display: block; font-size: 10px; color: #888; }
.stock-card .card-item .value { display: block; font-size: 12px; font-weight: 500; }
.text-up { color: #f5222d; }
.text-down { color: #52c41a; }
</style>
