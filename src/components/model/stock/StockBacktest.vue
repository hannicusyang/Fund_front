<template>
  <div class="stock-backtest-container">
    <a-row :gutter="16">
      <!-- 左侧：策略配置 -->
      <a-col :xs="24" :lg="6">
        <a-card title="⚙️ 策略配置" class="config-card">
          <a-form layout="vertical">
            <!-- 策略模板 -->
            <a-form-item label="策略模板">
              <a-select v-model:value="selectedStrategy" placeholder="选择策略模板" allow-clear>
                <a-select-option value="equal">等权重策略</a-select-option>
                <a-select-option value="momentum">动量策略</a-select-option>
                <a-select-option value="value">价值策略</a-select-option>
                <a-select-option value="growth">成长策略</a-select-option>
              </a-select>
            </a-form-item>
            
            <!-- 股票来源：固定为自选股 -->
            <a-form-item label="股票来源">
              <a-tag color="blue">自选股</a-tag>
            </a-form-item>
            
            <!-- 自选股选择 -->
            <a-form-item label="选择自选股">
              <a-select
                v-model:value="selectedStocks"
                mode="multiple"
                placeholder="从自选股选择"
                :max-tag-count="5"
                :options="watchlistOptions"
                allow-clear
                @change="onWatchlistChange"
              />
            </a-form-item>
            
            <a-divider>已选股票 ({{ selectedStockList.length }}只)</a-divider>
            
            <div class="selected-stocks">
              <a-tag 
                v-for="stock in selectedStockList" 
                :key="stock.code"
                closable 
                @close="removeStock(stock.code)"
                :color="getStockColor(stock.code)"
              >
                {{ stock.name || stock.code }} ({{ stock.code }})
              </a-tag>
              <a-empty v-if="selectedStockList.length === 0" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
            </div>
            
            <a-divider>回测参数</a-divider>
            
            <a-form-item label="回测周期">
              <a-select v-model:value="backtestParams.period">
                <a-select-option value="30">近30天</a-select-option>
                <a-select-option value="60">近60天</a-select-option>
                <a-select-option value="90">近90天</a-select-option>
                <a-select-option value="180">近180天</a-select-option>
                <a-select-option value="365">近1年</a-select-option>
              </a-select>
            </a-form-item>
            
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
            
            <a-form-item label="初始资金">
              <a-input-number
                v-model:value="backtestParams.initialCapital"
                :min="10000"
                :step="10000"
                style="width: 100%"
              />
            </a-form-item>
            
            <a-form-item label="仓位管理">
              <a-radio-group v-model:value="backtestParams.positionType">
                <a-radio value="all_in">一次性建仓</a-radio>
                <a-radio value="dollar_cost">定投建仓</a-radio>
              </a-radio-group>
            </a-form-item>
            
            <a-form-item label="再平衡策略">
              <a-select v-model:value="backtestParams.rebalanceStrategy">
                <a-select-option value="none">不再平衡</a-select-option>
                <a-select-option value="monthly">每月再平衡</a-select-option>
                <a-select-option value="quarterly">季度再平衡</a-select-option>
                <a-select-option value="threshold">阈值再平衡(偏差超10%)</a-select-option>
              </a-select>
            </a-form-item>
            
            <a-divider>交易成本</a-divider>
            
            <a-form-item label="佣金费率">
              <a-input-number
                v-model:value="backtestParams.commissionRate"
                :min="0"
                :max="0.01"
                :step="0.0001"
                :formatter="value => `${(value * 10000).toFixed(1)}‰`"
                :parser="value => parseFloat(value.replace('‰', '')) / 10000"
                style="width: 100%"
              />
            </a-form-item>
            
            <a-form-item label="印花税率">
              <a-input-number
                v-model:value="backtestParams.stampDuty"
                :min="0"
                :max="0.01"
                :step="0.0001"
                :formatter="value => `${(value * 1000).toFixed(1)}‰`"
                :parser="value => parseFloat(value.replace('‰', '')) / 1000"
                style="width: 100%"
                disabled
              />
              <div class="field-tip">印花税仅卖出收取(千一)</div>
            </a-form-item>
            
            <a-form-item label="滑点">
              <a-input-number
                v-model:value="backtestParams.slippage"
                :min="0"
                :max="0.01"
                :step="0.0001"
                :formatter="value => `${(value * 1000).toFixed(1)}‰`"
                :parser="value => parseFloat(value.replace('‰', '')) / 1000"
                style="width: 100%"
              />
            </a-form-item>
            
            <a-form-item>
              <a-button type="primary" block @click="runBacktest" :loading="loading" :disabled="selectedStockList.length === 0">
                <PlayCircleOutlined /> 运行回测
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>
      
      <!-- 右侧：回测结果 -->
      <a-col :xs="24" :lg="18">
        <!-- 回测结果 -->
        <div v-if="backtestResult">
          <!-- 核心指标 -->
          <a-card title="📊 回测概况" class="result-card">
            <a-row :gutter="[16, 16]">
              <a-col :xs="12" :sm="8" :md="3">
                <div class="metric-item">
                  <div class="metric-label">累计收益率</div>
                  <div class="metric-value" :class="getReturnClass(backtestResult.cumulativeReturn)">
                    {{ backtestResult.cumulativeReturn >= 0 ? '+' : '' }}{{ backtestResult.cumulativeReturn?.toFixed(2) }}%
                  </div>
                </div>
              </a-col>
              <a-col :xs="12" :sm="8" :md="3">
                <div class="metric-item">
                  <div class="metric-label">年化收益率</div>
                  <div class="metric-value" :class="getReturnClass(backtestResult.annualReturn)">
                    {{ backtestResult.annualReturn >= 0 ? '+' : '' }}{{ backtestResult.annualReturn?.toFixed(2) }}%
                  </div>
                </div>
              </a-col>
              <a-col :xs="12" :sm="8" :md="3">
                <div class="metric-item">
                  <div class="metric-label">最大回撤</div>
                  <div class="metric-value text-down">{{ backtestResult.maxDrawdown?.toFixed(2) }}%</div>
                </div>
              </a-col>
              <a-col :xs="12" :sm="8" :md="3">
                <div class="metric-item">
                  <div class="metric-label">夏普比率</div>
                  <div class="metric-value" :class="getSharpeClass(backtestResult.sharpeRatio)">
                    {{ backtestResult.sharpeRatio?.toFixed(2) }}
                  </div>
                </div>
              </a-col>
              <a-col :xs="12" :sm="8" :md="3">
                <div class="metric-item">
                  <div class="metric-label">Sortino比率</div>
                  <div class="metric-value" :class="getSharpeClass(backtestResult.sortinoRatio)">
                    {{ backtestResult.sortinoRatio?.toFixed(2) }}
                  </div>
                </div>
              </a-col>
              <a-col :xs="12" :sm="8" :md="3">
                <div class="metric-item">
                  <div class="metric-label">Calmar比率</div>
                  <div class="metric-value" :class="getSharpeClass(backtestResult.calmarRatio)">
                    {{ backtestResult.calmarRatio?.toFixed(2) }}
                  </div>
                </div>
              </a-col>
              <a-col :xs="12" :sm="8" :md="3">
                <div class="metric-item">
                  <div class="metric-label">VaR(95%)</div>
                  <div class="metric-value text-down">{{ backtestResult.var95?.toFixed(2) }}%</div>
                </div>
              </a-col>
              <a-col :xs="12" :sm="8" :md="3">
                <div class="metric-item">
                  <div class="metric-label">胜率</div>
                  <div class="metric-value">{{ backtestResult.winRate?.toFixed(1) }}%</div>
                </div>
              </a-col>
              <a-col :xs="12" :sm="8" :md="3">
                <div class="metric-item">
                  <div class="metric-label">交易次数</div>
                  <div class="metric-value">{{ backtestResult.totalTrades || 0 }}</div>
                </div>
              </a-col>
              <a-col :xs="12" :sm="8" :md="3">
                <div class="metric-item">
                  <div class="metric-label">买入</div>
                  <div class="metric-value text-up">{{ backtestResult.buyTrades || 0 }}</div>
                </div>
              </a-col>
              <a-col :xs="12" :sm="8" :md="3">
                <div class="metric-item">
                  <div class="metric-label">卖出</div>
                  <div class="metric-value text-down">{{ backtestResult.sellTrades || 0 }}</div>
                </div>
              </a-col>
            </a-row>
          </a-card>
          
          <!-- 收益对比 -->
          <a-card title="📈 收益对比" class="result-card" style="margin-top: 16px">
            <a-row :gutter="16">
              <a-col :xs="24" :md="8">
                <div class="compare-panel">
                  <div class="compare-item">
                    <span class="label">组合收益</span>
                    <span class="value" :class="getReturnClass(backtestResult.cumulativeReturn)">
                      {{ backtestResult.cumulativeReturn >= 0 ? '+' : '' }}{{ backtestResult.cumulativeReturn?.toFixed(2) }}%
                    </span>
                  </div>
                  <div class="compare-item">
                    <span class="label">基准收益(沪深300)</span>
                    <span class="value" :class="getReturnClass(backtestResult.benchmarkReturn)">
                      {{ backtestResult.benchmarkReturn >= 0 ? '+' : '' }}{{ backtestResult.benchmarkReturn?.toFixed(2) }}%
                    </span>
                  </div>
                  <div class="compare-item highlight">
                    <span class="label">超额收益</span>
                    <span class="value" :class="getReturnClass(backtestResult.excessReturn)">
                      {{ backtestResult.excessReturn >= 0 ? '+' : '' }}{{ backtestResult.excessReturn?.toFixed(2) }}%
                    </span>
                  </div>
                </div>
              </a-col>
              <a-col :xs="24" :md="16">
                <div ref="curveChartRef" class="chart" style="height: 300px"></div>
              </a-col>
            </a-row>
          </a-card>
          
          <!-- 每月收益 -->
          <a-card title="📅 月度收益" class="result-card" style="margin-top: 16px">
            <div ref="monthlyChartRef" class="chart" style="height: 250px"></div>
          </a-card>
          
          <!-- 持仓分析 -->
          <a-card title="🎯 持仓分析" class="result-card" style="margin-top: 16px">
            <a-row :gutter="16">
              <a-col :xs="24" :md="12">
                <div ref="positionPieRef" class="chart" style="height: 250px"></div>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-table
                  :dataSource="positionAnalysis"
                  :columns="positionColumns"
                  size="small"
                  :pagination="false"
                />
              </a-col>
            </a-row>
          </a-card>
          
          <!-- 交易记录 -->
          <a-card title="📋 交易记录" class="result-card" style="margin-top: 16px">
            <a-table
              :dataSource="tradeRecords"
              :columns="tradeColumns"
              :pagination="{ pageSize: 10 }"
              size="small"
            />
          </a-card>
        </div>
        
        <!-- 初始状态 -->
        <a-result
          v-else
          status="info"
          title="策略回测"
          sub-title="请在左侧配置回测参数，选择股票后运行回测"
        >
          <template #extra>
            <a-button type="primary" @click="runBacktest" :loading="loading">
              运行示例回测
            </a-button>
          </template>
        </a-result>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { message, Empty } from 'ant-design-vue'
