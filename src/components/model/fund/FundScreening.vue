<template>
  <div class="fund-screening">
    <a-row :gutter="16">
      <!-- 筛选条件面板 -->
      <a-col :xs="24" :lg="6">
        <a-card title="筛选条件" class="filter-card">
          <a-form :model="filterForm" layout="vertical">
            <a-form-item label="基金类型">
              <a-select 
                v-model:value="filterForm.fundType" 
                mode="multiple" 
                placeholder="选择基金类型"
              >
                <a-select-option value="股票型">股票型</a-select-option>
                <a-select-option value="混合型">混合型</a-select-option>
                <a-select-option value="债券型">债券型</a-select-option>
                <a-select-option value="指数型">指数型</a-select-option>
                <a-select-option value="货币型">货币型</a-select-option>
                <a-select-option value="QDII">QDII</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="基金名称/代码">
              <a-input 
                v-model:value="filterForm.keyword" 
                placeholder="输入基金名称或代码"
                allow-clear
              >
                <template #prefix>
                  <SearchOutlined />
                </template>
              </a-input>
            </a-form-item>

            <a-form-item label="年度收益率">
              <a-slider 
                v-model:value="filterForm.yearlyReturn" 
                range 
                :min="-50" 
                :max="200"
                :marks="{0: '0%', 100: '100%' }"
              />
            </a-form-item>

            <a-form-item label="周涨幅">
              <a-slider 
                v-model:value="filterForm.weeklyReturn" 
                range 
                :min="-20" 
                :max="50"
              />
            </a-form-item>

            <a-form-item label="月涨幅">
              <a-slider 
                v-model:value="filterForm.monthlyReturn" 
                range 
                :min="-30" 
                :max="100"
              />
            </a-form-item>

            <a-divider />

            <a-space direction="vertical" style="width: 100%">
              <a-button type="primary" block @click="applyFilter">
                <SearchOutlined /> 执行筛选
              </a-button>
              <a-button block @click="resetFilter">
                重置条件
              </a-button>
            </a-space>
          </a-form>

          <!-- 快捷筛选 -->
          <a-divider>快捷筛选</a-divider>
          <a-space wrap>
            <a-tag color="blue" @click="quickFilter('top performers')">
              🏆 年度收益>50%
            </a-tag>
            <a-tag color="green" @click="quickFilter('recent winners')">
              📈 本周上涨
            </a-tag>
            <a-tag color="orange" @click="quickFilter('my watchlist')">
              ⭐ 我的关注
            </a-tag>
            <a-tag color="purple" @click="quickFilter('my holdings')">
              💼 我的持仓
            </a-tag>
          </a-space>
        </a-card>
      </a-col>

      <!-- 筛选结果 -->
      <a-col :xs="24" :lg="18">
        <a-card 
          :title="`筛选结果 (${filteredFunds.length} 只基金)`" 
          class="result-card"
        >
          <template #extra>
            <a-space>
              <a-button 
                type="primary" 
                @click="batchAddToPool"
                :disabled="selectedRowKeys.length === 0"
              >
                加入备选池 ({{ selectedRowKeys.length }})
              </a-button>
              <a-button @click="exportResults">
                <ExportOutlined /> 导出
              </a-button>
            </a-space>
          </template>

          <a-table
            :data-source="paginatedFunds"
            :columns="columns"
            :row-selection="rowSelection"
            :pagination="pagination"
            :loading="loading"
            size="small"
            @change="handleTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'fund_name'">
                <div class="fund-name-cell">
                  <div class="fund-name">{{ record.fund_name }}</div>
                  <div class="fund-code">{{ record.fund_code }} | {{ record.fund_type }}</div>
                </div>
              </template>

              <template v-else-if="column.key === 'yearly_1_growth_rate'">
                <span :class="getRateClass(record.yearly_1_growth_rate)">
                  {{ formatRate(record.yearly_1_growth_rate) }}
                </span>
              </template>

              <template v-else-if="column.key === 'weekly_growth_rate'">
                <span :class="getRateClass(record.weekly_growth_rate)">
                  {{ formatRate(record.weekly_growth_rate) }}
                </span>
              </template>

              <template v-else-if="column.key === 'monthly_1_growth_rate'">
                <span :class="getRateClass(record.monthly_1_growth_rate)">
                  {{ formatRate(record.monthly_1_growth_rate) }}
                </span>
              </template>

              <template v-else-if="column.key === 'rank'">
                <a-tag :color="getRankColor(record.rank)">
                  {{ record.rank }}
                </a-tag>
              </template>

              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" size="small" @click="viewDetail(record)">
                    详情
                  </a-button>
                  <a-button type="link" size="small" @click="addSingleToPool(record)">
                    加入备选
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  SearchOutlined, ExportOutlined
} from '@ant-design/icons-vue'

