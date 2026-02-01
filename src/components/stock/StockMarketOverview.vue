<template>
  <div v-if="error" class="error-container">
    <a-empty description="数据加载失败，请刷新重试" />
    <a-button type="primary" @click="refreshData">重试</a-button>
  </div>
  <div class="market-situation-container">
    <!-- 日期选择和刷新区域 -->
    <a-row :gutter="24" style="margin-bottom: 24px">
      <a-col :span="18">
        <a-space>
          <!-- 日期选择器，对于月度数据（area, sector），需要特殊处理 -->
          <a-date-picker
            v-if="isMonthlyData"
            v-model:value="selectedPeriod"
            picker="month"
            :disabled-date="disabledMonth"
            value-format="YYYY-MM"
            @change="handleDateChange"
          />
          <a-date-picker
            v-else
            v-model:value="selectedDate"
            :disabled-date="disabledDate"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
          <a-select v-model:value="exchangeType" style="width: 120px" @change="loadData">
            <a-select-option value="sse">上交所</a-select-option>
            <a-select-option value="szse">深交所</a-select-option>
          </a-select>
          <a-select v-model:value="dataType" style="width: 150px" @change="loadData">
            <a-select-option value="summary">市场总貌</a-select-option>
            <a-select-option value="area">地区交易</a-select-option>
            <a-select-option value="sector">行业成交</a-select-option>
          </a-select>
          <span class="update-time">更新时间: {{ formattedUpdateTime }}</span>
        </a-space>
      </a-col>
      <a-col :span="6" style="text-align: right">
        <a-button type="primary" @click="refreshData" :loading="loading">
          <template #icon>
            <SyncOutlined />
          </template>
          刷新数据
        </a-button>
      </a-col>
    </a-row>

    <!-- 上证/深证概览卡片 -->
    <!-- 仅在加载完 summary 数据后显示 -->
    <a-row v-if="showSummaryCards" :gutter="16" style="margin-bottom: 24px">
      <a-col :span="6">
        <a-card size="small" :title="`${exchangeType === 'sse' ? '上' : '深'}证总市值 (亿元)`">
          <div class="summary-value" style="color: #1890ff; font-size: 24px">
            {{ formatAmount(exchangeType === 'sse' ? sseSummary.total_mv : szseSummary.total_market_value) }}
          </div>
          <div class="summary-label">
            {{ exchangeType === 'sse' ? '上证所' : '深交所' }}
            <!-- 注意：后端模型中没有直接的 change 字段，此处暂时不显示变动率 -->
            <!-- <span :style="{ color: getChangeColor(...) }">...</span> -->
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small" title="上市公司数量">
          <div class="summary-value" style="color: #52c41a; font-size: 24px">
            {{ exchangeType === 'sse' ? sseSummary.companies : szseSummary.total_companies }}
          </div>
          <div class="summary-label" v-if="exchangeType === 'sse'">
            <span>主板: {{ sseSummary.main_board_companies }}</span>
            <span style="margin-left: 8px">科创板: {{ sseSummary.star_board_companies }}</span>
          </div>
          <div class="summary-label" v-else>
            <span>主板A股: {{ szseSummary.main_board_a_companies }}</span>
            <span style="margin-left: 8px">创业板: {{ szseSummary.gem_companies }}</span>
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small" title="平均市盈率">
          <div class="summary-value" style="color: #faad14; font-size: 24px">
            {{ exchangeType === 'sse' ? sseSummary.avg_pe : szseSummary.avg_pe_ratio }}
          </div>
          <div class="summary-label" v-if="exchangeType === 'sse'">
            <span>主板: {{ sseSummary.main_board_pe }}</span>
            <span style="margin-left: 8px">科创板: {{ sseSummary.star_board_pe }}</span>
          </div>
          <div class="summary-label" v-else>
            <span>主板: {{ szseSummary.main_board_pe }}</span>
            <span style="margin-left: 8px">创业板: {{ szseSummary.gem_pe }}</span>
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small" title="成交金额 (亿元)">
          <div class="summary-value" style="color: #722ed1; font-size: 24px">
            <!-- 从 szseSummary 中获取总成交金额，这里简化处理 -->
            {{ formatAmount(szseSummary.total_turnover) }}
          </div>
          <div class="summary-label">
            <span>股票占比: --</span> <!-- 此字段可能需要后端计算提供 -->
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 双图表布局 -->
    <a-row :gutter="24" style="margin-bottom: 24px">
      <!-- 左侧：饼图 -->
      <a-col :span="12">
        <a-card :title="chartTitle1" size="small">
          <div ref="pieChartRef" style="width: 100%; height: 360px"></div>
        </a-card>
      </a-col>
      <!-- 右侧：折线图 -->
      <a-col :span="12">
        <a-card :title="chartTitle2" size="small">
          <div ref="lineChartRef" style="width: 100%; height: 360px"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 详细数据表格 -->
    <a-card :title="tableTitle" size="small">
      <a-table
        :columns="tableColumns"
        :data-source="tableData"
        :loading="loading"
        :row-key="record => record.key"
        :pagination="{ pageSize: 10 }"
        size="middle"
      >
        <template #bodyCell="{ column, text, record }">
          <template v-if="column.key === 'project' || column.key === 'region' || column.key === 'sector'">
            <span style="font-weight: bold">{{ text }}</span>
          </template>
          <template v-else-if="['value', 'amount', 'volume', 'ratio', 'turnover', 'pe_ratio', 'companies', 'total_mv', 'circulating_mv', 'turnover_amount', 'market_share', 'stock_turnover', 'fund_turnover', 'bond_turnover', 'preferred_stock_turnover', 'option_turnover', 'turnover_amount_cny', 'volume_shares', 'deal_count'].includes(column.key)">
            <span :style="{ color: getTableValueColor(text, column.key) }">
              {{ formatTableValue(text, column.key) }}
            </span>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { SyncOutlined } from '@ant-design/icons-vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