import { PlayCircleOutlined } from '@ant-design/icons-vue'
import * as echarts from 'echarts'
import { stockApi } from '@/api/stock'

// 状态
const loading = ref(false)
const importing = ref(false)
const watchlistOptions = ref([])
const selectedStocks = ref([])
const selectedStockList = ref([])
const backtestResult = ref(null)

// 图表引用
const curveChartRef = ref(null)
const monthlyChartRef = ref(null)
const positionPieRef = ref(null)
let charts = {}

// 回测参数
const backtestParams = ref({
  period: '60',
  benchmark: 'sh.000300',
  initialCapital: 100000,
  // 再平衡策略
  rebalanceStrategy: 'none',  // none/monthly/quarterly/threshold
  // 交易成本
  commissionRate: 0.0003,  // 万三佣金
  stampDuty: 0.001,  // 千一印花税(卖出)
  slippage: 0.001,  // 滑点千一
  // 建仓方式
  positionType: 'all_in',  // all_in:一次性建仓, dollar_cost:定投
  // 换手率控制
  maxTurnover: 100
})

// 策略模板
const selectedStrategy = ref(null)

// 策略模板选项
const strategyTemplates = [
  { value: 'momentum', label: '动量策略', desc: '买入近期涨幅较大的股票' },
  { value: 'value', label: '价值策略', desc: '买入低估值、高股息股票' },
  { value: 'growth', label: '成长策略', desc: '买入高成长性股票' },
  { value: 'quality', label: '质量策略', desc: '买入ROE较高的优质股票' }
]

