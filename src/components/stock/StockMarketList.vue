<template>
  <div class="stock-market-list">
    <!-- 顶部卡片：搜索和统计 -->
    <a-card :bordered="false" class="header-card">
      <div class="header-content">
        <!-- 左侧：标题和数据源 -->
        <div class="header-left">
          <h2 class="page-title">
            <BarChartOutlined /> 股票实时行情
          </h2>
          <div class="data-info">
            <a-tag :color="dataSource === 'database' ? 'green' : 'blue'">
              {{ dataSource === 'database' ? '数据库' : '实时API' }}
            </a-tag>
            <span v-if="lastUpdateTime" class="update-time">
              <ClockCircleOutlined /> 更新: {{ lastUpdateTime }}
            </span>
          </div>
        </div>

        <!-- 右侧：操作按钮 -->
        <div class="header-right">
          <a-space>
            <a-input-search
              v-model:value="searchForm.keyword"
              placeholder="搜索代码/名称"
              allow-clear
              @search="handleSearch"
              style="width: 200px"
            />
            <a-button @click="resetSearch">重置</a-button>
            <a-button type="primary" :loading="loading" @click="refreshData">
              <template #icon><ReloadOutlined /></template>
              刷新
            </a-button>
          </a-space>
        </div>
      </div>

      <!-- 筛选标签 -->
      <div class="filter-tags">
        <a-radio-group v-model:value="filterType" @change="handleFilterChange">
          <a-radio-button value="all">
            全部 <a-badge :count="stats.total" :overflow-count="9999" class="stat-badge" />
          </a-radio-button>
          <a-radio-button value="up">
            <span style="color: #f5222d">▲ 上涨</span>
            <a-badge :count="stats.up" :overflow-count="9999" class="stat-badge" />
          </a-radio-button>
          <a-radio-button value="down">
            <span style="color: #52c41a">▼ 下跌</span>
            <a-badge :count="stats.down" :overflow-count="9999" class="stat-badge" />
          </a-radio-button>
          <a-radio-button value="watchlist">
            <StarOutlined /> 自选
            <a-badge :count="stats.watchlist" :overflow-count="999" class="stat-badge" />
          </a-radio-button>
        </a-radio-group>
      </div>
    </a-card>

    <!-- 统计卡片 -->
    <a-row :gutter="16" class="stats-row">
      <a-col :xs="12" :sm="6" :lg="4">
        <a-card size="small" class="stat-card up-card">
          <div class="stat-value" style="color: #f5222d">{{ stats.upPercent }}%</div>
          <div class="stat-label">上涨占比</div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6" :lg="4">
        <a-card size="small" class="stat-card down-card">
          <div class="stat-value" style="color: #52c41a">{{ stats.downPercent }}%</div>
          <div class="stat-label">下跌占比</div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6" :lg="4">
        <a-card size="small" class="stat-card">
          <div class="stat-value" style="color: #1890ff">{{ stats.avgChange }}%</div>
          <div class="stat-label">平均涨跌幅</div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6" :lg="4">
        <a-card size="small" class="stat-card">
          <div class="stat-value" style="color: #722ed1">{{ formatMoney(stats.totalTurnover) }}</div>
          <div class="stat-label">总成交额</div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6" :lg="4">
        <a-card size="small" class="stat-card">
          <div class="stat-value" style="color: #fa8c16">{{ formatVolume(stats.totalVolume) }}</div>
          <div class="stat-label">总成交量</div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6" :lg="4">
        <a-card size="small" class="stat-card">
          <div class="stat-value" style="color: #eb2f96">{{ stats.limitUp }}</div>
          <div class="stat-label">涨停数</div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 股票表格 -->
    <a-card :bordered="false" class="table-card">
      <a-table
        :data-source="filteredStockList"
        :columns="columns"
        :loading="loading"
        :row-key="record => record.code"
        :pagination="paginationConfig"
        :scroll="{ x: 1000 }"
        size="middle"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 代码名称列 -->
          <template v-if="column.key === 'code'">
            <div class="stock-info">
              <div class="stock-code">{{ record.code }}</div>
              <div class="stock-name">{{ record.name }}</div>
            </div>
          </template>

          <!-- 最新价列 -->
          <template v-else-if="column.key === 'latest_price'">
            <span :class="['price-text', getChangeClass(record.change_percent)]">
              {{ formatNumber(record.latest_price, 2) }}
            </span>
          </template>

          <!-- 涨跌幅列 -->
          <template v-else-if="column.key === 'change_percent'">
            <div :class="['change-box', getChangeBgClass(record.change_percent)]">
              <ArrowUpOutlined v-if="record.change_percent > 0" />
              <ArrowDownOutlined v-else-if="record.change_percent < 0" />
              <span v-else>-</span>
              {{ formatPercent(record.change_percent) }}
            </div>
          </template>

          <!-- 涨跌额列 -->
          <template v-else-if="column.key === 'change_amount'">
            <span :class="getChangeClass(record.change_amount)">
              {{ formatNumber(record.change_amount, 2) }}
            </span>
          </template>

          <!-- 成交量 -->
          <template v-else-if="column.key === 'volume'">
            {{ formatVolume(record.volume) }}
          </template>

          <!-- 成交额 -->
          <template v-else-if="column.key === 'turnover'">
            {{ formatMoney(record.turnover) }}
          </template>

          <!-- 换手率 -->
          <template v-else-if="column.key === 'turnover_rate'">
            <a-progress
              :percent="Math.min(record.turnover_rate || 0, 100)"
              :show-info="false"
              :stroke-color="record.turnover_rate > 10 ? '#f5222d' : '#1890ff'"
              size="small"
              style="width: 60px"
            />
            <span style="margin-left: 4px">{{ formatNumber(record.turnover_rate, 2) }}%</span>
          </template>

          <!-- 市值 -->
          <template v-else-if="column.key === 'total_market_cap'">
            {{ formatMoney(record.total_market_cap) }}
          </template>

          <!-- 市盈率 -->
          <template v-else-if="column.key === 'pe_dynamic'">
            <a-tag v-if="record.pe_dynamic" :color="getPeColor(record.pe_dynamic)">
              {{ formatNumber(record.pe_dynamic, 1) }}
            </a-tag>
            <span v-else>--</span>
          </template>

          <!-- 操作列 -->
          <template v-else-if="column.key === 'action'">
            <a-tooltip :title="record.is_watched ? '移除自选' : '加入自选'">
              <a-button
                :type="record.is_watched ? 'primary' : 'default'"
                shape="circle"
                size="small"
                @click="toggleWatch(record)"
              >
                <StarFilled v-if="record.is_watched" />
                <StarOutlined v-else />
              </a-button>
            </a-tooltip>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 自动刷新提示 -->
    <a-alert
      v-if="autoRefreshEnabled"
      class="refresh-tip"
      type="info"
      show-icon
      :message="`数据每30秒自动刷新，下次刷新倒计时: ${countdown}秒`"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { stockApi } from '@/api/stock'
