<template>
  <div>
    <!-- 主容器：左右两栏布局（桌面端） -->
    <a-row v-if="!isMobile" :gutter="24">
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
    <!-- 持仓表格（桌面端） -->
    <a-table
      v-if="!isMobile"
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

    <!-- 移动端卡片列表 -->
    <div v-if="isMobile" class="mobile-holdings-list">
      <!-- 资产汇总卡片 - 第一行 -->
      <div class="summary-cards">
        <a-row :gutter="12">
          <a-col :span="8">
            <div class="summary-card-item">
              <div class="label">总资产</div>
              <div class="value" style="color: #1890ff">¥{{ portfolioSummary.totalAsset.toLocaleString() }}</div>
            </div>
          </a-col>
          <a-col :span="8">
            <div class="summary-card-item">
              <div class="label">总收益</div>
              <div class="value" :style="{ color: portfolioSummary.totalProfit >= 0 ? '#f5222d' : '#52c41a' }">
                ¥{{ portfolioSummary.totalProfit.toLocaleString() }}
              </div>
            </div>
          </a-col>
          <a-col :span="8">
            <div class="summary-card-item">
              <div class="label">收益率</div>
              <div class="value" :style="{ color: portfolioSummary.totalProfitRate >= 0 ? '#f5222d' : '#52c41a' }">
                {{ portfolioSummary.totalProfitRate }}%
              </div>
            </div>
          </a-col>
        </a-row>
      </div>

      <!-- 估算资产汇总卡片 -->
      <div class="summary-cards" style="margin-top: 12px;">
        <a-row :gutter="12">
          <a-col :span="8">
            <div class="summary-card-item">
              <div class="label">估算总资产</div>
              <div class="value" style="color: #1890ff">¥{{ estimatedPortfolioSummary.estimatedTotalAsset.toLocaleString() }}</div>
            </div>
          </a-col>
          <a-col :span="8">
            <div class="summary-card-item">
              <div class="label">估算总收益</div>
              <div class="value" :style="{ color: estimatedPortfolioSummary.estimatedTotalProfit >= 0 ? '#f5222d' : '#52c41a' }">
                ¥{{ estimatedPortfolioSummary.estimatedTotalProfit.toLocaleString() }}
              </div>
            </div>
          </a-col>
          <a-col :span="8">
            <div class="summary-card-item">
              <div class="label">估算收益率</div>
              <div class="value" :style="{ color: estimatedPortfolioSummary.estimatedTotalProfitRate >= 0 ? '#f5222d' : '#52c41a' }">
                {{ estimatedPortfolioSummary.estimatedTotalProfitRate }}%
              </div>
            </div>
          </a-col>
        </a-row>
      </div>

      <!-- 历史趋势图（移动端） -->
      <div class="chart-container">
        <div class="chart-title">历史趋势（总资产）</div>
        <div ref="mobileChartRef" style="width: 100%; height: 250px;"></div>
      </div>

      <!-- 实时趋势图（移动端） -->
      <div class="chart-container">
        <div class="chart-title">实时估算趋势</div>
        <div ref="mobileRealTimeChartRef" style="width: 100%; height: 250px;"></div>
      </div>

      <!-- 我的持仓 -->
      <div class="section-title">我的持仓</div>
      
      <!-- 持仓列表卡片 -->
      <a-spin :spinning="loading">
        <div 
          v-for="item in myHoldings" 
          :key="item.fund_code" 
          class="holding-card"
        >
          <div class="card-header">
            <div class="header-left">
              <span class="fund-name">{{ item.fund_name }}</span>
              <span class="fund-code">{{ item.fund_code }}</span>
            </div>
            <div class="header-right">
              <a-button size="small" type="link" @click.stop="goToDetail(item.fund_code)">详情</a-button>
              <a-button size="small" type="link" @click.stop="openEditModal(item)">修改</a-button>
            </div>
          </div>
          <div class="card-body">
            <div class="card-row">
              <div class="card-item"><span class="label">净值日期</span><span class="value">{{ item.net_value_date || '-' }}</span></div>
              <div class="card-item"><span class="label">估算净值</span><span class="value">{{ item.estimated_nav || '-' }}</span></div>
              <div class="card-item"><span class="label">估算日增长</span><span class="value" :style="{ color: getGrowthColor(item.daily_growth_rate) }">{{ formatPercent(item.daily_growth_rate) }}</span></div>
            </div>
            <div class="card-row">
              <div class="card-item"><span class="label">持仓金额</span><span class="value">¥{{ (item.holding_value || 0).toLocaleString() }}</span></div>
              <div class="card-item"><span class="label">持仓成本</span><span class="value">¥{{ (item.total_cost || 0).toLocaleString() }}</span></div>
              <div class="card-item"><span class="label">持有收益</span><span class="value" :style="{ color: (item.profit || 0) >= 0 ? '#f5222d' : '#52c41a' }">{{ (item.profit || 0) >= 0 ? '+' : '' }}¥{{ (item.profit || 0).toLocaleString() }}</span></div>
            </div>
            <div class="card-row">
              <div class="card-item"><span class="label">持有份额</span><span class="value">{{ (item.shares || 0).toLocaleString() }}</span></div>
              <div class="card-item"><span class="label">成本单价</span><span class="value">{{ item.cost_price || '-' }}</span></div>
              <div class="card-item"><span class="label">收益率</span><span class="value" :style="{ color: getGrowthColor(item.profit_rate) }">{{ formatPercent(item.profit_rate) }}</span></div>
            </div>
          </div>
        </div>
        <a-empty v-if="myHoldings.length === 0 && !loading" description="暂无持仓数据" />
      </a-spin>
    </div>
    
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

