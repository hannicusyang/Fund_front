<template>
  <div class="stock-backtest-pro">
    <a-row :gutter="16">
      <!-- 左侧：策略配置 -->
      <a-col :xs="24" :lg="6">
        <a-card title="⚙️ 策略配置" class="config-card">
          <!-- 数据来源 -->
          <a-form-item label="数据来源">
            <a-radio-group v-model:value="dataSource" @change="onDataSourceChange">
              <a-radio value="portfolio">组合导入</a-radio>
              <a-radio value="watchlist">自选列表</a-radio>
              <a-radio value="manual">手动输入</a-radio>
            </a-radio-group>
          </a-form-item>
          
          <!-- 手动输入股票 -->
          <a-form-item v-if="dataSource === 'manual'" label="股票代码">
            <a-input v-model:value="manualStocks" placeholder="如: 600000,600036,000001" allow-clear />
            <div class="field-tip">多个代码用逗号分隔</div>
          </a-form-item>
          
          <!-- 组合信息 -->
          <div v-if="(dataSource === 'portfolio' || dataSource === 'watchlist') && portfolioData.stocks.length > 0" class="portfolio-info">
            <a-divider>组合信息</a-divider>
            <div class="strategy-tag">
              <a-tag color="blue">{{ portfolioData.strategyType || '自定义' }}</a-tag>
              <a-tag color="orange">{{ portfolioData.stocks.length }}只</a-tag>
            </div>
            <div class="stock-list-mini">
              <a-tag v-for="stock in portfolioData.stocks.slice(0, 5)" :key="stock.code" size="small">
                {{ stock.name }}({{ Number(stock.weight).toFixed(2) }}%)
              </a-tag>
              <span v-if="portfolioData.stocks.length > 5">+{{ portfolioData.stocks.length - 5 }}</span>
            </div>
            <div class="total-weight">总权重: {{ totalWeight.toFixed(2) }}%</div>
          </div>
          
          <!-- 回测参数 -->
          <a-divider>回测参数</a-divider>
          
          <a-form layout="vertical" class="compact-form">
            <!-- 回测期间 -->
            <a-form-item label="回测期间">
              <a-select v-model:value="backtestParams.period">
                <a-select-option value="30">近30天</a-select-option>
                <a-select-option value="60">近60天</a-select-option>
                <a-select-option value="90">近90天</a-select-option>
                <a-select-option value="180">近180天</a-select-option>
                <a-select-option value="365">近1年</a-select-option>
              </a-select>
            </a-form-item>
            
            <!-- 基准指数 -->
            <a-form-item label="基准指数">
              <a-select v-model:value="backtestParams.benchmark">
                <a-select-option value="sh.000001">上证指数</a-select-option>
                <a-select-option value="sh.000300">沪深300</a-select-option>
                <a-select-option value="sz.399001">深证成指</a-select-option>
                <a-select-option value="sz.399006">创业板指</a-select-option>
                <a-select-option value="sh.000688">科创50</a-select-option>
                <a-select-option value="sh.000905">中证500</a-select-option>
                <a-select-option value="sh.000016">上证50</a-select-option>
              </a-select>
            </a-form-item>
            
            <!-- 调仓频率 -->
            <a-form-item label="调仓频率">
              <a-select v-model:value="backtestParams.rebalanceFreq">
                <a-select-option value="none">不再平衡</a-select-option>
                <a-select-option value="daily">日度</a-select-option>
                <a-select-option value="weekly">周度</a-select-option>
                <a-select-option value="monthly">月度</a-select-option>
                <a-select-option value="quarterly">季度</a-select-option>
                <a-select-option value="threshold">阈值触发(5%)</a-select-option>
              </a-select>
            </a-form-item>
            
            <!-- 初始资金 -->
            <a-form-item label="初始资金">
              <a-input-number
                v-model:value="backtestParams.initialCapital"
                :min="10000"
                :step="10000"
                :formatter="value => `¥${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                style="width: 100%"
              />
            </a-form-item>
            
            <!-- 交易成本折叠面板 -->
            <a-collapse ghost class="params-collapse">
              <a-collapse-panel key="1" header="交易成本">
                <a-form-item label="佣金费率" class="sub-form-item">
                  <a-input-number
                    v-model:value="backtestParams.commissionRate"
                    :min="0"
                    :max="0.01"
                    :step="0.0001"
                    :formatter="v => `${(v*10000).toFixed(1)}‰`"
                    :parser="v => parseFloat(v)/10000"
                    style="width: 100%"
                  />
                </a-form-item>
                
                <a-form-item label="印花税率" class="sub-form-item">
                  <a-input-number
                    v-model:value="backtestParams.stampDuty"
                    :min="0"
                    :max="0.01"
                    :step="0.0001"
                    :formatter="v => `${(v*1000).toFixed(1)}‰`"
                    :parser="v => parseFloat(v)/1000"
                    disabled
                    style="width: 100%"
                  />
                  <div class="field-tip">仅卖出时收取</div>
                </a-form-item>
                
                <a-form-item label="滑点" class="sub-form-item">
                  <a-input-number
                    v-model:value="backtestParams.slippage"
                    :min="0"
                    :max="0.01"
                    :step="0.0001"
                    :formatter="v => `${(v*1000).toFixed(1)}‰`"
                    :parser="v => parseFloat(v)/1000"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-collapse-panel>
              
              <a-collapse-panel key="2" header="风险控制">
                <a-form-item label="仓位上限" class="sub-form-item">
                  <a-slider
                    v-model:value="backtestParams.positionLimit"
                    :min="0.5"
                    :max="1"
                    :step="0.1"
                    :marks="{0.5: '50%', 1: '100%'}"
                  />
                </a-form-item>
                
                <a-form-item label="止损线" class="sub-form-item">
                  <a-input-number
                    v-model:value="backtestParams.stopLoss"
                    :min="0"
                    :max="0.5"
                    :step="0.01"
                    :formatter="v => v ? `${(v*100).toFixed(0)}%` : '关闭'"
                    :parser="v => parseFloat(v)/100"
                    style="width: 100%"
                    placeholder="关闭"
                  />
                </a-form-item>
                
                <a-form-item label="止盈线" class="sub-form-item">
                  <a-input-number
                    v-model:value="backtestParams.stopProfit"
                    :min="0"
                    :max="1"
                    :step="0.01"
                    :formatter="v => v ? `${(v*100).toFixed(0)}%` : '关闭'"
                    :parser="v => parseFloat(v)/100"
                    style="width: 100%"
                    placeholder="关闭"
                  />
                </a-form-item>
              </a-collapse-panel>
            </a-collapse>
            
            <!-- 预设模板 -->
            <a-form-item>
              <a-space>
                <a-button size="small" @click="applyTemplate('conservative')">保守型</a-button>
                <a-button size="small" @click="applyTemplate('balanced')">稳健型</a-button>
                <a-button size="small" @click="applyTemplate('aggressive')">激进型</a-button>
                <a-button size="small" @click="resetParams">重置</a-button>
              </a-space>
            </a-form-item>
            
            <!-- 运行按钮 -->
            <a-button 
              type="primary" 
              block 
              size="large"
              @click="runBacktest" 
              :loading="loading"
              :disabled="!canRunBacktest"
            >
              <PlayCircleOutlined /> 运行回测
            </a-button>
          </a-form>
        </a-card>
      </a-col>
      
      <!-- 右侧：回测结果 -->
      <a-col :xs="24" :lg="18">
        <div v-if="backtestResult" class="results-container">
          <!-- 核心指标卡片 -->
          <a-card class="metrics-card">
            <div class="main-metrics">
              <div class="metric-highlight">
                <div class="metric-title">累计收益</div>
                <div class="metric-value-large" :class="getReturnClass(backtestResult.summary.total_return)">
                  {{ formatReturn(backtestResult.summary.total_return) }}
                </div>
                <div class="metric-vs">
                  基准: {{ formatReturn(backtestResult.summary.benchmark_return) }}
                  <a-tag :color="backtestResult.summary.alpha >= 0 ? 'green' : 'red'" size="small">
                    α {{ backtestResult.summary.alpha >= 0 ? '+' : '' }}{{ backtestResult.summary.alpha.toFixed(2) }}%
                  </a-tag>
                </div>
              </div>
              
              <div class="metrics-grid">
                <div class="metric-item">
                  <div class="metric-label">年化收益</div>
                  <div class="metric-value" :class="getReturnClass(backtestResult.summary.annual_return)">
                    {{ formatReturn(backtestResult.summary.annual_return) }}
                  </div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">最大回撤</div>
                  <div class="metric-value text-down">
                    -{{ backtestResult.summary.max_drawdown.toFixed(2) }}%
                  </div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">夏普比率</div>
                  <div class="metric-value" :class="getSharpeClass(backtestResult.summary.sharpe_ratio)">
                    {{ backtestResult.summary.sharpe_ratio.toFixed(2) }}
                  </div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">胜率</div>
                  <div class="metric-value">
                    {{ backtestResult.summary.win_rate.toFixed(1) }}%
                  </div>
                </div>
              </div>
            </div>
          </a-card>
          
          <!-- 图表区域 -->
          <a-row :gutter="16" style="margin-top: 16px">
            <!-- 收益曲线 -->
            <a-col :span="16">
              <a-card title="收益曲线" class="chart-card">
                <div ref="equityCurveRef" class="chart-container"></div>
              </a-card>
            </a-col>
            
            <!-- 统计面板 -->
            <a-col :span="8">
              <a-card title="交易统计" class="stats-card">
                <div class="stats-list">
                  <div class="stat-row">
                    <span>初始资金</span>
                    <span>¥{{ formatNumber(backtestResult.summary.initial_capital) }}</span>
                  </div>
                  <div class="stat-row">
                    <span>最终价值</span>
                    <span :class="getReturnClass(backtestResult.summary.final_value - backtestResult.summary.initial_capital)">
                      ¥{{ formatNumber(backtestResult.summary.final_value) }}
                    </span>
                  </div>
                  <div class="stat-row">
                    <span>盈亏金额</span>
                    <span :class="getReturnClass(backtestResult.summary.profit)">
                      {{ backtestResult.summary.profit >= 0 ? '+' : '' }}¥{{ formatNumber(backtestResult.summary.profit) }}
                    </span>
                  </div>
                  <a-divider style="margin: 8px 0" />
                  <div class="stat-row">
                    <span>总交易次数</span>
                    <span>{{ backtestResult.summary.total_trades }}次</span>
                  </div>
                  <div class="stat-row">
                    <span>买入/卖出</span>
                    <span>{{ backtestResult.summary.buy_trades }} / {{ backtestResult.summary.sell_trades }}</span>
                  </div>
                  <div class="stat-row">
                    <span>交易成本</span>
                    <span>¥{{ formatNumber(backtestResult.summary.total_commission) }}</span>
                  </div>
                  <div class="stat-row">
                    <span>换手率</span>
                    <span>{{ backtestResult.summary.turnover_rate.toFixed(1) }}%</span>
                  </div>
                </div>
              </a-card>
            </a-col>
          </a-row>
          
          <!-- 持仓分析 -->
          <a-row :gutter="16" style="margin-top: 16px">
            <a-col :span="12">
              <a-card title="持仓分布" class="chart-card">
                <div ref="positionPieRef" class="chart-container" style="height: 300px"></div>
              </a-card>
            </a-col>
            <a-col :span="12">
              <a-card title="详细指标" class="detail-metrics-card">
                <a-row :gutter="16">
                  <a-col :span="12" v-for="(item, index) in detailMetrics" :key="index">
                    <div class="detail-metric-item">
                      <div class="detail-label">{{ item.label }}</div>
                      <div class="detail-value" :class="item.class">{{ item.value }}</div>
                    </div>
                  </a-col>
                </a-row>
              </a-card>
            </a-col>
          </a-row>
          
          <!-- 交易记录 -->
          <a-card title="交易记录" class="trades-card" style="margin-top: 16px">
            <a-table
              :dataSource="backtestResult.trades.slice().reverse()"
              :columns="tradeColumns"
              :pagination="{ pageSize: 10 }"
              size="small"
              row-key="date"
            />
          </a-card>
        </div>
        
        <!-- 空状态 -->
        <a-result
          v-else
          status="info"
          title="策略回测"
          sub-title="配置左侧参数，从组合构建导入股票后运行回测"
        >
          <template #extra>
            <a-button type="primary" @click="loadFromPortfolio">
              从组合构建导入
            </a-button>
          </template>
        </a-result>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { PlayCircleOutlined } from '@ant-design/icons-vue'
