// src/api/stock.js
import axios from '@/utils/axios';

export const stockApi = {
  // ========== 市场概览相关 ==========
  getSSESummary(params = {}) {
    return axios.get('/api/stock/sse-summary', { params });
  },
  getSSESummaryHistory(params = {}) {
    return axios.get('/api/stock/sse-summary/history', { params });
  },

  getSZSESummary(params = {}) {
    return axios.get('/api/stock/szse-summary', { params });
  },
  getSZSESummaryHistory(params = {}) {
    return axios.get('/api/stock/szse-summary/history', { params });
  },

  getSZSEAreaSummary(params = {}) {
    return axios.get('/api/stock/szse-area-summary', { params });
  },
  getSZSEAreaSummaryHistory(params = {}) {
    return axios.get('/api/stock/szse-area-summary/history', { params });
  },

  getSZSESectorSummary(params = {}) {
    return axios.get('/api/stock/szse-sector-summary', { params });
  },
  getSZSESectorSummaryHistory(params = {}) {
    return axios.get('/api/stock/szse-sector-summary/history', { params });
  },

  getSSEDealDaily(params = {}) {
    return axios.get('/api/stock/sse-deal-daily', { params });
  },
  getSSEDealDailyHistory(params = {}) {
    return axios.get('/api/stock/sse-deal-daily/history', { params });
  },

  // ========== 实时行情相关（新增）==========
  /** 获取所有A股实时行情 */
  getRealtimeList() {
    return axios.get('/api/stock/realtime');
  },

  /** 搜索股票 */
  searchStocks(keyword) {
    return axios.get('/api/stock/search', { params: { keyword } });
  },

  /** 获取单只股票详情 */
  getStockDetail(stockCode) {
    return axios.get(`/api/stock/detail/${stockCode}`);
  },

  // ========== 股票自选相关（新增）==========
  /** 获取股票自选列表 */
  getStockWatchlist() {
    return axios.get('/api/stock/watchlist/list');
  },

  /** 添加股票到自选 */
  addToWatchlist(data) {
    return axios.post('/api/stock/watchlist/add', data);
  },

  /** 从自选移除股票 */
  removeFromWatchlist(stockCode) {
    return axios.delete(`/api/stock/watchlist/remove/${stockCode}`);
  },

  /** 检查股票是否在自选 */
  checkInWatchlist(stockCode) {
    return axios.get(`/api/stock/watchlist/check/${stockCode}`);
  },
};