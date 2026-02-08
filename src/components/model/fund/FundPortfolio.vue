<template>
  <div class="fund-portfolio">
    <a-row :gutter="16">
      <!-- 组合配置面板 -->
      <a-col :xs="24" :lg="8">
        <a-card title="组合配置" class="config-card">
          <a-form :model="portfolioConfig" layout="vertical">
            <a-form-item label="组合名称">
              <a-input 
                v-model:value="portfolioConfig.name" 
                placeholder="输入组合名称"
              >
                <template #prefix>
                  <EditOutlined />
                </template>
              </a-input>
            </a-form-item>

            <a-form-item label="投资目标">
              <a-radio-group v-model:value="portfolioConfig.goal">
                <a-radio-button value="conservative">
                  🛡️ 保守型
                </a-radio-button>
                <a-radio-button value="balanced">
                  ⚖️ 平衡型
                </a-radio-button>
                <a-radio-button value="aggressive">
                  🚀 进取型
                </a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-form-item label="配置策略">
              <a-select v-model:value="portfolioConfig.strategy">
                <a-select-option value="equal">等权重配置</a-select-option>
                <a-select-option value="risk_parity">风险平价配置</a-select-option>
                <a-select-option value="max_sharpe">最大夏普比率</a-select-option>
                <a-select-option value="min_variance">最小方差优化</a-select-option>
                <a-select-option value="custom">自定义权重</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="投资金额">
              <a-input-number
                v-model:value="portfolioConfig.amount"
                :min="10000"
                :step="10000"
                style="width: 100%"
                :formatter="value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="value => value.replace(/\¥\s?|(,*)/g, '')"
              />
            </a-form-item>
          </a-form>

          <a-divider>备选基金池 ({{ fundPool.length }})</a-divider>

          <div class="pool-section">
            <a-list
              :data-source="fundPool"
              size="small"
              :pagination="{ pageSize: 5, size: 'small' }"
            >
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta
                    :title="item.fund_name"
                    :description="item.fund_code"
                  >
                    <template #avatar>
                      <a-avatar :style="{ backgroundColor: '#1890ff' }">
                        {{ item.fund_name?.charAt(0) }}
                      </a-avatar>
                    </template>
                  </a-list-item-meta>
                  <template #actions>
                    <a-button 
                      type="primary" 
                      size="small"
                      @click="addToPortfolio(item)"
                      :disabled="isInPortfolio(item)"
                    >
                      {{ isInPortfolio(item) ? '已添加' : '添加' }}
                    </a-button>
                  </template>
                </a-list-item>
              </template>
            </a-list>
          </div>
        </a-card>
      </a-col>

      <!-- 组合构建结果 -->
      <a-col :xs="24" :lg="16">
        <a-card title="我的投资组合" class="portfolio-card">
          <template #extra>
            <a-space>
              <a-button @click="autoOptimize">
                <ThunderboltOutlined /> 自动优化
              </a-button>
              <a-button type="primary" @click="savePortfolio">
                <SaveOutlined /> 保存组合
              </a-button>
            </a-space>
          </template>

          <!-- 已选基金列表 -->
          <a-table
            :data-source="portfolioFunds"
            :columns="portfolioColumns"
            :pagination="false"
            size="small"
            bordered
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'fund_name'">
                <div class="fund-cell">
                  <div class="name">{{ record.fund_name }}</div>
                  <div class="code">{{ record.fund_code }}</div>
                </div>
              </template>

              <template v-else-if="column.key === 'weight'">
                <div class="weight-cell">
                  <a-slider
                    v-if="portfolioConfig.strategy === 'custom'"
                    v-model:value="record.weight"
                    :min="0"
                    :max="100"
                    @change="onWeightChange"
                  />
                  <span v-else class="weight-value">{{ record.weight }}%</span>
                </div>
              </template>

              <template v-else-if="column.key === 'amount'">
                <span>¥ {{ calculateAmount(record.weight).toLocaleString() }}</span>
              </template>

              <template v-else-if="column.key === 'expected_return'">
                <span :class="getRateClass(record.yearly_1_growth_rate)">
                  {{ formatRate(record.yearly_1_growth_rate) }}
                </span>
              </template>

              <template v-else-if="column.key === 'action'">
                <a-button 
                  type="link" 
                  danger 
                  @click="removeFromPortfolio(index)"
                >
                  删除
                </a-button>
              </template>
            </template>

            <template #summary>
              <a-table-summary>
                <a-table-summary-row>
                  <a-table-summary-cell :col-span="2">合计</a-table-summary-cell>
                  <a-table-summary-cell>
                    <span :class="{ 'text-error': totalWeight !== 100 }">
                      {{ totalWeight }}%
                    </span>
                  </a-table-summary-cell>
                  <a-table-summary-cell>
                    ¥ {{ portfolioConfig.amount?.toLocaleString() }}
                  </a-table-summary-cell>
                  <a-table-summary-cell>
                    {{ formatRate(expectedPortfolioReturn) }}
                  </a-table-summary-cell>
                  <a-table-summary-cell></a-table-summary-cell>
                </a-table-summary-row>
              </a-table-summary>
            </template>
          </a-table>

          <a-alert
            v-if="totalWeight !== 100"
            message="权重合计不为100%，请调整"
            type="warning"
            show-icon
            style="margin-top: 16px"
          />
        </a-card>

        <!-- 组合可视化 -->
        <a-row :gutter="16" style="margin-top: 16px">
          <a-col :xs="24" :md="12">
            <a-card title="配置分布" class="chart-card">
              <div ref="pieChartRef" class="chart"></div>
            </a-card>
          </a-col>
          
          <a-col :xs="24" :md="12">
            <a-card title="收益贡献" class="chart-card">
              <div ref="barChartRef" class="chart"></div>
            </a-card>
          </a-col>
        </a-row>

        <!-- 组合风险评估 -->
        <a-card title="组合风险评估" class="risk-card" style="margin-top: 16px">
          <a-row :gutter="16">
            <a-col :xs="12" :md="6">
              <div class="risk-metric">
                <div class="label">预期年化收益</div>
                <div class="value" :class="getRateClass(expectedPortfolioReturn)">
                  {{ formatRate(expectedPortfolioReturn) }}
                </div>
              </div>
            </a-col>
            <a-col :xs="12" :md="6">
              <div class="risk-metric">
                <div class="label">组合波动率</div>
                <div class="value">{{ portfolioVolatility }}%</div>
              </div>
            </a-col>
            <a-col :xs="12" :md="6">
              <div class="risk-metric">
                <div class="label">夏普比率</div>
                <div class="value" :class="getSharpeClass(portfolioSharpe)">
                  {{ portfolioSharpe.toFixed(2) }}
                </div>
              </div>
            </a-col>
            <a-col :xs="12" :md="6">
              <div class="risk-metric">
                <div class="label">风险等级</div>
                <a-tag :color="riskLevel.color">{{ riskLevel.text }}</a-tag>
              </div>
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import * as echarts from 'echarts'
import {
  EditOutlined, ThunderboltOutlined, SaveOutlined
} from '@ant-design/icons-vue'