import * as echarts from 'echarts'
import { stockApi } from '@/api/stock'

// 数据源
const dataSource = ref('portfolio')
const manualStocks = ref('')

// 组合数据（从组合构建页面导入）
const portfolioData = ref({
  stocks: [],
  strategyType: '',
  constraints: {}
})

// 计算总权重
const totalWeight = computed(() => {
  return portfolioData.value.stocks.reduce((sum, s) => sum + (s.weight || 0), 0)
})

// 回测参数默认值
const defaultParams = {
  period: '90',
  benchmark: 'sh.000300',
  rebalanceFreq: 'monthly',
  initialCapital: 1000000,
  commissionRate: 0.0003,
  stampDuty: 0.001,
  slippage: 0.001,
  positionLimit: 1.0,
  stopLoss: null,
  stopProfit: null
}

// 重置参数
const resetParams = () => {
  Object.assign(backtestParams.value, defaultParams)
  message.success('参数已重置')
}

// 回测参数
const backtestParams = ref({
  period: '90',
  benchmark: 'sh.000300',
  rebalanceFreq: 'monthly',
  initialCapital: 1000000,
  commissionRate: 0.0003,
  stampDuty: 0.001,
  slippage: 0.001,
  positionLimit: 1.0,
  stopLoss: null,
  stopProfit: null
})

