<!-- src/components/stock/StockWatchlist.vue -->
<template>
  <div>
    <!-- 统计卡片 -->
    <a-row :gutter="16" style="margin-bottom: 24px">
      <a-col :span="6">
        <a-card size="small">
          <div class="summary-label">自选总数</div>
          <div class="summary-value" style="color: #1890ff">
            {{ watchlist.length }}
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small">
          <div class="summary-label">上涨</div>
          <div class="summary-value" style="color: #f5222d">
            {{ upCount }}
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small">
          <div class="summary-label">下跌</div>
          <div class="summary-value" style="color: #52c41a">
            {{ downCount }}
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small">
          <div class="summary-label">平均涨跌幅</div>
          <div
            class="summary-value"
            :style="{ color: avgChangePercent >= 0 ? '#f5222d' : '#52c41a' }"
          >
            {{ formatPercent(avgChangePercent) }}
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 操作按钮 -->
    <a-row style="margin-bottom: 16px">
      <a-col :span="24" style="text-align: right">
        <a-button type="primary" @click="showAddModal">
          <PlusOutlined />
          添加自选
        </a-button>
        <a-button style="margin-left: 8px" :loading="refreshLoading" @click="handleRefresh">
          <template #icon>
            <ReloadOutlined />
          </template>
          刷新
        </a-button>
      </a-col>
    </a-row>

    <!-- 自选表格 -->
    <a-table
      :data-source="watchlistWithData"
      :columns="columns"
      :loading="loading"
      :row-key="record => record.stock_code"
      size="middle"
      :pagination="{
        current: page,
        pageSize,
        total: watchlist.length,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: total => `共 ${total} 条`
      }"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <!-- 涨跌幅列 -->
        <template v-if="column.key === 'change_percent'">
          <span :style="{ color: getChangeColor(record.change_percent) }">
            {{ formatPercent(record.change_percent) }}
          </span>
        </template>

        <!-- 涨跌额列 -->
        <template v-else-if="column.key === 'change_amount'">
          <span :style="{ color: getChangeColor(record.change_amount) }">
            {{ formatNumber(record.change_amount, 2) }}
          </span>
        </template>

        <!-- 最新价列 -->
        <template v-else-if="column.key === 'latest_price'">
          <span :style="{ color: getChangeColor(record.change_percent) }">
            {{ formatNumber(record.latest_price, 2) }}
          </span>
        </template>

        <!-- 涨速列 -->
        <template v-else-if="column.key === 'change_speed'">
          <span :style="{ color: getChangeColor(record.change_speed) }">
            {{ formatPercent(record.change_speed) }}
          </span>
        </template>

        <!-- 操作列 -->
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button size="small" type="link" @click="showDetail(record)">
              详情
            </a-button>
            <a-button size="small" type="link" danger @click="removeWatch(record)">
              删除
            </a-button>
          </a-space>
        </template>

        <!-- 数值格式化列 -->
        <template v-else-if="column.format === 'volume'">
          <span>{{ formatVolume(record[column.dataIndex]) }}</span>
        </template>
        <template v-else-if="column.format === 'money'">
          <span>{{ formatMoney(record[column.dataIndex]) }}</span>
        </template>
        <template v-else-if="column.format === 'number'">
          <span>{{ formatNumber(record[column.dataIndex], column.precision || 2) }}</span>
        </template>
      </template>
    </a-table>

    <!-- 添加自选弹窗 -->
    <a-modal
      v-model:open="addModalVisible"
      title="添加自选"
      @ok="handleAddOk"
      @cancel="addModalVisible = false"
      :confirm-loading="adding"
      width="700px"
    >
      <div style="margin-bottom: 16px">
        <a-input-search
          v-model:value="searchKeyword"
          placeholder="输入股票代码或名称搜索"
          enter-button
          @search="handleSearchStock"
          @pressEnter="handleSearchStock"
        />
      </div>
      <a-table
        :data-source="searchResults"
        :columns="searchColumns"
        :loading="searchLoading"
        :row-key="record => record.code"
        size="small"
        :pagination="false"
        :scroll="{ y: 300 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'change_percent'">
            <span :style="{ color: getChangeColor(record.change_percent) }">
              {{ formatPercent(record.change_percent) }}
            </span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              type="primary"
              size="small"
              :disabled="isInWatchlist(record.code)"
              @click="addFromSearch(record)"
            >
              {{ isInWatchlist(record.code) ? '已添加' : '添加' }}
            </a-button>
          </template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { stockApi } from '@/api/stock'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'