const props = defineProps({
  fundList: {
    type: Array,
    default: () => []
  },
  fundRank: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select-fund', 'add-to-pool'])

// 筛选表单
const filterForm = ref({
  fundType: [],
  keyword: '',
  yearlyReturn: [-50, 200],
  weeklyReturn: [-20, 50],
  monthlyReturn: [-30, 100]
})

// 加载状态
const loading = ref(false)

// 表格选择
const selectedRowKeys = ref([])
const rowSelection = {
  selectedRowKeys,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  }
}

// 表格列定义
const columns = [
  {
    title: '排名',
    key: 'rank',
    width: 80,
    align: 'center'
  },
  {
    title: '基金名称',
    key: 'fund_name',
    width: 250
  },
  {
    title: '最新净值',
    dataIndex: 'net_value',
    key: 'net_value',
    width: 100,
    align: 'right'
  },
  {
    title: '日涨幅',
    dataIndex: 'daily_growth_rate',
    key: 'daily_growth_rate',
    width: 90,
    align: 'right'
  },
  {
    title: '周涨幅',
    key: 'weekly_growth_rate',
    width: 90,
    align: 'right'
  },
  {
    title: '月涨幅',
    key: 'monthly_1_growth_rate',
    width: 90,
    align: 'right'
  },
  {
    title: '年度收益',
    key: 'yearly_1_growth_rate',
    width: 100,
    align: 'right'
  },
  {
    title: '累计收益',
    dataIndex: 'since_inception_growth_rate',
    key: 'since_inception_growth_rate',
    width: 100,
    align: 'right'
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    align: 'center'
  }
]

// 分页
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`
})

// 合并基金列表和排名数据
const mergedFundData = computed(() => {
  // 直接使用 fundRank 作为数据源，因为它已经包含了所有需要的字段
  return props.fundRank.map(fund => ({
    ...fund,
    key: fund.fund_code
  }))
})

// 筛选后的基金
const filteredFunds = computed(() => {
  let result = mergedFundData.value

  // 按类型筛选
  if (filterForm.value.fundType.length > 0) {
    result = result.filter(fund => 
      filterForm.value.fundType.some(type => 
        fund.fund_type?.includes(type)
      )
    )
  }

  // 按关键词筛选
  if (filterForm.value.keyword) {
    const keyword = filterForm.value.keyword.toLowerCase()
    result = result.filter(fund => 
      fund.fund_name?.toLowerCase().includes(keyword) ||
      fund.fund_code?.includes(keyword)
    )
  }

  // 按年度收益筛选
  const [minYearly, maxYearly] = filterForm.value.yearlyReturn
  result = result.filter(fund => {
    const rate = parseFloat(fund.yearly_1_growth_rate) || 0
    return rate >= minYearly && rate <= maxYearly
  })

  // 按周涨幅筛选
  const [minWeekly, maxWeekly] = filterForm.value.weeklyReturn
  result = result.filter(fund => {
    const rate = parseFloat(fund.weekly_growth_rate) || 0
    return rate >= minWeekly && rate <= maxWeekly
  })

  // 按月涨幅筛选
  const [minMonthly, maxMonthly] = filterForm.value.monthlyReturn
  result = result.filter(fund => {
    const rate = parseFloat(fund.monthly_1_growth_rate) || 0
    return rate >= minMonthly && rate <= maxMonthly
  })

  return result
})

// 分页数据
const paginatedFunds = computed(() => {
  const start = (pagination.value.current - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return filteredFunds.value.slice(start, end)
})

// 监听筛选结果变化，更新分页
watch(filteredFunds, (newVal) => {
  pagination.value.total = newVal.length
  pagination.value.current = 1
}, { immediate: true })

// 应用筛选
function applyFilter() {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    message.success(`筛选完成，共找到 ${filteredFunds.value.length} 只基金`)
  }, 300)
}

// 重置筛选
function resetFilter() {
  filterForm.value = {
    fundType: [],
    keyword: '',
    yearlyReturn: [-50, 200],
    weeklyReturn: [-20, 50],
    monthlyReturn: [-30, 100]
  }
  applyFilter()
}

// 快捷筛选
function quickFilter(type) {
  switch (type) {
    case 'top performers':
      filterForm.value.yearlyReturn = [50, 200]
      break
    case 'recent winners':
      filterForm.value.weeklyReturn = [0, 50]
      break
    case 'my watchlist':
      // 这里需要结合 watchlist 数据
      message.info('我的关注筛选功能开发中')
      return
    case 'my holdings':
      // 这里需要结合 holdings 数据
      message.info('我的持仓筛选功能开发中')
      return
  }
  applyFilter()
}

// 批量添加到备选池
function batchAddToPool() {
  const selectedFunds = filteredFunds.value.filter(fund => 
    selectedRowKeys.value.includes(fund.key)
  )
  selectedFunds.forEach(fund => {
    emit('add-to-pool', fund)
  })
  selectedRowKeys.value = []
}

// 单个添加到备选池
function addSingleToPool(fund) {
  emit('add-to-pool', fund)
}

// 导出结果
function exportResults() {
  const csvContent = convertToCSV(filteredFunds.value)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = '筛选结果.csv'
  link.click()
  message.success('导出成功')
}

// 查看详情
function viewDetail(fund) {
  emit('select-fund', fund)
}

// 表格变化
function handleTableChange(paginationInfo) {
  pagination.value.current = paginationInfo.current
  pagination.value.pageSize = paginationInfo.pageSize
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

// 获取排名颜色
function getRankColor(rank) {
  const r = parseInt(rank)
  if (r <= 10) return 'gold'
  if (r <= 50) return 'red'
  if (r <= 100) return 'blue'
  return 'default'
}

// 转换为CSV
function convertToCSV(data) {
  if (data.length === 0) return ''
  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => row[h]).join(','))
  ].join('\n')
  return csv
}
</script>

<style scoped lang="less">
.fund-screening {
  .filter-card {
    height: 100%;
  }

  .result-card {
    min-height: 600px;
  }

  .fund-name-cell {
    .fund-name {
      font-weight: 500;
      font-size: 14px;
    }

    .fund-code {
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
}
</style>
