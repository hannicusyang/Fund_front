<template>
  <div class="fund-detail-container">
    <a-card v-if="fundInfo" class="fund-detail-card">
      <!-- 头部标题 -->
      <template #title>
        <div class="fund-title">
          <h2>{{ fundInfo['基金名称'] || fundInfo['基金代码'] }}</h2>
          <p class="fund-code">({{ fundInfo['基金代码'] }})</p>
        </div>
      </template>

      <!-- 操作按钮 -->
      <template #extra>
        <a-space>
          <a-button @click="goBack">返回</a-button>
          <a-button
            type="primary"
            @click="toggleFavorite"
            :loading="watchlistLoading"
            :disabled="watchlistLoading"
          >
            {{ isWatched ? '已自选' : '加入自选' }}
          </a-button>
        </a-space>
      </template>

      <a-row :gutter="24">
        <!-- 左侧：基本信息卡片 -->
        <a-col :span="12">
          <a-card title="基本信息" size="small" class="info-card">
            <a-descriptions :column="1" size="small">
              <a-descriptions-item label="基金全称">
                {{ fundInfo['基金全称'] || '--' }}
              </a-descriptions-item>
              <a-descriptions-item label="基金类型">
                {{ fundInfo['基金类型'] || '--' }}
              </a-descriptions-item>
              <a-descriptions-item label="成立时间">
                {{ fundInfo['成立时间'] || '--' }}
              </a-descriptions-item>
              <a-descriptions-item label="最新规模">
                {{ fundInfo['最新规模'] || '--' }}
              </a-descriptions-item>
              <a-descriptions-item label="基金公司">
                {{ fundInfo['基金公司'] || '--' }}
              </a-descriptions-item>
              <a-descriptions-item label="基金经理">
                {{ fundInfo['基金经理'] || '--' }}
              </a-descriptions-item>
              <a-descriptions-item label="托管银行">
                {{ fundInfo['托管银行'] || '--' }}
              </a-descriptions-item>
              <a-descriptions-item label="评级机构">
                {{ fundInfo['评级机构'] || '--' }}
              </a-descriptions-item>
              <a-descriptions-item label="基金评级">
                {{ fundInfo['基金评级'] || '--' }}
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>

        <!-- 右侧：专业信息卡片 -->
        <a-col :span="12">
          <!-- 业绩比较基准 -->
          <a-card title="业绩比较基准" size="small" class="info-card professional-card">
            <div class="professional-content">
              {{ fundInfo['业绩比较基准'] || '--' }}
            </div>
          </a-card>

          <!-- 投资目标 -->
          <a-card
            title="投资目标"
            size="small"
            class="info-card professional-card"
            style="margin-top: 16px;"
          >
            <div class="professional-content scrollable-content">
              {{ fundInfo['投资目标'] || '--' }}
            </div>
          </a-card>

          <!-- 投资策略 -->
          <a-card
            title="投资策略"
            size="small"
            class="info-card professional-card"
            style="margin-top: 16px;"
          >
            <div class="professional-content scrollable-content">
              {{ fundInfo['投资策略'] || '--' }}
            </div>
          </a-card>
        </a-col>
      </a-row>
    </a-card>


    <!-- ====== 双图表布局：实时估值（左） + 历史净值（右） ====== -->
    <a-row :gutter="24" style="margin-top: 16px;">
      <!-- 左侧：今日实时估值 -->
      <a-col :span="12">
        <a-card class="estimation-chart-card">
          <template #title>
            <div class="chart-title">
              <span>今日实时估值 ({{ currentEstimationDate }})</span>
              <a-button size="small" type="link" @click="refreshEstimationData" :loading="estimationLoading" >
                <ReloadOutlined /> 刷新
              </a-button>
            </div>
          </template>

          <!-- ✅ 容器始终存在，内部处理不同状态 -->
          <div style="width: 100%; height: 300px; position: relative;">
            <!-- 1. 加载状态 -->
            <a-spin
              v-if="estimationLoading && estimationHistory.length === 0"
              style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"
            />

            <!-- 2. 空状态 -->
            <div v-else-if="!estimationLoading && estimationHistory.length === 0" style="height: 100%; display: flex; align-items: center; justify-content: center;">
              <a-empty description="暂无今日估值数据" style="margin-top: 0;">
                <template #image>
                  <FundProjectionScreenOutlined style="color: #bfbfbf; font-size: 48px;" />
                </template>
                <template #footer>
                  <a-button type="primary" @click="refreshEstimationData" :loading="estimationLoading">尝试刷新</a-button>
                </template>
              </a-empty>
            </div>

            <!-- 3. 有数据时显示图表（✅ 容器始终存在） -->
            <div ref="estimationChartRef" style="width: 100%; height: 100%;"></div>
          </div>
        </a-card>
      </a-col>

      <!-- 右侧：历史净值折线图（✅ 容器始终存在） -->
      <a-col :span="12">
        <a-card class="historical-nav-chart-card">
          <template #title>
            <div class="chart-title">
              <span>历史净值走势</span>
              <a-space>
                <a-select
                  v-model:value="navTimeRange"
                  style="width: 100px"
                  size="small"
                  @change="loadHistoricalNavData"
                  :loading="navLoading"
                  :disabled="!fundInfo || navLoading"
                >
                  <a-select-option value="1y">近1年</a-select-option>
                  <a-select-option value="6m">近6月</a-select-option>
                  <a-select-option value="3m">近3月</a-select-option>
                  <a-select-option value="1m">近1月</a-select-option>
                </a-select>
                <a-button
                  size="small"
                  type="link"
                  @click="refreshHistoricalNavData"
                  :loading="navLoading"
                  :disabled="!fundInfo || navLoading"
                >
                  <ReloadOutlined /> 刷新
                </a-button>
              </a-space>
            </div>
          </template>

          <!-- ✅ 容器始终存在，内部处理不同状态 -->
          <div style="width: 100%; height: 300px; position: relative;">
            <!-- 1. 加载状态 -->
            <a-spin
              v-if="navLoading && historicalNavData.length === 0"
              style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"
            />

            <!-- 2. 空状态 -->
            <div v-else-if="!navLoading && historicalNavData.length === 0" style="height: 100%; display: flex; align-items: center; justify-content: center;">
              <a-empty description="暂无历史净值数据">
                <template #image>
                  <FundProjectionScreenOutlined style="color: #bfbfbf; font-size: 48px;" />
                </template>
                <template #footer>
                  <a-button type="primary" @click="refreshHistoricalNavData" :loading="navLoading">尝试刷新</a-button>
                </template>
              </a-empty>
            </div>

            <!-- 3. 有数据时显示图表（✅ 容器始终存在） -->
            <div ref="historicalNavChartRef" style="width: 100%; height: 100%;"></div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 在实时估值图表下方添加基金持仓饼状图 -->
    <!-- 基金持仓饼状图卡片 - 始终显示标题栏 -->
    <a-card v-if="fundInfo" class="holdings-chart-card" style="margin-top: 16px;">
  <template #title>
    <div class="chart-title">
      <span>基金持仓 {{ holdingsQuarter ? `(${holdingsQuarter})` : '' }}</span>
      <a-space>
        <a-select
          v-model:value="selectedYear"
          style="width: 120px"
          size="small"
          @change="loadHoldingsData"
          :loading="holdingsLoading"
        >
          <a-select-option
            v-for="year in availableYears"
            :key="year"
            :value="year"
          >
            {{ year }}年
          </a-select-option>
        </a-select>
        <a-button
          size="small"
          type="link"
          @click="refreshHoldingsData"
          :loading="holdingsLoading"
        >
          <ReloadOutlined /> 刷新
        </a-button>
      </a-space>
    </div>
  </template>

  <!-- 图表容器始终存在，通过 v-show 控制显示内容 -->
  <div style="width: 100%; height: 400px; position: relative;">
    <!-- 空数据提示 -->
    <div
      v-show="!holdingsLoading && holdingsData.length === 0"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 1;"
    >
      <a-empty description="暂无持仓数据">
        <template #image>
          <FundProjectionScreenOutlined style="color: #bfbfbf; font-size: 48px;" />
        </template>
      </a-empty>
    </div>

    <!-- 图表容器（始终渲染，但可能被空数据遮挡） -->
    <div
      ref="holdingsChartRef"
      :style="{
        width: '100%',
        height: '100%',
        visibility: holdingsLoading || holdingsData.length > 0 ? 'visible' : 'hidden'
      }"
    ></div>
  </div>