// --- 新增: 引入 axios 或您项目的API工具 ---
import axios from '@/utils/axios' // 请根据您的项目路径调整

// 响应式数据
const loading = ref(false)
const error = ref(null)
// 为了兼容月度数据，使用两个响应式变量
const selectedDate = ref(dayjs()) // 用于日度数据
const selectedPeriod = ref(dayjs().subtract(1, 'month')) // 用于月度数据，默认上个月
const exchangeType = ref('sse') // sse or szse
const dataType = ref('summary') // summary, area, sector
const updateTime = ref('')
// 存储后端返回的原始数据
const sseRawData = ref(null)
const szseSummaryRawData = ref(null) // SZSE summary
const szseAreaRawData = ref(null)   // SZSE area
const szseSectorRawData = ref(null) // SZSE sector

// 计算属性
const formattedDate = computed(() => selectedDate.value.format('YYYY-MM-DD'))
const formattedPeriod = computed(() => selectedPeriod.value.format('YYYY-MM')) // YYYY-MM 格式，后端需要转换为 YYYYMM
const isMonthlyData = computed(() => dataType.value === 'area' || dataType.value === 'sector')

// 计算摘要数据
const sseSummary = computed(() => {
  if (!sseRawData.value) return {}
  // 假设 sseRawData.value 是一个对象，包含股票、科创板、主板等字段
  // 需要后端API明确返回结构，这里按 StockSSESummary 模型字段聚合
  const data = sseRawData.value;
  return {
    total_mv: data.stock_total_mv + data.star_total_mv + data.main_total_mv, // 简单相加示例
    companies: data.stock_companies + data.star_companies + data.main_companies,
    avg_pe: data.stock_avg_pe || data.main_avg_pe, // 选择一个作为代表，或计算加权平均
    main_board_companies: data.main_companies,
    star_board_companies: data.star_companies,
    main_board_pe: data.main_avg_pe,
    star_board_pe: data.star_avg_pe,
    // ... 其他字段 ...
  }
})

