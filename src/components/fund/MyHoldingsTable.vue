<template>
  <div>
        <!-- 资产概览卡片 -->
    <a-row :gutter="16" style="margin-bottom: 24px">
      <a-col :span="8">
        <a-card size="small">
          <div class="summary-label">总资产</div>
          <div class="summary-value" style="color: #1890ff">
            ¥{{ portfolioSummary.totalAsset.toLocaleString() }}
          </div>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card size="small">
          <div class="summary-label">总收益</div>
          <div
            class="summary-value"
            :style="{ color: portfolioSummary.totalProfit >= 0 ? '#f5222d' : '#52c41a' }"
          >
            ¥{{ portfolioSummary.totalProfit.toLocaleString() }}
          </div>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card size="small">
          <div class="summary-label">总收益率</div>
          <div
            class="summary-value"
            :style="{ color: portfolioSummary.totalProfitRate >= 0 ? '#f5222d' : '#52c41a' }"
          >
            {{ portfolioSummary.totalProfitRate }}%
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 历史趋势图 -->
    <div ref="chartRef" style="width: 100%; height: 360px; margin-bottom: 24px"></div>

    <a-table
      :data-source="myHoldings"
      :columns="columns"
      :loading="loading"
      :row-key="record => record.fund_code"
      size="middle"
      :pagination="{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: total => `共 ${total} 条`
      }"
      @change="handleTableChange"
    >
      <template #title>
        <div class="table-header">
          <a-alert
            message="提示：点击“修改持仓”可编辑成本价、份额和买入时间"
            type="info"
            show-icon
            style="margin-bottom: 16px"
          />
          <a-button
            type="text"
            size="small"
            :loading="refreshLoading"
            @click="handleRefresh"
            class="refresh-btn"
          >
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </a-button>
        </div>
      </template>
      <template #bodyCell="{ column, record }">
        <!-- 自选列 -->
        <template v-if="column.key === 'favorite'">
          <a-button type="primary" size="small" @click="toggleFavorite(record)">
            <template v-if="record.is_checked">
              <CheckOutlined />
            </template>
            <template v-else>
              <PlusOutlined />
            </template>
          </a-button>
        </template>

        <!-- 百分比字段：日增长率、持有收益率 -->
        <template v-else-if="column.key === 'daily_growth_rate' || column.key === 'profit_rate'">
          <span :style="{ color: getGrowthColor(record[column.dataIndex]) }">
            {{ formatPercent(record[column.dataIndex]) }}
          </span>
        </template>

        <!-- 操作列 -->
        <template v-else-if="column.key === 'action'">
          <a-button size="small" type="link" @click="goToDetail(record.fund_code)">
            查看详情
          </a-button>
          <a-button size="small" type="link" @click="openEditModal(record)">
            修改持仓
          </a-button>
        </template>
      </template>
    </a-table>

    <!-- 修改持仓弹窗 -->
    <a-modal
      v-model:open="editModalVisible"
      title="修改持仓"
      @ok="handleEditOk"
      @cancel="editModalVisible = false"
      :confirm-loading="editing"
    >
      <a-form :model="editForm" layout="vertical">
        <a-form-item label="基金代码">
          <a-input v-model:value="editForm.fund_code" disabled />
        </a-form-item>
        <a-form-item label="基金名称">
          <a-input v-model:value="editForm.fund_name" disabled />
        </a-form-item>
        <a-form-item
          label="成本价"
          name="cost_price"
          :rules="[{ required: true, message: '请输入成本价' }]"
        >
          <a-input-number
            v-model:value="editForm.cost_price"
            :min="0"
            :precision="4"
            style="width: 100%"
            placeholder="例如：1.2500"
          />
        </a-form-item>
        <a-form-item
          label="持有份额"
          name="shares"
          :rules="[{ required: true, message: '请输入持有份额' }]"
        >
          <a-input-number
            v-model:value="editForm.shares"
            :min="0"
            :precision="4"
            style="width: 100%"
            placeholder="例如：1000.0000"
          />
        </a-form-item>
        <a-form-item label="首次买入时间" name="purchased_at">
          <a-date-picker
            v-model:value="editForm.purchased_at"
            show-time
            value-type="date"
            format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { message,Modal } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { fundApi } from '@/api/fund'