// 移动端检测
const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// 移动端图表 ref
const mobileChartRef = ref(null)
const mobileRealTimeChartRef = ref(null)
let mobileChartInstance = null
let mobileRealTimeChartInstance = null

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

  const data = realTimeHistory.value;
  if (data.length === 0) {
    realTimeChartInstance.showLoading({ text: '暂无实时数据' });
    return;
  }
  realTimeChartInstance.hideLoading();

  // ✅ 直接使用原始时间作为 X 轴（time 类型），保留所有数据点
  const assets = data.map(item => [new Date(item.update_time).getTime(), item.estimatedTotalAsset]);
  const profits = data.map(item => [new Date(item.update_time).getTime(), item.estimatedTotalProfit]);
  const rates = data.map(item => [new Date(item.update_time).getTime(), item.estimatedTotalProfitRate]);

  // 定义关键时间点用于 X 轴标签显示
  const keyTimes = [
    { hour: 9, minute: 30 },
    { hour: 10, minute: 30 },
    { hour: 11, minute: 30 },
    { hour: 13, minute: 0 },
    { hour: 14, minute: 0 },
    { hour: 15, minute: 0 }
  ];
  const today = dayjs().format('YYYY-MM-DD');
  const keyTimeStamps = keyTimes.map(t =>
    new Date(`${today}T${t.hour.toString().padStart(2, '0')}:${t.minute.toString().padStart(2, '0')}:00`).getTime()
  );

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: params => {
        const timeStr = dayjs(params[0].axisValue).format('HH:mm:ss');
        let html = `${timeStr}<br/>`;
        params.forEach(p => {
          if (p.seriesName.includes('收益率')) {
            html += `${p.marker} ${p.seriesName}: ${p.value[1]}%<br/>`;
          } else {
            html += `${p.marker} ${p.seriesName}: ¥${Number(p.value[1]).toLocaleString()}<br/>`;
          }
        });
        return html;
      }
    },
    legend: { data: ['估算总资产', '估算总收益', '估算收益率'], bottom: 10 },
    grid: { left: '3%', right: '4%', bottom: '18%', containLabel: true },
    xAxis: {
      type: 'time', // ✅ 使用 time 类型 X 轴
      axisLabel: {
        formatter: (value) => {
          const ts = value;
          const isKeyTime = keyTimeStamps.some(key => Math.abs(key - ts) < 10 * 60 * 1000);
          return isKeyTime ? dayjs(ts).format('HH:mm') : '';
        }
      }
    },
    yAxis: [
      { name: '金额 (¥)', position: 'left', axisLabel: { formatter: v => `¥${v}` } },
      { name: '收益率 (%)', position: 'right', axisLabel: { formatter: '{value}%' } }
    ],
    series: [
      { name: '估算总资产', type: 'line', yAxisIndex: 0, data: assets, smooth: true, symbol: 'none' },
      { name: '估算总收益', type: 'line', yAxisIndex: 0, data: profits, smooth: true, symbol: 'none' },
      { name: '估算收益率', type: 'line', yAxisIndex: 1, data: rates, smooth: true, symbol: 'none' }
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
    // 移动端图表更新
    if (isMobile.value && mobileChartInstance) {
      // 简化配置
      // 简化配置
      
      
      
      const fontSize = 10
      
      const dates = portfolioHistory.value.map(item => item.date)
      const assets = portfolioHistory.value.map(item => item.total_asset)
      const profits = portfolioHistory.value.map(item => item.total_profit)
      const rates = portfolioHistory.value.map(item => item.total_profit_rate)
      mobileChartInstance.setOption({
        tooltip: { 
          trigger: 'axis',
          confine: true,
          formatter: params => {
            let html = `${params[0].axisValue}<br/>`
            params.forEach(p => {
              if (p.seriesName === '收益率') {
                html += `${p.marker} ${p.seriesName}: ${Number(p.value).toFixed(2)}%<br/>`
              } else {
                html += `${p.marker} ${p.seriesName}: ¥${Number(p.value).toLocaleString()}<br/>`
              }
            })
            return html
          }
        },
        legend: { 
          data: ['总资产', '总收益', '收益率'], 
          bottom: 0, 
          textStyle: { fontSize: fontSize },
          itemWidth: 12,
          itemHeight: 8
        },
        grid: { left: "20%", right: "10%", top: 20, bottom: 50 },
        dataZoom: [{ type: 'inside', start: 0, end: 100 }],
        xAxis: { type: 'category', data: dates, axisLabel: { fontSize: fontSize } },
        yAxis: [
          { type: 'value', axisLabel: { fontSize: fontSize, formatter: v => '¥' + v.toLocaleString() } },
          { type: 'value', axisLabel: { fontSize: fontSize, formatter: '{value}%' } }
        ],
        series: [
          { name: '总资产', type: 'line', data: assets, smooth: true, showSymbol: false },
          { name: '总收益', type: 'line', data: profits, smooth: true, showSymbol: false },
          { name: '收益率', type: 'line', yAxisIndex: 1, data: rates, smooth: true, showSymbol: false }
        ]
      })
    }
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
    const res = await fundApi.getPortfolioRealTimeHistory();
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      // ✅ 关键修复：直接使用 update_time 字符串，不要用 dayjs.unix()！
      realTimeHistory.value = res.data.map(item => ({
        update_time: item.update_time, // ← 直接赋值！
        estimatedTotalAsset: item.estimated_total_asset,
        estimatedTotalProfit: item.estimated_total_profit,
        estimatedTotalProfitRate: item.estimated_total_profit_rate
      }));

      // 更新估算汇总（取最新一条）
      if (realTimeHistory.value.length > 0) {
        const latest = realTimeHistory.value[realTimeHistory.value.length - 1];
        Object.assign(estimatedPortfolioSummary, {
          estimatedTotalAsset: latest.estimatedTotalAsset,
          estimatedTotalProfit: latest.estimatedTotalProfit,
          estimatedTotalProfitRate: latest.estimatedTotalProfitRate
        });
      }

      await nextTick();
      renderRealTimeChart();
      // 移动端图表更新
      if (isMobile.value && mobileRealTimeChartInstance) {
        // 简化配置
        // 简化配置
        
        
        
        const fontSize = 10
        
        const times = realTimeHistory.value.map(item => item.update_time?.substring(11, 16) || '')
        const assets = realTimeHistory.value.map(item => item.estimatedTotalAsset || 0)
        const profits = realTimeHistory.value.map(item => item.estimatedTotalProfit || 0)
        const rates = realTimeHistory.value.map(item => item.estimatedTotalProfitRate || 0)
        mobileRealTimeChartInstance.setOption({
          tooltip: { 
            trigger: 'axis',
            confine: true,
            formatter: params => {
              let html = `${params[0].axisValue}<br/>`
              params.forEach(p => {
                if (p.seriesName === '估算收益率') {
                  html += `${p.marker} ${p.seriesName}: ${Number(p.value).toFixed(2)}%<br/>`
                } else {
                  html += `${p.marker} ${p.seriesName}: ¥${Number(p.value).toLocaleString()}<br/>`
                }
              })
              return html
            }
          },
          legend: { 
            data: ['估算总资产', '估算总收益', '估算收益率'], 
            bottom: 0, 
            textStyle: { fontSize: fontSize },
            itemWidth: 12,
            itemHeight: 8
          },
          grid: { left: "20%", right: "10%", top: 20, bottom: 50 },
          dataZoom: [{ type: 'inside', start: 0, end: 100 }],
          xAxis: { type: 'category', data: times, axisLabel: { fontSize: fontSize } },
          yAxis: [
            { type: 'value', axisLabel: { fontSize: fontSize, formatter: v => '¥' + v.toLocaleString() } },
            { type: 'value', axisLabel: { fontSize: fontSize, formatter: '{value}%' } }
          ],
          series: [
            { name: '估算总资产', type: 'line', data: assets, smooth: true, showSymbol: false },
            { name: '估算总收益', type: 'line', data: profits, smooth: true, showSymbol: false },
            { name: '估算收益率', type: 'line', yAxisIndex: 1, data: rates, smooth: true, showSymbol: false }
          ]
        })
      }
    }
  } catch (error) {
    console.error('加载实时历史数据失败:', error);
  }
};

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
  checkMobile()
  window.addEventListener('resize', checkMobile)
  sortField.value = 'holding_value'
  sortOrder.value = 'descend'
  loadData()
  startRealTimeUpdates()
  
  // 桌面端图表
  window.addEventListener('resize', () => {
    chartInstance?.resize()
    realTimeChartInstance?.resize()
    mobileChartInstance?.resize()
    mobileRealTimeChartInstance?.resize()
  })

  // 初始化移动端图表
  if (isMobile.value) {
    initMobileCharts()
  }
})