const szseSummary = computed(() => {
  if (!szseSummaryRawData.value || !Array.isArray(szseSummaryRawData.value)) return {}
  // SZSE summary 数据是数组，需要聚合计算
  let totalCompanies = 0;
  let totalTurnover = 0;
  let totalMarketValue = 0;
  let mainBoardAComps = 0;
  let gemComps = 0;
  let mainBoardAPE = 0;
  let gemPE = 0;

  szseSummaryRawData.value.forEach(item => {
     if(item.security_type.includes('A股')) { // 匹配 主板A股, 创业板A股
         totalCompanies += item.quantity || 0;
         totalTurnover += item.turnover_amount || 0;
         totalMarketValue += item.total_mv || 0;
         if(item.security_type.includes('主板A')) {
             mainBoardAComps = item.quantity;
             // PE 需要额外API或计算
         } else if(item.security_type.includes('创业板A')) {
             gemComps = item.quantity;
             // PE 需要额外API或计算
         }
     }
  });

  return {
    total_companies: totalCompanies,
    total_turnover: totalTurnover,
    total_market_value: totalMarketValue,
    main_board_a_companies: mainBoardAComps,
    gem_companies: gemComps,
    avg_pe_ratio: 0, // Placeholder, 需要后端提供
    main_board_pe: mainBoardAPE,
    gem_pe: gemPE,
  }
})

const showSummaryCards = computed(() => {
  return dataType.value === 'summary' && ((exchangeType.value === 'sse' && sseRawData.value) || (exchangeType.value === 'szse' && szseSummaryRawData.value));
});

const formattedUpdateTime = computed(() => {
  if (!updateTime.value) return '暂无更新时间'
  return dayjs(updateTime.value).format('YYYY-MM-DD HH:mm')
})

const chartTitle1 = computed(() => {
  if (dataType.value === 'summary') {
    return exchangeType.value === 'sse' ? '上证所主板/科创板市值占比' : '深交所各板块市值占比'
  } else if (dataType.value === 'area') {
    return '地区交易额占比'
  } else { // sector
    return '行业成交额占比'
  }
})

const chartTitle2 = computed(() => {
  if (dataType.value === 'summary') {
    return exchangeType.value === 'sse' ? '上证所近30天总市值走势' : '深交所近30天总市值走势' // 需要历史数据API
  } else if (dataType.value === 'area') {
    return '地区交易额TOP10'
  } else { // sector
    return '行业成交额TOP10'
  }
})

const tableTitle = computed(() => {
  if (dataType.value === 'summary') {
    return exchangeType.value === 'sse' ? '上海证券交易所股票数据总貌' : '深圳证券交易所证券类别统计'
  } else if (dataType.value === 'area') {
    return '深圳证券交易所地区交易排序'
  } else { // sector
    return '深圳证券交易所股票行业成交数据'
  }
})

const tableColumns = computed(() => {
  if (dataType.value === 'summary') {
    if (exchangeType.value === 'sse') {
      return [
        { title: '项目', dataIndex: 'project', key: 'project', width: 150 },
        { title: '股票', dataIndex: 'value', key: 'value', align: 'right' },
        { title: '科创板', dataIndex: 'star', key: 'star', align: 'right' },
        { title: '主板', dataIndex: 'main', key: 'main', align: 'right' }
      ]
    } else { // SZSE Summary
      return [
        { title: '证券类别', dataIndex: 'security_type', key: 'security_type', width: 150 },
        { title: '数量', dataIndex: 'quantity', key: 'quantity', align: 'right' },
        { title: '成交金额(元)', dataIndex: 'turnover_amount', key: 'turnover_amount', align: 'right' },
        { title: '总市值(元)', dataIndex: 'total_mv', key: 'total_mv', align: 'right' },
        { title: '流通市值(元)', dataIndex: 'circulating_mv', key: 'circulating_mv', align: 'right' }
      ]
    }
  } else if (dataType.value === 'area') { // SZSE Area
    return [
      { title: '序号', dataIndex: 'serial_number', key: 'serial_number', width: 60, align: 'center' },
      { title: '地区', dataIndex: 'area', key: 'area', width: 100 },
      { title: '总交易额(元)', dataIndex: 'total_turnover', key: 'total_turnover', align: 'right' },
      { title: '占市场(%)', dataIndex: 'market_share', key: 'market_share', align: 'right' },
      { title: '股票交易额(元)', dataIndex: 'stock_turnover', key: 'stock_turnover', align: 'right' },
      { title: '基金交易额(元)', dataIndex: 'fund_turnover', key: 'fund_turnover', align: 'right' },
      { title: '债券交易额(元)', dataIndex: 'bond_turnover', key: 'bond_turnover', align: 'right' },
      { title: '优先股交易额(元)', dataIndex: 'preferred_stock_turnover', key: 'preferred_stock_turnover', align: 'right' },
      { title: '期权交易额(元)', dataIndex: 'option_turnover', key: 'option_turnover', align: 'right' }
    ]
  } else { // SZSE Sector
    return [
      { title: '行业', dataIndex: 'sector_chinese', key: 'sector_chinese', width: 120 },
      { title: '交易天数', dataIndex: 'trading_days', key: 'trading_days', align: 'center', width: 80 },
      { title: '成交金额(元)', dataIndex: 'turnover_amount_cny', key: 'turnover_amount_cny', align: 'right' },
      { title: '占比(%)', dataIndex: 'turnover_amount_pct', key: 'turnover_amount_pct', align: 'right', width: 80 },
      { title: '成交股数', dataIndex: 'volume_shares', key: 'volume_shares', align: 'right' },
      { title: '成交笔数', dataIndex: 'deal_count', key: 'deal_count', align: 'right' }
    ]
  }
})

