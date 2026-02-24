<template>
  <div class="stock-screening-pro">
    <a-row :gutter="16">
      <!-- 左侧：筛选面板 -->
      <a-col :xs="24" :lg="6">
        <a-affix :offsetTop="16">
          <!-- 快捷筛选 -->
          <a-card class="quick-filter-card" :bordered="false">
            <template #title>
              <span class="card-title">⚡ 快捷筛选</span>
            </template>
            <div class="quick-filters">
              <a-tag
                v-for="filter in quickFilters"
                :key="filter.key"
                :class="['filter-tag', { active: activeQuickFilter === filter.key }]"
                @click="applyQuickFilter(filter)"
              >
                <span class="filter-icon">{{ filter.icon }}</span>
                {{ filter.name }}
              </a-tag>
            </div>
          </a-card>

          <!-- 因子筛选 -->
          <a-card class="factor-filter-card" :bordered="false">
            <template #title>
              <span class="card-title">🎛️ 因子筛选</span>
              <a-button type="link" size="small" @click="resetFilters">重置</a-button>
            </template>
            
            <a-collapse v-model:activeKey="activeCategory">
              <a-collapse-panel
                v-for="(factors, catKey) in factorCategories"
                :key="catKey"
                :header="getCategoryName(catKey)"
              >
                <div
                  v-for="(config, factorKey) in factors"
                  :key="factorKey"
                  class="factor-item"
                >
                  <div class="factor-header">
                    <span class="factor-name">{{ getFactorName(catKey, factorKey) }}</span>
                  </div>
                  
                  <a-slider
                    v-model:value="factorValues[factorKey]"
                    range
                    :min="config.min"
                    :max="config.max"
                    @change="() => activeQuickFilter = ''"
                  />
                  
                  <div class="factor-range">
                    <span>{{ factorValues[factorKey][0] }}</span>
                    <span>~</span>
                    <span>{{ factorValues[factorKey][1] }}</span>
                    <span class="unit">{{ getFactorUnit(catKey, factorKey) }}</span>
                  </div>
                </div>
              </a-collapse-panel>
            </a-collapse>

            <!-- 操作按钮 -->
            <div class="filter-actions">
              <a-button type="primary" block @click="runScreening" :loading="loading">
                <SearchOutlined /> 执行筛选
              </a-button>
              <a-space style="margin-top: 8px; width: 100%">
                <a-button block @click="showSaveModal = true">保存策略</a-button>
                <a-button block @click="showLoadModal = true">加载策略</a-button>
              </a-space>
            </div>
          </a-card>
        </a-affix>
      </a-col>

      <!-- 右侧：结果区域 -->
      <a-col :xs="24" :lg="18">
        <!-- 统计信息栏 -->
        <a-card class="stats-card" :bordered="false">
          <a-row :gutter="16" align="middle">
            <a-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ pagination.total }}</div>
                <div class="stat-label">筛选结果</div>
              </div>
            </a-col>
            <a-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ tradeDate }}</div>
                <div class="stat-label">数据日期</div>
              </div>
            </a-col>
            <a-col :span="12" style="text-align: right;">
              <a-select v-model:value="sortConfig.field" style="width: 120px" @change="runScreening">
                <a-select-option value="change_20d">20日涨跌</a-select-option>
                <a-select-option value="pe">市盈率</a-select-option>
                <a-select-option value="market_cap">市值</a-select-option>
                <a-select-option value="roe">ROE</a-select-option>
              </a-select>
            </a-col>
          </a-row>
        </a-card>

        <!-- 结果表格 -->
        <a-card class="result-card" :bordered="false">
          <!-- 操作栏 -->
          <div class="table-toolbar">
            <a-space>
              <a-button 
                type="primary" 
                :disabled="selectedRowKeys.length === 0"
                @click="batchAddToWatchlist"
              >
                <template #icon><PlusOutlined /></template>
                加入自选 ({{ selectedRowKeys.length }})
              </a-button>
              <a-button @click="selectedRowKeys = []">
                清空选择
              </a-button>
            </a-space>
            <span class="result-count">共 {{ pagination.total }} 只股票</span>
          </div>
          <a-table
            :dataSource="stockList"
            :columns="columns"
            :pagination="pagination"
            :loading="loading"
            :row-selection="rowSelection"
            @change="handleTableChange"
            rowKey="stock_code"
            :scroll="{ x: 1200 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'stock_name'">
                <div class="stock-name-cell">
                  <span class="stock-name">{{ record.stock_name }}</span>
                  <span class="stock-code">{{ record.stock_code }}</span>
                </div>
              </template>
              
              <template v-else-if="column.key === 'change_percent'">
                <span :class="record.change_percent > 0 ? 'up' : record.change_percent < 0 ? 'down' : ''">
                  {{ formatChange(record.change_percent) }}
                </span>
              </template>
              
              <template v-else-if="column.key === 'roe'">
                {{ record.roe ? record.roe.toFixed(2) + '%' : '--' }}
              </template>
              
              <template v-else-if="column.key === 'market_cap'">
                {{ record.market_cap ? (record.market_cap / 10000).toFixed(0) + '亿' : '--' }}
              </template>
              
              <template v-else-if="column.key === 'action'">
                <a-button 
                  type="text" 
                  size="small" 
                  @click.stop="toggleWatchlist(record)"
                >
                  <template #icon>
                    <StarFilled v-if="watchlistCodes.has(record.stock_code)" style="color: #faad14" />
                    <StarOutlined v-else />
                  </template>
                </a-button>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <!-- 保存策略弹窗 -->
    <a-modal v-model:open="showSaveModal" title="保存筛选策略" @ok="saveStrategy">
      <a-form :model="saveForm" layout="vertical">
        <a-form-item label="策略名称" required>
          <a-input v-model:value="saveForm.name" placeholder="输入策略名称" />
        </a-form-item>
        <a-form-item label="策略描述">
          <a-textarea v-model:value="saveForm.description" placeholder="输入策略描述" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 加载策略弹窗 -->
    <a-modal v-model:open="showLoadModal" title="加载筛选策略" :footer="null">
      <a-list :dataSource="savedStrategies" bordered>
        <template #renderItem="{ item }">
          <a-list-item>
            <div class="strategy-item">
              <div>
                <div class="strategy-name">{{ item.name }}</div>
                <div class="strategy-desc">{{ item.description || '无描述' }}</div>
              </div>
              <a-space>
                <a-button type="primary" size="small" @click="loadStrategy(item)">加载</a-button>
                <a-button danger size="small" @click="deleteStrategy(item.id)">删除</a-button>
              </a-space>
            </div>
          </a-list-item>
        </template>
      </a-list>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, StarOutlined, StarFilled, PlusOutlined } from '@ant-design/icons-vue'
