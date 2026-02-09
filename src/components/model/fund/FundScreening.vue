<template>
  <div class="fund-screening">
    <a-row :gutter="16">
      <!-- 左侧：筛选条件 + 备选池 -->
      <a-col :xs="24" :lg="6">
        <a-row :gutter="[0, 16]">
          <!-- 筛选条件面板 -->
          <a-col :span="24">
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

                <a-form-item label="排名比例">
                  <a-slider 
                    v-model:value="filterForm.rankRatio" 
                    range 
                    :min="0" 
                    :max="100"
                    :marks="{0: '0%', 50: '50%', 100: '100%' }"
                    :tip-formatter="(val) => val + '%'"
                  />
                  <div class="slider-label">
                    前 {{ filterForm.rankRatio[1] }}% 的基金
                  </div>
                </a-form-item>

                <a-form-item label="周涨幅">
                  <a-slider 
                    v-model:value="filterForm.weeklyReturn" 
                    range 
                    :min="ranges.weekly.min" 
                    :max="ranges.weekly.max"
                  />
                  <div class="slider-label">
                    {{ filterForm.weeklyReturn[0] }}% ~ {{ filterForm.weeklyReturn[1] }}%
                  </div>
                </a-form-item>

                <a-form-item label="月涨幅">
                  <a-slider 
                    v-model:value="filterForm.monthlyReturn" 
                    range 
                    :min="ranges.monthly.min" 
                    :max="ranges.monthly.max"
                  />
                  <div class="slider-label">
                    {{ filterForm.monthlyReturn[0] }}% ~ {{ filterForm.monthlyReturn[1] }}%
                  </div>
                </a-form-item>

                <a-form-item label="年度收益率">
                  <a-slider 
                    v-model:value="filterForm.yearlyReturn" 
                    range 
                    :min="ranges.yearly.min" 
                    :max="ranges.yearly.max"
                  />
                  <div class="slider-label">
                    {{ filterForm.yearlyReturn[0] }}% ~ {{ filterForm.yearlyReturn[1] }}%
                  </div>
                </a-form-item>

                <a-divider />

                <a-space direction="vertical" style="width: 100%">
                  <a-button type="primary" block @click="applyFilter" :loading="loading">
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
                <a-tag color="blue" @click="quickFilter('top_performers')">
                  🏆 年度收益>50%
                </a-tag>
                <a-tag color="green" @click="quickFilter('recent_winners')">
                  📈 本周上涨
                </a-tag>
                <a-tag color="orange" @click="quickFilter('my_watchlist')">
                  ⭐ 我的关注
                </a-tag>
                <a-tag color="purple" @click="quickFilter('my_holdings')">
                  💼 我的持仓
                </a-tag>
              </a-space>
            </a-card>
          </a-col>

          <!-- 备选池面板 -->
          <a-col :span="24">
            <a-card 
              title="🎯 备选池" 
              class="pool-card"
              :body-style="{ padding: '12px' }"
            >
              <template #extra>
                <a-space>
                  <a-tag color="blue">{{ fundPool.length }} 只</a-tag>
                  <a-button 
                    v-if="fundPool.length > 0"
                    type="link" 
                    danger 
                    size="small"
                    @click="clearPool"
                  >
                    清空
                  </a-button>
                </a-space>
              </template>

              <div v-if="fundPool.length === 0" class="pool-empty">
                <InboxOutlined class="empty-icon" />
                <p>暂无备选基金</p>
                <span class="empty-hint">从右侧筛选结果中添加</span>
              </div>

              <div v-else class="pool-list">
                <div 
                  v-for="fund in fundPool" 
                  :key="fund.fund_code"
                  class="pool-item"
                >
                  <div class="pool-item-info">
                    <div class="pool-item-name" :title="fund.fund_name">
                      {{ fund.fund_name }}
                    </div>
                    <div class="pool-item-code">
                      {{ fund.fund_code }} 
                      <span :class="getRateClass(fund.yearly_1_growth_rate)">
                        {{ formatRate(fund.yearly_1_growth_rate) }}
                      </span>
                    </div>
                  </div>
                  <a-button 
                    type="text" 
                    danger 
                    size="small"
                    class="pool-item-remove"
                    @click="removeFromPool(fund.fund_code)"
                  >
                    <CloseOutlined />
                  </a-button>
                </div>
              </div>

              <!-- 批量操作按钮 -->
              <div v-if="fundPool.length > 0" class="pool-actions">
                <a-button 
                  type="primary" 
                  block 
                  size="small"
                  @click="goToAnalysis"
                >
                  <BarChartOutlined /> 指标分析
                </a-button>
                <a-button 
                  block 
                  size="small"
                  style="margin-top: 8px"
                  @click="goToPortfolio"
                >
                  <PieChartOutlined /> 组合构建
                </a-button>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </a-col>

      <!-- 右侧：筛选结果 -->
      <a-col :xs="24" :lg="18">
        <a-card 
          :title="`筛选结果 (${pagination.total} 只基金)`" 
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
            :data-source="fundList"
            :columns="columns"
            :row-selection="rowSelection"
            :pagination="pagination"
            :loading="loading"
            size="small"
            @change="handleTableChange"
            row-key="fund_code"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'fund_name'">
                <div class="fund-name-cell">
                  <div class="fund-name">{{ record.fund_name }}</div>
                  <div class="fund-code">{{ record.fund_code }} | {{ record.fund_type || '混合型' }}</div>
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

              <template v-else-if="column.key === 'daily_growth_rate'">
                <span :class="getRateClass(record.daily_growth_rate)">
                  {{ formatRate(record.daily_growth_rate) }}
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
                  <a-button 
                    type="link" 
                    size="small" 
                    @click="addSingleToPool(record)"
                    :disabled="isInPool(record.fund_code)"
                  >
                    {{ isInPool(record.fund_code) ? '已添加' : '加入备选' }}
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
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  SearchOutlined, ExportOutlined, CloseOutlined, 
  InboxOutlined, BarChartOutlined, PieChartOutlined
} from '@ant-design/icons-vue'
import { fundScreeningApi } from '@/api/fundModel.js'