const tableData = computed(() => {
  if (dataType.value === 'summary') {
    if (exchangeType.value === 'sse' && sseRawData.value) {
      // 将 SSE 模型数据转换为表格所需格式
      const data = sseRawData.value;
      return [
        { key: '1', project: '流通股本 (亿股)', value: data.stock_circulating_capital, star: data.star_circulating_capital, main: data.main_circulating_capital },
        { key: '2', project: '总市值 (亿元)', value: data.stock_total_mv, star: data.star_total_mv, main: data.main_total_mv },
        { key: '3', project: '平均市盈率', value: data.stock_avg_pe, star: data.star_avg_pe, main: data.main_avg_pe },
        { key: '4', project: '上市公司', value: data.stock_companies, star: data.star_companies, main: data.main_companies },
        { key: '5', project: '上市股票', value: data.stock_stocks, star: data.star_stocks, main: data.main_stocks },
        { key: '6', project: '流通市值 (亿元)', value: data.stock_circulating_mv, star: data.star_circulating_mv, main: data.main_circulating_mv },
        { key: '7', project: '总股本 (亿股)', value: data.stock_total_capital, star: data.star_total_capital, main: data.main_total_capital }
      ];
    } else if (exchangeType.value === 'szse' && szseSummaryRawData.value) {
      // SZSE summary 原始数据本身就是表格格式
      return szseSummaryRawData.value.map((item, index) => ({ ...item, key: String(index + 1) }));
    }
  } else if (dataType.value === 'area' && szseAreaRawData.value) {
    return szseAreaRawData.value.map((item, index) => ({ ...item, key: String(index + 1) }));
  } else if (dataType.value === 'sector' && szseSectorRawData.value) {
    return szseSectorRawData.value.map((item, index) => ({ ...item, key: String(index + 1) }));
  }
  return [];
})

// 格式化函数
const formatAmount = (value) => {
  if (!value) return '--'
  return value.toFixed(2)
}

