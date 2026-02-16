<template>
  <div class="stock-analysis-container">
    <!-- 股票选择区域 -->
    <a-card title="🔍 股票选择" class="search-card">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :md="8">
          <a-input-search
            v-model:value="stockCode"
            placeholder="输入股票代码或名称"
            enter-button
            @search="onSearch"
            :loading="loading"
          />
        </a-col>
        <a-col :xs="24" :sm="12" :md="16">
          <a-space>
            <a-select v-model:value="timeRange" style="width: 120px" @change="onTimeRangeChange">
              <a-select-option value="1m">近1月</a-select-option>
              <a-select-option value="3m">近3月</a-select-option>
              <a-select-option value="6m">近6月</a-select-option>
              <a-select-option value="1y">近1年</a-select-option>
              <a-select-option value="2y">近2年</a-select-option>
            </a-select>
            <a-radio-group v-model:value="chartType" button-style="solid" size="small">
              <a-radio-button value="kline">K线</a-radio-button>
              <a-radio-button value="line">分时</a-radio-button>
            </a-radio-group>
            <a-button @click="refreshData" :loading="loading">
              <ReloadOutlined /> 刷新
            </a-button>
          </a-space>
        </a-col>
      </a-row>

      <!-- 股票信息展示 -->
      <div v-if="currentStock" class="stock-info">
        <a-divider />
        <a-row :gutter="16">
          <a-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">股票名称：</span>
              <span class="value">{{ currentStock.name }}</span>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">最新价：</span>
              <span class="value" :class="getPriceClass(currentStock.change)">
                {{ currentStock.price?.toFixed(2) }}
              </span>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">涨跌幅：</span>
              <span class="value" :class="getPriceClass(currentStock.change)">
                {{ currentStock.change > 0 ? '+' : '' }}{{ currentStock.change?.toFixed(2) }}%
              </span>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">换手率：</span>
              <span class="value">{{ currentStock.turnover?.toFixed(2) }}%</span>
            </div>
          </a-col>
        </a-row>
      </div>
    </a-card>

    <!-- 技术指标选择 -->
    <a-card title="📊 技术指标" class="indicator-card">
      <a-checkbox-group v-model:value="selectedIndicators" @change="onIndicatorChange">
        <a-row :gutter="[16, 8]">
          <a-col :span="6">
            <a-checkbox value="ma">MA均线 (5/10/20/60)</a-checkbox>
          </a-col>
          <a-col :span="6">
            <a-checkbox value="macd">MACD</a-checkbox>
          </a-col>
          <a-col :span="6">
            <a-checkbox value="rsi">RSI</a-checkbox>
          </a-col>
          <a-col :span="6">
            <a-checkbox value="kdj">KDJ</a-checkbox>
          </a-col>
          <a-col :span="6">
            <a-checkbox value="boll">布林带</a-checkbox>
          </a-col>
          <a-col :span="6">
            <a-checkbox value="volume">成交量</a-checkbox>
          </a-col>
          <a-col :span="6">
            <a-checkbox value="cci">CCI</a-checkbox>
          </a-col>
          <a-col :span="6">
            <a-checkbox value="wr">威廉指标</a-checkbox>
          </a-col>
        </a-row>
      </a-checkbox-group>
    </a-card>

    <!-- 主图表区域 -->
    <a-row :gutter="16" class="chart-row">
      <a-col :xs="24" :lg="16">
        <a-card title="📈 K线图" class="chart-card">
          <div ref="klineChartRef" class="chart kline-chart"></div>
          <!-- 指标说明 -->
          <a-collapse class="indicator-legend">
            <a-collapse-panel key="1" header="指标说明">
              <a-descriptions :column="2" size="small">
                <a-descriptions-item label="MA5"><span style="color:#f5222d">——</span> 5日均线</a-descriptions-item>
                <a-descriptions-item label="MA10"><span style="color:#faad14">——</span> 10日均线</a-descriptions-item>
                <a-descriptions-item label="MA20"><span style="color:#52c41a">——</span> 20日均线</a-descriptions-item>
                <a-descriptions-item label="MA60"><span style="color:#722ed1">——</span> 60日均线</a-descriptions-item>
              </a-descriptions>
            </a-collapse-panel>
          </a-collapse>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="8">
        <!-- 技术指标子图 -->
        <a-card title="📉 技术指标" class="sub-chart-card">
          <!-- MACD -->
          <div v-if="selectedIndicators.includes('macd')" class="sub-chart-wrapper">
            <div class="sub-chart-title">MACD</div>
            <div ref="macdChartRef" class="chart sub-chart"></div>
          </div>

          <!-- RSI -->
          <div v-if="selectedIndicators.includes('rsi')" class="sub-chart-wrapper">
            <div class="sub-chart-title">RSI</div>
            <div ref="rsiChartRef" class="chart sub-chart"></div>
          </div>

          <!-- KDJ -->
          <div v-if="selectedIndicators.includes('kdj')" class="sub-chart-wrapper">
            <div class="sub-chart-title">KDJ</div>
            <div ref="kdjChartRef" class="chart sub-chart"></div>
          </div>

          <!-- 成交量 -->
          <div v-if="selectedIndicators.includes('volume')" class="sub-chart-wrapper">
            <div class="sub-chart-title">成交量</div>
            <div ref="volumeChartRef" class="chart sub-chart"></div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 信号分析 -->
    <a-card title="🎯 技术信号" class="signal-card" v-if="techSignals.length > 0">
      <a-list :data-source="techSignals" size="small">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta
              :title="item.indicator"
              :description="item.description"
            >
              <template #avatar>
                <a-tag :color="item.type === 'buy' ? 'green' : item.type === 'sell' ? 'red' : 'blue'"
                >
                  {{ item.type === 'buy' ? '买入' : item.type === 'sell' ? '卖出' : '中性' }}
                </a-tag>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </a-card>

    <!-- 空状态 -->
    <a-empty v-if="!currentStock && !loading" description="请输入股票代码开始分析">
      <template #extra>
        <a-space>
          <a-tag color="blue">600519</a-tag>
          <a-tag color="blue">000001</a-tag>
          <a-tag color="blue">000858</a-tag>
          <a-tag color="blue">300750</a-tag>
          <a-button type="link" @click="() => { stockCode = '600519'; onSearch() }">
            查看贵州茅台
          </a-button>
        </a-space>
      </template>
    </a-empty>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import * as echarts from 'echarts'
