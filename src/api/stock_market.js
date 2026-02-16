// src/api/stock_market.js
import axios from '@/utils/axios'

const API_BASE_URL = '/stock_market/'

/**
 * 股票市场数据API - 统一契约
 */
export const stockMarketApi = {
  /**
   * 获取权威最近交易日
   */
  getLatestTradingDay() {
    return axios.get(`${API_BASE_URL}trading_day/latest`)
  },

  /**
   * 检查日期是否为交易日
   */
  checkTradingDay(date) {
    return axios.get(`${API_BASE_URL}trading_day/check`, { params: { date } })
  },

  /**
   * 获取上交所市场总貌
   * @param {string} date - 日期，格式YYYY-MM-DD或YYYYMMDD
   */
  getSSESummary(date) {
    // 标准化日期格式
    const normalizedDate = date.replace(/-/g, '')
    return axios.get(`${API_BASE_URL}sse/summary`, { params: { date: normalizedDate } })
  },

  /**
   * 获取深交所市场总貌
   */
  getSZSESummary(date) {
    const normalizedDate = date.replace(/-/g, '')
    return axios.get(`${API_BASE_URL}szse/summary`, { params: { date: normalizedDate } })
  },

  /**
   * 获取深交所地区交易数据
   */
  getSZSEAreaSummary(date) {
    // 月份格式 YYYY-MM
    const yearMonth = date.substring(0, 7).replace(/-/g, '')
    return axios.get(`${API_BASE_URL}szse/area-summary`, { params: { date: yearMonth } })
  },

  /**
   * 获取深交所行业成交数据
   */
  getSZSESectorSummary(date, symbol = '当年') {
    const yearMonth = date.substring(0, 7).replace(/-/g, '')
    return axios.get(`${API_BASE_URL}szse/sector-summary`, {
      params: { date: yearMonth, symbol }
    })
  }
}

export default stockMarketApi