<!-- src/components/stock/StockMarketList.vue -->
<template>
  <div>
    <!-- 搜索表单 -->
    <a-form :model="searchForm" layout="inline" @finish="handleSearch">
      <a-form-item label="股票代码/名称">
        <a-input
          v-model:value="searchForm.keyword"
          placeholder="请输入股票代码或名称"
          allowClear
          style="width: 250px"
          @pressEnter="handleSearch"
        />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit">搜索</a-button>
        <a-button style="margin-left: 8px" @click="resetSearch">重置</a-button>
      </a-form-item>
    </a-form>

    <!-- 统计信息 -->
    <a-row :gutter="16" style="margin: 16px 0">
      <a-col :span="6">
        <a-statistic title="总股票数" :value="pagination.total" />
      </a-col>
      <a-col :span="6">
        <a-statistic title="上涨" :value="upCount" value-style="color: #f5222d" />
      </a-col>
      <a-col :span="6">
        <a-statistic title="下跌" :value="downCount" value-style="color: #52c41a" />
      </a-col>
      <a-col :span="6">
        <a-statistic title="平盘" :value="flatCount" />
      </a-col>
    </a-row>

    <!-- 股票列表表格 -->
    <a-table
      :data-source="stockList"
      :columns="columns"
      :loading="loading"
      :row-key="record => record.code"
      :pagination="paginationConfig"
      style="margin-top: 16px"
      @change="handleTableChange"
      size="small"
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

        <!-- 振幅列 -->
        <template v-else-if="column.key === 'amplitude'">
          <span>{{ formatPercent(record.amplitude) }}</span>
        </template>

        <!-- 操作列 -->
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button
              :type="record.is_watched ? 'primary' : 'default'"
              size="small"
              @click="toggleWatch(record)"
            >
              <template v-if="record.is_watched">
                <CheckOutlined />
              </template>
              <template v-else>
                <PlusOutlined />
              </template>
              {{ record.is_watched ? '已自选' : '加自选' }}
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
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { stockApi } from '@/api/stock'
import { PlusOutlined, CheckOutlined } from '@ant-design/icons-vue'

// 标记组件是否已卸载
let isUnmounted = false
onUnmounted(() => {
  isUnmounted = true
  stopAutoRefresh()
})

const searchForm = ref({
  keyword: ''
})

const stockList = ref([])
const watchlistCodes = ref(new Set())
const loading = ref(false)
const autoRefreshTimer = ref(null)

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

const paginationConfig = computed(() => ({
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: pagination.total,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['20', '50', '100'],
  showTotal: total => `共 ${total} 条`
}))

// 统计信息
const upCount = computed(() => {
  return stockList.value.filter(s => s.change_percent > 0).length
})
const downCount = computed(() => {
  return stockList.value.filter(s => s.change_percent < 0).length
})
const flatCount = computed(() => {
  return stockList.value.filter(s => s.change_percent === 0 || s.change_percent == null).length
})

const columns = [
  { title: '代码', dataIndex: 'code', key: 'code', width: 90, fixed: 'left' },
  { title: '名称', dataIndex: 'name', key: 'name', width: 120, fixed: 'left' },
  { title: '最新价', dataIndex: 'latest_price', key: 'latest_price', width: 90, align: 'right' },
  { title: '涨跌幅', dataIndex: 'change_percent', key: 'change_percent', width: 90, align: 'right' },
  { title: '涨跌额', dataIndex: 'change_amount', key: 'change_amount', width: 90, align: 'right' },
  { title: '成交量', dataIndex: 'volume', key: 'volume', width: 100, align: 'right', format: 'volume' },
  { title: '成交额', dataIndex: 'turnover', key: 'turnover', width: 110, align: 'right', format: 'money' },
  { title: '换手率', dataIndex: 'turnover_rate', key: 'turnover_rate', width: 80, align: 'right', format: 'number', precision: 2 },
  { title: '总市值', dataIndex: 'total_market_cap', key: 'total_market_cap', width: 110, align: 'right', format: 'money' },
  { title: '流通市值', dataIndex: 'circulating_market_cap', key: 'circulating_market_cap', width: 110, align: 'right', format: 'money' },
  { title: '市盈率', dataIndex: 'pe_dynamic', key: 'pe_dynamic', width: 80, align: 'right', format: 'number', precision: 2 },
  { title: '市净率', dataIndex: 'pb_ratio', key: 'pb_ratio', width: 80, align: 'right', format: 'number', precision: 2 },
  { title: '振幅', dataIndex: 'amplitude', key: 'amplitude', width: 80, align: 'right' },
  { title: '涨速', dataIndex: 'change_speed', key: 'change_speed', width: 80, align: 'right' },
  { title: '最高', dataIndex: 'high', key: 'high', width: 90, align: 'right', format: 'number' },
  { title: '最低', dataIndex: 'low', key: 'low', width: 90, align: 'right', format: 'number' },
  { title: '今开', dataIndex: 'open', key: 'open', width: 90, align: 'right', format: 'number' },
  { title: '昨收', dataIndex: 'prev_close', key: 'prev_close', width: 90, align: 'right', format: 'number' },
  { title: '操作', key: 'action', fixed: 'right', width: 110, align: 'center' }
]

// 获取自选列表
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

// 加载数据
const loadData = async () => {
  loading.value = true
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
      // 标记是否已自选
      data.forEach(item => {
        item.is_watched = watchlistCodes.value.has(item.code)
      })
      
      // 分页处理
      const start = (pagination.current - 1) * pagination.pageSize
      const end = start + pagination.pageSize
      pagination.total = data.length
      stockList.value = data.slice(start, end)
    } else {
      message.error(res.message || '加载失败')
    }
  } catch (error) {
    if (!isUnmounted) {
      message.error('加载失败')
    }
    console.error(error)
  } finally {
    if (!isUnmounted) {
      loading.value = false
    }
  }
}

const handleSearch = () => {
  pagination.current = 1
  loadData()
}

const resetSearch = () => {
  searchForm.value.keyword = ''
  pagination.current = 1
  loadData()
}

const handleTableChange = (newPagination) => {
  pagination.current = newPagination.current
  pagination.pageSize = newPagination.pageSize
  loadData()
}

// 切换自选
const toggleWatch = async (record) => {
  try {
    if (record.is_watched) {
      await stockApi.removeFromWatchlist(record.code)
      message.success('已移除自选')
      watchlistCodes.value.delete(record.code)
    } else {
      await stockApi.addToWatchlist({
        stock_code: record.code,
        stock_name: record.name
      })
      message.success('已加入自选')
      watchlistCodes.value.add(record.code)
    }
    record.is_watched = !record.is_watched
  } catch (error) {
    message.error(record.is_watched ? '移除失败' : '加入失败')
    console.error(error)
  }
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
    loadData()
  }, 30000)
}

const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

onMounted(async () => {
  await loadWatchlist()
  await loadData()
  startAutoRefresh()
})
</script>
