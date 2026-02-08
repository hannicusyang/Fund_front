<template>
  <div class="fund-backtest">
    <a-row :gutter="16">
      <!-- 回测参数设置 -->
      <a-col :xs="24" :lg="6">
        <a-card title="回测参数" class="param-card">
          <a-form :model="backtestParams" layout="vertical">
            <a-form-item label="回测周期">
              <a-range-picker
                v-model:value="backtestParams.period"
                style="width: 100%"
                :ranges="{
                  '近1年': [moment().subtract(1, 'year'), moment()],
                  '近2年': [moment().subtract(2, 'year'), moment()],
                  '近3年': [moment().subtract(3, 'year'), moment()],
                }"
              />
            </a-form-item>

            <a-form-item label="初始资金">
              <a-input-number
                v-model:value="backtestParams.initialCapital"
                :min="1000"
                :step="10000"
                style="width: 100%"
                :formatter="value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="value => value.replace(/\¥\s?|(,*)/g, '')"
              />
            </a-form-item>

            <a-form-item label="调仓频率">
              <a-select v-model:value="backtestParams.rebalanceFreq">
                <a-select-option value="daily">每日</a-select-option>
                <a-select-option value="weekly">每周</a-select-option>
                <a-select-option value="monthly">每月</a-select-option>
                <a-select-option value="quarterly">每季度</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="交易成本">
              <a-input-number
                v-model:value="backtestParams.transactionCost"
                :min="0"
                :max="1"
                :precision="4"
                :step="0.0001"
                style="width: 100%"
                addon-after="%"
              />
            </a-form-item>

            <a-divider />

            <a-button 
              type="primary" 
              block 
              @click="runBacktest"
              :loading="backtestLoading"
            >
              <PlayCircleOutlined /> 开始回测
            </a-button>
            
            <a-button 
              block 
              style="margin-top: 8px"
              @click="exportReport"
            >
              <ExportOutlined /> 导出报告
            </a-button>
          </a-form>
        </a-card>

        <!-- 持仓历史 -->
        <a-card title="持仓历史" class="history-card" style="margin-top: 16px">
          <a-timeline>
            <a-timeline-item 
              v-for="(trade, index) in tradeHistory" 
              :key="index"
              :color="trade.type === 'buy' ? 'green' : 'red'"
            >
              <div class="trade-item">
                <div class="trade-info">
                  <div class="fund-name">{{ trade.fund_name }}</div>
                  <div class="trade-detail">
                    <span>{{ trade.type === 'buy' ? '买入' : '卖出' }}</span>
                    <span>{{ trade.quantity }}份</span>
                    <span>¥{{ trade.price }}</span>
                  </div>
                </div>
                <div class="trade-date">{{ trade.date }}</div>
              </div>
            </a-timeline-item>
          </a-timeline>
        </a-card>
      </a-col>

      <!-- 回测结果 -->
      <a-col :xs="24" :lg="18">
        <a-card title="回测结果" class="result-card">
          <template #extra>
            <a-space>
              <a-tag :color="performance.status.color">
                {{ performance.status.text }}
              </a-tag>
              <a-button @click="compareBenchmark">
                <SwapOutlined /> 对比基准
              </a-button>
            </a-space>
          </template>

          <!-- 性能概览 -->
          <a-row :gutter="16" class="performance-overview">
            <a-col :xs="24" :sm="6">
              <div class="metric-card">
                <div class="metric-title">总收益率</div>
                <div class="metric-value" :class="getRateClass(performance.totalReturn)">
                  {{ formatRate(performance.totalReturn) }}
                </div>
                <div class="metric-change">vs 基准 {{ formatRate(performance.benchmarkReturn) }}</div>
              </div>
            </a-col>
            <a-col :xs="24" :sm="6">
              <div class="metric-card">
                <div class="metric-title">年化收益率</div>
                <div class="metric-value" :class="getRateClass(performance.annualizedReturn)">
                  {{ formatRate(performance.annualizedReturn) }}
                </div>
                <div class="metric-change">夏普 {{ performance.sharpeRatio.toFixed(2) }}</div>
              </div>
            </a-col>
            <a-col :xs="24" :sm="6">
              <div class="metric-card">
                <div class="metric-title">最大回撤</div>
                <div class="metric-value" :class="getRateClass(performance.maxDrawdown)">
                  {{ formatRate(performance.maxDrawdown) }}
                </div>
                <div class="metric-change">胜率 {{ performance.winRate }}%</div>
              </div>
            </a-col>
            <a-col :xs="24" :sm="6">
              <div class="metric-card">
                <div class="metric-title">波动率</div>
                <div class="metric-value">
                  {{ performance.volatility.toFixed(2) }}%
                </div>
                <div class="metric-change">信息比率 {{ performance.informationRatio.toFixed(2) }}</div>
              </div>
            </a-col>
          </a-row>

          <!-- 净值曲线图 -->
          <a-card title="净值曲线" class="chart-card" style="margin-top: 16px">
            <div ref="equityCurveRef" class="chart"></div>
          </a-card>

          <!-- 回撤曲线 -->
          <a-card title="回撤曲线" class="chart-card" style="margin-top: 16px">
            <div ref="drawdownRef" class="chart"></div>
          </a-card>

          <!-- 交易记录 -->
          <a-card title="交易记录" class="trade-card" style="margin-top: 16px">
            <a-table
              :data-source="tradeRecords"
              :columns="tradeColumns"
              :pagination="{ pageSize: 10 }"
              size="small"
              bordered
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'action_type'">
                  <a-tag :color="record.action_type === 'BUY' ? 'green' : 'red'">
                    {{ record.action_type }}
                  </a-tag>
                </template>
                
                <template v-else-if="column.key === 'price'">
                  ¥{{ formatNumber(record.price) }}
                </template>
                
                <template v-else-if="column.key === 'amount'">
                  ¥{{ formatNumber(record.amount) }}
                </template>
                
                <template v-else-if="column.key === 'profit_loss'">
                  <span :class="getRateClass(record.profit_loss)">
                    {{ formatRate(record.profit_loss) }}
                  </span>
                </template>
              </template>
            </a-table>
          </a-card>

          <!-- 回测报告 -->
          <a-card title="回测报告" class="report-card" style="margin-top: 16px">
            <div class="report-content">
              <h4>回测总结</h4>
              <p>{{ backtestSummary }}</p>
              
              <h4>风险提示</h4>
              <ul>
                <li>历史表现不代表未来收益</li>
                <li>过往回测存在最大回撤 {{ formatRate(Math.abs(performance.maxDrawdown)) }}</li>
                <li>模型假设调仓频率为 {{ backtestParams.rebalanceFreq }}</li>
                <li>未考虑流动性风险及市场冲击成本</li>
              </ul>
              
              <h4>投资建议</h4>
              <p>{{ investmentAdvice }}</p>
            </div>
          </a-card>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  PlayCircleOutlined, ExportOutlined, SwapOutlined
} from '@ant-design/icons-vue'

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