</a-card>


    <!-- 加载状态 -->
    <div v-else-if="loading" class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <a-result status="error" :title="error" @click="loadFundDetail">
        <template #extra>
          <a-button type="primary" @click="loadFundDetail">重新加载</a-button>
        </template>
      </a-result>
    </div>

    <!-- 无数据状态 -->
    <div v-else class="no-data">
      <a-empty description="未找到基金详情" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { fundApi } from '@/api/fund'
import * as echarts from 'echarts'
import { ReloadOutlined, FundProjectionScreenOutlined } from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()

// 基金代码从路由参数获取
const fundCode = route.params.Detail_fund_code

// 响应式数据
const fundInfo = ref(null)
const loading = ref(false)
const error = ref('')
const watchlistLoading = ref(false)
const isWatched = ref(false)
const autoRefreshTimer = ref(null)
// 实时估值相关
const estimationHistory = ref([])
const estimationLoading = ref(false)
const estimationChartRef = ref(null)
let estimationChartInstance = null
const currentEstimationDate = ref('')

// 历史净值相关
const historicalNavData = ref([])
const navLoading = ref(false)
const historicalNavChartRef = ref(null)
let historicalNavChartInstance = null
const navTimeRange = ref('1y') // 默认显示近1年

// 基金持仓相关
const holdingsData = ref([])
const holdingsLoading = ref(false)
const holdingsChartRef = ref(null)
let holdingsChartInstance = null
const holdingsQuarter = ref('')
const selectedYear = ref(new Date().getFullYear().toString())
const availableYears = ref([])