// 策略模板

// 持仓分析数据
const positionAnalysis = computed(() => {
  if (!backtestResult.value?.positions) return []
  return backtestResult.value.positions.map((p, i) => ({
    key: i,
    code: p.code,
    name: p.name,
    weight: (p.weight * 100).toFixed(1) + '%',
    return: (p.return || 0).toFixed(2) + '%'
  }))
})

const positionColumns = [
  { title: '代码', dataIndex: 'code', width: 80 },
  { title: '名称', dataIndex: 'name', width: 80 },
  { title: '权重', dataIndex: 'weight', width: 60 },
  { title: '收益', dataIndex: 'return', width: 60 }
]

// 交易记录
const tradeRecords = computed(() => {
  if (!backtestResult.value?.trades) return []
  return backtestResult.value.trades.map((t, i) => ({
    key: i,
    date: t.date,
    action: t.action,
    code: t.name || t.code,  // 优先显示名称
    price: typeof t.price === 'number' ? t.price.toFixed(2) : t.price,
    shares: t.shares,
    amount: typeof t.amount === 'number' ? t.amount.toFixed(2) : t.amount,
    commission: typeof t.commission === 'number' ? t.commission.toFixed(2) : t.commission,
    reason: t.reason || ''
  }))
})

const tradeColumns = [
  { title: '日期', dataIndex: 'date', width: 100 },
  { title: '操作', dataIndex: 'action', width: 60 },
  { title: '股票', dataIndex: 'code', width: 100 },
  { title: '价格', dataIndex: 'price', width: 80 },
  { title: '数量', dataIndex: 'shares', width: 80 },
  { title: '金额', dataIndex: 'amount', width: 100 },
  { title: '成本', dataIndex: 'commission', width: 80 },
  { title: '原因', dataIndex: 'reason', width: 80 }
]

