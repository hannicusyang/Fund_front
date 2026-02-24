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
            @close="confirmDelete(stock)"
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
            <a-radio-group v-model:value="chartType" button-style="solid" size="large">
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
        <span class="title">📈 综合技术分析报告</span>
        <a-tag :color="analysisReport.overallTrend === '强势上涨' ? 'red' : analysisReport.overallTrend === '弱势下跌' ? 'green' : 'orange'">
          {{ analysisReport.overallTrend }}
        </a-tag>
      </div>
      <a-row :gutter="16" class="analysis-summary">
        <a-col :xs="24" :sm="8">
          <div class="summary-item">
            <span class="label">趋势判断</span>
            <span class="value">{{ analysisReport.trend }}</span>
          </div>
        </a-col>
        <a-col :xs="24" :sm="8">
          <div class="summary-item">
            <span class="label">支撑位</span>
            <span class="value support">{{ analysisReport.support }}</span>
          </div>
        </a-col>
        <a-col :xs="24" :sm="8">
          <div class="summary-item">
            <span class="label">压力位</span>
            <span class="value resistance">{{ analysisReport.resistance }}</span>
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
                <a-tag :color="signal.type === 'buy' ? 'green' : signal.type === 'sell' ? 'red' : 'orange'">
                  {{ signal.type === 'buy' ? '买入' : signal.type === 'sell' ? '卖出' : '观望' }}
                </a-tag>
                <span class="indicator-name">{{ signal.indicator }}</span>
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
const stockCode = ref('600519')

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
onMounted(() => {
  loadStockPool()
  onSearch()
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
      analysisReport.value = generateAnalysisReport(data)
      
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
  
  // MACD信号
  if (curr.macd && prev.macd) {
    if (curr.macd.dif > curr.macd.dea && prev.macd.dif <= prev.macd.dea) {
      signals.push({ indicator: 'MACD金叉', type: 'buy', description: 'DIF上穿DEA，短期趋势转强，建议关注' })
    } else if (curr.macd.dif < curr.macd.dea && prev.macd.dif >= prev.macd.dea) {
      signals.push({ indicator: 'MACD死叉', type: 'sell', description: 'DIF下穿DEA，短期趋势转弱，注意风险' })
    }
    if (curr.macd.bar > 0) {
      signals.push({ indicator: 'MACD红柱', type: 'buy', description: '多头排列，上涨动能充足' })
    } else if (curr.macd.bar < 0) {
      signals.push({ indicator: 'MACD绿柱', type: 'sell', description: '空头排列，下跌动能较强' })
    }
  }
  
  // RSI信号
  if (curr.rsi) {
    if (curr.rsi < 20) {
      signals.push({ indicator: 'RSI超卖', type: 'buy', description: `RSI=${curr.rsi.toFixed(1)}极度超卖，可能出现反弹` })
    } else if (curr.rsi < 30) {
      signals.push({ indicator: 'RSI超卖', type: 'buy', description: `RSI=${curr.rsi.toFixed(1)}处于超卖区域，可能反弹` })
    } else if (curr.rsi > 80) {
      signals.push({ indicator: 'RSI超买', type: 'sell', description: `RSI=${curr.rsi.toFixed(1)}极度超买，注意回调风险` })
    } else if (curr.rsi > 70) {
      signals.push({ indicator: 'RSI超买', type: 'sell', description: `RSI=${curr.rsi.toFixed(1)}处于超买区域，可能回调` })
    }
  }
  
  // KDJ信号
  if (curr.kdj) {
    if (curr.kdj.k < 20 && curr.kdj.j < 20) {
      signals.push({ indicator: 'KDJ超卖', type: 'buy', description: 'KDJ处于超卖区域，可能反弹' })
    } else if (curr.kdj.k > 80 && curr.kdj.j > 80) {
      signals.push({ indicator: 'KDJ超买', type: 'sell', description: 'KDJ处于超买区域，注意回调' })
    }
    if (curr.kdj.k > curr.kdj.d && prev.kdj.k <= prev.kdj.d) {
      signals.push({ indicator: 'KDJ金叉', type: 'buy', description: 'K线上穿D线，短期看涨' })
    } else if (curr.kdj.k < curr.kdj.d && prev.kdj.k >= prev.kdj.d) {
      signals.push({ indicator: 'KDJ死叉', type: 'sell', description: 'K线下穿D线，短期看跌' })
    }
  }
  
  // 布林带信号
  if (curr.boll) {
    if (curr.close < curr.boll.lower) {
      signals.push({ indicator: '布林下轨', type: 'buy', description: '价格触及布林下轨，可能出现反弹' })
    } else if (curr.close > curr.boll.upper) {
      signals.push({ indicator: '布林上轨', type: 'sell', description: '价格触及布林上轨，注意回调风险' })
    }
  }
  
  // MA信号
  if (curr.ma5 && curr.ma10 && curr.ma20) {
    if (curr.ma5 > curr.ma10 && curr.ma10 > curr.ma20) {
      signals.push({ indicator: '多头排列', type: 'buy', description: '均线呈多头排列，趋势向好' })
    } else if (curr.ma5 < curr.ma10 && curr.ma10 < curr.ma20) {
      signals.push({ indicator: '空头排列', type: 'sell', description: '均线呈空头排列，趋势向下' })
    }
    if (curr.ma5 > curr.ma10 && prev.ma5 <= prev.ma10) {
      signals.push({ indicator: 'MA5上穿MA10', type: 'buy', description: '短期均线上穿中期均线，形成金叉' })
    } else if (curr.ma5 < curr.ma10 && prev.ma5 >= prev.ma10) {
      signals.push({ indicator: 'MA5下穿MA10', type: 'sell', description: '短期均线下穿中期均线，形成死叉' })
    }
  }
  
  // 成交量信号
  if (curr.volume && data.length > 20) {
    const avgVol = data.slice(0, 20).reduce((sum, d) => sum + d.volume, 0) / 20
    if (curr.volume > avgVol * 2) {
      signals.push({ indicator: '放量突破', type: curr.change > 0 ? 'buy' : 'sell', description: '成交量是均量的2倍以上，关注趋势变化' })
    }
  }
  
  return signals
}

// 生成分析报告
function generateAnalysisReport(data) {
  if (!data || data.length < 20) return null
  
  const latest = data[data.length - 1]
  const prices = data.map(d => d.close).reverse()
  const highs = data.map(d => d.high).reverse()
  const lows = data.map(d => d.low).reverse()
  
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
  const support = lows.slice(-20).reduce((a, b) => a + b, 0) / 20
  const resistance = highs.slice(-20).reduce((a, b) => a + b, 0) / 20
  
  // 综合判断
  let summary = `${currentStock.value.name}当前处于${trend}，`
  
  if (latest.rsi > 70) {
    summary += 'RSI显示超买状态，'
  } else if (latest.rsi < 30) {
    summary += 'RSI显示超卖状态，'
  }
  
  if (latest.macd?.bar > 0) {
    summary += 'MACD多头排列，'
  } else {
    summary += 'MACD空头排列，'
  }
  
  if (latest.close > latest.ma20) {
    summary += '价格位于20日均线上方，建议关注。'
  } else {
    summary += '价格位于20日均线下方，建议谨慎。'
  }
  
  return {
    overallTrend,
    trend,
    support: support.toFixed(2),
    resistance: resistance.toFixed(2),
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
  
  // K线图
  if (klineChartRef.value) {
    charts.kline = echarts.init(klineChartRef.value)
    
    const klineOption = {
      tooltip: { 
        trigger: 'axis', 
        axisPointer: { type: 'cross' }
      },
      legend: { data: ['K线', 'MA5', 'MA10', 'MA20', 'MA60'], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '10%' },
      xAxis: { type: 'category', data: dates, scale: true },
      yAxis: { scale: true, splitArea: { show: true } },
      dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 0 }],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: data.map(d => [d.open, d.close, d.low, d.high]),
          itemStyle: { color: '#f5222d', color0: '#52c41a' }
        },
        selectedIndicators.value.includes('ma') && { name: 'MA5', type: 'line', data: data.map(d => d.ma5), smooth: true, lineStyle: { width: 1, color: '#f5222d' }, symbol: 'none'},
        selectedIndicators.value.includes('ma') && { name: 'MA10', type: 'line', data: data.map(d => d.ma10), smooth: true, lineStyle: { width: 1, color: '#faad14' }, symbol: 'none'},
        selectedIndicators.value.includes('ma') && { name: 'MA20', type: 'line', data: data.map(d => d.ma20), smooth: true, lineStyle: { width: 1, color: '#52c41a' }, symbol: 'none'},
        selectedIndicators.value.includes('ma') && { name: 'MA60', type: 'line', data: data.map(d => d.ma60), smooth: true, lineStyle: { width: 1, color: '#722ed1' }, symbol: 'none'},
        selectedIndicators.value.includes('boll') && { name: 'BOLL_UPPER', type: 'line', data: data.map(d => d.boll?.upper), smooth: true, lineStyle: { width: 1, color: '#1890ff', type: 'dashed' }, symbol: 'none'},
        selectedIndicators.value.includes('boll') && { name: 'BOLL_MID', type: 'line', data: data.map(d => d.boll?.middle), smooth: true, lineStyle: { width: 1, color: '#1890ff' }, symbol: 'none'},
        selectedIndicators.value.includes('boll') && { name: 'BOLL_LOWER', type: 'line', data: data.map(d => d.boll?.lower), smooth: true, lineStyle: { width: 1, color: '#1890ff', type: 'dashed' }, symbol: 'none'}
      ].filter(Boolean)
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
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { scale: true },
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
      yAxis: { min: 0, max: 100 },
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
      yAxis: { min: 0, max: 100 },
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
      yAxis: { scale: true },
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
      yAxis: { scale: true },
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
      yAxis: { scale: true },
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
}

