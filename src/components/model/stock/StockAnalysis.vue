<template>
  <div class="stock-analysis-container">
    <!-- 股票备选池 -->
    <a-card title="📋 股票备选池" class="pool-card" size="small">
      <div class="stock-pool">
        <span 
          v-for="stock in stockPool" 
          :key="stock.code"
          class="pool-item-wrapper"
        >
          <a-tag 
            :color="stockCode === stock.code ? 'blue' : 'default'"
            closable
            @close.prevent="confirmDelete(stock)"
            @click="selectStock(stock.code)"
          >
            {{ stock.name }} ({{ stock.code }})
          </a-tag>
        </span>
        <span v-if="stockPool.length === 0" class="no-data">暂无自选股票</span>
      </div>
    </a-card>

    <!-- 删除确认弹窗 -->
    <a-modal
      v-model:open="deleteModal.visible"
      title="确认删除"
      @ok="handleDelete"
      @cancel="deleteModal.visible = false"
      :confirmLoading="deleteModal.loading"
    >
      <p>确定要从自选池中删除 <b>{{ deleteModal.stock?.name }}</b> 吗？</p>
    </a-modal>

    <!-- 股票搜索区域 -->
    <a-card class="search-card">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :md="6">
          <a-input-search
            v-model:value="stockCode"
            placeholder="输入股票代码 (如 600519)"
            enter-button
            @search="onSearch"
            :loading="loading"
            size="large"
          />
        </a-col>
        <a-col :xs="24" :sm="12" :md="18">
          <a-space>
            <a-select v-model:value="timeRange" style="width: 130px" @change="onTimeRangeChange" size="large">
              <a-select-option value="1m">近1月</a-select-option>
              <a-select-option value="3m">近3月</a-select-option>
              <a-select-option value="6m">近6月</a-select-option>
              <a-select-option value="1y">近1年</a-select-option>
              <a-select-option value="2y">近2年</a-select-option>
            </a-select>
            <a-radio-group v-model:value="chartType" button-style="solid" size="large" @change="onChartTypeChange">
              <a-radio-button value="kline">K线</a-radio-button>
              <a-radio-button value="line">收盘线</a-radio-button>
            </a-radio-group>
            <a-button @click="refreshData" :loading="loading" size="large">
              <ReloadOutlined /> 刷新数据
            </a-button>
          </a-space>
        </a-col>
      </a-row>

      <!-- 股票基本信息 -->
      <div v-if="currentStock" class="stock-info">
        <a-divider />
        <a-row :gutter="16">
          <a-col :xs="24" :sm="12" :md="5">
            <div class="info-item main-info">
              <span class="label">股票名称</span>
              <span class="value name">{{ currentStock.name }}</span>
            </div>
          </a-col>
          <a-col :xs="12" :sm="6" :md="3">
            <div class="info-item">
              <span class="label">最新价</span>
              <span class="value price" :class="getPriceClass(currentStock.change)">
                {{ currentStock.price?.toFixed(2) }}
              </span>
            </div>
          </a-col>
          <a-col :xs="12" :sm="6" :md="3">
            <div class="info-item">
              <span class="label">涨跌幅</span>
              <span class="value" :class="getPriceClass(currentStock.change)">
                {{ currentStock.change > 0 ? '+' : '' }}{{ currentStock.change?.toFixed(2) }}%
              </span>
            </div>
          </a-col>
          <a-col :xs="12" :sm="6" :md="3">
            <div class="info-item">
              <span class="label">成交量</span>
              <span class="value">{{ formatVolume(currentStock.volume) }}</span>
            </div>
          </a-col>
          <a-col :xs="12" :sm="6" :md="3">
            <div class="info-item">
              <span class="label">成交额</span>
              <span class="value">{{ formatAmount(currentStock.amount) }}</span>
            </div>
          </a-col>
          <a-col :xs="12" :sm="6" :md="3">
            <div class="info-item">
              <span class="label">最高</span>
              <span class="value up">{{ currentStock.high?.toFixed(2) }}</span>
            </div>
          </a-col>
          <a-col :xs="12" :sm="6" :md="3">
            <div class="info-item">
              <span class="label">最低</span>
              <span class="value down">{{ currentStock.low?.toFixed(2) }}</span>
            </div>
          </a-col>
        </a-row>
      </div>
    </a-card>

    <!-- 综合分析报告 -->
    <a-card v-if="currentStock && analysisReport" class="analysis-report-card" :bordered="false">
      <div class="analysis-header">
        <span class="title">📊 综合技术分析报告</span>
        <a-tag :color="analysisReport.overallTrend === '强势上涨' ? 'red' : analysisReport.overallTrend === '弱势下跌' ? 'green' : 'orange'" style="font-size: 14px; padding: 4px 12px;">
          {{ analysisReport.overallTrend }}
        </a-tag>
      </div>
      
      <!-- 核心指标展示 -->
      <div class="core-indicators">
        <div class="core-item trend">
          <div class="core-icon">📈</div>
          <div class="core-content">
            <span class="core-label">趋势判断</span>
            <span class="core-value">{{ analysisReport.trend }}</span>
          </div>
        </div>
        <div class="core-item support">
          <div class="core-icon">⬇️</div>
          <div class="core-content">
            <span class="core-label">支撑位</span>
            <span class="core-value">{{ analysisReport.support }}</span>
          </div>
        </div>
        <div class="core-item resistance">
          <div class="core-icon">⬆️</div>
          <div class="core-content">
            <span class="core-label">压力位</span>
            <span class="core-value">{{ analysisReport.resistance }}</span>
          </div>
        </div>
        <div class="core-item volatility">
          <div class="core-icon">📊</div>
          <div class="core-content">
            <span class="core-label">波动率</span>
            <span class="core-value">{{ analysisReport.volatility }}%</span>
          </div>
        </div>
        <div class="core-item risk">
          <div class="core-icon">⚠️</div>
          <div class="core-content">
            <span class="core-label">风险等级</span>
            <a-tag :color="analysisReport.riskLevel === '较高' ? 'red' : analysisReport.riskLevel === '较低' ? 'green' : 'orange'" style="margin-top: 4px;">
              {{ analysisReport.riskLevel }}
            </a-tag>
          </div>
        </div>
      </div>
      
      <!-- 快速指标 -->
      <a-row :gutter="16" class="quick-indicators">
        <a-col :xs="12" :sm="8" v-if="keyIndicators">
          <div class="quick-item">
            <span class="label">最新价</span>
            <span class="value">{{ keyIndicators.latestPrice?.toFixed(2) }}</span>
          </div>
        </a-col>
        <a-col :xs="12" :sm="8" v-if="keyIndicators">
          <div class="quick-item">
            <span class="label">涨跌幅</span>
            <span class="value" :class="keyIndicators.changePercent >= 0 ? 'up' : 'down'">
              {{ keyIndicators.changePercent?.toFixed(2) }}%
            </span>
          </div>
        </a-col>
        <a-col :xs="12" :sm="8" v-if="keyIndicators">
          <div class="quick-item">
            <span class="label">成交量</span>
            <span class="value">{{ formatVolume(keyIndicators.volume) }}</span>
          </div>
        </a-col>
      </a-row>
    </a-card>

    <!-- 技术指标选择 -->
    <a-card title="📊 技术指标" class="indicator-card">
      <a-checkbox-group v-model:value="selectedIndicators" @change="onIndicatorChange">
        <a-row :gutter="[16, 8]">
          <a-col :xs="12" :sm="6">
            <a-checkbox value="ma">MA均线 (5/10/20/60)</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="macd">MACD</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="rsi">RSI</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="kdj">KDJ</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="boll">布林带</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="volume">成交量</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="dmi">DMI指标</a-checkbox>
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-checkbox value="obv">OBV能量潮</a-checkbox>
          </a-col>
        </a-row>
      </a-checkbox-group>

      <!-- 关键指标数值 -->
      <div v-if="currentStock && keyIndicators" class="key-indicators">
        <a-divider>关键指标</a-divider>
        <a-row :gutter="16">
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">MA5</span>
              <span class="value">{{ keyIndicators.ma5?.toFixed(2) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">MA10</span>
              <span class="value">{{ keyIndicators.ma10?.toFixed(2) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">MA20</span>
              <span class="value">{{ keyIndicators.ma20?.toFixed(2) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">MACD</span>
              <span class="value" :class="keyIndicators.macdBar > 0 ? 'up' : 'down'">
                {{ keyIndicators.macdBar?.toFixed(2) }}
              </span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">RSI(14)</span>
              <span class="value" :class="getRSIClass(keyIndicators.rsi)">
                {{ keyIndicators.rsi?.toFixed(1) }}
              </span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">KDJ(K)</span>
              <span class="value" :class="getKDJClass(keyIndicators.k)">
                {{ keyIndicators.k?.toFixed(1) }}
              </span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">DMI(+DI)</span>
              <span class="value">{{ keyIndicators.plusDi?.toFixed(1) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">ADX</span>
              <span class="value">{{ keyIndicators.adx?.toFixed(1) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">BOLL(上)</span>
              <span class="value">{{ keyIndicators.bollUpper?.toFixed(2) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">BOLL(中)</span>
              <span class="value">{{ keyIndicators.bollMiddle?.toFixed(2) }}</span>
            </div>
          </a-col>
          <a-col :xs="8" :sm="4">
            <div class="indicator-box">
              <span class="label">BOLL(下)</span>
              <span class="value">{{ keyIndicators.bollLower?.toFixed(2) }}</span>
            </div>
          </a-col>
        </a-row>
      </div>
    </a-card>

    <!-- K线图 -->
    <a-card title="📈 K线走势图" class="chart-card">
      <div ref="klineChartRef" class="kline-chart"></div>
    </a-card>

    <!-- 技术指标图表 -->
    <a-row :gutter="16">
      <a-col :xs="24" :lg="12">
        <a-card title="MACD指标" class="sub-chart-card" v-if="selectedIndicators.includes('macd')">
          <div ref="macdChartRef" class="sub-chart"></div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card title="RSI指标" class="sub-chart-card" v-if="selectedIndicators.includes('rsi')">
          <div ref="rsiChartRef" class="sub-chart"></div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card title="KDJ指标" class="sub-chart-card" v-if="selectedIndicators.includes('kdj')">
          <div ref="kdjChartRef" class="sub-chart"></div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card title="成交量" class="sub-chart-card" v-if="selectedIndicators.includes('volume')">
          <div ref="volumeChartRef" class="sub-chart"></div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card title="DMI指标" class="sub-chart-card" v-if="selectedIndicators.includes('dmi')">
          <div ref="dmiChartRef" class="sub-chart"></div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card title="OBV能量潮" class="sub-chart-card" v-if="selectedIndicators.includes('obv')">
          <div ref="obvChartRef" class="sub-chart"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 技术信号 -->
    <a-card title="🎯 技术信号分析" class="signal-card" v-if="techSignals.length > 0">
      <a-tabs>
        <a-tab-pane key="signals" tab="买卖信号">
          <a-row :gutter="16">
            <a-col :xs="24" :sm="12" :md="8" v-for="signal in techSignals" :key="signal.indicator">
              <a-card size="small" :class="'signal-item ' + signal.type">
                <div class="signal-header">
                  <a-tag :color="signal.type === 'buy' ? 'green' : signal.type === 'sell' ? 'red' : 'orange'">
                    {{ signal.type === 'buy' ? '买入' : signal.type === 'sell' ? '卖出' : '观望' }}
                  </a-tag>
                  <a-tag :color="signal.level === 'strong' ? 'purple' : signal.level === 'medium' ? 'blue' : 'default'">
                    {{ signal.level === 'strong' ? '强' : signal.level === 'medium' ? '中' : '弱' }}
                  </a-tag>
                </div>
                <div class="indicator-name">{{ signal.indicator }}</div>
                <p class="description">{{ signal.description }}</p>
              </a-card>
            </a-col>
          </a-row>
        </a-tab-pane>
        <a-tab-pane key="analysis" tab="分析解读">
          <a-alert
            v-if="analysisReport"
            :message="analysisReport.overallTrend"
            :description="analysisReport.summary"
            :type="analysisReport.overallTrend?.includes('涨') ? 'success' : analysisReport.overallTrend?.includes('跌') ? 'error' : 'warning'"
            show-icon
          />
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 数据信息 -->
    <a-card v-if="currentStock" class="info-card" size="small">
      <a-row :gutter="16">
        <a-col :span="12">
          <span class="info-text">数据更新: {{ currentStock.updateTime }}</span>
        </a-col>
        <a-col :span="12" style="text-align: right">
          <span class="info-text">数据来源: baostock</span>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import * as echarts from 'echarts'
import { stockAnalysisApi } from '@/api/stockModel.js'
import { stockApi } from '@/api/stock.js'

// 状态变量
const stockCode = ref('')

// 股票备选池
const stockPool = ref([])

// 加载自选股票池
const loadStockPool = async () => {
  try {
    const response = await stockApi.getStockWatchlist()
    // axios拦截器已经返回了response.data
    if (response.data) {
      stockPool.value = response.data.map(s => ({
        code: s.stock_code,
        name: s.stock_name
      }))
    }
  } catch (e) {
    console.error('加载自选股票失败', e)
  }
}

// 选择股票
const selectStock = (code) => {
  stockCode.value = code
  onSearch()
}

// 删除确认弹窗
const deleteModal = reactive({
  visible: false,
  loading: false,
  stock: null
})

// 确认删除
const confirmDelete = (stock) => {
  deleteModal.stock = stock
  deleteModal.visible = true
}

// 执行删除
const handleDelete = async () => {
  if (!deleteModal.stock) return
  
  deleteModal.loading = true
  try {
    await stockApi.removeFromWatchlist(deleteModal.stock.code)
    // 从列表中移除
    stockPool.value = stockPool.value.filter(s => s.code !== deleteModal.stock.code)
    message.success('已从自选池中删除')
    deleteModal.visible = false
  } catch (e) {
    message.error('删除失败: ' + e.message)
  } finally {
    deleteModal.loading = false
  }
}

const timeRange = ref('1y')
const chartType = ref('kline')
const loading = ref(false)
const currentStock = ref(null)
const techSignals = ref([])
const keyIndicators = ref(null)
const analysisReport = ref(null)
const selectedIndicators = ref(['ma', 'macd', 'rsi', 'kdj', 'volume', 'dmi', 'obv'])

// Chart refs
const klineChartRef = ref(null)
const macdChartRef = ref(null)
const rsiChartRef = ref(null)
const kdjChartRef = ref(null)
const volumeChartRef = ref(null)
const dmiChartRef = ref(null)
const obvChartRef = ref(null)

const charts = {}

// 初始化
onMounted(async () => {
  await loadStockPool()
  // 如果有自选股票，默认加载第一个
  if (stockPool.value.length > 0) {
    selectStock(stockPool.value[0].code)
  }
})

onUnmounted(() => {
  Object.values(charts).forEach(chart => chart?.dispose())
})

// 搜索股票
const onSearch = async () => {
  if (!stockCode.value) {
    message.warning('请输入股票代码')
    return
  }
  
  loading.value = true
  
  try {
    const response = await stockAnalysisApi.getKlineWithIndicators(
      stockCode.value.trim(), 
      'daily'
    )
    
    if (response.success && response.data && response.data.length > 0) {
      const data = response.data
      const stockInfo = data[data.length - 1]
      
      currentStock.value = {
        code: stockCode.value.trim(),
        name: response.stock_name || stockInfo.name || stockCode.value,
        price: stockInfo.close,
        change: stockInfo.change_percent,
        volume: stockInfo.volume,
        amount: stockInfo.amount,
        high: stockInfo.high,
        low: stockInfo.low,
        updateTime: new Date().toLocaleString('zh-CN'),
        data: data
      }
      
      // 计算关键指标
      keyIndicators.value = calculateKeyIndicators(data)
      
      // 生成技术信号
      techSignals.value = generateSignalsFromData(data)
      
      // 生成分析报告
      analysisReport.value = generateAnalysisReport(data, techSignals.value)
      
      message.success(`已加载 ${currentStock.value.name} 数据`)
      
      await nextTick()
      renderCharts()
    } else {
      message.error(response.message || '未找到该股票数据')
    }
    
  } catch (error) {
    console.error('加载失败：', error)
    message.error('加载失败：' + (error.message || '请检查网络连接'))
  } finally {
    loading.value = false
  }
}

// 计算关键指标
function calculateKeyIndicators(data) {
  if (!data || data.length < 20) return null
  
  const latest = data[data.length - 1]  // 最新数据在最后
  return {
    latestPrice: latest.close,
    changePercent: latest.change_percent,
    volume: latest.volume,
    ma5: latest.ma5,
    ma10: latest.ma10,
    ma20: latest.ma20,
    macdBar: latest.macd?.bar,
    rsi: latest.rsi,
    k: latest.kdj?.k,
    d: latest.kdj?.d,
    j: latest.kdj?.j,
    plusDi: latest.dmi?.plus_di,
    minusDi: latest.dmi?.minus_di,
    adx: latest.dmi?.adx,
    obv: latest.obv,
    bollUpper: latest.boll?.upper,
    bollMiddle: latest.boll?.middle,
    bollLower: latest.boll?.lower
  }
}

// 生成技术信号
function generateSignalsFromData(data) {
  const signals = []
  if (!data || data.length < 2) return signals
  
  const lastIndex = data.length - 1
  const curr = data[data.length - 1]
  const prev = data[data.length - 2]
  const prev2 = data.length > 2 ? data[data.length - 3] : null
  
  // 提取高低点数据用于后续分析
  const highs = data.map(d => d.high)
  const lows = data.map(d => d.low)
  
  // ===== MACD信号 =====
  if (curr.macd && prev.macd) {
    // 金叉/死叉
    if (curr.macd.dif > curr.macd.dea && prev.macd.dif <= prev.macd.dea) {
      signals.push({ indicator: 'MACD金叉', type: 'buy', level: 'strong', description: 'DIF上穿DEA，形成金叉，短期趋势转强，是积极买入信号' })
    } else if (curr.macd.dif < curr.macd.dea && prev.macd.dif >= prev.macd.dea) {
      signals.push({ indicator: 'MACD死叉', type: 'sell', level: 'strong', description: 'DIF下穿DEA，形成死叉，短期趋势转弱，注意风险' })
    }
    // 红绿柱
    if (curr.macd.bar > 0) {
      signals.push({ indicator: 'MACD红柱', type: 'buy', level: 'medium', description: '多头排列，红柱放大，上涨动能充足' })
    } else if (curr.macd.bar < 0) {
      signals.push({ indicator: 'MACD绿柱', type: 'sell', level: 'medium', description: '空头排列，绿柱放大，下跌动能较强' })
    }
    // 零轴位置
    if (curr.macd.dif > 0 && curr.macd.dea > 0) {
      signals.push({ indicator: 'MACD零轴上', type: 'buy', level: 'weak', description: 'DIF和DEA均在零轴上方，整体趋势偏多' })
    } else if (curr.macd.dif < 0 && curr.macd.dea < 0) {
      signals.push({ indicator: 'MACD零轴下', type: 'sell', level: 'weak', description: 'DIF和DEA均在零轴下方，整体趋势偏空' })
    }
  }
  
  // ===== RSI信号 =====
  if (curr.rsi) {
    const rsi = curr.rsi
    if (rsi < 20) {
      signals.push({ indicator: 'RSI超卖(极值)', type: 'buy', level: 'strong', description: `RSI=${rsi.toFixed(1)}极度超卖，市场可能出现严重超卖，反弹概率较高` })
    } else if (rsi < 30) {
      signals.push({ indicator: 'RSI超卖', type: 'buy', level: 'medium', description: `RSI=${rsi.toFixed(1)}处于超卖区域(30以下)，存在反弹机会` })
    } else if (rsi > 80) {
      signals.push({ indicator: 'RSI超买(极值)', type: 'sell', level: 'strong', description: `RSI=${rsi.toFixed(1)}极度超买，警惕回调风险` })
    } else if (rsi > 70) {
      signals.push({ indicator: 'RSI超买', type: 'sell', level: 'medium', description: `RSI=${rsi.toFixed(1)}处于超买区域(70以上)，注意回调风险` })
    } else if (rsi >= 40 && rsi <= 60) {
      signals.push({ indicator: 'RSI中性', type: 'neutral', level: 'weak', description: `RSI=${rsi.toFixed(1)}处于中性区域，方向不明确` })
    }
  }
  
  // ===== KDJ信号 =====
  if (curr.kdj) {
    // 超卖/超买
    if (curr.kdj.k < 20 && curr.kdj.j < 20) {
      signals.push({ indicator: 'KDJ超卖', type: 'buy', level: 'strong', description: `K=${curr.kdj.k.toFixed(1)}, J=${curr.kdj.j.toFixed(1)}，KDJ严重超卖，反弹概率大` })
    } else if (curr.kdj.k > 80 && curr.kdj.j > 80) {
      signals.push({ indicator: 'KDJ超买', type: 'sell', level: 'strong', description: `K=${curr.kdj.k.toFixed(1)}, J=${curr.kdj.j.toFixed(1)}，KDJ严重超买，注意回调` })
    }
    // 金叉/死叉
    if (curr.kdj.k > curr.kdj.d && prev.kdj.k <= prev.kdj.d) {
      signals.push({ indicator: 'KDJ金叉', type: 'buy', level: 'medium', description: 'K线上穿D线，形成金叉，短期看涨信号' })
    } else if (curr.kdj.k < curr.kdj.d && prev.kdj.k >= prev.kdj.d) {
      signals.push({ indicator: 'KDJ死叉', type: 'sell', level: 'medium', description: 'K线下穿D线，形成死叉，短期看跌信号' })
    }
    // J线触顶/触底
    if (curr.kdj.j < 0) {
      signals.push({ indicator: 'KDJ-J为负', type: 'buy', level: 'weak', description: 'J线低于0，短期内可能出现反弹' })
    } else if (curr.kdj.j > 100) {
      signals.push({ indicator: 'KDJ-J过高', type: 'sell', level: 'weak', description: 'J线超过100，短期内可能回调' })
    }
  }
  
  // ===== 布林带信号 =====
  if (curr.boll) {
    const position = ((curr.close - curr.boll.lower) / (curr.boll.upper - curr.boll.lower)) * 100
    if (curr.close < curr.boll.lower) {
      signals.push({ indicator: '布林下轨', type: 'buy', level: 'strong', description: `价格触及布林下轨(${curr.boll.lower.toFixed(2)})，超卖严重，反弹概率高` })
    } else if (curr.close > curr.boll.upper) {
      signals.push({ indicator: '布林上轨', type: 'sell', level: 'strong', description: `价格触及布林上轨(${curr.boll.upper.toFixed(2)})，超买严重，注意回调风险` })
    } else if (position < 20) {
      signals.push({ indicator: '布林下轨区域', type: 'buy', level: 'medium', description: `价格在布林下轨附近运行，处于相对低位` })
    } else if (position > 80) {
      signals.push({ indicator: '布林上轨区域', type: 'sell', level: 'medium', description: `价格在布林上轨附近运行，处于相对高位` })
    } else {
      signals.push({ indicator: '布林中轨区域', type: 'neutral', level: 'weak', description: `价格在布林中轨附近运行，震荡整理` })
    }
  }
  
  // ===== MA均线信号 =====
  if (curr.ma5 && curr.ma10 && curr.ma20 && curr.ma60) {
    const ma5 = curr.ma5, ma10 = curr.ma10, ma20 = curr.ma20, ma60 = curr.ma60
    const prevMa5 = prev.ma5, prevMa10 = prev.ma10, prevMa20 = prev.ma20
    
    // 多头排列
    if (ma5 > ma10 && ma10 > ma20 && ma20 > ma60) {
      signals.push({ indicator: '多头排列', type: 'buy', level: 'strong', description: 'MA5>MA10>MA20>MA60，长期趋势向上，是强势信号' })
    } else if (ma5 < ma10 && ma10 < ma20 && ma20 < ma60) {
      signals.push({ indicator: '空头排列', type: 'sell', level: 'strong', description: 'MA5<MA10<MA20<MA60，长期趋势向下，是弱势信号' })
    }
    // 短期均线上穿中期均线
    if (ma5 > ma10 && prevMa5 <= prevMa10) {
      signals.push({ indicator: 'MA5上穿MA10', type: 'buy', level: 'medium', description: '短期均线上穿中期均线，形成金叉，看涨' })
    } else if (ma5 < ma10 && prevMa5 >= prevMa10) {
      signals.push({ indicator: 'MA5下穿MA10', type: 'sell', level: 'medium', description: '短期均线下穿中期均线，形成死叉，看跌' })
    }
    // 站上/跌破均线
    if (curr.close > ma20 && prev.close <= prevMa20) {
      signals.push({ indicator: '突破MA20', type: 'buy', level: 'medium', description: '价格突破20日均线，短期转强' })
    } else if (curr.close < ma20 && prev.close >= prevMa20) {
      signals.push({ indicator: '跌破MA20', type: 'sell', level: 'medium', description: '价格跌破20日均线，短期转弱' })
    }
  }
  
  // ===== 成交量信号 =====
  if (curr.volume && data.length > 20) {
    const avgVol = data.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20
    const volRatio = curr.volume / avgVol
    
    if (volRatio > 2) {
      signals.push({ indicator: '放量暴涨/暴跌', type: curr.change > 0 ? 'buy' : 'sell', level: 'strong', description: `成交量是均量的${volRatio.toFixed(1)}倍，量价配合异常，关注趋势变化` })
    } else if (volRatio > 1.5) {
      signals.push({ indicator: '放量', type: curr.change > 0 ? 'buy' : 'sell', level: 'medium', description: `成交量放大至均量的${volRatio.toFixed(1)}倍，方向明确` })
    } else if (volRatio < 0.3) {
      signals.push({ indicator: '缩量', type: 'neutral', level: 'weak', description: `成交量极度萎缩至均量的${volRatio.toFixed(1)}倍，可能变盘` })
    }
  }
  
  // ===== DMI信号 =====
  if (curr.dmi) {
    const { diPlus, diMinus, adx, adxr } = curr.dmi
    if (diPlus && diMinus && adx) {
      // DI+上穿DI-
      if (diPlus > diMinus && prev.dmi?.diPlus <= prev.dmi?.diMinus) {
        signals.push({ indicator: 'DMI金叉', type: 'buy', level: 'medium', description: 'DI+上穿DI-，多头趋势形成' })
      } else if (diPlus < diMinus && prev.dmi?.diPlus >= prev.dmi?.diMinus) {
        signals.push({ indicator: 'DMI死叉', type: 'sell', level: 'medium', description: 'DI+下穿DI-，空头趋势形成' })
      }
      // ADX趋势强度
      if (adx > 25) {
        signals.push({ indicator: 'DMI趋势强', type: 'neutral', level: 'weak', description: `ADX=${adx.toFixed(1)}>25，趋势明显，适合顺势操作` })
      } else if (adx < 20) {
        signals.push({ indicator: 'DMI趋势弱', type: 'neutral', level: 'weak', description: `ADX=${adx.toFixed(1)}<20，趋势不明，震荡整理` })
      }
      // DI+ > DI- 多头
      if (diPlus > diMinus) {
        signals.push({ indicator: 'DMI多头', type: 'buy', level: 'weak', description: 'DI+ > DI-，多头占优' })
      } else {
        signals.push({ indicator: 'DMI空头', type: 'sell', level: 'weak', description: 'DI+ < DI-，空头占优' })
      }
    }
  }
  
  // ===== OBV能量潮信号 =====
  if (curr.obv && data.length > 10) {
    const prevObv = prev.obv
    if (curr.obv > prevObv) {
      signals.push({ indicator: 'OBV上涨', type: 'buy', level: 'weak', description: 'OBV上升，资金流入，看涨' })
    } else if (curr.obv < prevObv) {
      signals.push({ indicator: 'OBV下跌', type: 'sell', level: 'weak', description: 'OBV下降，资金流出，看跌' })
    }
  }
  
  // ===== 趋势强度综合评分 =====
  let buyScore = 0, sellScore = 0
  signals.forEach(s => {
    if (s.type === 'buy') buyScore += { strong: 3, medium: 2, weak: 1 }[s.level] || 0
    if (s.type === 'sell') sellScore += { strong: 3, medium: 2, weak: 1 }[s.level] || 0
  })
  
  // ===== 高级技术分析信号 =====
  if (data.length >= 60) {
    const ma60 = curr.ma60 || curr.ma20
    const ma120 = data.slice(-120).reduce((sum, d) => sum + (d.ma20 || d.close), 0) / Math.min(data.length, 120)
    
    // 均线偏离度分析
    if (ma60) {
      const bias5 = ((curr.close - curr.ma5) / curr.ma5 * 100)
      const bias10 = ((curr.close - curr.ma10) / curr.ma10 * 100)
      const bias20 = ((curr.close - curr.ma20) / curr.ma20 * 100)
      const bias60 = ((curr.close - ma60) / ma60 * 100)
      
      if (bias5 > 10) {
        signals.push({ indicator: 'BIAS5正偏离', type: 'sell', level: 'medium', description: `价格偏离5日均线${bias5.toFixed(1)}%，短期可能回调` })
      } else if (bias5 < -10) {
        signals.push({ indicator: 'BIAS5负偏离', type: 'buy', level: 'medium', description: `价格偏离5日均线${bias5.toFixed(1)}%，短期可能反弹` })
      }
      
      if (bias20 > 20) {
        signals.push({ indicator: 'BIAS20严重高估', type: 'sell', level: 'strong', description: `价格偏离20日均线${bias20.toFixed(1)}%，存在大幅回调风险` })
      } else if (bias20 < -20) {
        signals.push({ indicator: 'BIAS20严重低估', type: 'buy', level: 'strong', description: `价格偏离20日均线${bias20.toFixed(1)}%，存在大幅反弹机会` })
      }
    }
    
    // 均线收敛/发散分析
    const ma5Ma20Diff = Math.abs(curr.ma5 - curr.ma20) / curr.ma20 * 100
    const prevMa5Ma20Diff = Math.abs(prev.ma5 - prev.ma20) / prev.ma20 * 100
    if (ma5Ma20Diff < 2 && prevMa5Ma20Diff > 5) {
      signals.push({ indicator: '均线粘合', type: 'neutral', level: 'medium', description: '短期均线收敛粘合，可能选择突破方向' })
    } else if (ma5Ma20Diff > 15) {
      signals.push({ indicator: '均线发散', type: curr.ma5 > curr.ma20 ? 'buy' : 'sell', level: 'medium', description: '均线发散，趋势强劲' })
    }
    
    // 趋势延续信号
    const recent5 = data.slice(-5)
    const recent10 = data.slice(-10)
    const avgChange5 = recent5.reduce((sum, d) => sum + d.change, 0) / 5
    const avgChange10 = recent10.reduce((sum, d) => sum + d.change, 0) / 10
    
    if (avgChange5 > 3 && avgChange10 > 2) {
      signals.push({ indicator: '趋势延续(上涨)', type: 'buy', level: 'medium', description: `近期平均涨幅${avgChange5.toFixed(1)}%，上涨趋势延续` })
    } else if (avgChange5 < -3 && avgChange10 < -2) {
      signals.push({ indicator: '趋势延续(下跌)', type: 'sell', level: 'medium', description: `近期平均跌幅${Math.abs(avgChange5).toFixed(1)}%，下跌趋势延续` })
    }
    
    // 震荡整理信号
    const priceRange = (Math.max(...highs) - Math.min(...lows)) / Math.min(...lows) * 100
    if (priceRange < 10 && data.length > 30) {
      signals.push({ indicator: '窄幅震荡', type: 'neutral', level: 'weak', description: `振幅仅${priceRange.toFixed(1)}%，即将选择突破方向` })
    }
    
    // 支撑位分析
    const low20 = Math.min(...data.slice(-20).map(d => d.low))
    const low60 = Math.min(...data.slice(-60).map(d => d.low))
    if (curr.close - low20 < low20 * 0.03) {
      signals.push({ indicator: '触及20日低点', type: 'neutral', level: 'weak', description: `接近20日最低价${low20.toFixed(2)}，关注支撑` })
    }
    if (curr.close - low60 < low60 * 0.05) {
      signals.push({ indicator: '触及60日低点', type: 'buy', level: 'medium', description: `接近60日最低价${low60.toFixed(2)}，存在较强支撑` })
    }
    
    // 压力位分析
    const high20 = Math.max(...data.slice(-20).map(d => d.high))
    const high60 = Math.max(...data.slice(-60).map(d => d.high))
    if (high20 - curr.close < high20 * 0.03) {
      signals.push({ indicator: '触及20日高点', type: 'neutral', level: 'weak', description: `接近20日最高价${high20.toFixed(2)}，关注压力` })
    }
    if (high60 - curr.close < high60 * 0.05) {
      signals.push({ indicator: '触及60日高点', type: 'sell', level: 'medium', description: `接近60日最高价${high60.toFixed(2)}，存在较强压力` })
    }
  }
  
  // ===== 量价关系分析 =====
  if (curr.volume && data.length > 20) {
    const volData = data.slice(-20)
    const avgVol = volData.reduce((sum, d) => sum + d.volume, 0) / 20
    
    // 量价齐升/齐跌
    if (curr.volume > avgVol * 1.3 && curr.change > 0 && curr.close > prev.close) {
      signals.push({ indicator: '量价齐升', type: 'buy', level: 'medium', description: '成交量放大配合价格上涨，健康的上涨趋势' })
    } else if (curr.volume > avgVol * 1.3 && curr.change < 0 && curr.close < prev.close) {
      signals.push({ indicator: '量价齐跌', type: 'sell', level: 'medium', description: '成交量放大配合价格下跌，恐慌性下跌' })
    }
    
    // 放量滞涨/滞跌
    if (curr.volume > avgVol * 1.5 && Math.abs(curr.change) < 1) {
      signals.push({ indicator: '放量滞涨/滞跌', type: 'neutral', level: 'medium', description: '成交量放大但价格变动不大，可能反转' })
    }
    
    // 缩量回调/反弹
    if (curr.volume < avgVol * 0.5 && Math.abs(curr.change) < 2) {
      signals.push({ indicator: '缩量整理', type: 'neutral', level: 'weak', description: '成交量萎缩，观望情绪浓厚，等待方向' })
    }
  }
  
  // ===== 市场心理分析 =====
  if (data.length >= 10) {
    const upDays = data.slice(-10).filter(d => d.change > 0).length
    const downDays = data.slice(-10).filter(d => d.change < 0).length
    const upRate = upDays / 10 * 100
    
    if (upRate >= 80) {
      signals.push({ indicator: '市场过热', type: 'sell', level: 'medium', description: `10天内${upRate.toFixed(0)}%上涨，警惕回调` })
    } else if (upRate <= 20) {
      signals.push({ indicator: '市场过冷', type: 'buy', level: 'medium', description: `10天内仅${upRate.toFixed(0)}%上涨，存在反弹机会` })
    } else if (upRate >= 60) {
      signals.push({ indicator: '多头情绪', type: 'buy', level: 'weak', description: `多头情绪占优(${upRate.toFixed(0)}%)` })
    } else if (upRate <= 40) {
      signals.push({ indicator: '空头情绪', type: 'sell', level: 'weak', description: `空头情绪占优(${upRate.toFixed(0)}%)` })
    }
  }
  
  // 添加综合信号
  if (buyScore > sellScore + 2) {
    signals.unshift({ indicator: '综合信号', type: 'buy', level: 'strong', description: `买入信号强(得分${buyScore} vs ${sellScore})，建议关注` })
  } else if (sellScore > buyScore + 2) {
    signals.unshift({ indicator: '综合信号', type: 'sell', level: 'strong', description: `卖出信号强(得分${sellScore} vs ${buyScore})，注意风险` })
  } else if (buyScore > 0 || sellScore > 0) {
    signals.unshift({ indicator: '综合信号', type: 'neutral', level: 'weak', description: `多空平衡(买入${buyScore}分 vs 卖出${sellScore}分)，建议观望` })
  }
  
  return signals
}

// 生成分析报告
function generateAnalysisReport(data, signals = []) {
  if (!data || data.length < 20) return null
  
  const latest = data[data.length - 1]
  const prev = data[data.length - 2]
  const prices = data.map(d => d.close)
  const highs = data.map(d => d.high)
  const lows = data.map(d => d.low)
  const volumes = data.map(d => d.volume)
  
  // 计算趋势
  let trend = '震荡整理'
  let overallTrend = '震荡'
  if (latest.ma5 > latest.ma10 && latest.ma10 > latest.ma20) {
    trend = '上涨趋势'
    overallTrend = '强势上涨'
  } else if (latest.ma5 < latest.ma10 && latest.ma10 < latest.ma20) {
    trend = '下跌趋势'
    overallTrend = '弱势下跌'
  }
  
  // 计算支撑压力
  const support5 = latest.ma5 ? latest.ma5 * 0.95 : null
  const support10 = latest.ma10 ? latest.ma10 * 0.93 : null
  const support20 = latest.ma20 ? latest.ma20 * 0.90 : null
  const resistance5 = latest.ma5 ? latest.ma5 * 1.05 : null
  const resistance10 = latest.ma10 ? latest.ma10 * 1.07 : null
  const resistance20 = latest.ma20 ? latest.ma20 * 1.10 : null
  
  // 计算均线多头/空头排列天数
  let maGoldenDays = 0
  let maDeathDays = 0
  for (let i = Math.max(0, data.length - 20); i < data.length; i++) {
    if (data[i].ma5 > data[i].ma10 && data[i].ma10 > data[i].ma20) maGoldenDays++
    if (data[i].ma5 < data[i].ma10 && data[i].ma10 < data[i].ma20) maDeathDays++
  }
  
  // 计算波动率
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i])
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252) * 100
  
  // 计算成交量变化
  const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
  const volChange = ((latest.volume - avgVol20) / avgVol20 * 100)
  
  // 综合判断
  let summary = `【${currentStock.value?.name || '该股票'}技术分析报告】\n\n`
  summary += `📊 趋势判断：${trend}\n`
  
  // 均线分析
  summary += `\n📈 均线分析：\n`
  if (maGoldenDays >= 15) {
    summary += `  • 近20日均线多头排列天数：${maGoldenDays}天，持续强势\n`
  } else if (maDeathDays >= 15) {
    summary += `  • 近20日均线空头排列天数：${maDeathDays}天，持续弱势\n`
  } else {
    summary += `  • 均线暂无明确方向，处于震荡调整\n`
  }
  summary += `  • 5日均线：${latest.ma5?.toFixed(2)}\n`
  summary += `  • 10日均线：${latest.ma10?.toFixed(2)}\n`
  summary += `  • 20日均线：${latest.ma20?.toFixed(2)}\n`
  
  // RSI分析
  summary += `\n📉 RSI指标：${latest.rsi?.toFixed(1)}\n`
  if (latest.rsi > 80) {
    summary += `  • 严重超买，回调风险较大\n`
  } else if (latest.rsi > 70) {
    summary += `  • 处于超买区域，注意风险\n`
  } else if (latest.rsi < 20) {
    summary += `  • 严重超卖，反弹机会较大\n`
  } else if (latest.rsi < 30) {
    summary += `  • 处于超卖区域，存在反弹机会\n`
  } else {
    summary += `  • 处于中性区域\n`
  }
  
  // MACD分析
  summary += `\n📊 MACD指标：\n`
  if (latest.macd?.bar > 0) {
    summary += `  • 红柱放大，多头信号\n`
  } else if (latest.macd?.bar < 0) {
    summary += `  • 绿柱放大，空头信号\n`
  }
  if (latest.macd?.dif > latest.macd?.dea) {
    summary += `  • DIF > DEA，处于多头区域\n`
  } else {
    summary += `  • DIF < DEA，处于空头区域\n`
  }
  
  // KDJ分析
  if (latest.kdj) {
    summary += `\n📊 KDJ指标：K=${latest.kdj.k?.toFixed(1)}, D=${latest.kdj.d?.toFixed(1)}, J=${latest.kdj.j?.toFixed(1)}\n`
    if (latest.kdj.k > 80) {
      summary += `  • K值超买区，注意回调\n`
    } else if (latest.kdj.k < 20) {
      summary += `  • K值超卖区，关注反弹\n`
    }
  }
  
  // 布林带分析
  if (latest.boll) {
    const position = ((latest.close - latest.boll.lower) / (latest.boll.upper - latest.boll.lower) * 100).toFixed(1)
    summary += `\n📊 布林带：\n`
    summary += `  • 上轨：${latest.boll.upper?.toFixed(2)}\n`
    summary += `  • 中轨：${latest.boll.middle?.toFixed(2)}\n`
    summary += `  • 下轨：${latest.boll.lower?.toFixed(2)}\n`
    summary += `  • 当前位置：${position}%${position > 80 ? '(超买)' : position < 20 ? '(超卖)' : ''}\n`
  }
  
  // 成交量分析
  summary += `\n📊 成交量分析：\n`
  summary += `  • 当前成交量：${(latest.volume / 10000).toFixed(1)}万\n`
  summary += `  • 20日均量：${(avgVol20 / 10000).toFixed(1)}万\n`
  summary += `  • 量能变化：${volChange > 0 ? '+' : ''}${volChange.toFixed(1)}%\n`
  if (volChange > 50) {
    summary += `  • 成交量大幅放大，活跃度提升\n`
  } else if (volChange < -50) {
    summary += `  • 成交量大幅萎缩，观望情绪浓厚\n`
  }
  
  // 支撑压力
  summary += `\n🎯 支撑与压力：\n`
  if (support20) summary += `  • 20日均线支撑：${support20.toFixed(2)}\n`
  if (resistance20) summary += `  • 20日均线压力：${resistance20.toFixed(2)}\n`
  summary += `  • 当前价格：${latest.close?.toFixed(2)}\n`
  
  // 波动率
  summary += `\n📊 波动率：${volatility.toFixed(1)}%${volatility > 30 ? '(高波动)' : volatility > 15 ? '(中等)' : '(低波动)'}\n`
  
  // 风险评估
  summary += `\n⚠️ 风险评估：\n`
  let riskLevel = '中等'
  let riskFactors = []
  if (latest.rsi > 75 || latest.kdj?.k > 85) {
    riskFactors.push('RSI/KDJ超买')
    riskLevel = '较高'
  }
  if (volatility > 30) riskFactors.push('波动率较高')
  if (latest.close > resistance20) riskFactors.push('接近压力位')
  if (riskFactors.length === 0 && latest.rsi < 40 && volatility < 20) {
    riskLevel = '较低'
    riskFactors.push('RSI超卖+低波动')
  }
  summary += `  • 风险等级：${riskLevel}\n`
  if (riskFactors.length > 0) {
    summary += `  • 风险因素：${riskFactors.join('、')}\n`
  }
  
  // 操作建议
  summary += `\n💡 操作建议：\n`
  const buySignals = signals.filter(s => s.type === 'buy').length
  const sellSignals = signals.filter(s => s.type === 'sell').length
  
  if (buySignals > sellSignals + 2) {
    summary += `  • 多头信号占优，建议关注\n`
    summary += `  • 买入信号：${buySignals}个，卖出信号：${sellSignals}个\n`
  } else if (sellSignals > buySignals + 2) {
    summary += `  • 空头信号占优，建议谨慎\n`
    summary += `  • 买入信号：${buySignals}个，卖出信号：${sellSignals}个\n`
  } else {
    summary += `  • 多空平衡，建议观望\n`
    summary += `  • 买入信号：${buySignals}个，卖出信号：${sellSignals}个\n`
  }
  
  return {
    overallTrend,
    trend,
    support: support20?.toFixed(2),
    resistance: resistance20?.toFixed(2),
    volatility: volatility.toFixed(1),
    riskLevel,
    summary
  }
}

// 渲染图表
const renderCharts = () => {
  if (!currentStock.value?.data) return
  
  const data = currentStock.value.data
  const dates = data.map(d => d.date)
  
  // 销毁旧图表
  Object.values(charts).forEach(chart => chart?.dispose())
  
  // K线图/收盘线图
  if (klineChartRef.value) {
    charts.kline = echarts.init(klineChartRef.value)
    
    // 根据图表类型决定显示K线还是收盘线
    const isKline = chartType.value === 'kline'
    
    const seriesList = []
    
    if (isKline) {
      // K线图
      seriesList.push({
        name: 'K线',
        type: 'candlestick',
        data: data.map(d => [d.open, d.close, d.low, d.high]),
        itemStyle: { color: '#f5222d', color0: '#52c41a' }
      })
    } else {
      // 收盘线图
      seriesList.push({
        name: '收盘价',
        type: 'line',
        data: data.map(d => d.close),
        smooth: true,
        lineStyle: { width: 2, color: '#1890ff' },
        symbol: 'none',
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
            ]
          }
        }
      })
    }
    
    // 添加均线和布林带
    if (selectedIndicators.value.includes('ma')) {
      seriesList.push({ name: 'MA5', type: 'line', data: data.map(d => d.ma5), smooth: true, lineStyle: { width: 1, color: '#f5222d' }, symbol: 'none'})
      seriesList.push({ name: 'MA10', type: 'line', data: data.map(d => d.ma10), smooth: true, lineStyle: { width: 1, color: '#faad14' }, symbol: 'none'})
      seriesList.push({ name: 'MA20', type: 'line', data: data.map(d => d.ma20), smooth: true, lineStyle: { width: 1, color: '#52c41a' }, symbol: 'none'})
      seriesList.push({ name: 'MA60', type: 'line', data: data.map(d => d.ma60), smooth: true, lineStyle: { width: 1, color: '#722ed1' }, symbol: 'none'})
    }
    if (selectedIndicators.value.includes('boll')) {
      seriesList.push({ name: 'BOLL_UPPER', type: 'line', data: data.map(d => d.boll?.upper), smooth: true, lineStyle: { width: 1, color: '#1890ff', type: 'dashed' }, symbol: 'none'})
      seriesList.push({ name: 'BOLL_MID', type: 'line', data: data.map(d => d.boll?.middle), smooth: true, lineStyle: { width: 1, color: '#1890ff' }, symbol: 'none'})
      seriesList.push({ name: 'BOLL_LOWER', type: 'line', data: data.map(d => d.boll?.lower), smooth: true, lineStyle: { width: 1, color: '#1890ff', type: 'dashed' }, symbol: 'none'})
    }
    
    const legendData = isKline 
      ? ['K线', 'MA5', 'MA10', 'MA20', 'MA60', 'BOLL_UPPER', 'BOLL_MID', 'BOLL_LOWER'].filter(n => seriesList.some(s => s.name === n))
      : ['收盘价', 'MA5', 'MA10', 'MA20', 'MA60', 'BOLL_UPPER', 'BOLL_MID', 'BOLL_LOWER'].filter(n => seriesList.some(s => s.name === n))
    
    const klineOption = {
      tooltip: { 
        trigger: 'axis', 
        axisPointer: { type: 'cross' }
      },
      legend: { data: legendData, top: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '10%' },
      xAxis: { 
        type: 'category', 
        data: dates, 
        scale: true,
        axisLabel: {
          show: true,
          interval: Math.floor(dates.length / 8),
          formatter: (value) => value ? value.substring(5) : ''
        },
        axisTick: { show: true }
      },
      yAxis: { 
        scale: true, 
        splitArea: { show: true },
        axisLabel: {
          formatter: '{value}'
        }
      },
      dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 0 }],
      series: seriesList
    }
    charts.kline.setOption(klineOption)
  }
  
  // MACD图
  if (macdChartRef.value) {
    charts.macd = echarts.init(macdChartRef.value)
    charts.macd.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['DIF', 'DEA', 'MACD'], top: 0 },
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%' },
      xAxis: { 
        type: 'category', 
        data: dates, 
        show: false 
      },
      yAxis: { 
        scale: true,
        axisLabel: { formatter: '{value}' }
      },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: 'DIF', type: 'line', data: data.map(d => d.macd?.dif), lineStyle: { color: '#1890ff' }, symbol: 'none' },
        { name: 'DEA', type: 'line', data: data.map(d => d.macd?.dea), lineStyle: { color: '#f5222d' }, symbol: 'none' },
        { name: 'MACD', type: 'bar', data: data.map(d => d.macd?.bar), itemStyle: { color: (p) => p.value >= 0 ? '#f5222d' : '#52c41a' }}
      ]
    })
  }
  
  // RSI图
  if (rsiChartRef.value) {
    charts.rsi = echarts.init(rsiChartRef.value)
    charts.rsi.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['RSI'], top: 0 },
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { 
        min: 0, 
        max: 100,
        axisLabel: { formatter: '{value}' }
      },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: 'RSI', type: 'line', data: data.map(d => d.rsi), lineStyle: { color: '#eb2f96' }, symbol: 'none' },
        { name: '超买线', type: 'line', data: data.map(() => 70), lineStyle: { color: '#f5222d', type: 'dashed', width: 1 }, symbol: 'none' },
        { name: '超卖线', type: 'line', data: data.map(() => 30), lineStyle: { color: '#52c41a', type: 'dashed', width: 1 }, symbol: 'none' },
        { name: '中轴', type: 'line', data: data.map(() => 50), lineStyle: { color: '#999', type: 'dashed', width: 1 }, symbol: 'none' }
      ]
    })
  }
  
  // KDJ图
  if (kdjChartRef.value) {
    charts.kdj = echarts.init(kdjChartRef.value)
    charts.kdj.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['K', 'D', 'J'], top: 0 },
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { 
        min: 0, 
        max: 100,
        axisLabel: { formatter: '{value}' }
      },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: 'K', type: 'line', data: data.map(d => d.kdj?.k), lineStyle: { color: '#1890ff' }, symbol: 'none' },
        { name: 'D', type: 'line', data: data.map(d => d.kdj?.d), lineStyle: { color: '#faad14' }, symbol: 'none' },
        { name: 'J', type: 'line', data: data.map(d => d.kdj?.j), lineStyle: { color: '#eb2f96' }, symbol: 'none' },
        { name: '超买线', type: 'line', data: data.map(() => 80), lineStyle: { color: '#f5222d', type: 'dashed', width: 1 }, symbol: 'none' },
        { name: '超卖线', type: 'line', data: data.map(() => 20), lineStyle: { color: '#52c41a', type: 'dashed', width: 1 }, symbol: 'none' }
      ]
    })
  }
  
  // 成交量图
  if (volumeChartRef.value) {
    charts.volume = echarts.init(volumeChartRef.value)
    const volData = data.map(d => ({
      value: d.volume,
      itemStyle: {
        color: d.close >= d.open ? '#f5222d' : '#52c41a'
      }
    }))
    charts.volume.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['成交量'], top: 0 },
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { 
        scale: true,
        axisLabel: { 
          formatter: (value) => {
            if (value >= 10000) return (value / 10000).toFixed(0) + '万'
            return value
          }
        }
      },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: '成交量', type: 'bar', data: volData }
      ]
    })
  }
  
  // DMI指标图
  if (dmiChartRef.value) {
    charts.dmi = echarts.init(dmiChartRef.value)
    charts.dmi.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['+DI', '-DI', 'ADX'], top: 0 },
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { 
        scale: true,
        axisLabel: { formatter: '{value}' }
      },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: '+DI', type: 'line', data: data.map(d => d.dmi?.plus_di), lineStyle: { color: '#1890ff' }, symbol: 'none' },
        { name: '-DI', type: 'line', data: data.map(d => d.dmi?.minus_di), lineStyle: { color: '#f5222d' }, symbol: 'none' },
        { name: 'ADX', type: 'line', data: data.map(d => d.dmi?.adx), lineStyle: { color: '#52c41a' }, symbol: 'none' }
      ]
    })
  }
  
  // OBV能量潮图
  if (obvChartRef.value) {
    charts.obv = echarts.init(obvChartRef.value)
    charts.obv.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['OBV'], top: 0 },
      grid: { left: '3%', right: '4%', top: '15%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { 
        scale: true,
        axisLabel: { 
          formatter: (value) => {
            if (Math.abs(value) >= 10000) return (value / 10000).toFixed(0) + '万'
            return value
          }
        }
      },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: 'OBV', type: 'line', data: data.map(d => d.obv), lineStyle: { color: '#722ed1' }, symbol: 'none' }
      ]
    })
  }
  
  window.addEventListener('resize', () => {
    Object.values(charts).forEach(chart => chart?.resize())
  })
}