// 加载基金详情
const loadFundDetail = async () => {
  if (!fundCode) {
    error.value = '无效的基金代码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await fundApi.getFundDetail(fundCode)

    if (result.success) {
      fundInfo.value = result.data
      // 加载完基金详情后，立即检查自选状态
      await checkWatchlistStatus()
      // 加载估值数据
      await loadEstimationHistory()
    } else {
      error.value = result.message || '获取基金详情失败'
    }
  } catch (err) {
    console.error('加载基金详情失败:', err)
    error.value = '网络错误，请稍后重试'
    message.error('加载基金详情失败')
  } finally {
    loading.value = false
  }
}

// 检查自选状态
const checkWatchlistStatus = async () => {
  try {
    const result = await fundApi.checkInWatchlist(fundCode)
    if (result.success) {
      isWatched.value = result.data.is_watched
    }
  } catch (err) {
    console.error('检查自选状态失败:', err)
    // 即使检查失败也不影响主要功能，可以忽略或显示警告
  }
}

// 切换自选（带确认弹窗）- 复用 MyHoldingsTable 的逻辑
const toggleFavorite = async () => {
  if (!fundInfo.value) return

  const fundCode = fundInfo.value['基金代码']
  const fundName = fundInfo.value['基金名称']

  try {
    if (isWatched.value) {
      // 取消自选 - 显示确认弹窗
      const confirmed = await new Promise(resolve => {
        Modal.confirm({
          title: '确认取消自选？',
          content: `确定要将基金 [ $ {fundCode}  $ {fundName}] 从观察清单中移除吗？`,
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
      isWatched.value = false
    } else {
      // 加入自选
      await fundApi.addToStore(fundCode)
      message.success('已加入自选')
      isWatched.value = true
    }

    // 重新检查状态确保同步
    await checkWatchlistStatus()
  } catch (error) {
    message.error(isWatched.value ? '取消失败' : '加入失败')
    console.error(error)
  }
}

// 加载估值历史数据
const loadEstimationHistory = async () => {
  if (!fundCode) return

  estimationLoading.value = true
  try {
    const result = await fundApi.getFundEstimationHistory(fundCode)
    if (result.success) {
      estimationHistory.value = result.data || []

      // 设置当前估值日期
      if (estimationHistory.value.length > 0) {
        currentEstimationDate.value = estimationHistory.value[0].estimation_date || ''
      }

      await nextTick()
      renderEstimationChart()
    }
  } catch (err) {
    console.error('加载估值数据失败:', err)
    message.warning('加载估值数据失败')
  } finally {
    estimationLoading.value = false
  }
}

const startAutoRefresh = () => {
  // 先清除已存在的定时器
  stopAutoRefresh()
  // 每5分钟（300000毫秒）自动刷新一次
  autoRefreshTimer.value = setInterval(() => {
    loadEstimationHistory()
  }, 5 * 60 * 1000)
}

const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

// 刷新估值数据
// 修改现有的 refreshEstimationData 函数，确保手动刷新时重置自动刷新
const refreshEstimationData = async () => {
  await loadEstimationHistory()
  // 手动刷新后重置自动刷新定时器
  startAutoRefresh()
}


// 渲染估值折线图
const renderEstimationChart = () => {
    if (!estimationChartRef.value) {
    console.warn('实时估值图表容器未找到，100ms 后重试')
    setTimeout(renderEstimationChart, 100)
    return
  }
  if (!estimationChartInstance) {
    estimationChartInstance = echarts.init(estimationChartRef.value)
  }

  const data = estimationHistory.value
  if (data.length === 0) {
    estimationChartInstance.showLoading({
      text: '暂无估值数据',
      color: '#c0c0c0',
      textColor: '#999',
      maskColor: 'rgba(255, 255, 255, 0.8)'
    })
    return
  }

  estimationChartInstance.hideLoading()

  // 准备数据
  const times = data.map(item => {
    const fetchTime = new Date(item.fetch_time)
    return `${fetchTime.getHours().toString().padStart(2, '0')}:${fetchTime.getMinutes().toString().padStart(2, '0')}`
  })

  const navValues = data.map(item => item.estimated_nav)
  // 后端返回的 daily_growth_rate 已经是百分比数值，不需要乘以 100
  const growthRates = data.map(item =>
    item.daily_growth_rate !== null ? item.daily_growth_rate : null
  )

  // 计算净值的最小值和最大值
  const navMin = Math.min(...navValues)
  const navMax = Math.max(...navValues)
  const navRange = navMax - navMin

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params) {
        const timeStr = params[0].axisValue
        let html = `<div style="padding: 8px; background: rgba(255, 255, 255, 0.9); border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`
        html += `<div style="font-size: 12px; color: #666; margin-bottom: 8px;">${timeStr}</div>`

        params.forEach(param => {
          if (param.seriesName === '估算净值') {
            html += `<div style="margin-bottom: 4px;">`
            html += `<span style="color: #1890ff;">${param.marker}</span>`
            html += `<span style="margin-left: 4px; font-weight: 500;">${param.seriesName}</span>`
            html += `<span style="margin-left: 8px; color: #333;">${param.value.toFixed(4)}</span>`
            html += `</div>`
          } else if (param.seriesName === '日增长率') {
            html += `<div style="margin-bottom: 4px;">`
            html += `<span style="color: #f5222d;">${param.marker}</span>`
            html += `<span style="margin-left: 4px; font-weight: 500;">${param.seriesName}</span>`
            html += `<span style="margin-left: 8px; color: #333;">${param.value !== null ? param.value.toFixed(2) + '%' : '--%'}</span>`
            html += `</div>`
          }
        })
        html += '</div>'
        return html
      }
    },
    legend: {
      data: ['估算净值', '日增长率'],
      bottom: 10,
      textStyle: { fontSize: 12 }
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
      data: times,
      axisLabel: {
        rotate: 45,
        fontSize: 12
      },
      axisTick: {
        alignWithLabel: true
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '净值',
        position: 'left',
        axisLine: { show: true },
        axisLabel: {
          formatter: '{value}',
          fontSize: 12
        },
        // 动态调整Y轴范围，突出显示微小波动
        min: navRange === 0 ? navMin - 0.001 : navMin - navRange * 0.1,
        max: navRange === 0 ? navMax + 0.001 : navMax + navRange * 0.1,
        minInterval: 0.0001, // 更精细的刻度
        splitLine: {
          lineStyle: {
            color: '#eee'
          }
        }
      },
      {
        type: 'value',
        name: '增长率 (%)',
        position: 'right',
        axisLine: { show: true },
        axisLabel: {
          formatter: '{value}%',
          fontSize: 12
        },
        splitLine: {
          lineStyle: {
            color: '#eee'
          }
        }
      }
    ],
    series: [
      {
        name: '估算净值',
        type: 'line',
        yAxisIndex: 0,
        data: navValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: '#1890ff'
        },
        itemStyle: {
          color: '#1890ff'
        }
      },
      {
        name: '日增长率',
        type: 'line',
        yAxisIndex: 1,
        data: growthRates,
        smooth: true,
        symbol: ' circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: '#f5222d'
        },
        itemStyle: {
          color: '#f5222d'
        }
      }
    ]
  }

  estimationChartInstance.setOption(option)
}

