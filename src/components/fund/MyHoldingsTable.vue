<!-- src/components/fund/MyHoldingsTable.vue -->
<template>
  <div>
    <a-alert
      message="提示：编辑持仓后点击“保存”生效"
      type="info"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-table
      :data-source="myHoldings"
      :columns="columns"
      :loading="loading"
      :row-key="record => record.fund_code"
    >
      <!-- 编辑单元格 -->
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'cost_price'">
          <a-input-number
            v-model:value="record.cost_price"
            :min="0"
            :precision="4"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'shares'">
          <a-input-number
            v-model:value="record.shares"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button
            size="small"
            type="link"
            @click="goToDetail(record.fund_code)"
          >
            查看详情
          </a-button>
          <a-popconfirm
            title="确定要删除吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="deleteHolding(record.fund_code, index)"
          >
            <a-button size="small" type="link" danger>删除</a-button>
          </a-popconfirm>
        </template>

        <!-- 格式化收益率 -->
        <template v-else-if="column.key === 'return_rate'">
          <span :style="{ color: getGrowthColor(record.return_rate) }">
            {{ formatPercent(record.return_rate) }}
          </span>
        </template>
      </template>
    </a-table>

    <!-- 保存按钮 -->
    <a-button
      type="primary"
      :loading="saving"
      style="margin-top: 16px"
      @click="saveHoldings"
    >
      保存修改
    </a-button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { fundApi } from '@/api/fund'

const router = useRouter()

const myHoldings = ref([])
const loading = ref(false)
const saving = ref(false)

// 表格列
const columns = [
  { title: '基金代码', dataIndex: 'fund_code', key: 'fund_code' },
  { title: '基金名称', dataIndex: 'fund_name', key: 'fund_name' },
  { title: '成本价', key: 'cost_price', width: 120 },
  { title: '持有份额', key: 'shares', width: 120 },
  { title: '当前净值', dataIndex: 'current_net_value', key: 'current_net_value' },
  { title: '收益率', key: 'return_rate', width: 100 },
  { title: '操作', key: 'action', fixed: 'right', width: 150 }
]

// 加载我的持仓
const loadHoldings = async () => {
  loading.value = true
  try {
    const res = await fundApi.getMyStore() // 假设你有这个接口
    myHoldings.value = res.data.funds || []
  } catch (error) {
    message.error('加载持仓失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 删除持仓
const deleteHolding = async (fundCode, index) => {
  try {
    await fundApi.deleteFromStore(fundCode)
    myHoldings.value.splice(index, 1)
    message.success('删除成功')
  } catch (error) {
    message.error('删除失败')
    console.error(error)
  }
}

// 保存修改
const saveHoldings = async () => {
  if (myHoldings.value.length === 0) return

  saving.value = true
  try {
    // 构造更新数据
    const updateData = myHoldings.value.map(item => ({
      fund_code: item.fund_code,
      cost_price: item.cost_price,
      shares: item.shares
    }))
    await fundApi.updateMyStore(updateData)
    message.success('保存成功')
  } catch (error) {
    message.error('保存失败')
    console.error(error)
  } finally {
    saving.value = false
  }
}

const goToDetail = (fundCode) => {
  router.push(`/FundDetail/${fundCode}`)
}

const formatPercent = (value) => {
  if (value == null) return '--'
  return `${(value * 100).toFixed(2)}%`
}

const getGrowthColor = (value) => {
  if (value == null) return 'inherit'
  return value >= 0 ? '#f5222d' : '#52c41a'
}

onMounted(() => {
  loadHoldings()
})
</script>