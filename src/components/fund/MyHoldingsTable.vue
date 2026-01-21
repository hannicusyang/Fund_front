<template>
  <div>
    <!-- 主容器：左右两栏布局 -->
    <a-row :gutter="24">
      <!-- 左侧：原有资产概览 + 历史趋势图 -->
      <a-col :span="12">
        <!-- 资产概览卡片（原有） -->
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
        <!-- 历史趋势图（原有） -->
        <div ref="chartRef" style="width: 100%; height: 360px; margin-bottom: 24px"></div>
      </a-col>
      <!-- 右侧：实时估算数据 + 实时趋势图 -->
      <a-col :span="12">
        <!-- 实时估算资产概览卡片 -->
        <a-row :gutter="16" style="margin-bottom: 24px">
          <a-col :span="8">
            <a-card size="small">
              <div class="summary-label">估算总资产</div>
              <div class="summary-value" style="color: #1890ff">
                ¥{{ estimatedPortfolioSummary.estimatedTotalAsset.toLocaleString() }}
              </div>
            </a-card>
          </a-col>
          <a-col :span="8">
            <a-card size="small">
              <div class="summary-label">估算总收益</div>
              <div
                class="summary-value"
                :style="{ color: estimatedPortfolioSummary.estimatedTotalProfit >= 0 ? '#f5222d' : '#52c41a' }"
              >
                ¥{{ estimatedPortfolioSummary.estimatedTotalProfit.toLocaleString() }}
              </div>
            </a-card>
          </a-col>
          <a-col :span="8">
            <a-card size="small">
              <div class="summary-label">估算总收益率</div>
              <div
                class="summary-value"
                :style="{ color: estimatedPortfolioSummary.estimatedTotalProfitRate >= 0 ? '#f5222d' : '#52c41a' }"
              >
                {{ estimatedPortfolioSummary.estimatedTotalProfitRate }}%
              </div>
            </a-card>
          </a-col>
        </a-row>
        <!-- 实时估算趋势图 -->
        <div ref="realTimeChartRef" style="width: 100%; height: 360px; margin-bottom: 24px"></div>
      </a-col>
    </a-row>
    <!-- 持仓表格（保持不变） -->
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
          <a-button type="text" size="小" :loading="refreshLoading" @click="handleRefresh" class="refresh-btn">
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
          <a-button size="small" type="link" @click="goToDetail(record.fund_code)">查看详情</a-button>
          <a-button size="small" type="link" @click="openEditModal(record)">修改持仓</a-button>
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
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { fundApi } from '@/api/fund'
import { PlusOutlined, CheckOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import * as echarts from 'echarts'
import { ReloadOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const refreshLoading = ref(false)
const xAxisLabels = ['09:30', '10:30', '11:30/13:00', '14:00', '15:00'];
// ✅ 添加这两个 ref 来跟踪当前排序状态
const sortField = ref('') // 当前排序字段（前端 key，如 'holding_value'）
const sortOrder = ref('') // 当前排序顺序（'ascend' | 'descend' | ''）

// 账户汇总（原有）
const portfolioSummary = reactive({
  totalAsset: 0,
  totalProfit: 0,
  totalProfitRate: 0
})

// ✅ 新增：实时估算账户汇总
const estimatedPortfolioSummary = reactive({
  estimatedTotalAsset: 0,
  estimatedTotalProfit: 0,
  estimatedTotalProfitRate: 0
})

// 历史数据（原有）
const portfolioHistory = ref([])
const chartRef = ref(null)
let chartInstance = null

// ✅ 新增：实时估算历史数据
const realTimeHistory = ref([])
const realTimeChartRef = ref(null)
let realTimeChartInstance = null

// 实时更新定时器
const realTimeTimer = ref(null)

// 计算实时估算汇总数据
const calculateEstimatedSummary = (holdings) => {
  let totalAsset = 0
  let totalCost = 0
  holdings.forEach(holding => {
    const shares = holding.shares || 0
    const costPrice = holding.cost_price || 0
    const estimatedNav = holding.estimated_nav || 0
    const holdingValue = shares * estimatedNav
    const holdingCost = shares * costPrice
    totalAsset += holdingValue
    totalCost += holdingCost
  })
  const totalProfit = totalAsset - totalCost
  const totalProfitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0
  estimatedPortfolioSummary.estimatedTotalAsset = Math.round(totalAsset * 100) / 100
  estimatedPortfolioSummary.estimatedTotalProfit = Math.round(totalProfit * 100) / 100
  estimatedPortfolioSummary.estimatedTotalProfitRate = parseFloat(totalProfitRate.toFixed(2))
}

// 更新顶部卡片（原有）
const updateSummaryFromHistory = () => {
  const history = portfolioHistory.value
  if (history.length === 0) {
    portfolioSummary.totalAsset = 0
    portfolioSummary.totalProfit = 0
    portfolioSummary.totalProfitRate = 0
    return
  }
  const latest = history[history.length - 1]
  portfolioSummary.totalAsset = latest.total_asset
  portfolioSummary.totalProfit = latest.total_profit
  portfolioSummary.totalProfitRate = latest.total_profit_rate
}

// 渲染历史趋势图（原有）- 添加缩放功能
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

  // ✅ 添加缩放功能
  const option = {
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
      data: dates,
      axisLabel: {
        rotate: 45
      }
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
    ],
    // ✅ 添加数据缩放功能
    dataZoom: [
      {
        type: 'inside', // 内置缩放（鼠标滚轮、拖拽）
        start: 0,
        end: 100
      },
      {
        type: 'slider', // 滑块缩放
        start: 0,
        end: 100,
        height: 20,
        bottom: 40
      }
    ]
  }

  chartInstance.setOption(option)
}