import { stockFactorApi } from '@/api/stockFactor'
import { stockApi } from '@/api/stock'

// 响应式数据
const loading = ref(false)
const factorCategories = ref({})
const quickFilters = ref([])
const stockList = ref([])
const tradeDate = ref('')
const activeQuickFilter = ref('')
const activeCategory = ref(['valuation'])
const showSaveModal = ref(false)
const showLoadModal = ref(false)
const savedStrategies = ref([])

// 自选相关
const selectedRowKeys = ref([])
const watchlistCodes = ref(new Set())
const watchlistLoading = ref(false)

// 因子值
const factorValues = reactive({})

// 排序配置
const sortConfig = reactive({
  field: 'change_20d'
})

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['20', '50', '100'],
  showTotal: (total) => `共 ${total} 条`
})

// 保存表单
const saveForm = reactive({
  name: '',
  description: ''
})

// 表格列定义
const columns = [
  { title: '', key: 'selection', width: 50 },
  { title: '股票', key: 'stock_name', width: 140, fixed: 'left' },
  { title: '最新价', dataIndex: 'latest_price', key: 'latest_price', width: 90, align: 'right',
    customRender: ({ text }) => text ? text.toFixed(2) : '--' },
  { title: '涨跌幅', key: 'change_percent', width: 100, align: 'right' },
  { title: 'PE', dataIndex: 'pe', key: 'pe', width: 80, align: 'right',
    customRender: ({ text }) => text ? text.toFixed(2) : '--' },
  { title: 'PB', dataIndex: 'pb', key: 'pb', width: 80, align: 'right',
    customRender: ({ text }) => text ? text.toFixed(2) : '--' },
  { title: 'ROE', key: 'roe', width: 80, align: 'right' },
  { title: '市值', key: 'market_cap', width: 100, align: 'right' },
  { title: '操作', key: 'action', width: 80, fixed: 'right' }
]

// 行选择配置
const rowSelection = ref({
  selectedRowKeys: selectedRowKeys,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  }
})

// 因子名称映射
const factorNames = {
  valuation: { pe: '市盈率PE', pb: '市净率PB', ps: '市销率PS' },
  momentum: { change_5d: '5日涨跌', change_20d: '20日涨跌', change_60d: '60日涨跌', turnover_rate: '换手率' },
  quality: { roe: 'ROE', gross_margin: '毛利率', net_profit_margin: '净利率' },
  growth: { revenue_growth: '营收增长', profit_growth: '利润增长' },
  scale: { market_cap: '总市值', circulating_cap: '流通市值' }
}