import { PlusOutlined, CheckOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import * as echarts from 'echarts'
import { onMounted, onUnmounted, nextTick } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
const router = useRouter()

const refreshLoading = ref(false)
// ✅ 添加这两个 ref 来跟踪当前排序状态
const sortField = ref('')      // 当前排序字段（前端 key，如 'holding_value'）
const sortOrder = ref('')      // 当前排序顺序（'ascend' | 'descend' | ''）

const handleRefresh = async () => {
  refreshLoading.value = true
  try {
    // 重新加载所有数据：持仓列表 + 历史趋势
    await Promise.all([
      loadHoldings(sortField.value, sortOrder.value), // 保持当前排序状态
      loadPortfolioHistory(30) // 重新加载30天历史
    ])

    // 可选：显示成功提示（如果数据有更新）
    // message.success('数据已刷新')
  } catch (error) {
    message.error('刷新失败，请重试')
    console.error('刷新错误:', error)
  } finally {
    refreshLoading.value = false
  }
}
// 账户汇总
const portfolioSummary = reactive({
  totalAsset: 0,
  totalProfit: 0,
  totalProfitRate: 0
})

// 历史数据
const portfolioHistory = ref([])
const chartRef = ref(null)
let chartInstance = null

const updateSummaryFromHistory = () => {
  const history = portfolioHistory.value
  if (history.length === 0) {
    // 如果无历史数据，可选择清零或保留原值
    portfolioSummary.totalAsset = 0
    portfolioSummary.totalProfit = 0
    portfolioSummary.totalProfitRate = 0
    return
  }

  // 取最后一条（最新日期）
  const latest = history[history.length - 1]
  portfolioSummary.totalAsset = latest.total_asset
  portfolioSummary.totalProfit = latest.total_profit
  portfolioSummary.totalProfitRate = latest.total_profit_rate
}


const loadPortfolioHistory = async (days = 30) => {
  try {
    const res = await fundApi.getPortfolioHistory(days)
    portfolioHistory.value = res.data || []
    await nextTick()

    // ✅ 关键：更新顶部卡片
    updateSummaryFromHistory()

    renderChart() // ✅ 无条件调用！让 renderChart 自己处理初始化
  } catch (error) {
    message.error('加载历史趋势失败')
    console.error(error)
    // 出错时也尝试渲染（显示 loading）
    renderChart()
  }
}

const renderChart = () => {
  if (!chartRef.value) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const data = portfolioHistory.value

  if (data.length === 0) {
    chartInstance.showLoading({
      text: '暂无历史数据',
      color: '#c0c0c0',
      textColor: '#999',
      maskColor: 'rgba(255, 255, 255, 0.8)'
    })
    return
  }

  chartInstance.hideLoading()


  const dates = data.map(d => d.date)
  const assets = data.map(d => d.total_asset)
  const profits = data.map(d => d.total_profit)
  const rates = data.map(d => d.total_profit_rate)

  chartInstance.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: params => {
        const date = params[0].axisValue
        let html = `${date}<br/>`
        params.forEach(p => {
          if (p.seriesName === '收益率') {
            html += `${p.marker} ${p.seriesName}: ${p.value}%<br/>`
          } else {
            html += `${p.marker} ${p.seriesName}: ¥${Number(p.value).toLocaleString()}<br/>`
          }
        })
        return html
      }
    },
    legend: {
      data: ['总资产', '总收益', '收益率'],
      bottom: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '18%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates
    },
    yAxis: [
      {
        type: 'value',
        name: '金额 (¥)',
        position: 'left',
        axisLine: { show: true },
        axisLabel: {
          formatter: value => `¥${value.toLocaleString()}`
        }
      },
      {
        type: 'value',
        name: '收益率 (%)',
        position: 'right',
        axisLine: { show: true },
        axisLabel: {
          formatter: '{value}%'
        }
      }
    ],
    series: [
      {
        name: '总资产',
        type: 'line',
        yAxisIndex: 0,
        data: assets,
        smooth: true,
        symbol: 'none'
      },
      {
        name: '总收益',
        type: 'line',
        yAxisIndex: 0,
        data: profits,
        smooth: true,
        symbol: 'none'
      },
      {
        name: '收益率',
        type: 'line',
        yAxisIndex: 1,
        data: rates,
        smooth: true,
        symbol: 'none'
      }
    ]
  })
}





