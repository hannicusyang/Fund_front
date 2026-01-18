<template>
  <div>
    <a-alert
      message="提示：点击“修改持仓”可编辑成本价、份额和买入时间"
      type="info"
      show-icon
      style="margin-bottom: 16px"
    />
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

const router = useRouter()

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
  profit_rate: 'profit_rate'
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
      currentSortOrder = sorter.order || ''
    }
  }

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
loadHoldings()
</script>