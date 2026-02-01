// src/api/stock.js
import axios from '@/utils/axios';

export const stockApi = {
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
};