// 分页状态
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const myHoldings = ref([])
const loading = ref(false)
const editModalVisible = ref(false)
const editing = ref(false)
const currentRecord = ref(null)

const editForm = reactive({
  fund_code: '',
  fund_name: '',
  cost_price: null,
  shares: null,
  purchased_at: null
})

// 可排序字段白名单（前端 key -> 后端字段名）
const SORTABLE_FIELDS = {
  daily_growth_rate: 'daily_growth_rate',
  cost_price: 'cost_price',
  shares: 'shares',
  total_cost: 'total_cost',
  profit: 'profit',
  profit_rate: 'profit_rate',
  holding_value: 'holding_value'
}

// 表格列定义
const columns = [
  { title: '自选', key: 'favorite', width: 80, align: 'center' },
  { title: '基金代码', dataIndex: 'fund_code', key: 'fund_code', align: 'center' },
  { title: '基金名称', dataIndex: 'fund_name', key: 'fund_name', align: 'center' },
  { title: '净值日期', dataIndex: 'net_value_date', key: 'net_value_date', align: 'center' },
  { title: '估算净值', dataIndex: 'estimated_nav', key: 'estimated_nav', align: 'center' },
  {
    title: '估算日增长率',
    dataIndex: 'daily_growth_rate',
    key: 'daily_growth_rate',
    align: 'center',
    sorter: true
  },
  {
    title: '持仓金额',
    dataIndex: 'holding_value',
    key: 'holding_value',
    align: 'center',
    sorter: true
  },
  {
    title: '持仓成本单价',
    dataIndex: 'cost_price',
    key: 'cost_price',
    align: 'center',
    sorter: true
  },
  {
    title: '持仓份额',
    dataIndex: 'shares',
    key: 'shares',
    align: 'center',
    sorter: true
  },
  {
    title: '持仓总成本',
    dataIndex: 'total_cost',
    key: 'total_cost',
    align: 'center',
    sorter: true
  },
  {
    title: '持有收益',
    dataIndex: 'profit',
    key: 'profit',
    align: 'center',
    sorter: true
  },
  {
    title: '持有收益率',
    dataIndex: 'profit_rate',
    key: 'profit_rate',
    align: 'center',
    sorter: true
  },
  { title: '上一交易日净值', dataIndex: 'last_nav', key: 'last_nav', align: 'center' },
  { title: '操作', key: 'action', fixed: 'right', width: 220, align: 'center' }
]