// 加载可用年份
const loadAvailableYears = async () => {
  try {
    const currentYear = new Date().getFullYear()
    // 生成过去5年的年份选项
    availableYears.value = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())
    // 默认选择当前年份
    selectedYear.value = currentYear.toString()
  } catch (err) {
    console.error('加载年份列表失败:', err)
  }
}

// 加载历史净值数据
const loadHistoricalNavData = async (timeRange = null) => {
  // 添加前置检查：只有当基金信息存在时才加载数据
  if (!fundCode || !fundInfo.value) {
    console.log('跳过历史净值加载：基金信息不存在')
    return
  }
  navLoading.value = true
  try {
    const range = timeRange || navTimeRange.value
    let params = {}

    // 根据时间范围设置参数
    if (range !== 'all') {
      const now = new Date()
      let startDate
      switch (range) {
        case '1y':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
          break
        case '6m':
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
          break
        case '3m':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
          break
        case '1m':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
          break
        default:
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      }
      params.start_date = startDate.toISOString().split('T')[0]
    }

    // 使用你后端已有的接口
    const result = await fundApi.getFundMovingAverages(fundCode, params)
     console.log('API 返回结果:', result)

    if (result.success) {
      historicalNavData.value = result.data || []
      await nextTick()
      renderHistoricalNavChart()
    }
  } catch (err) {
    console.error('加载历史净值数据失败:', err)
    message.error('加载历史净值数据失败')
    historicalNavData.value = []
  } finally {
    navLoading.value = false
  }
}