// 时间范围变化
const onTimeRangeChange = () => {
  onSearch()
}

// 图表类型变化
const onChartTypeChange = () => {
  nextTick(() => renderCharts())
}

// 指标选择变化
const onIndicatorChange = () => {
  nextTick(() => renderCharts())
}

// 刷新数据
const refreshData = () => {
  onSearch()
}

// 工具函数
const getPriceClass = (change) => {
  if (change > 0) return 'up'
  if (change < 0) return 'down'
  return ''
}

const getRSIClass = (rsi) => {
  if (rsi > 70) return 'overbought'
  if (rsi < 30) return 'oversold'
  return ''
}

const getKDJClass = (k) => {
  if (k > 80) return 'overbought'
  if (k < 20) return 'oversold'
  return ''
}

const formatVolume = (vol) => {
  if (!vol) return '0'
  if (vol >= 100000000) return (vol / 100000000).toFixed(2) + '亿'
  if (vol >= 10000) return (vol / 10000).toFixed(2) + '万'
  return vol.toString()
}

const formatAmount = (amount) => {
  if (!amount) return '0'
  if (amount >= 100000000) return (amount / 100000000).toFixed(2) + '亿'
  if (amount >= 10000) return (amount / 10000).toFixed(2) + '万'
  return amount.toString()
}
</script>