import { stockAnalysisApi } from '@/api/stockModel.js'

// 响应式数据
const stockCode = ref('')
const timeRange = ref('1y')
const chartType = ref('kline')
const loading = ref(false)
const currentStock = ref(null)
const selectedIndicators = ref(['ma', 'macd', 'volume'])
const techSignals = ref([])

// 图表引用
const klineChartRef = ref(null)
const macdChartRef = ref(null)
const rsiChartRef = ref(null)
const kdjChartRef = ref(null)
const volumeChartRef = ref(null)

// 图表实例
let charts = {}

// 模拟股票数据 - 硬编码（实际应从后端获取）
const MOCK_STOCK_DATA = {
  '600519': {
    name: '贵州茅台',
    price: 1680.50,
    change: 0.85,
    turnover: 0.35,
    klineData: generateMockKline(100)
  },
  '000001': {
    name: '平安银行',
    price: 10.50,
    change: 1.23,
    turnover: 2.35,
    klineData: generateMockKline(80)
  },
  '000858': {
    name: '五粮液',
    price: 145.50,
    change: -0.65,
    turnover: 1.25,
    klineData: generateMockKline(90)
  },
  '300750': {
    name: '宁德时代',
    price: 185.50,
    change: 3.25,
    turnover: 4.55,
    klineData: generateMockKline(120)
  }
}