import {
  BarChartOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  StarOutlined,
  StarFilled,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons-vue'

// ============ 状态 ============
let isUnmounted = false
onUnmounted(() => {
  isUnmounted = true
  stopAutoRefresh()
  stopCountdown()
})

const searchForm = ref({ keyword: '' })
const filterType = ref('all') // all, up, down, watchlist
const stockList = ref([])
const allStockData = ref([]) // 存储全部数据用于筛选
const watchlistCodes = ref(new Set())
const loading = ref(false)
const dataSource = ref('')
const lastUpdateTime = ref('')
const autoRefreshEnabled = ref(true)
const countdown = ref(30)

const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})

// ============ 计算属性 ============
const paginationConfig = computed(() => ({
  current: pagination.value.current,
  pageSize: pagination.value.pageSize,
  total: filteredStockList.value.length,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['20', '50', '100', '200'],
  showTotal: total => `共 ${total} 条`
}))

// 统计数据
const stats = computed(() => {
  const list = allStockData.value
  const up = list.filter(s => s.change_percent > 0).length
  const down = list.filter(s => s.change_percent < 0).length
  const flat = list.filter(s => s.change_percent === 0 || s.change_percent == null).length
  const watchlist = list.filter(s => watchlistCodes.value.has(s.code)).length
  const limitUp = list.filter(s => s.change_percent >= 9.9).length

  const totalTurnover = list.reduce((sum, s) => sum + (s.turnover || 0), 0)
  const totalVolume = list.reduce((sum, s) => sum + (s.volume || 0), 0)

  const avgChange = list.length > 0
    ? list.reduce((sum, s) => sum + (s.change_percent || 0), 0) / list.length
    : 0

  return {
    total: list.length,
    up,
    down,
    flat,
    watchlist,
    limitUp,
    upPercent: list.length ? ((up / list.length) * 100).toFixed(1) : 0,
    downPercent: list.length ? ((down / list.length) * 100).toFixed(1) : 0,
    avgChange: avgChange.toFixed(2),
    totalTurnover,
    totalVolume
  }
})

