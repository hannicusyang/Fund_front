// stores/stockStrategy.js
// 股票策略状态管理 - Pinia Store

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const API_BASE = '/api/strategy'

export const useStockStrategyStore = defineStore('stockStrategy', () => {
  // ============ State ============
  
  // 当前用户组合配置
  const currentPortfolio = ref({
    id: null,
    name: '',
    description: '',
    stocks: [],
    strategyType: 'equal',
    strategyConfig: {},
    constraints: {},
    backtestSettings: {}
  })
  
  // 保存的配置列表
  const savedPortfolios = ref([])
  const savedTemplates = ref([])
  const savedScreeningStrategies = ref([])
  
  // 加载状态
  const loading = ref(false)
  const error = ref(null)
  
  // 自动保存定时器
  let autoSaveTimer = null
  
  // ============ Getters ============
  
  const portfolioStockCodes = computed(() => {
    return currentPortfolio.value.stocks.map(s => s.code)
  })
  
  const portfolioTotalWeight = computed(() => {
    return currentPortfolio.value.stocks.reduce((sum, s) => sum + (s.weight || 0), 0)
  })
  
  const canRunBacktest = computed(() => {
    return currentPortfolio.value.stocks.length > 0 && portfolioTotalWeight.value === 100
  })
  
  const hasUnsavedChanges = ref(false)
  
  // ============ Actions ============
  
  // 从localStorage恢复状态
  const restoreFromLocal = () => {
    try {
      const saved = localStorage.getItem('stock_portfolio_current')
      if (saved) {
        currentPortfolio.value = JSON.parse(saved)
        console.log('已恢复组合配置')
      }
    } catch (e) {
      console.error('恢复状态失败:', e)
    }
  }
  
  // 保存到localStorage
  const saveToLocal = () => {
    try {
      localStorage.setItem('stock_portfolio_current', JSON.stringify(currentPortfolio.value))
      hasUnsavedChanges.value = false
    } catch (e) {
      console.error('本地保存失败:', e)
    }
  }
  
  // 启用自动保存
  const enableAutoSave = () => {
    if (autoSaveTimer) clearInterval(autoSaveTimer)
    autoSaveTimer = setInterval(() => {
      if (hasUnsavedChanges.value) {
        saveToLocal()
      }
    }, 5000) // 每5秒自动保存
  }
  
  // 禁用自动保存
  const disableAutoSave = () => {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
  }
  
  // 设置股票列表
  const setStocks = (stocks) => {
    currentPortfolio.value.stocks = stocks
    hasUnsavedChanges.value = true
    saveToLocal()
  }
  
  // 添加股票
  const addStock = (stock) => {
    const exists = currentPortfolio.value.stocks.find(s => s.code === stock.code)
    if (!exists) {
      currentPortfolio.value.stocks.push(stock)
      hasUnsavedChanges.value = true
      saveToLocal()
    }
  }
  
  // 移除股票
  const removeStock = (code) => {
    currentPortfolio.value.stocks = currentPortfolio.value.stocks.filter(s => s.code !== code)
    hasUnsavedChanges.value = true
    saveToLocal()
  }
  
  // 更新权重
  const updateWeight = (code, weight) => {
    const stock = currentPortfolio.value.stocks.find(s => s.code === code)
    if (stock) {
      stock.weight = weight
      hasUnsavedChanges.value = true
      saveToLocal()
    }
  }
  
  // 设置策略类型
  const setStrategyType = (type) => {
    currentPortfolio.value.strategyType = type
    hasUnsavedChanges.value = true
    saveToLocal()
  }
  
  // 设置约束条件
  const setConstraints = (constraints) => {
    currentPortfolio.value.constraints = { ...currentPortfolio.value.constraints, ...constraints }
    hasUnsavedChanges.value = true
    saveToLocal()
  }
  
  // 从服务器加载保存的配置列表
  const loadSavedPortfolios = async (userId = 'default') => {
    loading.value = true
    try {
      const res = await axios.get(`${API_BASE}/portfolio/configs`, {
        params: { user_id: userId }
      })
      if (res.data.success) {
        savedPortfolios.value = res.data.data
      }
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }
  
  // 保存组合到服务器
  const savePortfolioToServer = async (name, userId = 'default') => {
    loading.value = true
    try {
      const data = {
        user_id: userId,
        name: name || currentPortfolio.value.name || `组合_${new Date().toLocaleDateString()}`,
        description: currentPortfolio.value.description,
        stocks: currentPortfolio.value.stocks,
        strategyType: currentPortfolio.value.strategyType,
        strategyConfig: currentPortfolio.value.strategyConfig,
        constraints: currentPortfolio.value.constraints,
        backtestSettings: currentPortfolio.value.backtestSettings
      }
      
      const res = await axios.post(`${API_BASE}/portfolio/configs`, data)
      if (res.data.success) {
        currentPortfolio.value.id = res.data.data.id
        await loadSavedPortfolios(userId)
        return { success: true, data: res.data.data }
      }
      return { success: false, message: res.data.message }
    } catch (e) {
      error.value = e.message
      return { success: false, message: e.message }
    } finally {
      loading.value = false
    }
  }
  
  // 从服务器加载特定配置
  const loadPortfolioFromServer = async (configId) => {
    loading.value = true
    try {
      // 这里需要添加一个获取单个配置的API
      // 暂时从列表中查找
      await loadSavedPortfolios()
      const config = savedPortfolios.value.find(c => c.id === configId)
      if (config) {
        currentPortfolio.value = {
          id: config.id,
          name: config.name,
          description: config.description,
          stocks: config.stocks || [],
          strategyType: config.strategyType || 'equal',
          strategyConfig: config.strategyConfig || {},
          constraints: config.constraints || {},
          backtestSettings: config.backtestSettings || {}
        }
        saveToLocal()
        return { success: true }
      }
      return { success: false, message: '配置不存在' }
    } catch (e) {
      error.value = e.message
      return { success: false, message: e.message }
    } finally {
      loading.value = false
    }
  }
  
  // 删除配置
  const deletePortfolio = async (configId, userId = 'default') => {
    try {
      const res = await axios.delete(`${API_BASE}/portfolio/configs/${configId}`)
      if (res.data.success) {
        await loadSavedPortfolios(userId)
        return { success: true }
      }
      return { success: false, message: res.data.message }
    } catch (e) {
      return { success: false, message: e.message }
    }
  }
  
  // ============ 回测模板 ============
  
  const loadSavedTemplates = async (userId = 'default') => {
    try {
      const res = await axios.get(`${API_BASE}/backtest/templates`, {
        params: { user_id: userId }
      })
      if (res.data.success) {
        savedTemplates.value = res.data.data
      }
    } catch (e) {
      console.error('加载模板失败:', e)
    }
  }
  
  const saveTemplate = async (name, params, userId = 'default') => {
    try {
      const res = await axios.post(`${API_BASE}/backtest/templates`, {
        user_id: userId,
        name,
        params
      })
      if (res.data.success) {
        await loadSavedTemplates(userId)
        return { success: true }
      }
    } catch (e) {
      return { success: false, message: e.message }
    }
  }
  
  const getPresetTemplates = async () => {
    try {
      const res = await axios.get(`${API_BASE}/backtest/templates/presets`)
      if (res.data.success) {
        return res.data.data
      }
    } catch (e) {
      console.error('获取预设模板失败:', e)
    }
    return []
  }
  
  // ============ 筛选策略 ============
  
  const loadScreeningStrategies = async (userId = 'default') => {
    try {
      const res = await axios.get(`${API_BASE}/screening/strategies`, {
        params: { user_id: userId }
      })
      if (res.data.success) {
        savedScreeningStrategies.value = res.data.data
      }
    } catch (e) {
      console.error('加载筛选策略失败:', e)
    }
  }
  
  const saveScreeningStrategy = async (name, factors, userId = 'default') => {
    try {
      const res = await axios.post(`${API_BASE}/screening/strategies`, {
        user_id: userId,
        name,
        factors
      })
      if (res.data.success) {
        await loadScreeningStrategies(userId)
        return { success: true }
      }
    } catch (e) {
      return { success: false, message: e.message }
    }
  }
  
  // ============ 回测报告 ============
  
  const saveBacktestReport = async (result, params, userId = 'default') => {
    try {
      const data = {
        user_id: userId,
        portfolioId: currentPortfolio.value.id,
        params,
        summary: result.summary,
        curve: result.curve,
        trades: result.trades
      }
      
      const res = await axios.post(`${API_BASE}/backtest/reports`, data)
      return res.data
    } catch (e) {
      console.error('保存回测报告失败:', e)
      return { success: false }
    }
  }
  
  // ============ 初始化 ============
  
  const init = () => {
    restoreFromLocal()
    enableAutoSave()
  }
  
  const cleanup = () => {
    disableAutoSave()
  }
  
  return {
    // State
    currentPortfolio,
    savedPortfolios,
    savedTemplates,
    savedScreeningStrategies,
    loading,
    error,
    hasUnsavedChanges,
    
    // Getters
    portfolioStockCodes,
    portfolioTotalWeight,
    canRunBacktest,
    
    // Actions
    init,
    cleanup,
    setStocks,
    addStock,
    removeStock,
    updateWeight,
    setStrategyType,
    setConstraints,
    saveToLocal,
    loadSavedPortfolios,
    savePortfolioToServer,
    loadPortfolioFromServer,
    deletePortfolio,
    loadSavedTemplates,
    saveTemplate,
    getPresetTemplates,
    loadScreeningStrategies,
    saveScreeningStrategy,
    saveBacktestReport
  }
})