// 回测参数
const now = new Date()
const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
const backtestParams = ref({
  period: [oneYearAgo, now],
  initialCapital: 100000,
  rebalanceFreq: 'monthly',
  transactionCost: 0.001
})

// 回测状态
const backtestLoading = ref(false)

// 回测结果数据
const equityCurveData = ref([])
const drawdownData = ref([])
const tradeHistory = ref([])
const tradeRecords = ref([])

// 交易记录表格列
const tradeColumns = [
  {
    title: '日期',
    dataIndex: 'date',
    key: 'date',
    width: 120
  },
  {
    title: '基金',
    dataIndex: 'fund_name',
    key: 'fund_name',
    width: 150
  },
  {
    title: '操作',
    key: 'action_type',
    width: 80
  },
  {
    title: '数量',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 100,
    align: 'right'
  },
  {
    title: '价格',
    key: 'price',
    width: 100,
    align: 'right'
  },
  {
    title: '金额',
    key: 'amount',
    width: 120,
    align: 'right'
  },
  {
    title: '盈亏',
    key: 'profit_loss',
    width: 100,
    align: 'right'
  }
]

// 性能指标
const performance = computed(() => {
  // 模拟性能数据
  return {
    totalReturn: 25.67,
    annualizedReturn: 22.34,
    benchmarkReturn: 15.23,
    maxDrawdown: -12.45,
    volatility: 18.76,
    sharpeRatio: 1.19,
    winRate: 68,
    informationRatio: 0.85,
    status: {
      text: '表现优秀',
      color: 'green'
    }
  }
})

// 回测总结
const backtestSummary = computed(() => {
  return `本次回测周期内，投资组合取得了 ${performance.value.totalReturn.toFixed(2)}% 的总收益率，
  年化收益率为 ${performance.value.annualizedReturn.toFixed(2)}%，优于同期基准收益率 
  ${performance.value.benchmarkReturn.toFixed(2)}%。最大回撤为 ${Math.abs(performance.value.maxDrawdown).toFixed(2)}%，
  风险控制良好，夏普比率为 ${performance.value.sharpeRatio.toFixed(2)}，整体表现稳健。`
})

// 投资建议
const investmentAdvice = computed(() => {
  const perf = performance.value
  if (perf.sharpeRatio >= 1.5) {
    return '模型表现优异，建议积极配置。当前策略在控制风险的前提下获得了超额收益，可考虑增加投资比例。'
  } else if (perf.sharpeRatio >= 1.0) {
    return '模型表现良好，建议适度配置。策略具备一定的盈利能力，但需持续关注市场变化调整参数。'
  } else if (perf.sharpeRatio >= 0.5) {
    return '模型表现一般，建议谨慎配置。策略盈利能力有限，建议降低投资比例或优化策略参数。'
  } else {
    return '模型表现不佳，建议暂缓配置。当前策略风险收益比不高，建议重新评估策略有效性。'
  }
})

// 图表引用
const equityCurveRef = ref(null)
const drawdownRef = ref(null)

