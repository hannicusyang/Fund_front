<template>
  <div class="stock-screening-container">
    <!-- 因子选择区域 -->
    <a-card title="📊 多因子选股模型" class="factor-card">
      <a-tabs v-model:activeKey="activeTab" size="small">
        
        <!-- 估值因子 -->
        <a-tab-pane key="valuation" tab="💰 估值">
          <a-row :gutter="[16, 16]">
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="市盈率 PE">
                <a-slider v-model:value="factors.valuation.pe" range :min="0" :max="200" :marks="peMarks" />
                <div class="range-display">{{ factors.valuation.pe[0] }} - {{ factors.valuation.pe[1] }}</div>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="市净率 PB">
                <a-slider v-model:value="factors.valuation.pb" range :min="0" :max="50" :marks="pbMarks" />
                <div class="range-display">{{ factors.valuation.pb[0] }} - {{ factors.valuation.pb[1] }}</div>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="总市值 (亿元)">
                <a-slider v-model:value="factors.valuation.market_cap" range :min="0" :max="5000" :marks="{0:'0',1000:'1000',5000:'5000'}" />
                <div class="range-display">{{ factors.valuation.market_cap[0] }} - {{ factors.valuation.market_cap[1] }} 亿</div>
              </a-form-item>
            </a-col>
          </a-row>
        </a-tab-pane>

        <!-- 动量因子 -->
        <a-tab-pane key="momentum" tab="🚀 动量">
          <a-row :gutter="[16, 16]">
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="当日涨跌幅 (%)">
                <a-slider v-model:value="factors.momentum.change_percent" range :min="-50" :max="50" :marks="changeMarks" />
                <div class="range-display">{{ factors.momentum.change_percent[0] }}% - {{ factors.momentum.change_percent[1] }}%</div>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="5日涨跌幅 (%)">
                <a-slider v-model:value="factors.momentum.change_5d" range :min="-50" :max="50" :marks="changeMarks" />
                <div class="range-display">{{ factors.momentum.change_5d[0] }}% - {{ factors.momentum.change_5d[1] }}%</div>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="10日涨跌幅 (%)">
                <a-slider v-model:value="factors.momentum.change_10d" range :min="-80" :max="80" :marks="changeMarks" />
                <div class="range-display">{{ factors.momentum.change_10d[0] }}% - {{ factors.momentum.change_10d[1] }}%</div>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="20日涨跌幅 (%)">
                <a-slider v-model:value="factors.momentum.change_20d" range :min="-80" :max="80" :marks="changeMarks" />
                <div class="range-display">{{ factors.momentum.change_20d[0] }}% - {{ factors.momentum.change_20d[1] }}%</div>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="60日涨跌幅 (%)">
                <a-slider v-model:value="factors.momentum.change_60d" range :min="-100" :max="100" :marks="changeMarks" />
                <div class="range-display">{{ factors.momentum.change_60d[0] }}% - {{ factors.momentum.change_60d[1] }}%</div>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="换手率 (%)">
                <a-slider v-model:value="factors.momentum.turnover_rate" range :min="0" :max="100" :marks="turnoverMarks" />
                <div class="range-display">{{ factors.momentum.turnover_rate[0] }}% - {{ factors.momentum.turnover_rate[1] }}%</div>
              </a-form-item>
            </a-col>
          </a-row>
        </a-tab-pane>

      </a-tabs>

      <!-- 操作按钮 -->
      <div class="action-bar">
        <a-space>
          <a-button type="primary" size="large" @click="runScreening" :loading="loading">
            <FilterOutlined /> 执行筛选
          </a-button>
          <a-button size="large" @click="resetFactors">重置</a-button>
          <a-button size="large" @click="saveStrategy">保存策略</a-button>
          <a-button size="large" @click="loadStrategy">加载策略</a-button>
        </a-space>
      </div>
    </a-card>

    <!-- 筛选结果 -->
    <a-card v-if="screenedStocks.length > 0" class="result-card">
      <template #title>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>📋 筛选结果 ({{ screenedStocks.length }} 只)</span>
          <a-space>
            <a-button type="link" @click="exportResults">导出</a-button>
            <a-button type="link" @click="addAllToPool" :disabled="selectedStocks.length === 0">
              加入 ({{ selectedStocks.length }})
            </a-button>
          </a-space>
        </div>
      </template>

      <a-table
        :dataSource="screenedStocks"
        :columns="columns"
        :rowSelection="{ selectedRowKeys: selectedStocks, onChange: onSelectChange }"
        :pagination="{ pageSize: 20 }"
        size="small"
        rowKey="stock_code"
        :scroll="{ x: 1200 }"
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'operation'">
            <a-button type="link" size="small" @click="addToPool(record)">加入</a-button>
          </template>
          <template v-else-if="['pe', 'pb'].includes(column.key)">
            <span :class="getValuationClass(record[column.key], column.key)">
              {{ formatNumber(record[column.key]) }}
            </span>
          </template>
          <template v-else-if="['change_percent', 'change_5d', 'change_10d', 'change_20d', 'change_60d'].includes(column.key)">
            <span :class="record[column.key] >= 0 ? 'text-up' : 'text-down'">
              {{ formatNumber(record[column.key]) }}%
            </span>
          </template>
          <template v-else-if="column.key === 'latest_price'">
            <span>{{ formatNumber(record[column.key]) }}</span>
          </template>
          <template v-else-if="column.key === 'market_cap'">
            <span>{{ formatNumber(record[column.key]) }}</span>
          </template>
          <template v-else-if="column.key === 'turnover_rate'">
            <span>{{ formatNumber(record[column.key]) }}%</span>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 空状态 -->
    <a-empty v-if="!hasSearched && screenedStocks.length === 0" description="设置因子条件后点击执行筛选" class="empty-state">
      <template #extra>
        <a-space>
          <a-button @click="loadDefaultFactors">加载默认</a-button>
          <a-button @click="saveStrategy">保存策略</a-button>
        </a-space>
      </template>
    </a-empty>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { FilterOutlined, ReloadOutlined, SaveOutlined, DownloadOutlined, PlusOutlined, FolderOpenOutlined } from '@ant-design/icons-vue'