<style scoped>
.stock-analysis-container {
  padding: 16px;
  background: #f5f5f5;
  min-height: 100vh;
}

.pool-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.pool-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px 8px 0 0;
}

.pool-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
}

.stock-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
  padding: 8px 0;
}

.pool-item {
  cursor: pointer;
  margin: 2px;
  transition: all 0.3s;
  border-radius: 4px;
}

.pool-item:hover {
  opacity: 0.8;
  transform: translateY(-2px);
}

.no-data {
  color: #999;
  font-size: 12px;
  padding: 8px;
}

.search-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.search-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 8px 8px 0 0;
}

.search-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
}

.stock-info {
  margin-top: 8px;
}

.info-item {
  text-align: center;
  padding: 8px;
}

.info-item .label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.info-item .value {
  display: block;
  font-size: 16px;
  font-weight: 500;
}

.info-item.main-info .value.name {
  font-size: 20px;
  color: #1890ff;
}

.info-item .value.price {
  font-size: 24px;
  font-weight: bold;
}

.info-item .value.up {
  color: #f5222d;
}

.info-item .value.down {
  color: #52c41a;
}

.analysis-report-card {
  margin-bottom: 16px;
  background: linear-gradient(135deg, #f0f5ff 0%, #fff7e6 100%);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.analysis-report-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px 8px 0 0;
}

.analysis-report-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

/* 核心指标展示 */
.core-indicators {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .core-indicators {
    grid-template-columns: repeat(2, 1fr);
  }
}

.core-item {
  background: white;
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.3s;
  border: 2px solid transparent;
}

.core-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.12);
}