// 初始化移动端图表
const initMobileCharts = async () => {
  await nextTick()
  
  // 使用固定配置，确保兼容性
  const fontSize = 10
  
  // 历史趋势图
  if (mobileChartRef.value) {
    mobileChartInstance = echarts.init(mobileChartRef.value)
    const dates = portfolioHistory.value.map(item => item.date)
    const assets = portfolioHistory.value.map(item => item.total_asset)
    const profits = portfolioHistory.value.map(item => item.total_profit)
    const rates = portfolioHistory.value.map(item => item.total_profit_rate)
    mobileChartInstance.setOption({
      tooltip: { 
        trigger: 'axis',
        confine: true,
        formatter: params => {
          let html = `${params[0].axisValue}<br/>`
          params.forEach(p => {
            if (p.seriesName === '收益率') {
              html += `${p.marker} ${p.seriesName}: ${Number(p.value).toFixed(2)}%<br/>`
            } else {
              html += `${p.marker} ${p.seriesName}: ¥${Number(p.value).toLocaleString()}<br/>`
            }
          })
          return html
        }
      },
      legend: { 
        data: ['总资产', '总收益', '收益率'], 
        bottom: 0, 
        textStyle: { fontSize: fontSize },
        itemWidth: 12,
        itemHeight: 8
      },
      grid: { left: "20%", right: "10%", top: 20, bottom: 50 },
      dataZoom: [{ type: 'inside', start: 0, end: 100 }],
      xAxis: { type: 'category', data: dates, axisLabel: { fontSize: fontSize } },
      yAxis: [
        { type: 'value', axisLabel: { fontSize: fontSize } },
        { type: 'value', axisLabel: { fontSize: fontSize, formatter: '{value}%' } }
      ],
      series: [
        { name: '总资产', type: 'line', data: assets, smooth: true, showSymbol: false },
        { name: '总收益', type: 'line', data: profits, smooth: true, showSymbol: false },
        { name: '收益率', type: 'line', yAxisIndex: 1, data: rates, smooth: true, showSymbol: false }
      ]
    })
  }
  
  // 实时趋势图
  if (mobileRealTimeChartRef.value) {
    mobileRealTimeChartInstance = echarts.init(mobileRealTimeChartRef.value)
    const times = realTimeHistory.value.map(item => item.update_time?.substring(11, 16) || '')
    const assets = realTimeHistory.value.map(item => item.estimatedTotalAsset || 0)
    const profits = realTimeHistory.value.map(item => item.estimatedTotalProfit || 0)
    const rates = realTimeHistory.value.map(item => item.estimatedTotalProfitRate || 0)
    mobileRealTimeChartInstance.setOption({
      tooltip: { 
        trigger: 'axis',
        confine: true,
        formatter: params => {
          let html = `${params[0].axisValue}<br/>`
          params.forEach(p => {
            if (p.seriesName === '估算收益率') {
              html += `${p.marker} ${p.seriesName}: ${Number(p.value).toFixed(2)}%<br/>`
            } else {
              html += `${p.marker} ${p.seriesName}: ¥${Number(p.value).toLocaleString()}<br/>`
            }
          })
          return html
        }
      },
      legend: { 
        data: ['估算总资产', '估算总收益', '估算收益率'], 
        bottom: 0, 
        textStyle: { fontSize: fontSize },
        itemWidth: 12,
        itemHeight: 8
      },
      grid: { left: "20%", right: "10%", top: 20, bottom: 50 },
      dataZoom: [{ type: 'inside', start: 0, end: 100 }],
      xAxis: { type: 'category', data: times, axisLabel: { fontSize: fontSize } },
      yAxis: [
        { type: 'value', axisLabel: { fontSize: fontSize, formatter: v => '¥' + v.toLocaleString() } },
        { type: 'value', axisLabel: { fontSize: fontSize, formatter: '{value}%' } }
      ],
      series: [
        { name: '估算总资产', type: 'line', data: assets, smooth: true, showSymbol: false },
        { name: '估算总收益', type: 'line', data: profits, smooth: true, showSymbol: false },
        { name: '估算收益率', type: 'line', yAxisIndex: 1, data: rates, smooth: true, showSymbol: false }
      ]
    })
  }
}

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
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

