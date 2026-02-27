// src/api/marketIntelligence.js
// 市场资讯API - 支持多新闻源

import axios from '@/utils/axios';

const axiosGet = axios.get;
const axiosPost = axios.post;

// 获取市场概览
export function getMarketOverview(params) {
  return axiosGet('/api/market/intelligence/overview', { params })
}

// 获取板块热力图
export function getSectorHeatmap(params) {
  return axiosGet('/api/market/intelligence/heatmap', { params })
}

// 获取涨跌排行
export function getTopStocks(params) {
  return axiosGet('/api/market/intelligence/top-stocks', { params })
}

// AI市场分析
export function getAIAnalysis(data) {
  return axiosPost('/api/market/intelligence/analysis', data)
}

// 获取龙虎榜数据
export function getTopList(params) {
  return axiosGet('/api/market/intelligence/top-list', { params })
}

// 获取资金流向（个股）
export function getMoneyFlow(params) {
  return axiosGet('/api/market/intelligence/moneyflow', { params })
}

// 获取沪深港通资金流向
export function getMoneyFlowHsgt(params) {
  return axiosGet('/api/market/intelligence/moneyflow-hsgt', { params })
}

// 获取大宗交易数据
export function getBlockTrade(params) {
  return axiosGet('/api/market/intelligence/block-trade', { params })
}

// 获取融资融券数据
export function getMargin(params) {
  return axiosGet('/api/market/intelligence/margin', { params })
}

// 获取财经新闻（支持多新闻源）
// 参数: { channel, source, time_range, keyword, limit }
export function getNews(params) {
  return axiosGet('/api/market/intelligence/news', { params })
}

// 获取指定新闻源列表
export function getNewsSources() {
  return axiosGet('/api/market/intelligence/news/sources')
}

// AI新闻分析
export function getNewsAIAnalysis(data) {
  return axiosPost('/api/market/intelligence/news/ai-analysis', data)
}

// 获取新闻详情
export function getNewsDetail(newsId) {
  return axiosGet(`/api/market/intelligence/news/detail/${newsId}`)
}

// 搜索新闻
export function searchNews(params) {
  return axiosGet('/api/market/intelligence/news/search', { params })
}

// 收藏新闻
export function favoriteNews(data) {
  return axiosPost('/api/market/intelligence/news/favorite', data)
}

// 获取收藏的新闻
export function getFavoriteNews(params) {
  return axiosGet('/api/market/intelligence/news/favorites', { params })
}

// 统一的获取市场资讯数据的函数（兼容旧代码）
export function getMarketIntelligence(params) {
  const { type } = params
  switch (type) {
    case 'top_list':
      return getTopList(params)
    case 'moneyflow':
      return getMoneyFlow(params)
    case 'moneyflow_hsgt':
      return getMoneyFlowHsgt(params)
    case 'block_trade':
      return getBlockTrade(params)
    case 'margin':
      return getMargin(params)
    case 'news':
      return getNews(params)
    default:
      return Promise.resolve({ success: false, message: 'Unknown type' })
  }
}