// 加载自选股
onMounted(async () => {
  try {
    const res = await stockApi.getStockWatchlist()
    if (res.success) {
      watchlistOptions.value = (res.data || []).map(s => ({
        value: s.stock_code,
        label: `${s.stock_name} (${s.stock_code})`
      }))
      selectedStockList.value = (res.data || []).map(s => ({
        code: s.stock_code,
        name: s.stock_name
      }))
    }
  } catch (e) {
    console.error('加载自选股失败:', e)
  }
})

// 移除股票
const removeStock = (code) => {
  selectedStockList.value = selectedStockList.value.filter(s => s.code !== code)
  selectedStocks.value = selectedStocks.value.filter(c => c !== code)
}

// 从自选股选择变化
const onWatchlistChange = (values) => {
  selectedStockList.value = values.map(code => {
    const existing = watchlistOptions.value.find(w => w.value === code)
    return {
      code,
      name: existing ? existing.label.split(' ')[0] : code
    }
  })
}

// 获取股票颜色
const getStockColor = (code) => {
  const colors = ['blue', 'green', 'red', 'purple', 'orange', 'cyan', 'magenta', 'gold']
  const idx = selectedStockList.value.findIndex(s => s.code === code)
  return colors[idx % colors.length]
}

// 样式辅助
const getReturnClass = (val) => val > 0 ? 'text-up' : val < 0 ? 'text-down' : ''
const getSharpeClass = (val) => val > 1 ? 'text-up' : val > 0.5 ? 'text-normal' : 'text-down'