// 生成模拟K线数据 - 硬编码算法
function generateMockKline(count) {
  const data = []
  let basePrice = 100
  const now = new Date()
  
  for (let i = count; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    const change = (Math.random() - 0.5) * 0.05
    basePrice = basePrice * (1 + change)
    
    const open = basePrice * (1 + (Math.random() - 0.5) * 0.02)
    const close = basePrice * (1 + (Math.random() - 0.5) * 0.02)
    const low = Math.min(open, close) * (1 - Math.random() * 0.01)
    const high = Math.max(open, close) * (1 + Math.random() * 0.01)
    const volume = Math.floor(Math.random() * 100000) + 50000
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      volume: volume
    })
  }
  
  return data
}

// 计算技术指标 - 硬编码算法（实际应由后端计算）
function calculateIndicators(data) {
  const result = { ...data }
  
  // 计算MA均线
  result.ma5 = calculateMA(data, 5)
  result.ma10 = calculateMA(data, 10)
  result.ma20 = calculateMA(data, 20)
  result.ma60 = calculateMA(data, 60)
  
  // 计算MACD
  result.macd = calculateMACD(data)
  
  // 计算RSI
  result.rsi = calculateRSI(data, 14)
  
  // 计算KDJ
  result.kdj = calculateKDJ(data)
  
  return result
}

// 计算移动平均线
function calculateMA(data, period) {
  return data.map((item, index) => {
    if (index < period - 1) return null
    const sum = data.slice(index - period + 1, index + 1).reduce((a, b) => a + b.close, 0)
    return parseFloat((sum / period).toFixed(2))
  })
}

// 计算MACD（简化版）
function calculateMACD(data) {
  const closes = data.map(d => d.close)
  const ema12 = calculateEMA(closes, 12)
  const ema26 = calculateEMA(closes, 26)
  const dif = ema12.map((v, i) => v && ema26[i] ? parseFloat((v - ema26[i]).toFixed(3)) : null)
  const dea = calculateEMA(dif.filter(v => v !== null), 9)
  
  return {
    dif: dif,
    dea: dea,
    bar: dif.map((v, i) => v && dea[i] ? parseFloat(((v - dea[i]) * 2).toFixed(3)) : null)
  }
}

// 计算EMA
function calculateEMA(data, period) {
  const multiplier = 2 / (period + 1)
  const ema = [data[0]]
  
  for (let i = 1; i < data.length; i++) {
    ema.push(parseFloat(((data[i] - ema[i-1]) * multiplier + ema[i-1]).toFixed(3)))
  }
  
  return ema
}

// 计算RSI
function calculateRSI(data, period = 14) {
  return data.map((item, index) => {
    if (index < period) return null
    
    let gains = 0, losses = 0
    for (let i = index - period + 1; i <= index; i++) {
      const change = data[i].close - data[i-1].close
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }
    
    const avgGain = gains / period
    const avgLoss = losses / period
    
    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return parseFloat((100 - (100 / (1 + rs))).toFixed(2))
  })
}

// 计算KDJ（简化版）
function calculateKDJ(data, n = 9, m1 = 3, m2 = 3) {
  const k = []
  const d = []
  const j = []
  
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) {
      k.push(null)
      d.push(null)
      j.push(null)
      continue
    }
    
    const periodData = data.slice(i - n + 1, i + 1)
    const low = Math.min(...periodData.map(d => d.low))
    const high = Math.max(...periodData.map(d => d.high))
    const close = data[i].close
    
    const rsv = high === low ? 50 : ((close - low) / (high - low)) * 100
    
    const kVal = i === n - 1 ? 50 : (2/3) * k[i-1] + (1/3) * rsv
    const dVal = i === n - 1 ? 50 : (2/3) * d[i-1] + (1/3) * kVal
    const jVal = 3 * kVal - 2 * dVal
    
    k.push(parseFloat(kVal.toFixed(2)))
    d.push(parseFloat(dVal.toFixed(2)))
    j.push(parseFloat(jVal.toFixed(2)))
  }
  
  return { k, d, j }
}