import { stockScreeningApi } from '@/api/stockModel.js'

// 默认因子 - 简化版
const DEFAULT_FACTORS = {
  valuation: { pe: [0, 50], pb: [0, 5], market_cap: [100, 5000] },
  momentum: { change_percent: [-10, 10], change_5d: [-20, 20], change_10d: [-40, 40], change_20d: [-40, 40], change_60d: [-50, 50], turnover_rate: [1, 30] }
}

const activeTab = ref('valuation')
const factors = reactive(JSON.parse(JSON.stringify(DEFAULT_FACTORS)))
const loading = ref(false)
const hasSearched = ref(false)
const screenedStocks = ref([])
const selectedStocks = ref([])

// Slider marks
const peMarks = { 0: '0', 50: '50', 100: '100', 200: '200' }
const pbMarks = { 0: '0', 10: '10', 25: '25', 50: '50' }
const changeMarks = { '-50': '-50%', 0: '0', 50: '50%' }
const turnoverMarks = { 0: '0', 25: '25', 50: '50', 100: '100' }

// 表格列 - 简化版（去掉财务因子）
const columns = [
  { title: '代码', dataIndex: 'stock_code', key: 'stock_code', width: 90, fixed: 'left' },
  { title: '名称', dataIndex: 'stock_name', key: 'stock_name', width: 100, fixed: 'left' },
  { title: '价格', dataIndex: 'latest_price', key: 'latest_price', width: 80 },
  { title: 'PE', dataIndex: 'pe', key: 'pe', width: 70 },
  { title: 'PB', dataIndex: 'pb', key: 'pb', width: 70 },
  { title: '涨跌幅', dataIndex: 'change_percent', key: 'change_percent', width: 90 },
  { title: '5日涨幅', dataIndex: 'change_5d', key: 'change_5d', width: 85 },
  { title: '10日涨幅', dataIndex: 'change_10d', key: 'change_10d', width: 85 },
  { title: '20日涨幅', dataIndex: 'change_20d', key: 'change_20d', width: 85 },
  { title: '60日涨幅', dataIndex: 'change_60d', key: 'change_60d', width: 85 },
  { title: '换手率', dataIndex: 'turnover_rate', key: 'turnover_rate', width: 80 },
  { title: '市值(亿)', dataIndex: 'market_cap', key: 'market_cap', width: 100 },
  { title: '操作', key: 'operation', width: 70, fixed: 'right' }
]

const STRATEGY_KEY = 'stock_screening_strategies'

