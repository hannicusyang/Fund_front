/**
 * 股票模型API接口 - 完整版
 */

const API_BASE = '/api'

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  return response.json()
}

export const stockScreeningApi = {
  // 多因子选股筛选
  async screenStocks(factors = {}) {
    const params = new URLSearchParams()
    
    // 估值因子
    if (factors.valuation?.pe) params.append('valuation_pe', factors.valuation.pe.join(','))
    if (factors.valuation?.pb) params.append('valuation_pb', factors.valuation.pb.join(','))
    if (factors.valuation?.ps) params.append('valuation_ps', factors.valuation.ps.join(','))
    
    // 动量因子
    if (factors.momentum?.change_percent) params.append('momentum_change_percent', factors.momentum.change_percent.join(','))
    if (factors.momentum?.change_5d) params.append('momentum_change5d', factors.momentum.change_5d.join(','))
    if (factors.momentum?.change_10d) params.append('momentum_change10d', factors.momentum.change_10d.join(','))
    if (factors.momentum?.change_20d) params.append('momentum_change20d', factors.momentum.change_20d.join(','))
    if (factors.momentum?.change_60d) params.append('momentum_change60d', factors.momentum.change_60d.join(','))
    if (factors.momentum?.turnover_rate) params.append('momentum_turnover_rate', factors.momentum.turnover_rate.join(','))
    
    // 规模因子
    if (factors.scale?.market_cap) params.append('scale_market_cap', factors.scale.market_cap.join(','))
    if (factors.scale?.circulating_cap) params.append('scale_circulating_cap', factors.scale.circulating_cap.join(','))
    
    return request(`${API_BASE}/stock/screen?${params.toString()}`)
  },

  // 获取因子范围
  async getFactorRanges() {
    return request(`${API_BASE}/stock/factors`)
  },

  // 获取股票列表
  async getStockList(page = 1, pageSize = 50, search = '') {
    const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() })
    if (search) params.append('search', search)
    return request(`${API_BASE}/stock/list?${params.toString()}`)
  },

  // 获取市场统计
  async getMarketStats() {
    return request(`${API_BASE}/stock/stats`)
  },

  // 手动触发同步
  async triggerSync() {
    return request(`${API_BASE}/stock/sync`, { method: 'POST' })
  }
}

export const stockAnalysisApi = {
  async getKlineData(stockCode, period = 'daily') {
    return request(`${API_BASE}/stock/kline/${stockCode}?period=${period}`)
  },
  async getMoneyFlow(stockCode) {
    return request(`${API_BASE}/stock/moneyflow/${stockCode}`)
  }
}

export const stockPortfolioApi = {
  async optimizePortfolio(stocks, strategy = 'equal') {
    return request(`${API_BASE}/stock/portfolio/optimize`, { method: 'POST', body: JSON.stringify({ stocks, strategy }) })
  },
  async calculatePortfolioMetrics(portfolio) {
    return request(`${API_BASE}/stock/portfolio/metrics`, { method: 'POST', body: JSON.stringify(portfolio) })
  }
}

export const stockBacktestApi = {
  async runBacktest(params) {
    return request(`${API_BASE}/stock/backtest`, { method: 'POST', body: JSON.stringify(params) })
  },
  async getBacktestResult(backtestId) {
    return request(`${API_BASE}/stock/backtest/${backtestId}`)
  }
}