// 生成技术信号 - 硬编码规则
function generateSignals(data) {
  const signals = []
  const lastIndex = data.length - 1
  
  // MACD信号
  const macd = data.macd
  if (macd.dif[lastIndex] > macd.dea[lastIndex] && macd.dif[lastIndex-1] <= macd.dea[lastIndex-1]) {
    signals.push({ indicator: 'MACD金叉', type: 'buy', description: 'DIF上穿DEA，短期趋势转强' })
  } else if (macd.dif[lastIndex] < macd.dea[lastIndex] && macd.dif[lastIndex-1] >= macd.dea[lastIndex-1]) {
    signals.push({ indicator: 'MACD死叉', type: 'sell', description: 'DIF下穿DEA，短期趋势转弱' })
  }
  
  // RSI信号
  const rsi = data.rsi[lastIndex]
  if (rsi < 30) {
    signals.push({ indicator: 'RSI超卖', type: 'buy', description: `RSI=${rsi}，处于超卖区域，可能反弹` })
  } else if (rsi > 70) {
    signals.push({ indicator: 'RSI超买', type: 'sell', description: `RSI=${rsi}，处于超买区域，可能回调` })
  }
  
  // 均线信号
  const ma5 = data.ma5[lastIndex]
  const ma20 = data.ma20[lastIndex]
  if (ma5 && ma20 && ma5 > ma20 && data.ma5[lastIndex-1] <= data.ma20[lastIndex-1]) {
    signals.push({ indicator: '均线金叉', type: 'buy', description: 'MA5上穿MA20，中期趋势向好' })
  }
  
  return signals
}

