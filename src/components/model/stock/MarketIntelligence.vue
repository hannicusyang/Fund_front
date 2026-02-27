<template>
  <div class="market-intelligence-container">
    <!-- 页面标题 -->
    <a-page-header
      title="📊 市场资讯"
      sub-title="实时市场行情与AI智能分析"
      :ghost="false"
    >
      <template #extra>
        <a-radio-group v-model:value="timeRange" @change="onTimeRangeChange">
          <a-radio-button value="today">今日</a-radio-button>
          <a-radio-button value="week">本周</a-radio-button>
          <a-radio-button value="month">本月</a-radio-button>
        </a-radio-group>
        <a-button type="primary" @click="refreshData" :loading="loading">
          <ReloadOutlined /> 刷新
        </a-button>
      </template>
    </a-page-header>

    <!-- 核心指标卡片 -->
    <a-row :gutter="16" class="stats-row">
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card class="stat-card up">
          <div class="stat-value">{{ overview.up_count || 0 }}</div>
          <div class="stat-label">上涨股票</div>
          <div class="stat-change">
            <ArrowUpOutlined /> {{ upRatio }}%
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card class="stat-card down">
          <div class="stat-value">{{ overview.down_count || 0 }}</div>
          <div class="stat-label">下跌股票</div>
          <div class="stat-change">
            <ArrowDownOutlined /> {{ downRatio }}%
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card class="stat-card limit-up">
          <div class="stat-value">{{ overview.limit_up_count || 0 }}</div>
          <div class="stat-label">涨停</div>
          <div class="stat-trend">🔥 热点活跃</div>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card class="stat-card limit-down">
          <div class="stat-value">{{ overview.limit_down_count || 0 }}</div>
          <div class="stat-label">跌停</div>
          <div class="stat-trend">⚠️ 风险监控</div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 市场概览与AI分析 -->
    <a-row :gutter="16" class="main-content">
      <!-- 左侧：市场数据 -->
      <a-col :xs="24" :lg="16">
        <!-- 指数行情 -->
        <a-card title="📈 指数行情" class="chart-card">
          <div ref="indexChart" class="chart-container"></div>
        </a-card>

        <!-- 涨跌排行 -->
        <a-row :gutter="16" class="rank-row">
          <a-col :xs="24" :md="12">
            <a-card title="🔥 涨幅榜" class="rank-card">
              <a-table
                :dataSource="topStocks.top_gainers"
                :columns="rankColumns"
                :pagination="false"
                size="small"
                :scroll="{ y: 300 }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'pct_chg'">
                    <span :class="record.pct_chg > 0 ? 'up-text' : 'down-text'">
                      {{ formatPercent(record.pct_chg) }}
                    </span>
                  </template>
                </template>
              </a-table>
            </a-card>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-card title="❄️ 跌幅榜" class="rank-card">
              <a-table
                :dataSource="topStocks.top_losers"
                :columns="rankColumns"
                :pagination="false"
                size="small"
                :scroll="{ y: 300 }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'pct_chg'">
                    <span :class="record.pct_chg > 0 ? 'up-text' : 'down-text'">
                      {{ formatPercent(record.pct_chg) }}
                    </span>
                  </template>
                </template>
              </a-table>
            </a-card>
          </a-col>
        </a-row>
      </a-col>

      <!-- 右侧：AI分析 -->
      <a-col :xs="24" :lg="8">
        <a-card title="🤖 AI市场分析" class="ai-card">
          <div v-if="aiAnalysis.loading" class="ai-loading">
            <a-spin tip="AI分析中..." />
          </div>
          <div v-else class="ai-content">
            <!-- 情绪指标 -->
            <div class="sentiment-section">
              <h4>市场情绪</h4>
              <a-progress
                type="dashboard"
                :percent="aiAnalysis.sentiment_score * 100"
                :stroke-color="sentimentColor"
                :format="() => aiAnalysis.sentiment"
              />
            </div>

            <a-divider />

            <!-- 分析摘要 -->
            <div class="summary-section">
              <h4>📋 分析摘要</h4>
              <p>{{ aiAnalysis.summary }}</p>
            </div>

            <a-divider />

            <!-- 风险提示 -->
            <div class="risk-section">
              <h4>⚠️ 风险提示</h4>
              <a-list
                :dataSource="aiAnalysis.risks"
                size="small"
                :renderItem="item => h(ANTList.Item, null, { default: () => item })"
              />
            </div>

            <a-divider />

            <!-- 投资机会 -->
            <div class="opportunity-section">
              <h4>💡 投资机会</h4>
              <a-list
                :dataSource="aiAnalysis.opportunities"
                size="small"
                :renderItem="item => h(ANTList.Item, null, { default: () => item })"
              />
            </div>

            <a-divider />

            <!-- 投资建议 -->
            <div class="suggestion-section">
              <h4>🎯 投资建议</h4>
              <a-alert
                :message="aiAnalysis.suggestion"
                type="info"
                show-icon
              />
            </div>
          </div>

          <template #extra>
            <a-button type="link" @click="runAIAnalysis" :loading="aiAnalysis.loading">
              <RobotOutlined /> 重新分析
            </a-button>
          </template>
        </a-card>

        <!-- 资金流向 -->
        <a-card title="💰 资金流向" class="flow-card">
          <div class="flow-item">
            <span>北向资金</span>
            <span :class="northboundClass">
              {{ formatAmount(overview.northbound?.net_buy) }}
            </span>
          </div>
          <div class="flow-item">
            <span>融资余额</span>
            <span>{{ formatAmount(overview.margin?.total_balance) }}</span>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 板块热力图 -->
    <a-card title="🔥 板块热力图" class="heatmap-card">
      <div ref="heatmapChart" class="heatmap-container"></div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, h } from 'vue'