.pool-card {
  margin-bottom: 16px;
}

.stock-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
}

.pool-item {
  cursor: pointer;
  margin: 2px;
}

.pool-item:hover {
  opacity: 0.8;
}

.no-data {
  color: #999;
  font-size: 12px;
}

.search-card {
  margin-bottom: 16px;
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
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.analysis-header .title {
  font-size: 16px;
  font-weight: bold;
}

.analysis-summary .summary-item {
  text-align: center;
  padding: 12px;
  background: rgba(255,255,255,0.8);
  border-radius: 8px;
}

.analysis-summary .summary-item .label {
  display: block;
  font-size: 12px;
  color: #666;
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
}

.key-indicators {
  margin-top: 16px;
}

.indicator-box {
  text-align: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
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
}

.kline-chart {
  height: 500px;
}

.sub-chart-card {
  margin-bottom: 16px;
}

.sub-chart {
  height: 250px;
}

.signal-card {
  margin-bottom: 16px;
}

.signal-item {
  margin-bottom: 12px;
}

.signal-item .indicator-name {
  font-weight: bold;
  margin-left: 8px;
}

.signal-item .description {
  margin-top: 8px;
  margin-bottom: 0;
  font-size: 12px;
  color: #666;
}

.info-card {
  text-align: center;
}

.info-text {
  font-size: 12px;
  color: #999;
}
</style>