// 搜索股票
const onSearch = async () => {
  if (!stockCode.value) {
    message.warning('请输入股票代码')
    return
  }
  
  loading.value = true
  
  try {
    // 调用后端API获取带技术指标的K线数据
    const response = await stockAnalysisApi.getKlineWithIndicators(
      stockCode.value.trim(), 
      timeRange.value === '1m' ? 'daily' : 
      timeRange.value === '3m' ? 'daily' :
      timeRange.value === '6m' ? 'daily' :
      timeRange.value === '1y' ? 'daily' : 'daily'
    )
    
    if (response.success && response.data && response.data.length > 0) {
      // 处理后端返回的数据
      const data = response.data
      const stockInfo = data[0] // 最新一条数据
      
      currentStock.value = {
        code: stockCode.value.trim(),
        name: stockInfo.name || stockCode.value,
        price: stockInfo.close,
        change: stockInfo.change_percent,
        turnover: stockInfo.turnover,
        data: data
      }
      
      // 生成技术信号
      techSignals.value = generateSignalsFromData(data)
      
      message.success(`已加载 ${currentStock.value.name} 数据`)
      
      // 渲染图表
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

// 从真实数据生成技术信号
function generateSignalsFromData(data) {
  const signals = []
  if (!data || data.length < 2) return signals
  
  const lastIndex = data.length - 1
  const curr = data[lastIndex]
  const prev = data[lastIndex - 1]
  
  // MACD信号
  if (curr.macd && prev.macd) {
    if (curr.macd.dif > curr.macd.dea && prev.macd.dif <= prev.macd.dea) {
      signals.push({ indicator: 'MACD金叉', type: 'buy', description: 'DIF上穿DEA，短期趋势转强' })
    } else if (curr.macd.dif < curr.macd.dea && prev.macd.dif >= prev.macd.dea) {
      signals.push({ indicator: 'MACD死叉', type: 'sell', description: 'DIF下穿DEA，短期趋势转弱' })
    }
  }
  
  // RSI信号
  if (curr.rsi) {
    if (curr.rsi < 30) {
      signals.push({ indicator: 'RSI超卖', type: 'buy', description: `RSI=${curr.rsi.toFixed(1)}，处于超卖区域，可能反弹` })
    } else if (curr.rsi > 70) {
      signals.push({ indicator: 'RSI超买', type: 'sell', description: `RSI=${curr.rsi.toFixed(1)}，处于超买区域，可能回调` })
    }
  }
  
  // KDJ信号
  if (curr.kdj && prev.kdj) {
    if (curr.kdj.k < 20 && curr.kdj.k > curr.kdj.d && prev.kdj.k <= prev.kdj.d) {
      signals.push({ indicator: 'KDJ金叉', type: 'buy', description: 'K值超卖并上穿D值' })
    } else if (curr.kdj.k > 80 && curr.kdj.k < prev.kdj.d && prev.kdj.k >= prev.kdj.d) {
      signals.push({ indicator: 'KDJ死叉', type: 'sell', description: 'K值超买并下穿D值' })
    }
  }
  
  // 均线信号
  if (curr.ma5 && curr.ma20) {
    if (curr.ma5 > curr.ma20 && data[lastIndex-1].ma5 <= data[lastIndex-1].ma20) {
      signals.push({ indicator: '均线金叉', type: 'buy', description: 'MA5上穿MA20，中期趋势向好' })
    } else if (curr.ma5 < curr.ma20 && data[lastIndex-1].ma5 >= data[lastIndex-1].ma20) {
      signals.push({ indicator: '均线死叉', type: 'sell', description: 'MA5下穿MA20，中期趋势转弱' })
    }
  }
  
  // 布林带信号
  if (curr.boll) {
    if (curr.close < curr.boll.lower) {
      signals.push({ indicator: '布林下轨', type: 'buy', description: '价格触及布林下轨，可能反弹' })
    } else if (curr.close > curr.boll.upper) {
      signals.push({ indicator: '布林上轨', type: 'sell', description: '价格触及布林上轨，可能回调' })
    }
  }
  
  return signals
}

// 渲染图表
const renderCharts = () => {
  if (!currentStock.value) return
  
  const data = currentStock.value.data
  const dates = data.map(d => d.date)
  
  // 销毁旧图表
  Object.values(charts).forEach(chart => chart?.dispose())
  
  // K线图
  if (klineChartRef.value) {
    charts.kline = echarts.init(klineChartRef.value)
    const klineOption = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
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
        selectedIndicators.value.includes('ma') && { name: 'MA5', type: 'line', data: data.map(d => d.ma5), smooth: true, lineStyle: { color: '#f5222d' }, symbol: 'none'},
        selectedIndicators.value.includes('ma') && { name: 'MA10', type: 'line', data: data.map(d => d.ma10), smooth: true, lineStyle: { color: '#faad14' }, symbol: 'none'},
        selectedIndicators.value.includes('ma') && { name: 'MA20', type: 'line', data: data.map(d => d.ma20), smooth: true, lineStyle: { color: '#52c41a' }, symbol: 'none'},
        selectedIndicators.value.includes('ma') && { name: 'MA60', type: 'line', data: data.map(d => d.ma60), smooth: true, lineStyle: { color: '#722ed1' }, symbol: 'none'}
      ].filter(Boolean)
    }
    charts.kline.setOption(klineOption)
  }
  
  // MACD图
  if (macdChartRef.value && selectedIndicators.value.includes('macd')) {
    charts.macd = echarts.init(macdChartRef.value)
    const macdData = data.map(d => d.macd ? d.macd.bar : null)
    charts.macd.setOption({
      grid: { left: '3%', right: '4%', top: '10%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { scale: true },
      series: [
        { name: 'DIF', type: 'line', data: data.map(d => d.macd?.dif), lineStyle: { color: '#1890ff' }, symbol: 'none'},
        { name: 'DEA', type: 'line', data: data.map(d => d.macd?.dea), lineStyle: { color: '#f5222d' }, symbol: 'none'},
        { name: 'MACD', type: 'bar', data: macdData, itemStyle: { color: (p) => p.value >= 0 ? '#f5222d' : '#52c41a' }}
      ]
    })
  }
  
  // RSI图
  if (rsiChartRef.value && selectedIndicators.value.includes('rsi')) {
    charts.rsi = echarts.init(rsiChartRef.value)
    charts.rsi.setOption({
      grid: { left: '3%', right: '4%', top: '10%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { min: 0, max: 100 },
      series: [
        { name: 'RSI', type: 'line', data: data.map(d => d.rsi), lineStyle: { color: '#eb2f96' }, symbol: 'none'},
        { name: '超买线', type: 'line', data: data.map(() => 70), lineStyle: { color: '#f5222d', type: 'dashed' }, symbol: 'none' },
        { name: '超卖线', type: 'line', data: data.map(() => 30), lineStyle: { color: '#52c41a', type: 'dashed' }, symbol: 'none' }
      ]
    })
  }
  
  // KDJ图
  if (kdjChartRef.value && selectedIndicators.value.includes('kdj')) {
    charts.kdj = echarts.init(kdjChartRef.value)
    charts.kdj.setOption({
      grid: { left: '3%', right: '4%', top: '10%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: { scale: true },
      series: [
        { name: 'K', type: 'line', data: data.map(d => d.kdj?.k), lineStyle: { color: '#1890ff' }, symbol: 'none'},
        { name: 'D', type: 'line', data: data.map(d => d.kdj?.d), lineStyle: { color: '#f5222d' }, symbol: 'none'},
        { name: 'J', type: 'line', data: data.map(d => d.kdj?.j), lineStyle: { color: '#52c41a' }, symbol: 'none'}
      ]
    })
  }
  
  // 成交量图
  if (volumeChartRef.value && selectedIndicators.value.includes('volume')) {
    charts.volume = echarts.init(volumeChartRef.value)
    charts.volume.setOption({
      grid: { left: '3%', right: '4%', top: '10%', bottom: '5%' },
      xAxis: { type: 'category', data: dates, show: false },
      yAxis: {},
      series: [
        { name: '成交量', type: 'bar', data: data.map(d => d.volume), itemStyle: { color: (p) => data[p.dataIndex].close >= data[p.dataIndex].open ? '#f5222d' : '#52c41a' }}
      ]
    })
  }
}

// 指标切换
const onIndicatorChange = () => {
  nextTick(() => renderCharts())
}

// 时间范围切换
const onTimeRangeChange = () => {
  if (currentStock.value) {
    onSearch()
  }
}

// 刷新数据
const refreshData = () => {
  onSearch()
}

// 获取价格样式
const getPriceClass = (change) => {
  if (change > 0) return 'text-up'
  if (change < 0) return 'text-down'
  return ''
}

// 窗口大小改变时重绘
window.addEventListener('resize', () => {
  Object.values(charts).forEach(chart => chart?.resize())
})
</script>

<style scoped lang="less">
.stock-analysis-container {
  padding: 16px;

  .search-card {
    margin-bottom: 16px;

    .stock-info {
      .info-item {
        display: flex;
        align-items: center;
        padding: 8px 0;

        .label {
          color: #8c8c8c;
          margin-right: 8px;
        }

        .value {
          font-size: 16px;
          font-weight: 500;

          &.text-up {
            color: #f5222d;
          }

          &.text-down {
            color: #52c41a;
          }
        }
      }
    }
  }

  .indicator-card {
    margin-bottom: 16px;
  }

  .chart-row {
    margin-bottom: 16px;
  }

  .chart-card {
    .kline-chart {
      height: 400px;
    }

    .indicator-legend {
      margin-top: 12px;
    }
  }

  .sub-chart-card {
    .sub-chart-wrapper {
      margin-bottom: 16px;

      .sub-chart-title {
        font-size: 12px;
        color: #8c8c8c;
        margin-bottom: 4px;
      }

      .sub-chart {
        height: 120px;
      }
    }
  }

  .signal-card {
    margin-top: 16px;
  }

  .chart {
    width: 100%;
  }
}

// 移动端适配
@media (max-width: 768px) {
  .stock-analysis-container {
    padding: 8px;

    .chart-card .kline-chart {
      height: 300px;
    }

    .sub-chart-card .sub-chart {
      height: 100px;
    }
  }
}
</style>