const props = defineProps({
  fundPool: {
    type: Array,
    default: () => []
  },
  myHoldings: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['save-portfolio'])

// 组合配置
const portfolioConfig = ref({
  name: '我的基金组合',
  goal: 'balanced',
  strategy: 'equal',
  amount: 100000
})

// 投资组合中的基金
const portfolioFunds = ref([])

// 表格列定义
const portfolioColumns = [
  {
    title: '基金',
    key: 'fund_name',
    width: 200
  },
  {
    title: '配置权重',
    key: 'weight',
    width: 200,
    align: 'center'
  },
  {
    title: '投资金额',
    key: 'amount',
    width: 120,
    align: 'right'
  },
  {
    title: '预期收益',
    key: 'expected_return',
    width: 100,
    align: 'right'
  },
  {
    title: '操作',
    key: 'action',
    width: 80,
    align: 'center'
  }
]

// 图表引用
const pieChartRef = ref(null)
const barChartRef = ref(null)

// 检查基金是否已在组合中
function isInPortfolio(fund) {
  return portfolioFunds.value.some(f => f.fund_code === fund.fund_code)
}

// 添加基金到组合
function addToPortfolio(fund) {
  if (isInPortfolio(fund)) {
    message.warning('该基金已在组合中')
    return
  }
  
  portfolioFunds.value.push({
    ...fund,
    weight: 0
  })
  
  // 自动分配权重
  recalculateWeights()
  message.success(`已添加 ${fund.fund_name}`)
}

// 从组合中移除
function removeFromPortfolio(index) {
  portfolioFunds.value.splice(index, 1)
  recalculateWeights()
}

// 重新计算权重
function recalculateWeights() {
  const count = portfolioFunds.value.length
  if (count === 0) return
  
  let weights = []
  
  switch (portfolioConfig.value.strategy) {
    case 'equal':
      // 等权重
      const equalWeight = Math.floor(100 / count)
      weights = portfolioFunds.value.map((_, i) => 
        i === count - 1 ? 100 - equalWeight * (count - 1) : equalWeight
      )
      break
      
    case 'max_sharpe':
      // 按夏普比率分配（简化）
      const sharpes = portfolioFunds.value.map(f => parseFloat(f.sharpe) || 1)
      const totalSharpe = sharpes.reduce((a, b) => a + b, 0)
      weights = sharpes.map(s => Math.round((s / totalSharpe) * 100))
      break
      
    case 'risk_parity':
      // 风险平价（简化）
      weights = portfolioFunds.value.map(() => Math.floor(100 / count))
      break
      
    default:
      weights = portfolioFunds.value.map(() => Math.floor(100 / count))
  }
  
  // 分配权重
  portfolioFunds.value.forEach((fund, i) => {
    fund.weight = weights[i] || 0
  })
  
  // 调整最后一只基金的权重使总和为100
  const currentTotal = weights.reduce((a, b) => a + b, 0)
  if (portfolioFunds.value.length > 0 && currentTotal !== 100) {
    const lastFund = portfolioFunds.value[portfolioFunds.value.length - 1]
    lastFund.weight += (100 - currentTotal)
  }
}

// 监听策略变化
watch(() => portfolioConfig.value.strategy, recalculateWeights)

// 监听权重变化
function onWeightChange() {
  // 自定义权重时的处理
}

// 计算金额
function calculateAmount(weight) {
  return Math.round((portfolioConfig.value.amount || 0) * (weight / 100))
}

// 总权重
const totalWeight = computed(() => {
  return portfolioFunds.value.reduce((sum, f) => sum + (f.weight || 0), 0)
})

// 预期组合收益
const expectedPortfolioReturn = computed(() => {
  if (portfolioFunds.value.length === 0) return 0
  
  const total = portfolioFunds.value.reduce((sum, fund) => {
    const return_rate = parseFloat(fund.yearly_1_growth_rate) || 0
    return sum + (return_rate * (fund.weight / 100))
  }, 0)
  
  return total
})

// 组合波动率（简化计算）
const portfolioVolatility = computed(() => {
  // 简化的波动率估算
  if (portfolioFunds.value.length === 0) return 0
  const avgVolatility = 15 // 假设平均波动率15%
  return avgVolatility * (1 - Math.min(portfolioFunds.value.length * 0.05, 0.3))
})

// 组合夏普比率
const portfolioSharpe = computed(() => {
  const vol = portfolioVolatility.value
  if (vol === 0) return 0
  return (expectedPortfolioReturn.value - 3) / vol // 假设无风险利率3%
})

// 风险等级
const riskLevel = computed(() => {
  const sharpe = portfolioSharpe.value
  if (sharpe >= 2) return { text: '低风险', color: 'green' }
  if (sharpe >= 1) return { text: '中低风险', color: 'blue' }
  if (sharpe >= 0.5) return { text: '中风险', color: 'orange' }
  return { text: '高风险', color: 'red' }
})

// 自动优化
function autoOptimize() {
  portfolioConfig.value.strategy = 'max_sharpe'
  recalculateWeights()
  message.success('已按最大夏普比率优化配置')
}

// 保存组合
function savePortfolio() {
  if (portfolioFunds.value.length === 0) {
    message.error('组合不能为空')
    return
  }
  
  if (totalWeight.value !== 100) {
    message.error('权重合计必须等于100%')
    return
  }
  
  const portfolio = {
    ...portfolioConfig.value,
    funds: portfolioFunds.value,
    expected_return: expectedPortfolioReturn.value,
    volatility: portfolioVolatility.value,
    sharpe: portfolioSharpe.value
  }
  
  emit('save-portfolio', portfolio)
}

// 格式化收益率
function formatRate(value) {
  if (value == null || value === '') return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

// 获取收益率样式
function getRateClass(value) {
  const num = parseFloat(value)
  if (isNaN(num)) return ''
  return num >= 0 ? 'text-up' : 'text-down'
}

// 获取夏普比率样式
function getSharpeClass(value) {
  if (value >= 2) return 'text-excellent'
  if (value >= 1) return 'text-good'
  return ''
}

// 初始化图表
function initCharts() {
  nextTick(() => {
    initPieChart()
    initBarChart()
  })
}

// 饼图
function initPieChart() {
  if (!pieChartRef.value) return
  
  const chart = echarts.init(pieChartRef.value)
  const data = portfolioFunds.value.map(fund => ({
    name: fund.fund_name?.substring(0, 8) + '...',
    value: fund.weight
  }))

  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}% ({d}%)' },
    legend: { orient: 'vertical', left: 'left', top: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 16, fontWeight: 'bold' }
      },
      data
    }]
  })
}