const formatPercent = (value) => {
  if (value == null || value === '') return '--'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

const formatTableValue = (value, columnKey) => {
  if (value == null || value === '' || value === 0) return '--'
  if (columnKey === 'total_mv' || columnKey === 'circulating_mv' || columnKey === 'turnover_amount' || columnKey === 'stock_turnover' || columnKey === 'fund_turnover' || columnKey === 'bond_turnover' || columnKey === 'total_turnover' || columnKey === 'preferred_stock_turnover' || columnKey === 'option_turnover' || columnKey === 'turnover_amount_cny' || columnKey === 'volume_shares' || columnKey === 'deal_count') {
    if (Math.abs(value) >= 1e12) {
      return (value / 1e12).toFixed(2) + ' 万亿'
    } else if (Math.abs(value) >= 1e8) {
      return (value / 1e8).toFixed(2) + ' 亿'
    } else if (Math.abs(value) >= 1e4) {
      return (value / 1e4).toFixed(2) + ' 万'
    }
    return value.toFixed(2)
  }
  if (columnKey === 'market_share' || columnKey === 'turnover_amount_pct' || columnKey === 'volume_shares_pct' || columnKey === 'deal_count_pct') {
    return value.toFixed(2) + '%'
  }
  return typeof value === 'number' ? value.toFixed(2) : value
}

const getChangeColor = (value) => {
  if (value == null) return 'inherit'
  return value >= 0 ? '#f5222d' : '#52c41a'
}

const getTableValueColor = (value, columnKey) => {
  if (typeof value !== 'number' || isNaN(value)) return 'inherit'
  if (columnKey === 'turnover_amount_pct' || columnKey === 'market_share') {
    return value > 5 ? '#f5222d' : '#52c41a'
  } else if (columnKey === 'avg_pe' || columnKey === 'avg_pe_ratio') {
    return value > 30 ? '#f5222d' : '#52c41a'
  } else if (columnKey === 'companies' || columnKey === 'quantity') {
    return value > 1000 ? '#f5222d' : '#52c41a'
  } else if (value > 0) {
    return '#f5222d'
  } else {
    return '#52c41a'
  }
}

// --- 核心数据加载逻辑 ---
const loadData = async () => {
  loading.value = true
  error.value = null
  try {
    // 根据 dataType 决定请求哪个 API
    let response;
    // StockMarketOverview.vue (修改 loadData 函数中 SSE Summary 的处理部分)
    if (dataType.value === 'summary') {
      if (exchangeType.value === 'sse') {
        // 请求 SSE Summary API (假设路径)
        response = await axios.get(`/api/stock/sse-summary`, { params: { date: formattedDate.value } });
        if (response.data && response.data.success) {
          // --- 修改开始 ---
          // 后端返回的结构是 { ..., data: { stock: {...}, star_board: {...}, main_board: {...}, trade_date, update_time } }
          // 我们需要将 stock, star_board, main_board 的字段提取出来，形成前端期望的结构
          const apiData = response.data.data;
          sseRawData.value = {
            // 从 stock 对象映射
            stock_circulating_capital: apiData.stock.circulating_capital,
            stock_total_mv: apiData.stock.total_mv,
            stock_avg_pe: apiData.stock.avg_pe,
            stock_companies: apiData.stock.companies,
            stock_stocks: apiData.stock.stocks,
            stock_circulating_mv: apiData.stock.circulating_mv,
            stock_total_capital: apiData.stock.total_capital,
            // 从 star_board 对象映射
            star_circulating_capital: apiData.star_board.circulating_capital,
            star_total_mv: apiData.star_board.total_mv,
            star_avg_pe: apiData.star_board.avg_pe,
            star_companies: apiData.star_board.companies,
            star_stocks: apiData.star_board.stocks,
            star_circulating_mv: apiData.star_board.circulating_mv,
            star_total_capital: apiData.star_board.total_capital,
            // 从 main_board 对象映射
            main_circulating_capital: apiData.main_board.circulating_capital,
            main_total_mv: apiData.main_board.total_mv,
            main_avg_pe: apiData.main_board.avg_pe,
            main_companies: apiData.main_board.companies,
            main_stocks: apiData.main_board.stocks,
            main_circulating_mv: apiData.main_board.circulating_mv,
            main_total_capital: apiData.main_board.total_capital,
            // 也可以保留原始的 trade_date 和 update_time (可选)
            trade_date: apiData.trade_date,
            update_time: apiData.update_time,
          };
          // --- 修改结束 ---
          updateTime.value = response.data.update_time || new Date().toISOString();
        } else {
          throw new Error(response.data.message || 'SSE Summary API 返回错误');
        }
      } else {
        // SZSE Summary 逻辑保持不变
        response = await axios.get(`/api/stock/szse-summary`, { params: { date: formattedDate.value } });
        if(response.data && response.data.success) {
          szseSummaryRawData.value = response.data.data; // 假设 data 是数组
          updateTime.value = response.data.update_time || new Date().toISOString();
        } else {
          throw new Error(response.data.message || 'SZSE Summary API 返回错误');
        }
      }
      // ... 其他 dataType 的处理 ...
    }

    // 数据加载成功后渲染图表
    await nextTick()
    renderCharts()

  } catch (err) {
    console.error('加载数据失败:', err)
    error.value = err.message
    message.error(`加载${exchangeType.value === 'sse' ? '上交所' : '深交所'}${dataType.value}数据失败: ${err.message}`)
  } finally {
    loading.value = false
  }
}

const refreshData = async () => {
  await loadData()
}

const handleDateChange = () => {
  loadData()
}

// 日期/月份禁用规则
const disabledDate = (current) => {
  return current && current.isAfter(dayjs().endOf('day'))
}

const disabledMonth = (current) => {
  // 可以设置只允许选择过去月份
  return current && current.isSameOrAfter(dayjs().startOf('month'))
}

// 图表渲染逻辑 (保持不变，但数据源来自 tableData 或其他计算属性)
const pieChartRef = ref(null)
const lineChartRef = ref(null)
let pieChartInstance = null
let lineChartInstance = null

const renderCharts = () => {
  renderPieChart()
  renderLineChart()
}

const renderPieChart = () => {
  if (!pieChartRef.value) return
  if (!pieChartInstance) {
    pieChartInstance = echarts.init(pieChartRef.value)
  }

  let option = {};
  // 根据 dataType 和 exchangeType 构建饼图数据
  if (dataType.value === 'summary') {
    if (exchangeType.value === 'sse' && sseRawData.value) {
      option = {
        tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
        legend: { orient: 'vertical', right: 10, top: 'center' },
        series: [{
          name: '市值分布',
          type: 'pie', radius: ['40%', '70%'], center: ['40%', '50%'],
          avoidLabelOverlap: false, itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } },
          labelLine: { show: false },
          data: [
            { value: sseRawData.value.main_total_mv, name: '主板', itemStyle: { color: '#5470c6' } },
            { value: sseRawData.value.star_total_mv, name: '科创板', itemStyle: { color: '#91cc75' } },
            // 可以添加股票总市值或其他分类
          ]
        }]
      };
    } else if (exchangeType.value === 'szse' && szseSummaryRawData.value) {
       option = {
        tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
        legend: { orient: 'vertical', right: 10, top: 'center' },
        series: [{
          name: '市值分布',
          type: 'pie', radius: ['40%', '70%'], center: ['40%', '50%'],
          avoidLabelOverlap: false, itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } },
          labelLine: { show: false },
          data: szseSummaryRawData.value
            .filter(item => item.total_mv && item.security_type !== '债券') // 过滤掉不需要的类型
            .map(item => ({
               value: item.total_mv,
               name: item.security_type,
               itemStyle: { color: '#5470c6' } // 可以根据类型分配不同颜色
            }))
        }]
      };
    }
  } else if (dataType.value === 'area' && szseAreaRawData.value) {
     const top10 = szseAreaRawData.value.slice(0, 10);
     option = {
        tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
        legend: { orient: 'horizontal', bottom: 0, left: 'center', data: top10.map(item => item.area) },
        series: [{
          name: '地区交易额',
          type: 'pie', radius: ['30%', '60%'], center: ['50%', '45%'],
          avoidLabelOverlap: false, itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } },
          labelLine: { show: false },
          data: top10.map(item => ({
             value: item.total_turnover,
             name: item.area,
             itemStyle: { color: '#5470c6' }
          }))
        }]
      };
  } else if (dataType.value === 'sector' && szseSectorRawData.value) {
     const top10 = szseSectorRawData.value.slice(0, 10);
     option = {
        tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
        legend: { orient: 'horizontal', bottom: 0, left: 'center', data: top10.map(item => item.sector_chinese) },
        series: [{
          name: '行业成交额',
          type: 'pie', radius: ['30%', '60%'], center: ['50%', '45%'],
          avoidLabelOverlap: false, itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } },
          labelLine: { show: false },
          data: top10.map(item => ({
             value: item.turnover_amount_cny,
             name: item.sector_chinese,
             itemStyle: { color: '#5470c6' }
          }))
        }]
      };
  }

  pieChartInstance.setOption(option, true) // true: 不合并，完全替换
}