// 筛选后的列表
const filteredStockList = computed(() => {
  let result = allStockData.value

  // 按类型筛选
  if (filterType.value === 'up') {
    result = result.filter(s => s.change_percent > 0)
  } else if (filterType.value === 'down') {
    result = result.filter(s => s.change_percent < 0)
  } else if (filterType.value === 'watchlist') {
    result = result.filter(s => watchlistCodes.value.has(s.code))
  }

  // 按搜索词筛选
  if (searchForm.value.keyword) {
    const kw = searchForm.value.keyword.toLowerCase()
    result = result.filter(s =>
      s.code.toLowerCase().includes(kw) ||
      s.name.toLowerCase().includes(kw)
    )
  }

  // 分页
  const start = (pagination.value.current - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize

  return result.slice(start, end)
})

// ============ 表格列 ============
const columns = [
  { title: '股票', key: 'code', width: 140, fixed: 'left' },
  { title: '最新价', key: 'latest_price', width: 100, align: 'right', sorter: (a, b) => a.latest_price - b.latest_price },
  { title: '涨跌幅', key: 'change_percent', width: 110, align: 'center', sorter: (a, b) => a.change_percent - b.change_percent },
  { title: '涨跌额', key: 'change_amount', width: 100, align: 'right', sorter: (a, b) => a.change_amount - b.change_amount },
  { title: '成交量', key: 'volume', width: 100, align: 'right', sorter: (a, b) => a.volume - b.volume },
  { title: '成交额', key: 'turnover', width: 110, align: 'right', sorter: (a, b) => a.turnover - b.turnover },
  { title: '换手率', key: 'turnover_rate', width: 140, align: 'right', sorter: (a, b) => a.turnover_rate - b.turnover_rate },
  { title: '总市值', key: 'total_market_cap', width: 110, align: 'right', sorter: (a, b) => a.total_market_cap - b.total_market_cap },
  { title: '市盈率', key: 'pe_dynamic', width: 90, align: 'right', sorter: (a, b) => (a.pe_dynamic || 0) - (b.pe_dynamic || 0) },
  { title: '操作', key: 'action', width: 80, align: 'center', fixed: 'right' }
]

// ============ 方法 ============
const loadWatchlist = async () => {
  try {
    const res = await stockApi.getStockWatchlist()
    if (res.success) {
      watchlistCodes.value = new Set(res.data.map(item => item.stock_code))
    }
  } catch (error) {
    console.error('加载自选列表失败:', error)
  }
}

const loadData = async (showLoading = true) => {
  if (showLoading) loading.value = true

  try {
    let res
    if (searchForm.value.keyword) {
      res = await stockApi.searchStocks(searchForm.value.keyword)
    } else {
      res = await stockApi.getRealtimeList()
    }

    if (isUnmounted) return

    if (res.success) {
      const data = res.data || []
      data.forEach(item => {
        item.is_watched = watchlistCodes.value.has(item.code)
      })

      allStockData.value = data
      pagination.value.total = data.length
      dataSource.value = res.cache_type || res.source || 'api'
      lastUpdateTime.value = new Date().toLocaleTimeString()
    } else {
      message.error(res.message || '加载失败')
    }
  } catch (error) {
    if (!isUnmounted) {
      message.error('加载失败: ' + (error.message || '未知错误'))
    }
    console.error(error)
  } finally {
    if (showLoading) loading.value = false
  }
}

const refreshData = () => {
  pagination.value.current = 1
  loadData()
  resetCountdown()
}

const handleSearch = () => {
  pagination.value.current = 1
  loadData()
}

const resetSearch = () => {
  searchForm.value.keyword = ''
  pagination.value.current = 1
  loadData()
}

const handleFilterChange = () => {
  pagination.value.current = 1
}

const handleTableChange = (newPagination) => {
  pagination.value.current = newPagination.current
  pagination.value.pageSize = newPagination.pageSize
}

const toggleWatch = async (record) => {
  try {
    if (record.is_watched) {
      await stockApi.removeFromWatchlist(record.code)
      message.success(`已移除 ${record.name}`)
      watchlistCodes.value.delete(record.code)
    } else {
      await stockApi.addToWatchlist({
        stock_code: record.code,
        stock_name: record.name
      })
      message.success(`已添加 ${record.name}`)
      watchlistCodes.value.add(record.code)
    }
    record.is_watched = !record.is_watched
  } catch (error) {
    message.error(record.is_watched ? '移除失败' : '添加失败')
    console.error(error)
  }
}

// ============ 格式化 ============
const formatPercent = (value) => {
  if (value == null || value === '') return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

const formatNumber = (value, precision = 2) => {
  if (value == null || value === '') return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  return num.toFixed(precision)
}

const formatVolume = (value) => {
  if (value == null || value === '') return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return (num / 10000).toFixed(2) + '万'
  return num.toFixed(0)
}

const formatMoney = (value) => {
  if (value == null || value === '') return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  if (num >= 100000000000) return (num / 100000000000).toFixed(2) + '千亿'
  if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return (num / 10000).toFixed(2) + '万'
  return num.toFixed(2)
}

const getChangeClass = (value) => {
  if (value == null) return ''
  const num = parseFloat(value)
  if (isNaN(num)) return ''
  if (num > 0) return 'text-up'
  if (num < 0) return 'text-down'
  return 'text-flat'
}

const getChangeBgClass = (value) => {
  if (value == null) return 'bg-flat'
  const num = parseFloat(value)
  if (isNaN(num)) return 'bg-flat'
  if (num > 0) return 'bg-up'
  if (num < 0) return 'bg-down'
  return 'bg-flat'
}

const getPeColor = (value) => {
  if (value < 0) return 'red'      // 亏损
  if (value < 15) return 'green'   // 低估
  if (value > 50) return 'orange'  // 高估
  return 'blue'
}

// ============ 自动刷新 ============
let autoRefreshTimer = null
let countdownTimer = null

const startAutoRefresh = () => {
  autoRefreshTimer = setInterval(() => {
    loadData(false) // 静默刷新
    resetCountdown()
  }, 30000)
  startCountdown()
}

const stopAutoRefresh = () => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
}

const startCountdown = () => {
  countdown.value = 30
  countdownTimer = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    }
  }, 1000)
}

const stopCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

const resetCountdown = () => {
  stopCountdown()
  startCountdown()
}

// ============ 生命周期 ============
onMounted(async () => {
  await loadWatchlist()
  await loadData()
  startAutoRefresh()
})
</script>

<style scoped lang="less">
.stock-market-list {
  padding: 16px;

  .header-card {
    margin-bottom: 16px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;

      .header-left {
        .page-title {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
        }

        .data-info {
          display: flex;
          align-items: center;
          gap: 12px;

          .update-time {
            color: #8c8c8c;
            font-size: 13px;
          }
        }
      }

      .header-right {
        display: flex;
        gap: 8px;
      }
    }

    .filter-tags {
      padding-top: 8px;
      border-top: 1px solid #f0f0f0;

      .stat-badge {
        margin-left: 4px;

        :deep(.ant-badge-count) {
          background: #e6e6e6;
          color: #666;
          font-size: 11px;
          height: 16px;
          line-height: 16px;
          min-width: 16px;
          padding: 0 4px;
        }
      }
    }
  }

  .stats-row {
    margin-bottom: 16px;

    .stat-card {
      text-align: center;

      .stat-value {
        font-size: 24px;
        font-weight: 600;
        line-height: 1.2;
      }

      .stat-label {
        font-size: 12px;
        color: #8c8c8c;
        margin-top: 4px;
      }

      &.up-card {
        background: linear-gradient(135deg, #fff1f0 0%, #fff 100%);
      }

      &.down-card {
        background: linear-gradient(135deg, #f6ffed 0%, #fff 100%);
      }
    }
  }

  .table-card {
    .stock-info {
      .stock-code {
        font-weight: 600;
        font-size: 14px;
        color: #262626;
      }

      .stock-name {
        font-size: 12px;
        color: #8c8c8c;
        margin-top: 2px;
      }
    }

    .price-text {
      font-weight: 600;
      font-size: 14px;
    }

    .change-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 500;
      font-size: 13px;
      min-width: 80px;

      &.bg-up {
        background: #fff1f0;
        color: #f5222d;
      }

      &.bg-down {
        background: #f6ffed;
        color: #52c41a;
      }

      &.bg-flat {
        background: #f5f5f5;
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

    .text-flat {
      color: #8c8c8c;
    }

    :deep(.ant-table-row) {
      cursor: pointer;

      &:hover {
        background: #f0f5ff;
      }
    }
  }

  .refresh-tip {
    margin-top: 16px;
  }
}

// 响应式
@media (max-width: 768px) {
  .stock-market-list {
    padding: 8px;

    .header-card {
      .header-content {
        flex-direction: column;
        align-items: flex-start;

        .header-right {
          width: 100%;

          .ant-space {
            flex-wrap: wrap;
          }
        }
      }
    }
  }
}
</style>