// 回测结果
const backtestResult = ref(null)
const loading = ref(false)

// 图表引用
const equityCurveRef = ref(null)
const positionPieRef = ref(null)
let charts = {}

// 是否可以运行回测
const canRunBacktest = computed(() => {
  if (dataSource.value === 'manual') {
    return manualStocks.value.trim().length > 0
  }
  return portfolioData.value.stocks.length > 0
})

// 详细指标
const detailMetrics = computed(() => {
  if (!backtestResult.value) return []
  const s = backtestResult.value.summary
  return [
    { label: '年化波动率', value: s.volatility.toFixed(2) + '%', class: '' },
    { label: '索提诺比率', value: s.sortino_ratio.toFixed(2), class: getSharpeClass(s.sortino_ratio) },
    { label: '卡玛比率', value: s.calmar_ratio.toFixed(2), class: getSharpeClass(s.calmar_ratio) },
    { label: '信息比率', value: (s.alpha / s.volatility * 100).toFixed(2), class: '' }
  ]
})

// 交易记录列
const tradeColumns = [
  { title: '日期', dataIndex: 'date', width: 100 },
  { title: '操作', dataIndex: 'action', width: 60 },
  { title: '股票', dataIndex: 'name', width: 100 },
  { title: '价格', dataIndex: 'price', width: 80 },
  { title: '数量', dataIndex: 'shares', width: 80 },
  { title: '金额', dataIndex: 'amount', width: 100 },
  { title: '费用', dataIndex: 'total_cost', width: 80 },
  { title: '原因', dataIndex: 'reason', width: 80 }
]