const renderLineChart = () => {
  if (!lineChartRef.value) return
  if (!lineChartInstance) {
    lineChartInstance = echarts.init(lineChartRef.value)
  }

  let option = {};

  // 这里需要历史数据来绘制趋势图，目前只有单日/单月数据
  // 示例：模拟历史数据或显示 Top 10 柱状图
  if (dataType.value === 'area' && szseAreaRawData.value) {
     const top10 = szseAreaRawData.value.slice(0, 10);
     const areas = top10.map(item => item.area);
     const turnovers = top10.map(item => item.total_turnover / 1e12); // 转换为万亿
     option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: params => {
                const area = params[0].axisValue;
                const value = params[0].value;
                return `${area}<br/>总交易额: ${value.toFixed(2)} 万亿`;
            }
        },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', data: areas, axisLabel: { rotate: 45 } },
        yAxis: { type: 'value', name: '万亿', axisLabel: { formatter: '{value}' } },
        series: [{
            name: '总交易额',
            type: 'bar', barWidth: '60%',
            data: turnovers,
            itemStyle: { color: '#5470c6', borderRadius: [4, 4, 0, 0] }
        }]
     };
  } else if (dataType.value === 'sector' && szseSectorRawData.value) {
     const top10 = szseSectorRawData.value.slice(0, 10);
     const sectors = top10.map(item => item.sector_chinese);
     const turnovers = top10.map(item => item.turnover_amount_cny / 1e12); // 转换为万亿
     option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: params => {
                const sector = params[0].axisValue;
                const value = params[0].value;
                return `${sector}<br/>成交额: ${value.toFixed(2)} 万亿`;
            }
        },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', data: sectors, axisLabel: { rotate: 45 } },
        yAxis: { type: 'value', name: '万亿', axisLabel: { formatter: '{value}' } },
        series: [{
            name: '成交额',
            type: 'bar', barWidth: '60%',
            data: turnovers,
            itemStyle: { color: '#5470c6', borderRadius: [4, 4, 0, 0] }
        }]
     };
  } else {
    // 对于 summary，可以绘制历史趋势图，但需要后端提供历史数据API
    // 暂时显示空或提示信息
    option = {
        title: { text: '暂无历史趋势数据', left: 'center', top: 'center' }
    };
  }


  lineChartInstance.setOption(option, true) // true: 不合并，完全替换
}