import {
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  RobotOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { List as ANTList } from 'ant-design-vue'
import * as echarts from 'echarts'
import { getMarketOverview, getTopStocks, getSectorHeatmap, getAIAnalysis } from '@/api/marketIntelligence'

// 状态
const loading = ref(false)
const timeRange = ref('today')
const overview = reactive({})
const topStocks = reactive({
  top_gainers: [],
  top_losers: [],
  limit_up: [],
  limit_down: []
})
const sectorHeatmap = ref([])
const aiAnalysis = reactive({
  loading: false,
  sentiment: '分析中...',
  sentiment_score: 0.5,
  summary: '',
  risks: [],
  opportunities: [],
  suggestion: ''
})

// 图表引用
const indexChart = ref(null)
const heatmapChart = ref(null)

// 计算属性
const upRatio = computed(() => {
  const total = overview.up_count + overview.down_count
  return total > 0 ? ((overview.up_count / total) * 100).toFixed(1) : 0
})

const downRatio = computed(() => {
  const total = overview.up_count + overview.down_count
  return total > 0 ? ((overview.down_count / total) * 100).toFixed(1) : 0
})

const sentimentColor = computed(() => {
  const score = aiAnalysis.sentiment_score
  if (score >= 0.7) return '#52c41a'
  if (score >= 0.4) return '#faad14'
  return '#f5222d'
})

const northboundClass = computed(() => {
  const val = overview.northbound?.net_buy
  return val > 0 ? 'up-text' : val < 0 ? 'down-text' : ''
})

// 表格列定义
const rankColumns = [
  { title: '股票', dataIndex: 'name', key: 'name', width: 100 },
  { title: '代码', dataIndex: 'code', key: 'code', width: 80 },
  { title: '价格', dataIndex: 'close', key: 'close', width: 80 },
  { title: '涨跌幅', dataIndex: 'pct_chg', key: 'pct_chg', width: 100 }
]

// 方法
const formatPercent = (val) => {
  if (!val) return '-'
  const sign = val > 0 ? '+' : ''
  return `${sign}${val.toFixed(2)}%`
}

const formatAmount = (val) => {
  if (!val) return '-'
  if (val >= 100000000) return `${(val / 100000000).toFixed(2)}亿`
  if (val >= 10000) return `${(val / 10000).toFixed(2)}万`
  return val.toString()
}

const fetchData = async () => {
  loading.value = true
  try {
    // 并行获取数据
    const [overviewRes, topRes] = await Promise.all([
      getMarketOverview(),
      getTopStocks()
    ])

    if (overviewRes.success) {
      Object.assign(overview, overviewRes.data)
    }

    if (topRes.success) {
      Object.assign(topStocks, topRes.data)
    }

    // 获取AI分析
    await runAIAnalysis()

    message.success('数据更新成功')
  } catch (error) {
    message.error('数据获取失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const runAIAnalysis = async () => {
  aiAnalysis.loading = true
  try {
    const res = await getAIAnalysis({
      market_data: overview
    })
    if (res.success) {
      Object.assign(aiAnalysis, res.data)
    }
  } catch (error) {
    console.error('AI分析失败:', error)
  } finally {
    aiAnalysis.loading = false
  }
}

const refreshData = () => {
  fetchData()
}

const onTimeRangeChange = () => {
  fetchData()
}

// 初始化
onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="less">
.market-intelligence-container {
  padding: 16px;
  background: #f5f5f5;
  min-height: 100vh;

  .stats-row {
    margin-bottom: 16px;

    .stat-card {
      text-align: center;
      border-radius: 8px;

      .stat-value {
        font-size: 32px;
        font-weight: bold;
        margin-bottom: 8px;
      }

      .stat-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 8px;
      }

      .stat-change, .stat-trend {
        font-size: 12px;
      }

      &.up {
        border-left: 4px solid #52c41a;
        .stat-value { color: #52c41a; }
      }

      &.down {
        border-left: 4px solid #f5222d;
        .stat-value { color: #f5222d; }
      }

      &.limit-up {
        border-left: 4px solid #fa541c;
        .stat-value { color: #fa541c; }
      }

      &.limit-down {
        border-left: 4px solid #722ed1;
        .stat-value { color: #722ed1; }
      }
    }
  }

  .main-content {
    margin-bottom: 16px;

    .chart-card {
      margin-bottom: 16px;

      .chart-container {
        height: 300px;
      }
    }

    .rank-row {
      .rank-card {
        .up-text {
          color: #52c41a;
        }
        .down-text {
          color: #f5222d;
        }
      }
    }

    .ai-card {
      margin-bottom: 16px;

      .ai-loading {
        text-align: center;
        padding: 40px 0;
      }

      .sentiment-section {
        text-align: center;
        padding: 20px 0;
      }

      .summary-section, .risk-section, .opportunity-section, .suggestion-section {
        h4 {
          margin-bottom: 12px;
          font-weight: 600;
        }
      }
    }

    .flow-card {
      .flow-item {
        display: flex;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .up-text { color: #52c41a; }
        .down-text { color: #f5222d; }
      }
    }
  }

  .heatmap-card {
    .heatmap-container {
      height: 400px;
    }
  }
}
</style>