// 因子单位映射
const factorUnits = {
  valuation: { pe: '倍', pb: '倍', ps: '倍' },
  momentum: { change_5d: '%', change_20d: '%', change_60d: '%', turnover_rate: '%' },
  quality: { roe: '%', gross_margin: '%', net_profit_margin: '%' },
  growth: { revenue_growth: '%', profit_growth: '%' },
  scale: { market_cap: '亿', circulating_cap: '亿' }
}

const categoryNames = {
  valuation: '💰 估值因子',
  momentum: '🚀 动量因子',
  quality: '💎 质量因子',
  growth: '🌱 成长因子',
  scale: '📊 规模因子'
}

const getCategoryName = (key) => categoryNames[key] || key
const getFactorName = (catKey, factorKey) => factorNames[catKey]?.[factorKey] || factorKey
const getFactorUnit = (catKey, factorKey) => factorUnits[catKey]?.[factorKey] || ''

// 初始化因子值
const initFactorValues = () => {
  Object.entries(factorCategories.value).forEach(([catKey, factors]) => {
    Object.entries(factors).forEach(([factorKey, config]) => {
      factorValues[factorKey] = config.default || [config.min, config.max]
    })
  })
}

const applyQuickFilter = (filter) => {
  activeQuickFilter.value = filter.key
  Object.entries(filter.factors).forEach(([key, range]) => {
    if (factorValues[key] !== undefined) {
      factorValues[key] = range
    }
  })
  runScreening()
}

const resetFilters = () => {
  activeQuickFilter.value = ''
  initFactorValues()
  runScreening()
}