// 开始回测
function runBacktest() {
  backtestLoading.value = true
  
  // 模拟回测过程
  setTimeout(() => {
    generateMockData()
    initCharts()
    backtestLoading.value = false
    message.success('回测完成')
  }, 2000)
}

// 生成模拟数据
function generateMockData() {
  // 模拟净值曲线数据
  equityCurveData.value = []
  let currentValue = 100
  const startDate = backtestParams.value.period[0]
  const endDate = backtestParams.value.period[1]
  const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24))
  
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    // 模拟随机涨跌，但总体趋势向上
    const change = (Math.random() - 0.48) / 100
    currentValue = currentValue * (1 + change)
    equityCurveData.value.push([dateStr, currentValue])
  }
  
  // 模拟回撤数据
  drawdownData.value = []
  let peak = equityCurveData.value[0][1]
  for (let i = 0; i < equityCurveData.value.length; i++) {
    const value = equityCurveData.value[i][1]
    if (value > peak) {
      peak = value
    }
    const drawdown = ((value - peak) / peak) * 100
    drawdownData.value.push([equityCurveData.value[i][0], drawdown])
  }
  
  // 生成交易记录
  tradeRecords.value = props.fundPool.slice(0, 10).map((fund, index) => {
    const date = new Date()
    date.setDate(date.getDate() - index * 30)
    return {
      key: index,
      date: date.toISOString().split('T')[0],
      fund_name: fund.fund_name,
      action_type: index % 2 === 0 ? 'BUY' : 'SELL',
      quantity: Math.floor(Math.random() * 1000) + 100,
      price: (parseFloat(fund.net_value) || 1).toFixed(4),
      amount: (Math.random() * 10000 + 5000).toFixed(2),
      profit_loss: (Math.random() * 20 - 5).toFixed(2)
    }
  })
  
  // 生成交易历史
  tradeHistory.value = tradeRecords.value.slice(0, 5).map(trade => ({
    fund_name: trade.fund_name,
    type: trade.action_type.toLowerCase(),
    quantity: trade.quantity,
    price: trade.price,
    date: trade.date
  }))
}

// 初始化图表
function initCharts() {
  nextTick(() => {
    initEquityCurveChart()
    initDrawdownChart()
  })
}

// 净值曲线图
function initEquityCurveChart() {
  if (!equityCurveRef.value) return
  
  const chart = echarts.init(equityCurveRef.value)
  
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const param = params[0]
        return `${param.axisValue}<br/>
                净值: ${param.value[1].toFixed(4)}<br/>
                累计收益: ${((param.value[1]/100 - 1) * 100).toFixed(2)}%`
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', name: '净值' },
    series: [{
      type: 'line',
      data: equityCurveData.value,
      smooth: true,
      lineStyle: { color: '#52c41a', width: 2 },
      areaStyle: { color: 'rgba(82, 196, 26, 0.1)' }
    }]
  })
}

// 回撤曲线图
function initDrawdownChart() {
  if (!drawdownRef.value) return
  
  const chart = echarts.init(drawdownRef.value)
  
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const param = params[0]
        return `${param.axisValue}<br/>回撤: ${param.value[1].toFixed(2)}%`
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', name: '回撤(%)' },
    series: [{
      type: 'line',
      data: drawdownData.value,
      lineStyle: { color: '#f5222d', width: 2 },
      areaStyle: { color: 'rgba(245, 34, 45, 0.1)' }
    }]
  })
}

// 对比基准
function compareBenchmark() {
  message.info('基准对比功能开发中')
}

// 导出报告
function exportReport() {
  message.success('报告导出功能开发中')
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

onMounted(() => {
  // 初始化时运行一次回测
  runBacktest()
})
</script>

<style scoped lang="less">
.fund-backtest {
  .param-card {
    height: 100%;
  }

  .result-card {
    min-height: 800px;
  }

  .performance-overview {
    margin-bottom: 16px;

    .metric-card {
      padding: 16px;
      text-align: center;
      background: #f6ffed;
      border-radius: 8px;
      border: 1px solid #f0f0f0;

      .metric-title {
        font-size: 14px;
        color: #8c8c8c;
        margin-bottom: 8px;
      }

      .metric-value {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .metric-change {
        font-size: 12px;
        color: #8c8c8c;
      }
    }
  }

  .chart-card {
    .chart {
      height: 300px;
    }
  }

  .trade-item {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .trade-info {
      flex: 1;

      .fund-name {
        font-weight: 500;
        margin-bottom: 4px;
      }

      .trade-detail {
        font-size: 12px;
        color: #8c8c8c;
        
        span {
          margin-right: 8px;
        }
      }
    }

    .trade-date {
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

  .report-content {
    h4 {
      margin: 16px 0 8px 0;
      color: #262626;
    }

    p {
      line-height: 1.6;
      color: #595959;
    }

    ul {
      padding-left: 20px;
      color: #595959;

      li {
        margin-bottom: 8px;
        line-height: 1.5;
      }
    }
  }
}
</style>