// 生命周期
onMounted(() => {
  loadData()

  window.addEventListener('resize', () => {
    pieChartInstance?.resize()
    lineChartInstance?.resize()
  })
})

onUnmounted(() => {
  if (pieChartInstance) {
    pieChartInstance.dispose()
    pieChartInstance = null
  }
  if (lineChartInstance) {
    lineChartInstance.dispose()
    lineChartInstance = null
  }
  window.removeEventListener('resize', () => {
    pieChartInstance?.resize()
    lineChartInstance?.resize()
  })
})
</script>

<style scoped>
.market-situation-container { padding: 0 24px; min-height: calc(100vh - 64px - 16px); }
.update-time { color: #8c8c8c; margin-left: 16px; font-size: 14px; }
.summary-value { font-weight: bold; line-height: 1.4; }
.summary-label { font-size: 14px; color: #8c8c8c; margin-top: 4px; }
/* 暗色模式适配 */
html[data-theme='dark'] .market-situation-container { color: rgba(255, 255, 255, 0.85); }
html[data-theme='dark'] .ant-card { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.1); }
html[data-theme='dark'] .ant-card-head { border-color: rgba(255, 255, 255, 0.1); }
html[data-theme='dark'] .ant-table { background: transparent; }
html[data-theme='dark'] .ant-table-cell { border-color: rgba(255, 255, 255, 0.1); }
html[data-theme='dark'] .ant-table-thead > tr > th { background: rgba(0, 0, 0, 0.2); }
/* 响应式设计 */
@media (max-width: 992px) { .market-situation-container { padding: 0 16px; } }
@media (max-width: 768px) {
  .ant-row { margin-left: -8px !important; margin-right: -8px !important; }
  .ant-col { padding-left: 8px !important; padding-right: 8px !important; }
}
</style>