// 柱状图
function initBarChart() {
  if (!barChartRef.value) return
  
  const chart = echarts.init(barChartRef.value)
  const funds = portfolioFunds.value

  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: funds.map(f => f.fund_name?.substring(0, 6) + '...'),
      axisLabel: { rotate: 30 }
    },
    yAxis: { type: 'value', name: '预期收益贡献(%)' },
    series: [{
      type: 'bar',
      data: funds.map(f => {
        const return_rate = parseFloat(f.yearly_1_growth_rate) || 0
        return (return_rate * (f.weight / 100)).toFixed(2)
      }),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#83bff6' },
          { offset: 0.5, color: '#188df0' },
          { offset: 1, color: '#188df0' }
        ])
      }
    }]
  })
}

// 监听组合变化，更新图表
watch(portfolioFunds, () => {
  initCharts()
}, { deep: true })

onMounted(() => {
  // 如果有持仓数据，自动加载
  if (props.myHoldings.length > 0) {
    props.myHoldings.forEach(holding => {
      const fund = props.fundPool.find(f => f.fund_code === holding.fund_code)
      if (fund) {
        portfolioFunds.value.push({ ...fund, weight: 0 })
      }
    })
    recalculateWeights()
  }
  
  initCharts()
})
</script>

<style scoped lang="less">
.fund-portfolio {
  .config-card {
    height: 100%;
  }

  .portfolio-card {
    min-height: 400px;
  }

  .pool-section {
    max-height: 400px;
    overflow-y: auto;
  }

  .fund-cell {
    .name {
      font-weight: 500;
    }
    .code {
      font-size: 12px;
      color: #8c8c8c;
    }
  }

  .weight-cell {
    padding: 0 8px;
  }

  .weight-value {
    font-weight: 600;
    color: #1890ff;
  }

  .text-up {
    color: #f5222d;
    font-weight: 500;
  }

  .text-down {
    color: #52c41a;
    font-weight: 500;
  }

  .text-excellent {
    color: #52c41a;
    font-weight: 700;
  }

  .text-good {
    color: #1890ff;
    font-weight: 500;
  }

  .text-error {
    color: #ff4d4f;
    font-weight: 700;
  }

  .chart-card {
    .chart {
      height: 280px;
    }
  }

  .risk-card {
    .risk-metric {
      text-align: center;
      padding: 16px;
      background: #f6ffed;
      border-radius: 8px;

      .label {
        font-size: 12px;
        color: #8c8c8c;
        margin-bottom: 8px;
      }

      .value {
        font-size: 24px;
        font-weight: 700;
      }
    }
  }
}
</style>