const loadHoldings = async (sortField = '', sortOrder = '') => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      page_size: pageSize.value
    }
    if (sortField && SORTABLE_FIELDS[sortField]) {
      params.sort_field = SORTABLE_FIELDS[sortField] // 如 'shares'
      params.sort_order = sortOrder === 'descend' ? 'desc' : 'asc'
    }

    console.log('【发送请求】', params) // 调试用

    const res = await fundApi.getMyHolding(params)
    const data = res.data
    myHoldings.value = data.items || []
    total.value = data.total || 0
  } catch (error) {
    message.error('加载持仓失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleTableChange = (pagination, filters, sorter) => {
  // 更新分页
  page.value = pagination.current
  pageSize.value = pagination.pageSize

  let currentSortField = ''
  let currentSortOrder = ''

  // ✅ 正确提取排序字段：使用 sorter.field（字符串）或 sorter.column.dataIndex
  if (sorter && sorter.field && typeof sorter.field === 'string') {
    const field = sorter.field.trim()
    if (field in SORTABLE_FIELDS) {
      currentSortField = field
      currentSortOrder = sorter.order || 'descend'
    }else {
    // ✅ 完全没有排序时，可以设置一个默认排序字段
    // 比如默认按持仓金额降序排列
    currentSortField = 'holding_value'
    currentSortOrder = 'descend'
    }
  }

  sortField.value = currentSortField
  sortOrder.value = currentSortOrder

  // ✅ 关键：把排序参数传给 loadHoldings！
  loadHoldings(currentSortField, currentSortOrder)
}

// 切换自选（带确认弹窗）
const toggleFavorite = async (record) => {
  const fundCode = record.fund_code
  const fundName = record.fund_name
  try {
    if (record.is_checked) {
      // 已在自选：弹出确认框
      const confirmed = await new Promise((resolve) => {
        Modal.confirm({
          title: '确认取消自选？',
          content: `确定要将基金 [${fundCode} ${fundName}] 从观察清单中移除吗？`,
          okText: '确定',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => resolve(true),
          onCancel: () => resolve(false)
        })
      })

      if (!confirmed) {
        return // 用户取消
      }

      // 调用移除接口
      await fundApi.removeFromStore(fundCode)
      message.success('已取消自选')
      record.is_checked = false
      await loadHoldings()
    } else {
      // 未在自选：直接加入
      await fundApi.addToStore(fundCode)
      message.success('已加入自选')
      record.is_checked = true
    }
  } catch (error) {
    message.error(record.is_checked ? '取消失败' : '加入失败')
    console.error(error)
  }
}

// 打开编辑弹窗
const openEditModal = (record) => {
  currentRecord.value = record
  editForm.fund_code = record.fund_code
  editForm.fund_name = record.fund_name
  editForm.cost_price = record.cost_price ?? 0
  editForm.shares = record.shares ?? 0

  let dateVal = null
  const raw = record.purchased_at
  if (typeof raw === 'string' && raw.trim() !== '') {
    const d = dayjs(raw)
    if (d.isValid()) {
      dateVal = d
    }
  }
  editForm.purchased_at = dateVal
  editModalVisible.value = true
}

// 确认编辑
const handleEditOk = async () => {
  if (!currentRecord.value) return
  editing.value = true
  try {
    const payload = { fund_code: editForm.fund_code }
    if (editForm.cost_price !== currentRecord.value.cost_price) {
      payload.cost_price = editForm.cost_price
    }
    if (editForm.shares !== currentRecord.value.shares) {
      payload.shares = editForm.shares
    }
    if (
      editForm.purchased_at &&
      editForm.purchased_at.toISOString() !== currentRecord.value.purchased_at
    ) {
      payload.purchased_at = editForm.purchased_at.toISOString()
    }
    await fundApi.updateMyHolding(payload)

    // 更新本地记录（即时反馈）
    Object.assign(currentRecord.value, {
      cost_price: editForm.cost_price,
      shares: editForm.shares,
      purchased_at: editForm.purchased_at?.toISOString()
    })

    message.success('修改成功')
    editModalVisible.value = false

    // ✅ 刷新数据：保持当前分页和排序
    // 从表格当前状态获取排序信息
    const tableRef = document.querySelector('.ant-table') // 无法直接获取 sorter，所以重新触发一次
    // 更简单方式：调用 loadHoldings 时传入当前排序（但需保存状态）

    // 由于我们没有全局保存 sorter，这里采用重新加载当前页（无排序）
    // 实际上，在 handleTableChange 中已经能正确处理，所以只需 reload 当前页
    await loadHoldings()
  } catch (error) {
    message.error('修改失败')
    console.error(error)
  } finally {
    editing.value = false
  }
}

const goToDetail = (fundCode) => {
  router.push(`/FundDetail/${fundCode}`)
}

const formatPercent = (value) => {
  if (value == null || value === '') return '--'
  return `${value.toFixed(2)}%`
}

const getGrowthColor = (value) => {
  if (value == null) return 'inherit'
  return value >= 0 ? '#f5222d' : '#52c41a' // 红涨绿跌
}

// 初始加载
// loadHoldings()
const loadData = async () => {
  await loadHoldings()
  loadPortfolioHistory(30) // 默认30天
}

onMounted(() => {
  sortField.value = 'holding_value'
  sortOrder.value = 'descend'

  loadData()
  window.addEventListener('resize', () => chartInstance?.resize())
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  window.removeEventListener('resize', () => chartInstance?.resize())
})


</script>


<style scoped>
.summary-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}
.summary-value {
  font-size: 20px;
  font-weight: bold;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.refresh-btn {
  margin-left: auto; /* 确保靠右 */
}
</style>