// 从组合构建导入
const loadFromPortfolio = async () => {
  try {
    // 从localStorage或API获取组合数据
    const savedPortfolio = localStorage.getItem('stock_portfolio')
    if (savedPortfolio) {
      const data = JSON.parse(savedPortfolio)
      portfolioData.value = {
        stocks: data.stocks || [],
        strategyType: data.strategyType || '自定义',
        constraints: data.constraints || {}
      }
      message.success(`已导入 ${portfolioData.value.stocks.length} 只股票`)
    } else {
      // 从API获取
      const res = await stockApi.getStockWatchlist()
      if (res.data) {
        portfolioData.value.stocks = res.data.map(s => ({
          code: s.stock_code,
          name: s.stock_name,
          weight: 100 / res.data.length  // 等权重
        }))
        portfolioData.value.strategyType = '等权重'
        message.success(`从自选导入 ${portfolioData.value.stocks.length} 只股票`)
      }
    }
  } catch (e) {
    console.error('导入失败:', e)
    message.error('导入组合数据失败')
  }
}

// 数据源切换
const onDataSourceChange = () => {
  if (dataSource.value === 'portfolio') {
    loadFromPortfolio()
  }
}

// 应用参数模板
const applyTemplate = (type) => {
  const templates = {
    conservative: {
      rebalanceFreq: 'quarterly',
      commissionRate: 0.0003,
      slippage: 0.001,
      positionLimit: 0.8,
      stopLoss: 0.08,
      stopProfit: 0.15
    },
    balanced: {
      rebalanceFreq: 'monthly',
      commissionRate: 0.0003,
      slippage: 0.001,
      positionLimit: 1.0,
      stopLoss: null,
      stopProfit: null
    },
    aggressive: {
      rebalanceFreq: 'weekly',
      commissionRate: 0.00025,
      slippage: 0.0005,
      positionLimit: 1.0,
      stopLoss: null,
      stopProfit: null
    }
  }
  
  const template = templates[type]
  if (template) {
    Object.assign(backtestParams.value, template)
    message.success(`已应用${type === 'conservative' ? '保守型' : type === 'balanced' ? '稳健型' : '激进型'}模板`)
  }
}

