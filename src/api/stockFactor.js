// api/stockFactor.js
// 股票多因子API

const API_BASE = '/api'

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

export const stockFactorApi = {
  // 获取所有因子定义
  async getFactors() {
    return request(`${API_BASE}/stock/factors`)
  },
  
  // 获取快捷筛选预设
  async getQuickFilters() {
    return request(`${API_BASE}/stock/quick-filters`)
  },
  
  // 执行多因子筛选
  async screenStocks(params) {
    return request(`${API_BASE}/stock/screen`, {
      method: 'POST',
      body: JSON.stringify(params)
    })
  },
  
  // 获取保存的策略列表
  async getStrategies() {
    return request(`${API_BASE}/stock/strategies`)
  },
  
  // 保存策略
  async saveStrategy(data) {
    return request(`${API_BASE}/stock/strategies`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  
  // 删除策略
  async deleteStrategy(id) {
    return request(`${API_BASE}/stock/strategies/${id}`, {
      method: 'DELETE'
    })
  }
}