/* 移动端适配 - 美化版 */
@media (max-width: 768px) {
  /* 卡片美化 */
  :deep(.ant-card) {
    margin-bottom: 12px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    border: none;
  }
  /* 表格横向滚动 */
  :deep(.ant-table) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  /* 按钮优化 */
  :deep(.ant-btn) {
    padding: 6px 12px;
    font-size: 13px;
    border-radius: 6px;
  }
  /* 汇总卡片 */
  .summary-card {
    padding: 12px;
  }
  .summary-label {
    font-size: 12px;
    color: #888;
  }
  .summary-value {
    font-size: 18px;
    font-weight: 600;
  }
}

/* 超小屏幕 */
@media (max-width: 576px) {
  .summary-label {
    font-size: 11px;
  }
  .summary-value {
    font-size: 16px;
  }
  :deep(.ant-btn) {
    padding: 4px 10px;
    font-size: 12px;
  }
}
</style>
<style scoped>
/* 移动端持仓卡片列表 */
.mobile-holdings-list {
  padding: 0;
}
.summary-cards {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.summary-card-item {
  text-align: center;
}
.summary-card-item .label {
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}
.summary-card-item .value {
  font-size: 14px;
  font-weight: 600;
}
.holding-card {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  cursor: pointer;
}
.holding-card:active {
  opacity: 0.8;
  background: #fafafa;
}
.holding-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}
.holding-card .header-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.holding-card .header-right {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.holding-card .fund-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.holding-card .fund-code {
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.holding-card .card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.holding-card .card-row {
  display: flex;
  justify-content: space-between;
}
.holding-card .card-item {
  flex: 1;
  text-align: center;
}
.holding-card .card-item .label {
  display: block;
  font-size: 11px;
  color: #888;
  margin-bottom: 2px;
}
.holding-card .card-item .value {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

/* 移动端图表容器 */
.chart-container {
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  padding: 12px 0;
  margin-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}
</style>