// 标记组件是否已卸载
let isUnmounted = false
onUnmounted(() => {
  isUnmounted = true
  stopAutoRefresh()
})

const loading = ref(false)
const refreshLoading = ref(false)
const addModalVisible = ref(false)
const adding = ref(false)
const searchKeyword = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const autoRefreshTimer = ref(null)

const watchlist = ref([])
const stockDataMap = ref(new Map())

const page = ref(1)
const pageSize = ref(20)

// 统计信息
const upCount = computed(() => {
  return watchlist.value.filter(item => {
    const data = stockDataMap.value.get(item.stock_code)
    return data && data.change_percent > 0
  }).length
})

const downCount = computed(() => {
  return watchlist.value.filter(item => {
    const data = stockDataMap.value.get(item.stock_code)
    return data && data.change_percent < 0
  }).length
})

const avgChangePercent = computed(() => {
  const changes = watchlist.value
    .map(item => stockDataMap.value.get(item.stock_code))
    .filter(data => data && data.change_percent != null)
    .map(data => data.change_percent)
  
  if (changes.length === 0) return 0
  const sum = changes.reduce((a, b) => a + b, 0)
  return sum / changes.length
})

const watchlistWithData = computed(() => {
  return watchlist.value.map(item => {
    const realtimeData = stockDataMap.value.get(item.stock_code) || {}
    return {
      ...item,
      ...realtimeData
    }
  })
})

const columns = [
  { title: '代码', dataIndex: 'stock_code', key: 'stock_code', width: 90, fixed: 'left' },
  { title: '名称', dataIndex: 'stock_name', key: 'stock_name', width: 120, fixed: 'left' },
  { title: '最新价', dataIndex: 'latest_price', key: 'latest_price', width: 90, align: 'right' },
  { title: '涨跌幅', dataIndex: 'change_percent', key: 'change_percent', width: 90, align: 'right' },
  { title: '涨跌额', dataIndex: 'change_amount', key: 'change_amount', width: 90, align: 'right' },
  { title: '成交量', dataIndex: 'volume', key: 'volume', width: 100, align: 'right', format: 'volume' },
  { title: '成交额', dataIndex: 'turnover', key: 'turnover', width: 110, align: 'right', format: 'money' },
  { title: '换手率', dataIndex: 'turnover_rate', key: 'turnover_rate', width: 80, align: 'right', format: 'number', precision: 2 },
  { title: '总市值', dataIndex: 'total_market_cap', key: 'total_market_cap', width: 110, align: 'right', format: 'money' },
  { title: '市盈率', dataIndex: 'pe_dynamic', key: 'pe_dynamic', width: 80, align: 'right', format: 'number', precision: 2 },
  { title: '涨速', dataIndex: 'change_speed', key: 'change_speed', width: 80, align: 'right' },
  { title: '操作', key: 'action', fixed: 'right', width: 150, align: 'center' }
]