// 运行回测
const runBacktest = async () => {
  if (portfolioData.value.stocks.length === 0) {
    message.warning('请先导入股票组合')
    return
  }
  
  // 限制股票数量
  const maxStocks = 20
  // 获取股票列表
  let stocksToUse = []
  if (dataSource.value === 'manual') {
    // 手动输入的股票
    const codes = manualStocks.value.split(',').map(c => c.trim()).filter(c => c)
    stocksToUse = codes.map(code => ({
      code: code.startsWith('sh.') || code.startsWith('sz.') ? code : (code.startsWith('6') ? 'sh.' + code : 'sz.' + code),
      name: code,
      weight: 100 / codes.length
    }))
  } else {
    stocksToUse = portfolioData.value.stocks.slice(0, maxStocks)
  }
  if (portfolioData.value.stocks.length > maxStocks) {
    message.warning(`已自动截取前${maxStocks}只股票进行回测`)
  }
  
  loading.value = true
  
  // 超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000) // 60秒超时
  
  try {
    const res = await fetch('/api/stock/pro/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stocks: stocksToUse.map(s => ({
          code: s.code,
          name: s.name,
          weight: s.weight / 100
        })),
        period: parseInt(backtestParams.value.period),
        initialCapital: backtestParams.value.initialCapital,
        benchmark: backtestParams.value.benchmark,
        rebalanceFreq: backtestParams.value.rebalanceFreq,
        commissionRate: backtestParams.value.commissionRate,
        stampDuty: backtestParams.value.stampDuty,
        slippage: backtestParams.value.slippage,
        positionLimit: backtestParams.value.positionLimit,
        stopLoss: backtestParams.value.stopLoss,
        stopProfit: backtestParams.value.stopProfit
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    const data = await res.json()
    
    if (data.success) {
      backtestResult.value = data.data
      message.success('回测完成')
      await nextTick()
      drawCharts()
    } else {
      message.error(data.message || '回测失败')
    }
  } catch (e) {
    console.error('回测错误:', e)
    message.error('回测失败')
  } finally {
    loading.value = false
  }
}

// 绘制图表
const drawCharts = () => {
  if (!backtestResult.value) return
  
  const { curve, positions } = backtestResult.value
  
  // 收益曲线
  if (equityCurveRef.value) {
    if (charts.equity) charts.equity.dispose()
    charts.equity = echarts.init(equityCurveRef.value)
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: { data: ['组合', '基准'], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
      xAxis: {
        type: 'category',
        data: curve.dates,
        axisLabel: { interval: Math.floor(curve.dates.length / 6) }
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: v => '¥' + (v / 10000).toFixed(0) + '万' }
      },
      series: [
        {
          name: '组合',
          type: 'line',
          data: curve.portfolio,
          smooth: true,
          lineStyle: { color: '#1890ff', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(24,144,255,0.3)' },
              { offset: 1, color: 'rgba(24,144,255,0.05)' }
            ])
          }
        },
        {
          name: '基准',
          type: 'line',
          data: curve.benchmark,
          smooth: true,
          lineStyle: { color: '#f5222d', width: 1, type: 'dashed' }
        }
      ]
    }
    charts.equity.setOption(option)
  }
  
  // 持仓饼图
  if (positionPieRef.value && positions.length > 0) {
    if (charts.pie) charts.pie.dispose()
    charts.pie = echarts.init(positionPieRef.value)
    
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}股 ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        type: 'scroll'
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{c}股'
        },
        data: positions.map(p => ({
          name: p.name,
          value: p.shares
        }))
      }]
    }
    charts.pie.setOption(option)
  }
}