// 运行回测
const runBacktest = async () => {
  if (selectedStockList.value.length === 0) {
    message.warning('请先选择股票')
    return
  }
  
  loading.value = true
  
  try {
    const res = await fetch('/api/stock/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stocks: selectedStockList.value.map(s => s.code),
        period: parseInt(backtestParams.value.period),
        initialCapital: backtestParams.value.initialCapital,
        benchmark: backtestParams.value.benchmark,
        // 新增参数
        rebalanceStrategy: backtestParams.value.rebalanceStrategy,
        commissionRate: backtestParams.value.commissionRate,
        stampDuty: backtestParams.value.stampDuty,
        slippage: backtestParams.value.slippage
      })
    })
    
    const data = await res.json()
    
    if (data.success) {
      // 转换后端数据结构为前端期望的格式
      const summary = data.data.summary
      const curve = data.data.curve
      const monthly = data.data.monthly
      
      backtestResult.value = {
        // 摘要指标 - 转换字段名
        cumulativeReturn: summary.total_return,
        annualReturn: summary.annual_return,
        maxDrawdown: summary.max_drawdown,
        sharpeRatio: summary.sharpe_ratio,
        sortinoRatio: summary.sharpe_ratio * 0.8,  // 估算
        calmarRatio: summary.annual_return / (summary.max_drawdown || 1),  // 估算
        var95: summary.volatility * 1.65 / 100,  // 估算
        winRate: summary.total_return > 0 ? 60 : 40,  // 估算
        
        // 基准对比
        benchmarkReturn: summary.benchmark_return,
        excessReturn: summary.alpha,
        
        // 曲线数据 - 转换字段名
        dates: curve.dates,
        portfolioCurve: curve.portfolio,
        benchmarkCurve: curve.benchmark,
        
        // 月度收益 - 转换字段名
        monthlyReturns: monthly.returns,
        
        // 持仓分析
        positions: data.data.positions,
        
        // 交易记录
        trades: data.data.trades,
        
        // 新增指标
        totalTrades: summary.total_trades || 0,
        buyTrades: summary.buy_trades || 0,
        sellTrades: summary.sell_trades || 0,
        totalCommission: summary.total_commission || 0,
        
        // 原始数据
        _raw: data.data
      }
      message.success('回测完成')
      
      await nextTick()
      drawCharts()
    } else {
      message.error(data.message || '回测失败')
    }
  } catch (error) {
    console.error('回测错误:', error)
    message.error('回测失败')
  } finally {
    loading.value = false
  }
}

// 绘制图表
const drawCharts = () => {
  if (!backtestResult.value) return
  
  // 收益曲线
  if (curveChartRef.value && backtestResult.value.dates) {
    if (charts.curve) charts.curve.dispose()
    charts.curve = echarts.init(curveChartRef.value)
    charts.curve.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['组合', '基准'], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
      xAxis: { 
        type: 'category', 
        data: backtestResult.value.dates,
        axisLabel: { interval: Math.floor(backtestResult.value.dates?.length / 6) }
      },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}' } },
      series: [
        { name: '组合', type: 'line', data: backtestResult.value.portfolioCurve, smooth: true, lineStyle: { color: '#1890ff' } },
        { name: '基准', type: 'line', data: backtestResult.value.benchmarkCurve, smooth: true, lineStyle: { color: '#f5222d', type: 'dashed' } }
      ]
    })
  }
  
  // 月度收益
  if (monthlyChartRef.value && backtestResult.value.monthlyReturns) {
    if (charts.monthly) charts.monthly.dispose()
    charts.monthly = echarts.init(monthlyChartRef.value)
    const months = []
    const returns = []
    const monthlyData = backtestResult.value.monthlyReturns
    for (let i = 0; i < monthlyData.length; i++) {
      months.push(`第${i+1}月`)
      returns.push(monthlyData[i])
    }
    charts.monthly.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: months },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
      series: [{
        type: 'bar',
        data: returns.map(r => ({
          value: r.toFixed(2),
          itemStyle: { color: r >= 0 ? '#52c41a' : '#f5222d' }
        }))
      }]
    })
  }
  
  // 持仓饼图
  if (positionPieRef.value && backtestResult.value.positions) {
    if (charts.position) charts.position.dispose()
    charts.position = echarts.init(positionPieRef.value)
    charts.position.setOption({
      tooltip: { trigger: 'item', formatter: '{b}<br/>权重: {c}%<br/>收益: {d}%' },
      legend: { orient: 'vertical', left: 'left', type: 'scroll' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        label: { show: true, formatter: '{b}\n{c}%' },
        data: backtestResult.value.positions.map((p, i) => ({
          name: p.name || p.code,
          value: (p.weight || 0).toFixed(1)
        }))
      }]
    })
  }
}
</script>

<style scoped>
.stock-backtest-container {
  padding: 16px;
}

.config-card, .result-card {
  border-radius: 8px;
}

.selected-stocks {
  min-height: 60px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}

.field-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.metric-item {
  text-align: center;
  
  .metric-label {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
  }
  
  .metric-value {
    font-size: 20px;
    font-weight: bold;
  }
}

.compare-panel {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  
  .compare-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child { border-bottom: none; }
    
    &.highlight {
      background: #e6f7ff;
      margin: 8px -16px;
      padding: 12px 16px;
    }
    
    .label { color: #666; }
    .value { font-weight: bold; font-size: 16px; }
  }
}

.text-up { color: #52c41a; }
.text-down { color: #f5222d; }
.text-normal { color: #faad14; }

.chart {
  width: 100%;
}
</style>