const runScreening = async () => {
  loading.value = true
  try {
    const filters = {}
    Object.entries(factorValues).forEach(([key, value]) => {
      if (value && value.length === 2) {
        filters[key] = value
      }
    })
    
    const res = await stockFactorApi.screenStocks({
      filters,
      sortBy: sortConfig.field,
      page: pagination.current,
      pageSize: pagination.pageSize
    })
    
    if (res.success && res.data) {
      stockList.value = res.data.list || []
      pagination.total = res.data.total || 0
      tradeDate.value = res.data.tradeDate || ''
    } else {
      message.error(res.message || '筛选失败')
    }
  } catch (error) {
    message.error('筛选失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  runScreening()
}

const saveStrategy = async () => {
  if (!saveForm.name) {
    message.warning('请输入策略名称')
    return
  }
  
  try {
    const filters = {}
    Object.entries(factorValues).forEach(([key, value]) => {
      if (value && value.length === 2) {
        filters[key] = value
      }
    })
    
    const res = await stockFactorApi.saveStrategy({
      name: saveForm.name,
      description: saveForm.description,
      factors: filters
    })
    
    if (res.success) {
      message.success('策略保存成功')
      showSaveModal.value = false
      saveForm.name = ''
      saveForm.description = ''
      loadSavedStrategies()
    }
  } catch (error) {
    message.error('保存失败: ' + error.message)
  }
}

const loadSavedStrategies = async () => {
  try {
    const res = await stockFactorApi.getStrategies()
    if (res.success) {
      savedStrategies.value = res.data
    }
  } catch (error) {
    console.error('加载策略失败:', error)
  }
}

const loadStrategy = (strategy) => {
  const factors = strategy.factors?.factors || {}
  Object.entries(factors).forEach(([key, range]) => {
    if (factorValues[key] !== undefined) {
      factorValues[key] = range
    }
  })
  showLoadModal.value = false
  runScreening()
  message.success(`已加载策略: ${strategy.name}`)
}

const deleteStrategy = async (id) => {
  try {
    const res = await stockFactorApi.deleteStrategy(id)
    if (res.success) {
      message.success('删除成功')
      loadSavedStrategies()
    }
  } catch (error) {
    message.error('删除失败: ' + error.message)
  }
}

const formatChange = (val) => {
  if (val === null || val === undefined) return '--'
  const sign = val > 0 ? '+' : ''
  return `${sign}${Number(val).toFixed(2)}%`
}

// 加载自选列表
const loadWatchlist = async () => {
  try {
    const res = await stockApi.getStockWatchlist()
    if (res.success && res.data) {
      watchlistCodes.value = new Set(res.data.map(item => item.stock_code))
    }
  } catch (e) {
    console.error('加载自选失败:', e)
  }
}

// 切换自选状态
const toggleWatchlist = async (record) => {
  const code = record.stock_code
  try {
    if (watchlistCodes.value.has(code)) {
      await stockApi.removeFromWatchlist(code)
      watchlistCodes.value.delete(code)
      message.success('已移除自选')
    } else {
      await stockApi.addToWatchlist({
        stock_code: code,
        stock_name: record.stock_name
      })
      watchlistCodes.value.add(code)
      message.success('已加入自选')
    }
    // 触发响应式更新
    watchlistCodes.value = new Set(watchlistCodes.value)
  } catch (e) {
    message.error('操作失败: ' + e.message)
  }
}

// 批量加入自选
const batchAddToWatchlist = async () => {
  if (selectedRowKeys.value.length === 0) return
  
  watchlistLoading.value = true
  let successCount = 0
  
  for (const code of selectedRowKeys.value) {
    if (!watchlistCodes.value.has(code)) {
      const stock = stockList.value.find(s => s.stock_code === code)
      try {
        await stockApi.addToWatchlist({
          stock_code: code,
          stock_name: stock?.stock_name || ''
        })
        watchlistCodes.value.add(code)
        successCount++
      } catch (e) {
        console.error(`添加 ${code} 失败:`, e)
      }
    }
  }
  
  watchlistCodes.value = new Set(watchlistCodes.value)
  selectedRowKeys.value = []
  watchlistLoading.value = false
  message.success(`成功加入 ${successCount} 只股票到自选`)
}

// 生命周期
onMounted(async () => {
  // 加载自选列表
  await loadWatchlist()
  
  // 加载因子定义
  const factorRes = await stockFactorApi.getFactors()
  if (factorRes.success) {
    factorCategories.value = factorRes.data
    initFactorValues()
  }
  
  // 加载快捷筛选
  const quickRes = await stockFactorApi.getQuickFilters()
  if (quickRes.success) {
    quickFilters.value = quickRes.data
  }
  
  // 加载保存的策略
  loadSavedStrategies()
  
  // 执行初始筛选
  runScreening()
})
</script>

<style scoped lang="less">
.stock-screening-pro {
  padding: 16px;
  background: #f5f5f5;
  min-height: 100vh;

  .card-title {
    font-weight: 600;
    font-size: 15px;
  }

  .quick-filter-card {
    margin-bottom: 16px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);

    :deep(.ant-card-head) {
      background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
      border-radius: 8px 8px 0 0;
    }

    :deep(.ant-card-head-title) {
      color: white;
    }

    .quick-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .filter-tag {
        cursor: pointer;
        padding: 6px 14px;
        border-radius: 20px;
        transition: all 0.3s;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        &.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: transparent;
        }

        .filter-icon {
          margin-right: 4px;
        }
      }
    }
  }

  .factor-filter-card {
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);

    :deep(.ant-card-head) {
      background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
      border-radius: 8px 8px 0 0;
    }

    :deep(.ant-card-head-title) {
      color: white;
    }

    .factor-item {
      margin-bottom: 16px;
      padding: 12px;
      background: #fafafa;
      border-radius: 8px;
      transition: all 0.3s;
      border: 1px solid #f0f0f0;

      &:hover {
        background: #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .factor-header {
        margin-bottom: 8px;

        .factor-name {
          font-weight: 500;
          font-size: 13px;
          color: #333;
        }
      }

      .factor-range {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        font-size: 12px;
        color: #666;

        .unit {
          margin-left: 4px;
        }
      }
    }

    .filter-actions {
      margin-top: 16px;
    }
  }

  .stats-card {
    margin-bottom: 16px;

    .stat-item {
      text-align: center;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      color: white;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
      }

      .stat-value {
        font-size: 28px;
        font-weight: 700;
        color: white;
      }

      .stat-label {
        font-size: 13px;
        color: rgba(255,255,255,0.9);
        margin-top: 4px;
      }
    }
  }

  .result-card {
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);

    :deep(.ant-card-head) {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      border-radius: 8px 8px 0 0;
    }

    :deep(.ant-card-head-title) {
      color: white;
      font-weight: 600;
    }

    .table-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f0f0f0;
      
      .result-count {
        color: #666;
        font-size: 14px;
      }
    }
    
    .stock-name-cell {
      .stock-name {
        font-weight: 500;
        display: block;
      }

      .stock-code {
        font-size: 12px;
        color: #999;
      }
    }

    .up {
      color: #ff4d4f;
    }

    .down {
      color: #52c41a;
    }
  }

  .strategy-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;

    .strategy-name {
      font-weight: 500;
    }

    .strategy-desc {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
  }
}
</style>
