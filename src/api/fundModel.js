// API 服务 - 统一管理与 Fund_backend 的交互

const API_BASE = '/api'

// 通用请求函数
async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

// 基金筛选相关 API
export const fundScreeningApi = {
  // 获取筛选范围（动态滑块范围）
  async getScreenRanges() {
    return request(`${API_BASE}/lab/screen/ranges`)
  },

  // 多维度基金筛选
  async screenFunds(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    return request(`${API_BASE}/lab/screen?${queryString}`)
  },

  // 快捷筛选
  async quickFilter(filterType, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    return request(`${API_BASE}/lab/quick-filter/${filterType}?${queryString}`)
  },

  // 导出基金数据
  async exportFunds(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    window.open(`${API_BASE}/lab/export/funds?${queryString}`, '_blank')
  }
}

// 基金分析相关 API
export const fundAnalysisApi = {
  // 获取基金历史收益率数据
  async getReturnsAnalysis(fundCodes, startDate, endDate) {
    const codes = Array.isArray(fundCodes) ? fundCodes.join(',') : fundCodes
    let url = `${API_BASE}/lab/analysis/returns/${codes}`
    if (startDate) url += `?start_date=${startDate}`
    if (endDate) url += `${startDate ? '&' : '?'}end_date=${endDate}`
    return request(url)
  },

  // 计算基金相关性矩阵
  async calculateCorrelation(fundCodes, startDate, endDate) {
    return request(`${API_BASE}/lab/analysis/correlation`, {
      method: 'POST',
      body: JSON.stringify({ fund_codes: fundCodes, start_date: startDate, end_date: endDate })
    })
  },

  // 获取基金量化指标
  async getMetrics(fundCodes) {
    const codes = Array.isArray(fundCodes) ? fundCodes.join(',') : fundCodes
    return request(`${API_BASE}/lab/analysis/metrics/${codes}`)
  },

  // 计算组合指标
  async calculateMetrics(funds) {
    return request(`${API_BASE}/lab/analysis/calculate-metrics`, {
      method: 'POST',
      body: JSON.stringify({ funds })
    })
  }
}

// 组合相关 API
export const fundPortfolioApi = {
  // 优化组合权重
  async optimizePortfolio(funds, strategy = 'equal') {
    return request(`${API_BASE}/lab/portfolio/optimize`, {
      method: 'POST',
      body: JSON.stringify({ funds, strategy })
    })
  }
}

// 回测相关 API
export const fundBacktestApi = {
  // 运行回测
  async runBacktest(config) {
    return request(`${API_BASE}/lab/backtest`, {
      method: 'POST',
      body: JSON.stringify(config)
    })
  },

  // 保存回测结果
  async saveBacktestResult(data) {
    return request(`${API_BASE}/lab/backtest/save`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
}

// 基金基础信息 API（使用原有接口）
export const fundBaseApi = {
  // 获取基金排名列表
  async getFundRankList(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    return request(`${API_BASE}/funds/list?${queryString}`)
  },
  
  // 获取基金详情
  async getFundDetail(fundCode) {
    return request(`${API_BASE}/fund_detail/detail/${fundCode}`)
  },
  
  // 获取基金持仓
  async getFundHoldings(fundCode) {
    return request(`${API_BASE}/fund_detail/detail/holdings/${fundCode}/`)
  },
  
  // 获取我的持仓
  async getMyHoldings() {
    return request(`${API_BASE}/holding/list`)
  },

  // 获取关注列表
  async getWatchlist() {
    return request(`${API_BASE}/watchlist/list`)
  }
}

export default {
  screening: fundScreeningApi,
  analysis: fundAnalysisApi,
  portfolio: fundPortfolioApi,
  backtest: fundBacktestApi,
  base: fundBaseApi
}