// 刷新历史净值数据
const refreshHistoricalNavData = async () => {
  await loadHistoricalNavData()
}

// 渲染历史净值折线图
const renderHistoricalNavChart = () => {
// 安全检查：容器是否存在
  if (!historicalNavChartRef.value) {
    console.warn('历史净值图表容器未找到，100ms 后重试')
    setTimeout(() => {
      // ✅ 无论是否有数据都重试（之前只在有数据时重试）
      renderHistoricalNavChart()
    }, 100)
    return
  }

  // 初始化图表实例
  if (!historicalNavChartInstance) {
    historicalNavChartInstance = echarts.init(historicalNavChartRef.value)
  }

  const data = historicalNavData.value

  // 显示 loading 状态
  if (data.length === 0) {
    historicalNavChartInstance.showLoading({
      text: '暂无历史净值数据',
      color: '#c0c0c0',
      textColor: '#999',
      maskColor: 'rgba(255, 255, 255, 0.8)'
    })
    return
  }

  historicalNavChartInstance.hideLoading()

  // 准备数据
  const dates = data.map(item => item.nav_date)
  const netValues = data.map(item => item.net_value)
  const ma5Values = data.map(item => item.ma5)
  const ma10Values = data.map(item => item.ma10)
  const ma30Values = data.map(item => item.ma30)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
  trigger: 'axis',
  axisPointer: {
    type: 'shadow',
    label: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: '#fff',
      padding: [3, 5],
      borderRadius: 3
    }
  },
  formatter: function(params) {
    const date = params[0].axisValue;
    let result = `<div style="padding: 8px; background: white; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`;
    result += `<div style="font-size: 12px; color: #666;">${date}</div>`;

    params.forEach(param => {
      if (param.seriesName === '单位净值') {
        result += `<div style="margin-top: 4px;"><span style="color: ${param.color};">●</span> <strong>${param.seriesName}</strong>: ${param.value.toFixed(4)}</div>`;
      } else {
        result += `<div style="margin-top: 4px;"><span style="color: ${param.color};">●</span> ${param.seriesName}: ${param.value.toFixed(4)}</div>`;
      }
    });
    result += '</div>';
    return result;
  },
  textStyle: {
    fontSize: 12,
    color: '#333'
  }
},
    legend: {
      data: ['单位净值', '5日均线', '10日均线', '30日均线'],
      bottom: 25, // 增加到底部的距离，为滑块留出空间
      left: 'center', // 居中显示
      textStyle: {
        fontSize: 12,
        color: '#666'
      },
      itemWidth: 10, // 缩小图例标记宽度
      itemHeight: 10, // 缩小图例标记高度
      itemGap: 15 // 增加图例项间距
    },
    grid: {
  left: '5%',
  right: '5%',
  bottom: '18%', // 为图例和滑块留出空间
  top: '15%', // 上方留白，避免标题遮挡
  containLabel: true
},
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        rotate: 45,
        fontSize: 10
      },
      axisTick: {
        alignWithLabel: true
      }
    },
    yAxis: {
      type: 'value',
      name: '净值',
      axisLine: {
        show: true
      },
      axisLabel: {
        formatter: '{value}',
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          color: '#eee'
        }
      }
    },
   dataZoom: [
  {
    type: 'inside',
    start: 0,
    end: 100
  },
  {
    show: true,
    type: 'slider',
    bottom: 10, // 固定在底部
    height: 18, // 稍小的高度
    textStyle: {
      fontSize: 10,
      color: '#999'
    },
    handleStyle: {
      color: '#1890ff',
      borderColor: '#4096ff',
      shadowBlur: 2,
      shadowColor: 'rgba(24, 144, 255, 0.3)'
    },
    fillerStyle: {
      color: 'rgba(24, 144, 255, 0.2)',
      opacity: 0.8
    },
    // ✅ 关键：隐藏部分按钮，简化UI
    showDetail: false, // 不显示数值
    zoomLock: true, // 锁定缩放比例
    // ✅ 可选：自定义滑块两端的三角形
    sliderStyle: {
      color: 'rgba(24, 144, 255, 0.5)',
      opacity: 0.8
    }
  }
],
    series: [
  {
    name: '单位净值',
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: {
      width: 2,
      color: '#1890ff'
    },
    areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
        { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
      ])
    },
    emphasis: {
      focus: 'series'
    },
    data: netValues
  },
  {
    name: '5日均线',
    type: 'line',
    smooth: true,
    symbol: 'none',
    lineStyle: {
      width: 1.5,
      color: '#2f54eb'
    },
    data: ma5Values
  },
  {
    name: '10日均线',
    type: 'line',
    smooth: true,
    symbol: 'none',
    lineStyle: {
      width: 1.5,
      color: '#5cb85c'
    },
    data: ma10Values
  },
  {
    name: '30日均线',
    type: 'line',
    smooth: true,
    symbol: 'none',
    lineStyle: {
      width: 1.5,
      color: '#f0ad4e'
    },
    data: ma30Values
  }
]
  }

  historicalNavChartInstance.setOption(option)
}