// ✅ 修改后的：渲染实时估算趋势图（固定股票交易时间点，tooltip显示真实时间）
// 假设 realTimeHistory.value 是后端返回的真实数据数组
const renderRealTimeChart = () => {
  if (!realTimeChartRef.value) return;
  if (!realTimeChartInstance) {
    realTimeChartInstance = echarts.init(realTimeChartRef.value);
  }

  const xAxisLabels = ['09:30', '10:30', '11:30/13:00', '14:00', '15:00'];

  // 初始化每个 X 轴位置的数据列表
  const seriesData = xAxisLabels.map(() => ({
    assets: [],
    profits: [],
    rates: []
  }));

  // 遍历所有后端返回的真实数据
  realTimeHistory.value.forEach(item => {
    const realTime = dayjs(item.update_time);
    let xIndex = -1;

    // ✅ 按交易时段规则分配 X 轴索引
    if (realTime.hour() === 9 && realTime.minute() >= 30 ||
        realTime.hour() === 10 && realTime.minute() < 30) {
      xIndex = 0; // 09:30
    } else if (realTime.hour() === 10 && realTime.minute() >= 30 ||
               realTime.hour() === 11 && realTime.minute() < 30) {
      xIndex = 1; // 10:30
    } else if (realTime.hour() === 11 && realTime.minute() >= 30) {
      xIndex = 2; // 11:30/13:00（上午收盘段）
    } else if (realTime.hour() === 13) {
      xIndex = 2; // 11:30/13:00（下午开盘段）
    } else if (realTime.hour() === 14) {
      xIndex = 3; // 14:00
    } else if (realTime.hour() >= 15) {
      xIndex = 4; // 15:00
    }

    if (xIndex === -1) return; // 忽略非交易时段

    // 存储原始时间 + 数值
    seriesData[xIndex].assets.push({
      value: item.estimated_total_asset,
      originalTime: realTime.format('HH:mm:ss')
    });
    seriesData[xIndex].profits.push({
      value: item.estimated_total_profit,
      originalTime: realTime.format('HH:mm:ss')
    });
    seriesData[xIndex].rates.push({
      value: item.estimated_total_profit_rate,
      originalTime: realTime.format('HH:mm:ss')
    });
  });

  // ✅ 构建最终系列数据：每个 X 点取最新一条数据，若无则为 null
  const finalAssets = [];
  const finalProfits = [];
  const finalRates = [];

  seriesData.forEach((group, index) => {
    if (group.assets.length > 0) {
      const latestIdx = group.assets.length - 1;
      finalAssets.push(group.assets[latestIdx]);
      finalProfits.push(group.profits[latestIdx]);
      finalRates.push(group.rates[latestIdx]);
    } else {
      // ✅ 关键：没有数据时，设为 null，ECharts 不会画线
      finalAssets.push(null);
      finalProfits.push(null);
      finalRates.push(null);
    }
  });

  // ✅ 配置 ECharts
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: params => {
        const originalTime = params.data?.originalTime || 'N/A';
        const value = params.data?.value ?? 0;
        let html = `${originalTime}<br/>`;
        if (params.seriesName.includes('收益率')) {
          html += `${params.marker} ${params.seriesName}: ${value}%`;
        } else {
          html += `${params.marker} ${params.seriesName}: ¥${Number(value).toLocaleString()}`;
        }
        return html;
      }
    },
    legend: {
      data: ['估算总资产', '估算总收益', '估算收益率'],
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
      data: xAxisLabels
    },
    yAxis: [
      { name: '金额 (¥)', position: 'left', axisLabel: { formatter: v => `¥${v}` } },
      { name: '收益率 (%)', position: 'right', axisLabel: { formatter: '{value}%' } }
    ],
    series: [
      { name: '估算总资产', type: 'line', yAxisIndex: 0, data: finalAssets, smooth: true },
      { name: '估算总收益', type: 'line', yAxisIndex: 0, data: finalProfits, smooth: true },
      { name: '估算收益率', type: 'line', yAxisIndex: 1, data: finalRates, smooth: true }
    ]
  };

  realTimeChartInstance.setOption(option);
};