const props = defineProps({
  fundPool: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select-fund', 'add-to-pool', 'remove-from-pool', 'clear-pool', 'go-to-tab'])

// 动态范围数据
const ranges = ref({
  weekly: { min: -20, max: 50, default_min: -20, default_max: 50 },
  monthly: { min: -30, max: 100, default_min: -30, default_max: 100 },
  yearly: { min: -50, max: 200, default_min: -50, default_max: 200 },
  rankRatio: { min: 0, max: 100, default_min: 0, default_max: 20 }
})

// 筛选表单 - 默认全范围（加载全部基金）
const filterForm = ref({
  fundType: [],
  keyword: '',
  rankRatio: [0, 100],
  weeklyReturn: [-100, 100],
  monthlyReturn: [-100, 200],
  yearlyReturn: [-100, 300]
})

// 基金列表数据
const fundList = ref([])

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
    dataIndex: 'rank',
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
    title: '操作',
    key: 'action',
    width: 120,
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

// 检查基金是否已在备选池
function isInPool(fundCode) {
  return props.fundPool.some(f => f.fund_code === fundCode)
}

// 加载筛选范围
async function loadRanges() {
  try {
    const response = await fundScreeningApi.getScreenRanges()
    if (response.success) {
      ranges.value = response.data
      // 设置为全范围（加载全部基金）
      filterForm.value.rankRatio = [0, 100]
      filterForm.value.weeklyReturn = [response.data.weekly.min, response.data.weekly.max]
      filterForm.value.monthlyReturn = [response.data.monthly.min, response.data.monthly.max]
      filterForm.value.yearlyReturn = [response.data.yearly.min, response.data.yearly.max]
    }
  } catch (error) {
    console.error('加载筛选范围失败:', error)
  }
}

// 构建查询参数
function buildQueryParams() {
  const params = {
    page: pagination.value.current,
    page_size: pagination.value.pageSize
  }

  if (filterForm.value.fundType.length > 0) {
    params.fund_types = filterForm.value.fundType.join(',')
  }

  if (filterForm.value.keyword) {
    params.keyword = filterForm.value.keyword
  }

  const [minRankRatio, maxRankRatio] = filterForm.value.rankRatio
  params.min_rank_ratio = minRankRatio
  params.max_rank_ratio = maxRankRatio

  const [minWeekly, maxWeekly] = filterForm.value.weeklyReturn
  params.min_weekly_return = minWeekly
  params.max_weekly_return = maxWeekly

  const [minMonthly, maxMonthly] = filterForm.value.monthlyReturn
  params.min_monthly_return = minMonthly
  params.max_monthly_return = maxMonthly

  const [minYearly, maxYearly] = filterForm.value.yearlyReturn
  params.min_yearly_return = minYearly
  params.max_yearly_return = maxYearly

  return params
}

// 加载基金数据
async function loadFunds() {
  loading.value = true
  try {
    const params = buildQueryParams()
    const response = await fundScreeningApi.screenFunds(params)
    
    if (response.success) {
      fundList.value = response.data.items.map(item => ({
        ...item,
        key: item.fund_code
      }))
      pagination.value.total = response.data.total
    } else {
      message.error(response.message || '加载数据失败')
    }
  } catch (error) {
    console.error('加载基金数据失败:', error)
    message.error('加载数据失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 应用筛选
async function applyFilter() {
  pagination.value.current = 1
  await loadFunds()
  message.success(`筛选完成，共找到 ${pagination.value.total} 只基金`)
}

// 重置筛选
async function resetFilter() {
  filterForm.value = {
    fundType: [],
    keyword: '',
    rankRatio: [0, 100],
    weeklyReturn: [ranges.value.weekly.min, ranges.value.weekly.max],
    monthlyReturn: [ranges.value.monthly.min, ranges.value.monthly.max],
    yearlyReturn: [ranges.value.yearly.min, ranges.value.yearly.max]
  }
  await applyFilter()
}

// 快捷筛选
async function quickFilter(type) {
  loading.value = true
  try {
    const response = await fundScreeningApi.quickFilter(type, {
      page: 1,
      page_size: pagination.value.pageSize
    })
    
    if (response.success) {
      fundList.value = response.data.items.map(item => ({
        ...item,
        key: item.fund_code
      }))
      pagination.value.total = response.data.total
      pagination.value.current = 1
      message.success(`${type} 筛选完成，共找到 ${response.data.total} 只基金`)
    } else {
      message.error(response.message || '快捷筛选失败')
    }
  } catch (error) {
    console.error('快捷筛选失败:', error)
    message.error('快捷筛选失败')
  } finally {
    loading.value = false
  }
}

// 批量添加到备选池
function batchAddToPool() {
  const selectedFunds = fundList.value.filter(fund => 
    selectedRowKeys.value.includes(fund.fund_code)
  )
  let addedCount = 0
  let duplicateCount = 0
  
  selectedFunds.forEach(fund => {
    if (!isInPool(fund.fund_code)) {
      emit('add-to-pool', fund)
      addedCount++
    } else {
      duplicateCount++
    }
  })
  
  selectedRowKeys.value = []
  
  if (addedCount > 0) {
    message.success(`已成功添加 ${addedCount} 只基金到备选池`)
  }
  if (duplicateCount > 0) {
    message.warning(`${duplicateCount} 只基金已在备选池中`)
  }
}

// 单个添加到备选池
function addSingleToPool(fund) {
  if (isInPool(fund.fund_code)) {
    message.warning('该基金已在备选池中')
    return
  }
  emit('add-to-pool', fund)
  message.success(`${fund.fund_name} 已加入备选池`)
}

// 从备选池移除
function removeFromPool(fundCode) {
  emit('remove-from-pool', fundCode)
  message.success('已从备选池移除')
}

// 清空备选池
function clearPool() {
  emit('clear-pool')
  message.success('备选池已清空')
}

// 跳转到指标分析
function goToAnalysis() {
  emit('go-to-tab', 'analysis')
}

// 跳转到组合构建
function goToPortfolio() {
  emit('go-to-tab', 'portfolio')
}

// 导出结果
function exportResults() {
  const params = buildQueryParams()
  fundScreeningApi.exportFunds(params)
  message.success('导出任务已启动')
}

// 查看详情
function viewDetail(fund) {
  emit('select-fund', fund)
}

// 表格变化
function handleTableChange(paginationInfo) {
  pagination.value.current = paginationInfo.current
  pagination.value.pageSize = paginationInfo.pageSize
  loadFunds()
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

// 组件挂载时加载数据
onMounted(async () => {
  await loadRanges()
  await loadFunds()
})
</script>

<style scoped lang="less">
.fund-screening {
  .filter-card {
    height: 100%;
  }

  .pool-card {
    .pool-empty {
      text-align: center;
      padding: 24px 0;
      color: #bfbfbf;

      .empty-icon {
        font-size: 48px;
        margin-bottom: 8px;
      }

      p {
        margin: 0;
        font-size: 14px;
      }

      .empty-hint {
        font-size: 12px;
      }
    }

    .pool-list {
      max-height: 400px;
      overflow-y: auto;

      .pool-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        margin-bottom: 8px;
        background: #f6ffed;
        border-radius: 4px;
        border: 1px solid #b7eb8f;

        &:last-child {
          margin-bottom: 0;
        }

        .pool-item-info {
          flex: 1;
          min-width: 0;
          margin-right: 8px;

          .pool-item-name {
            font-size: 13px;
            font-weight: 500;
            color: #262626;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .pool-item-code {
            font-size: 12px;
            color: #8c8c8c;
            margin-top: 2px;
          }
        }

        .pool-item-remove {
          padding: 0 4px;
          opacity: 0.6;

          &:hover {
            opacity: 1;
          }
        }
      }
    }

    .pool-actions {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed #d9d9d9;
    }
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

  .slider-label {
    font-size: 12px;
    color: #8c8c8c;
    margin-top: 4px;
    text-align: center;
  }
}
</style>