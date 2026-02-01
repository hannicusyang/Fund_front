// src/composables/useStockMarket.js
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { stockMarketApi } from '@/api/stock_market'
import dayjs from 'dayjs'

/**
 * 股票市场数据业务逻辑 - 组合式API
 */
export function useStockMarket() {
  // 状态管理
  const state = ref({
    loading: false,
    error: null,
    lastUpdate: '',
    sseData: null,
    szseData: null,
    selectedDate: dayjs().format('YYYY-MM-DD'),
    exchangeType: 'sse',
    dataType: 'summary'
  })

  // 派生状态
  const summaryData = computed(() => {
    return state.value.exchangeType === 'sse'
      ? state.value.sseData?.summary
      : state.value.szseData?.summary
  })

  const formattedUpdateTime = computed(() => {
    if (!state.value.lastUpdate) return '暂无更新时间'
    return dayjs(state.value.lastUpdate).format('YYYY-MM-DD HH:mm')
  })

  // 业务方法
  const loadLatestTradingDay = async () => {
    try {
      const res = await stockMarketApi.getLatestTradingDay()
      if (res.data.success) {
        state.value.selectedDate = res.data.data.date_formatted
        return true
      }
      return false
    } catch (error) {
      console.warn('获取交易日失败，使用本地计算:', error)
      // 本地计算最近交易日（保守策略）
      calculateLocalTradingDay()
      return true
    }
  }

  const calculateLocalTradingDay = () => {
    const today = dayjs()
    let workingDay = today

    // 如果是周末，回退到周五
    if (today.day() === 0) { // 周日
      workingDay = today.subtract(2, 'day')
    } else if (today.day() === 6) { // 周六
      workingDay = today.subtract(1, 'day')
    }

    state.value.selectedDate = workingDay.format('YYYY-MM-DD')
  }

  const loadData = async () => {
    state.value.loading = true
    state.value.error = null

    try {
      let apiCall

      if (state.value.dataType === 'summary') {
        apiCall = state.value.exchangeType === 'sse'
          ? stockMarketApi.getSSESummary(state.value.selectedDate)
          : stockMarketApi.getSZSESummary(state.value.selectedDate)
      } else if (state.value.dataType === 'area') {
        apiCall = stockMarketApi.getSZSEAreaSummary(state.value.selectedDate)
      } else {
        apiCall = stockMarketApi.getSZSESectorSummary(state.value.selectedDate, '当年')
      }

      const response = await apiCall

      if (response.data.success) {
        const data = response.data.data
        state.value.lastUpdate = data.update_time || new Date().toISOString()

        if (state.value.exchangeType === 'sse') {
          state.value.sseData = data
        } else {
          state.value.szseData = data
        }

        // 处理警告信息
        if (response.data.warning) {
          message.warning(response.data.warning)
        }
      } else {
        throw new Error(response.data.message || '数据加载失败')
      }

    } catch (error) {
      console.error('数据加载失败:', error)
      state.value.error = error
      message.error(`数据加载失败: ${error.message}`)
    } finally {
      state.value.loading = false
    }
  }

  const refreshData = async () => {
    await loadData()
  }

  const handleDateChange = (date) => {
    if (date) {
      state.value.selectedDate = date
    }
  }

  // 生命周期
  onMounted(async () => {
    await loadLatestTradingDay()
    await loadData()
  })

  // 监听状态变化
  watch(() => [state.value.selectedDate, state.value.exchangeType, state.value.dataType],
    ([newDate, newExchange, newDataType], [oldDate, oldExchange, oldDataType]) => {
      // 避免初始化时的重复加载
      if (oldDate && (newDate !== oldDate || newExchange !== oldExchange || newDataType !== oldDataType)) {
        loadData()
      }
    },
    { deep: true }
  )

  return {
    state,
    summaryData,
    formattedUpdateTime,
    loadData,
    refreshData,
    handleDateChange,
    setExchangeType: (type) => { state.value.exchangeType = type },
    setDataType: (type) => { state.value.dataType = type }
  }
}