const formatNumber = (val) => val === null || val === undefined ? '--' : val.toFixed(2)

const runScreening = async () => {
  loading.value = true
  hasSearched.value = true
  try {
    const response = await stockScreeningApi.screenStocks(factors)
    if (response.success) {
      screenedStocks.value = response.data || []
      message.success(`筛选完成，找到 ${screenedStocks.value.length} 只`)
    } else {
      message.error(response.message || '筛选失败')
      screenedStocks.value = []
    }
  } catch (error) {
    message.error('筛选失败：' + error.message)
    screenedStocks.value = []
  } finally {
    loading.value = false
  }
}

const resetFactors = () => {
  Object.assign(factors, JSON.parse(JSON.stringify(DEFAULT_FACTORS)))
  screenedStocks.value = []
  selectedStocks.value = []
  message.info('已重置')
}

const loadDefaultFactors = () => {
  Object.assign(factors, JSON.parse(JSON.stringify(DEFAULT_FACTORS)))
  message.info('已加载默认')
}

const saveStrategy = () => {
  Modal.confirm({
    title: '保存策略',
    content: '请输入策略名称：',
    onOk: () => {
      const name = prompt('策略名称：')
      if (!name) return
      const list = JSON.parse(localStorage.getItem(STRATEGY_KEY) || '[]')
      list.push({ name, factors: JSON.parse(JSON.stringify(factors)), time: new Date().toISOString() })
      localStorage.setItem(STRATEGY_KEY, JSON.stringify(list))
      message.success(`"${name}" 已保存`)
    }
  })
}

const loadStrategy = () => {
  const list = JSON.parse(localStorage.getItem(STRATEGY_KEY) || '[]')
  if (list.length === 0) {
    message.info('暂无保存的策略')
    return
  }
  const options = list.map((s, i) => ({ value: i, label: `${s.name} (${new Date(s.time).toLocaleDateString()})` }))
  Modal.info({
    title: '选择策略',
    content: options.map(o => `<div style="padding:8px;cursor:pointer;" onclick="selectStrategy(${o.value})">${o.label}</div>`).join(''),
    onOk: () => {},
    okText: '关闭'
  })
  window.selectStrategy = (idx) => {
    Object.assign(factors, list[idx].factors)
    message.success(`已加载 "${list[idx].name}"`)
    Modal.destroyAll()
  }
}

const exportResults = () => {
  if (screenedStocks.value.length === 0) {
    message.warning('无数据导出')
    return
  }
  const headers = ['代码', '名称', '价格', 'PE', 'PB', '涨跌幅', '5日涨幅', '10日涨幅', '20日涨幅', '60日涨幅', '换手率', '市值(亿)']
  const rows = screenedStocks.value.map(s => [
    s.stock_code, s.stock_name, s.latest_price, s.pe, s.pb, 
    s.change_percent, s.change_5d, s.change_10d, s.change_20d, s.change_60d,
    s.turnover_rate, s.market_cap
  ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `stock_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  message.success('导出成功')
}

const onSelectChange = (keys) => { selectedStocks.value = keys }
const addToPool = (s) => message.success(`已将 ${s.stock_name} 加入`)
const addAllToPool = () => message.success(`已将 ${selectedStocks.value.length} 只加入`)
const getValuationClass = (val, type) => {
  if (!val && val !== 0) return ''
  const t = { pe: [15, 30], pb: [1, 3] }
  const [low, high] = t[type] || [0, 100]
  if (val < low) return 'text-low'
  if (val > high) return 'text-high'
  return 'text-normal'
}
</script>

<style scoped lang="less">
.stock-screening-container { padding: 16px;
  .factor-card { margin-bottom: 16px;
    .range-display { text-align: center; color: #1890ff; font-weight: 500; }
  }
  .action-bar { margin-top: 24px; text-align: center; padding: 16px; background: #fafafa; border-radius: 8px; }
  .result-card {
    .text-up { color: #f5222d; font-weight: 500; }
    .text-down { color: #52c41a; font-weight: 500; }
    .text-low { color: #52c41a; font-weight: 500; }
    .text-high { color: #f5222d; font-weight: 500; }
    .text-normal { color: #faad14; font-weight: 500; }
  }
  .empty-state { margin-top: 48px; padding: 48px; }
}
@media (max-width: 768px) { .stock-screening-container { padding: 8px; } }
</style>