// 格式化函数
const formatReturn = (val) => {
  if (val === undefined || val === null) return '--'
  return (val >= 0 ? '+' : '') + val.toFixed(2) + '%'
}

const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

const getReturnClass = (val) => {
  if (val === undefined || val === null) return ''
  return val >= 0 ? 'text-up' : 'text-down'
}

const getSharpeClass = (val) => {
  if (val === undefined || val === null) return ''
  if (val >= 2) return 'text-excellent'
  if (val >= 1) return 'text-good'
  if (val >= 0) return 'text-normal'
  return 'text-poor'
}

// 初始化
onMounted(() => {
  loadFromPortfolio()
  window.addEventListener('resize', () => {
    Object.values(charts).forEach(c => c?.resize())
  })
})
</script>

<style scoped lang="less">
.stock-backtest-pro {
  padding: 16px;
  
  .config-card {
    .portfolio-info {
      margin-bottom: 16px;
      
      .strategy-tag {
        margin-bottom: 8px;
      }
      
      .stock-list-mini {
        .ant-tag {
          margin-bottom: 4px;
        }
      }
      
      .total-weight {
        margin-top: 8px;
        font-size: 12px;
        color: #666;
      }
    }
    
    .compact-form {
      .ant-form-item {
        margin-bottom: 12px;
      }
    }
    
    .params-collapse {
      margin-bottom: 12px;
      
      .sub-form-item {
        margin-bottom: 8px;
      }
    }
    
    .field-tip {
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }
  }
  
  .results-container {
    .metrics-card {
      .main-metrics {
        display: flex;
        align-items: center;
        gap: 32px;
        
        .metric-highlight {
          flex-shrink: 0;
          
          .metric-title {
            font-size: 14px;
            color: #666;
          }
          
          .metric-value-large {
            font-size: 36px;
            font-weight: bold;
            
            &.text-up { color: #f5222d; }
            &.text-down { color: #52c41a; }
          }
          
          .metric-vs {
            font-size: 12px;
            color: #999;
            margin-top: 4px;
          }
        }
        
        .metrics-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          
          .metric-item {
            text-align: center;
            padding: 12px;
            background: #f6ffed;
            border-radius: 8px;
            
            .metric-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 4px;
            }
            
            .metric-value {
              font-size: 20px;
              font-weight: 500;
              
              &.text-up { color: #f5222d; }
              &.text-down { color: #52c41a; }
              &.text-excellent { color: #52c41a; }
              &.text-good { color: #1890ff; }
              &.text-normal { color: #faad14; }
              &.text-poor { color: #f5222d; }
            }
          }
        }
      }
    }
    
    .chart-card {
      .chart-container {
        height: 350px;
      }
    }
    
    .stats-card {
      .stats-list {
        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dashed #f0f0f0;
          
          &:last-child {
            border-bottom: none;
          }
          
          span:first-child {
            color: #666;
          }
          
          span:last-child {
            font-weight: 500;
          }
        }
      }
    }
    
    .detail-metrics-card {
      .detail-metric-item {
        padding: 12px;
        margin-bottom: 8px;
        background: #fafafa;
        border-radius: 4px;
        
        .detail-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .detail-value {
          font-size: 18px;
          font-weight: 500;
        }
      }
    }
    
    .trades-card {
      margin-top: 16px;
    }
  }
  
  .text-up { color: #f5222d; }
  .text-down { color: #52c41a; }
}
</style>