const searchColumns = [
  { title: '代码', dataIndex: 'code', key: 'code', width: 90 },
  { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
  { title: '最新价', dataIndex: 'latest_price', key: 'latest_price', width: 90 },
  { title: '涨跌幅', dataIndex: 'change_percent', key: 'change_percent', width: 90 },
  { title: '操作', key: 'action', width: 100, align: 'center' }
]

// 加载自选列表
const loadWatchlist = async () => {
  loading.value = true
  try {
    const res = await stockApi.getStockWatchlist()
    if (isUnmounted) return
    
    if (res.success) {
      watchlist.value = res.data || []
      await loadStockData()
    } else {
      message.error(res.message || '加载失败')
    }
  } catch (error) {
    if (!isUnmounted) {
      message.error('加载自选列表失败')
    }
    console.error(error)
  } finally {
    if (!isUnmounted) {
      loading.value = false
    }
  }
}

// 加载股票实时数据
const loadStockData = async () => {
  if (watchlist.value.length === 0) return
  
  try {
    const res = await stockApi.getRealtimeList()
    if (isUnmounted) return
    
    if (res.success) {
      const data = res.data || []
      stockDataMap.value = new Map(data.map(item => [item.code, item]))
    }
  } catch (error) {
    console.error('加载股票数据失败:', error)
  }
}

// 刷新数据
const handleRefresh = async () => {
  refreshLoading.value = true
  try {
    await loadWatchlist()
    if (!isUnmounted) {
      message.success('刷新成功')
    }
  } catch (error) {
    if (!isUnmounted) {
      message.error('刷新失败')
    }
  } finally {
    if (!isUnmounted) {
      refreshLoading.value = false
    }
  }
}

// 显示添加弹窗
const showAddModal = () => {
  addModalVisible.value = true
  searchKeyword.value = ''
  searchResults.value = []
}

// 搜索股票
const handleSearchStock = async () => {
  if (!searchKeyword.value.trim()) {
    message.warning('请输入搜索关键词')
    return
  }
  
  searchLoading.value = true
  try {
    const res = await stockApi.searchStocks(searchKeyword.value.trim())
    if (isUnmounted) return
    
    if (res.success) {
      searchResults.value = res.data || []
    } else {
      message.error(res.message || '搜索失败')
    }
  } catch (error) {
    if (!isUnmounted) {
      message.error('搜索失败')
    }
    console.error(error)
  } finally {
    if (!isUnmounted) {
      searchLoading.value = false
    }
  }
}

// 检查是否已在自选
const isInWatchlist = (code) => {
  return watchlist.value.some(item => item.stock_code === code)
}

// 从搜索结果添加
const addFromSearch = async (record) => {
  try {
    await stockApi.addToWatchlist({
      stock_code: record.code,
      stock_name: record.name
    })
    if (!isUnmounted) {
      message.success('添加成功')
      // 刷新自选列表
      await loadWatchlist()
    }
  } catch (error) {
    if (!isUnmounted) {
      message.error('添加失败')
    }
    console.error(error)
  }
}

// 弹窗确认
const handleAddOk = () => {
  addModalVisible.value = false
}

// 删除自选
const removeWatch = async (record) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要将 ${record.stock_name}(${record.stock_code}) 从自选清单中移除吗？`,
    okText: '确定',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await stockApi.removeFromWatchlist(record.stock_code)
        if (!isUnmounted) {
          message.success('删除成功')
          await loadWatchlist()
        }
      } catch (error) {
        if (!isUnmounted) {
          message.error('删除失败')
        }
        console.error(error)
      }
    }
  })
}

// 显示详情
const showDetail = (record) => {
  message.info(`${record.stock_name}(${record.stock_code}) 详情功能开发中...`)
}

const handleTableChange = (pagination) => {
  page.value = pagination.current
  pageSize.value = pagination.pageSize
}

// 格式化函数
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
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿'
  } else if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万'
  }
  return num.toFixed(0)
}

const formatMoney = (value) => {
  if (value == null || value === '') return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿'
  } else if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万'
  }
  return num.toFixed(2)
}

const getChangeColor = (value) => {
  if (value == null) return 'inherit'
  const num = parseFloat(value)
  if (isNaN(num)) return 'inherit'
  if (num > 0) return '#f5222d'
  if (num < 0) return '#52c41a'
  return 'inherit'
}

// 自动刷新
const startAutoRefresh = () => {
  autoRefreshTimer.value = setInterval(() => {
    loadStockData()
  }, 30000)
}

const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

onMounted(() => {
  loadWatchlist()
  startAutoRefresh()
})
</script>

<style scoped>
.summary-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}
.summary-value {
  font-size: 24px;
  font-weight: bold;
}
</style>