// ✅ 修改后的实时数据获取函数
const fetchRealTimeEstimations = async () => {
  try {
    // 方式1：如果只需要汇总数据，调用新接口
    const summaryRes = await fundApi.getPortfolioRealTime() // ← 确保这个方法名正确
    const summaryData = summaryRes.data

    // 更新估算汇总
    estimatedPortfolioSummary.estimatedTotalAsset = summaryData.estimated_total_asset
    estimatedPortfolioSummary.estimatedTotalProfit = summaryData.estimated_total_profit
    estimatedPortfolioSummary.estimatedTotalProfitRate = summaryData.estimated_total_profit_rate

    // 添加到实时历史记录
    const currentTime = dayjs().format('HH:mm:ss')
    realTimeHistory.value.push({
      time: currentTime,
      estimatedTotalAsset: summaryData.estimated_total_asset,
      estimatedTotalProfit: summaryData.estimated_total_profit,
      estimatedTotalProfitRate: summaryData.estimated_total_profit_rate
    })

    // 限制历史记录数量
    if (realTimeHistory.value.length > 100) {
      realTimeHistory.value = realTimeHistory.value.slice(-100)
    }

    await nextTick()
    renderRealTimeChart()
  } catch (error) {
    console.warn('获取实时估算数据失败:', error)
  }
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
  { title: '持仓金额', dataIndex: 'holding_value', key: 'holding_value', align: 'center', sorter: true },
  {
    title: '持仓成本单价',
    dataIndex: 'cost_price',
    key: 'cost_price',
    align: 'center',
    sorter: true
  },
  { title: '持仓份额', dataIndex: 'shares', key: 'shares', align: 'center', sorter: true },
  { title: '持仓总成本', dataIndex: 'total_cost', key: 'total_cost', align: 'center', sorter: true },
  { title: '持有收益', dataIndex: 'profit', key: 'profit', align: 'center', sorter: true },
  { title: '持有收益率', dataIndex: 'profit_rate', key: 'profit_rate', align: 'center', sorter: true },
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
      params.sort_field = SORTABLE_FIELDS[sortField]
      params.sort_order = sortOrder === 'descend' ? 'desc' : 'asc'
    }
    console.log('【发送请求】', params)
    const res = await fundApi.getMyHolding(params)
    const data = res.data
    myHoldings.value = data.items || []
    total.value = data.total || 0

    // ✅ 首次加载后立即获取实时数据
    if (myHoldings.value.length > 0) {
      await fetchRealTimeEstimations()
    }
  } catch (error) {
    message.error('加载持仓失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleTableChange = (pagination, filters, sorter) => {
  page.value = pagination.current
  pageSize.value = pagination.pageSize
  let currentSortField = ''
  let currentSortOrder = ''
  if (sorter && sorter.field && typeof sorter.field === 'string') {
    const field = sorter.field.trim()
    if (field in SORTABLE_FIELDS) {
      currentSortField = field
      currentSortOrder = sorter.order || 'descend'
    } else {
      currentSortField = 'holding_value'
      currentSortOrder = 'descend'
    }
  }
  sortField.value = currentSortField
  sortOrder.value = currentSortOrder
  loadHoldings(currentSortField, currentSortOrder)
}

const handleRefresh = async () => {
  refreshLoading.value = true
  try {
    await Promise.all([loadHoldings(sortField.value, sortOrder.value), loadPortfolioHistory(30)])
  } catch (error) {
    message.error('刷新失败，请重试')
    console.error('刷新错误:', error)
  } finally {
    refreshLoading.value = false
  }
}

// 切换自选（带确认弹窗）
const toggleFavorite = async (record) => {
  const fundCode = record.fund_code
  const fundName = record.fund_name
  try {
    if (record.is_checked) {
      const confirmed = await new Promise(resolve => {
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
        return
      }
      await fundApi.removeFromStore(fundCode)
      message.success('已取消自选')
      record.is_checked = false
      await loadHoldings()
    } else {
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
const openEditModal = record => {
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
    const payload = {
      fund_code: editForm.fund_code
    }
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
    Object.assign(currentRecord.value, {
      cost_price: editForm.cost_price,
      shares: editForm.shares,
      purchased_at: editForm.purchased_at?.toISOString()
    })
    message.success('修改成功')
    editModalVisible.value = false
    await loadHoldings()
  } catch (error) {
    message.error('修改失败')
    console.error(error)
  } finally {
    editing.value = false
  }
}

const goToDetail = fundCode => {
  router.push(`/FundDetail/${fundCode}`)
}

const formatPercent = value => {
  if (value == null || value === '') return '--'
  return `${value.toFixed(2)}%`
}

const getGrowthColor = value => {
  if (value == null) return 'inherit'
  return value >= 0 ? '#f5222d' : '#52c41a'
}

const loadPortfolioHistory = async days => {
  try {
    const res = await fundApi.getPortfolioHistory(days)
    portfolioHistory.value = res.data || []
    await nextTick()
    updateSummaryFromHistory()
    renderChart()
  } catch (error) {
    message.error('加载历史趋势失败')
    console.error(error)
    renderChart()
  }
}

// 初始化加载
const loadData = async () => {
  await loadHoldings()
  loadPortfolioHistory(30)
  // ✅ 新增：加载当天的实时历史数据
  await loadRealTimeHistory()
}

// 新增函数：加载当天实时历史数据
const loadRealTimeHistory = async () => {
  try {
    const res = await fundApi.getPortfolioRealTimeHistory()
    if (res.success && res.data.length > 0) {
      // 转换数据格式以匹配现有结构
      realTimeHistory.value = res.data.map(item => ({
        update_time: item.update_time, // 保留原始 ISO 时间戳
        estimatedTotalAsset: item.estimated_total_asset,
        estimatedTotalProfit: item.estimated_total_profit,
        estimatedTotalProfitRate: item.estimated_total_profit_rate
      }))
      // 如果有历史数据，更新估算汇总为最新值
      const latest = res.data[res.data.length - 1]
      estimatedPortfolioSummary.estimatedTotalAsset = latest.estimated_total_asset
      estimatedPortfolioSummary.estimatedTotalProfit = latest.estimated_total_profit
      estimatedPortfolioSummary.estimatedTotalProfitRate = latest.estimated_total_profit_rate
      await nextTick()
      renderRealTimeChart()
    }
  } catch (error) {
    console.warn('加载实时历史数据失败:', error)
  }
}

// ✅ 新增：启动实时更新
const startRealTimeUpdates = () => {
  // 每30秒更新汇总卡片
  realTimeTimer.value = setInterval(() => {
    if (myHoldings.value.length > 0) {
      fetchRealTimeEstimations()
    }
  }, 30000)
  // 每2分钟重新加载完整的历史数据（确保图表包含最新点）
  setInterval(() => {
    if (myHoldings.value.length > 0) {
      loadRealTimeHistory()
    }
  }, 2 * 60 * 1000)
}

// ✅ 新增：停止实时更新
const stopRealTimeUpdates = () => {
  if (realTimeTimer.value) {
    clearInterval(realTimeTimer.value)
    realTimeTimer.value = null
  }
}

onMounted(() => {
  sortField.value = 'holding_value'
  sortOrder.value = 'descend'
  loadData()
  startRealTimeUpdates()
  window.addEventListener('resize', () => {
    chartInstance?.resize()
    realTimeChartInstance?.resize()
  })
})

onUnmounted(() => {
  stopRealTimeUpdates()
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  if (realTimeChartInstance) {
    realTimeChartInstance.dispose()
    realTimeChartInstance = null
  }
  window.removeEventListener('resize', () => {
    chartInstance?.resize()
    realTimeChartInstance?.resize()
  })
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
  margin-left: auto;
}
</style>