// 窗口大小变化处理
const handleHistoricalNavResize = () => {
  historicalNavChartInstance?.resize()
}

// ✅ 改进持仓数据加载函数
const loadHoldingsData = async (year = null) => {
  if (!fundCode) {
    console.warn('跳过持仓数据加载：无效的基金代码')
    return
  }

  holdingsLoading.value = true
  try {
    const targetYear = year || selectedYear.value
    console.log(`📊 正在加载 ${targetYear} 年持仓数据，基金代码: ${fundCode}`)

    const result = await fundApi.getFundHoldings(fundCode, { year: targetYear })

    console.log('📊 持仓API响应:', {
      success: result.success,
      dataLength: result.data?.length || 0,
      quarter: result.quarter,
      error: result.message
    })

    if (result.success) {
      holdingsData.value = result.data || []
      holdingsQuarter.value = result.quarter || ''

      await nextTick()
      renderHoldingsChart() // ✅ 确保在DOM更新后渲染
    } else {
      holdingsData.value = []
      message.warning(result.message || '获取持仓数据失败')
    }
  } catch (err) {
    console.error('🔥 加载持仓数据失败:', err)
    message.error('加载持仓数据失败')
    holdingsData.value = []
  } finally {
    holdingsLoading.value = false
  }
}

// 刷新持仓数据
const refreshHoldingsData = async () => {
  await loadHoldingsData(selectedYear.value)
}