.core-item.trend {
  border-color: #1890ff;
  background: linear-gradient(135deg, #e6f7ff 0%, #fff 100%);
}

.core-item.support {
  border-color: #52c41a;
  background: linear-gradient(135deg, #f6ffed 0%, #fff 100%);
}

.core-item.resistance {
  border-color: #f5222d;
  background: linear-gradient(135deg, #fff1f0 0%, #fff 100%);
}

.core-item.volatility {
  border-color: #faad14;
  background: linear-gradient(135deg, #fffbe6 0%, #fff 100%);
}

.core-item.risk {
  border-color: #722ed1;
  background: linear-gradient(135deg, #f9f0ff 0%, #fff 100%);
}

.core-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.core-content {
  display: flex;
  flex-direction: column;
}

.core-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.core-value {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

/* 快速指标 */
.quick-indicators {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e0e0e0;
}

.quick-item {
  text-align: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
}

.quick-item .label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.quick-item .value {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.quick-item .value.up {
  color: #f5222d;
}

.quick-item .value.down {
  color: #52c41a;
}

.analysis-header .title {
  font-size: 18px;
  font-weight: bold;
  color: #1890ff;
}

.analysis-summary .summary-item {
  text-align: center;
  padding: 12px;
  background: rgba(255,255,255,0.9);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.3s;
}

.analysis-summary .summary-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.analysis-summary .summary-item .label {
  display: block;
  font-size: 14px;
  color: #888;
  margin-bottom: 4px;
}

.analysis-summary .summary-item .value {
  display: block;
  font-size: 18px;
  font-weight: bold;
}

.analysis-summary .summary-item .value.support {
  color: #52c41a;
}

.analysis-summary .summary-item .value.resistance {
  color: #f5222d;
}

.indicator-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.indicator-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 8px 8px 0 0;
}

.indicator-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
}

.key-indicators {
  margin-top: 16px;
}

.indicator-box {
  text-align: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  transition: all 0.3s;
}

.indicator-box:hover {
  background: #e6f7ff;
  transform: scale(1.02);
}

.indicator-box .label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.indicator-box .value {
  display: block;
  font-size: 16px;
  font-weight: bold;
}

.indicator-box .value.up {
  color: #f5222d;
}

.indicator-box .value.down {
  color: #52c41a;
}

.indicator-box .value.overbought {
  color: #f5222d;
}

.indicator-box .value.oversold {
  color: #52c41a;
}

.chart-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.chart-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #fa541c 0%, #fa8c16 100%);
  border-radius: 8px 8px 0 0;
}

.chart-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
}

.kline-chart {
  height: 500px;
  border-radius: 0 0 8px 8px;
}

.sub-chart-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.sub-chart-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #722ed1 0%, #b37feb 100%);
  border-radius: 8px 8px 0 0;
}

.sub-chart-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.sub-chart {
  height: 250px;
}

.signal-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.signal-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #eb2f96 0%, #ff85c0 100%);
  border-radius: 8px 8px 0 0;
}

.signal-card :deep(.ant-card-head-title) {
  color: white;
  font-weight: 600;
}

.signal-item {
  margin-bottom: 12px;
  border-radius: 8px;
  transition: all 0.3s;
  border: 1px solid #f0f0f0;
}

.signal-item:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.signal-item .signal-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.signal-item .indicator-name {
  font-weight: bold;
  margin-top: 8px;
}

.signal-item .description {
  margin-top: 4px;
  margin-bottom: 0;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

.info-card {
  text-align: center;
}

.info-text {
  font-size: 12px;
  color: #999;
}
</style>