// 渲染持仓饼状图
const renderHoldingsChart = () => {
    if (!holdingsChartRef.value) {
    console.warn('持仓图表容器未找到，100ms 后重试')
    setTimeout(() => {
      renderHoldingsChart() // ✅ 关键：添加重试
    }, 100)
    return
  }

  // 确保图表实例存在
  if (!holdingsChartInstance) {
    holdingsChartInstance = echarts.init(holdingsChartRef.value)
  }

  const data = holdingsData.value

  if (data.length === 0) {
    // 显示空数据提示（由模板控制）
    holdingsChartInstance.clear()
    return
  }

  // 清除之前的 loading 状态
  holdingsChartInstance.hideLoading()

  // 准备饼图数据
  const pieData = data
    .filter(item => item.proportion_of_nav !== null && item.proportion_of_nav > 0)
    .map(item => ({
      name: `${item.stock_name} (${item.stock_code})`,
      value: item.proportion_of_nav,
      stock_code: item.stock_code,
      stock_name: item.stock_name
    }))
    .sort((a, b) => b.value - a.value)

  // 如果数据太多，只显示前10个，其余合并为"其他"
  let displayData = []
  let otherValue = 0

  if (pieData.length > 10) {
    displayData = pieData.slice(0, 10)
    otherValue = pieData.slice(10).reduce((sum, item) => sum + item.value, 0)
    if (otherValue > 0) {
      displayData.push({
        name: '其他',
        value: otherValue
      })
    }
  } else {
    displayData = pieData
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        return `${params.name}<br/>占比: ${params.value.toFixed(2)}%`
      }
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 20,
      bottom: 20,
      textStyle: {
        fontSize: 12,
        color: 'inherit'
      },
      formatter: function(name) {
        const item = displayData.find(d => d.name === name)
        if (item) {
          return `${name} (${item.value.toFixed(2)}%)`
        }
        return name
      }
    },
    series: [
      {
        name: '持仓占比',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 2,
          borderColor: '#fff',
          borderWidth: 1
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: displayData
      }
    ]
  }

  // 使用 setOption 而不是直接赋值，确保正确更新
  holdingsChartInstance.setOption(option, {
    notMerge: true, // 不合并配置，完全替换
    replaceMerge: ['series'] // 只替换 series 部分
  })
}

// 窗口大小变化处理
const handleHoldingsResize = () => {
  holdingsChartInstance?.resize()
}




// 返回上一页
const goBack = () => {
  router.go(-1)
}

// ✅ 修改 onMounted 钩子，确保正确的加载顺序
onMounted(() => {
  // 1. 先加载基金基础信息
  loadFundDetail().then(() => {
    // 2. 基金信息加载完成后，再加载所有图表数据
    if (fundInfo.value) {
      loadEstimationHistory()
      loadHistoricalNavData()
      loadHoldingsData() // ✅ 确保在 fundInfo 加载完成后调用
    }
  })

  startAutoRefresh()
  loadAvailableYears() // 年份列表可提前加载
})

// 组件卸载时清理
onUnmounted(() => {
  // 清理图表实例
  if (estimationChartInstance) {
    estimationChartInstance.dispose()
    estimationChartInstance = null
  }
  if (holdingsChartInstance) {
    holdingsChartInstance.dispose()
    holdingsChartInstance = null
  }
    if (historicalNavChartInstance) {
    historicalNavChartInstance.dispose()
    historicalNavChartInstance = null
  }

  // 停止自动刷新
  stopAutoRefresh()
  // 移除窗口大小监听
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('resize', handleHoldingsResize)
  window.removeEventListener('resize', handleHistoricalNavResize)

})

// 监听窗口大小变化
const handleResize = () => {
  estimationChartInstance?.resize()
}
window.addEventListener('resize', handleResize)
// 添加窗口大小监听
window.addEventListener('resize', handleHoldingsResize)
// 添加窗口大小监听
window.addEventListener('resize', handleHistoricalNavResize)

</script>

<style scoped>
.fund-detail-container {
  padding: 0 24px;
  min-height: calc(100vh - 64px - 16px);
}

.fund-detail-card {
  margin-top: 16px;
}

.fund-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fund-title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
}

.fund-code {
  color: #666;
  font-size: 16px;
  margin: 0;
}

/* 信息卡片样式 */
.info-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 专业信息卡片样式 */
.professional-card {
  background-color: #f9f9f9;
}

.professional-content {
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  text-align: justify;
  color: rgba(0, 0, 0, 0.85);
  font-size: 14px;
  padding: 12px 0;
}

/* 长文本滚动容器 */
.scrollable-content {
  max-height: 150px;
  overflow-y: auto;
  padding-right: 8px;
}

.scrollable-content::-webkit-scrollbar {
  width: 6px;
}

.scrollable-content::-webkit-scrollbar-track {
  background: transparent;
}

.scrollable-content::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.scrollable-content::-webkit-scrollbar-thumb:hover {
  background: #999;
}

/* 图表标题样式 */
.chart-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 加载和错误状态 */
.loading-container,
.error-container,
.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

/* 暗色模式适配 */
html[data-theme='dark'] .fund-detail-container {
  color: rgba(255, 255, 255, 0.85);
}

html[data-theme='dark'] .professional-card {
  background-color: rgba(255, 255, 255, 0.04);
}

html[data-theme='dark'] .professional-content {
  color: rgba(255, 255, 255, 0.85);
}

html[data-theme='dark'] .scrollable-content::-webkit-scrollbar-thumb {
  background: #666;
}

html[data-theme='dark'] .scrollable-content::-webkit-scrollbar-thumb:hover {
  background: #888;
}

/* 持仓图表标题样式 */
.chart-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 暗色模式适配 */
html[data-theme='dark'] .holdings-chart-card {
  background-color: rgba(255, 255, 255, 0.04);
}

html[data-theme='dark'] .no-holdings-card {
  background-color: rgba(255, 255, 255, 0.04);
}


/* 历史净值图表样式 */
.historical-nav-chart-card {
  height: 100%;
}

/* 暗色模式适配 */
html[data-theme='dark'] .historical-nav-chart-card {
  background-color: rgba(255, 255, 255, 0.04);
}

html[data-theme='dark'] .no-nav-card {
  background-color: rgba(255, 255, 255, 0.04);
}

/* 图表标题样式保持一致 */
.chart-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
</style>