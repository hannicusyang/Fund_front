// src/api/fund.js
import axios from '@/utils/axios'

// 字段转换：仅将 is_checked 统一为 is_in_store，其余字段保持后端原名
const transformFundItem = (item) => {
  return {
    ...item,
    is_in_store: item.is_checked // 语义化重命名，便于前端逻辑统一
  };
};

export const fundApi = {
  /**
   * 查询基金列表（支持分页、搜索、排序）
   * @param {Object} params - 查询参数（可选）
   *   - page, page_size
   *   - fund_code, fund_name
   *   - sort_field, sort_order
   * @returns {Promise} 返回标准化的分页数据
   */
   async searchFunds(params = {}) {
    const response = await axios.get('/funds/list', { params });
    // 后端返回 response.data.items, 我们将其重命名为 funds 以符合通用约定
    return {
      ...response,
      data: {
        funds: response.data.items || [],
        total: response.data.total,
        page: response.data.page,
        page_size: response.data.page_size
      }
    };
    },

  // 其他 API 保持不变
  addToStore(fundCode) {
    return axios.post('/watchlist/add', { fund_code: fundCode });
  },
  removeFromStore(fundCode) {
    return axios.delete(`/watchlist/remove/${fundCode}`);
  },
  getMyHolding: (params) => axios.get('/holding/list', { params }),
  updateMyHolding(data) {
    return axios.patch('/holding/update', data);
  },

  getFundEstimation(fundCode){
     return axios.get(`/holding/fund-estimation-history/${fund_code}`);
  },

  getPortfolioHistory: (days = 30) => axios.get('/holding/portfolio-history', { params: { days } }),


  getPortfolioRealTime() {
      return axios.get('/holding/get_portfolio_realtime')
  },
      // 获取当天的实时估算历史数据（用于初始化图表）
  getPortfolioRealTimeHistory() {
    return axios.get('/holding/get_portfolio_realtime_history')
  },
  getFundDetail(fundCode) {
    return axios.get(`/fund_detail/detail/${fundCode}`);
  },

  getFundEstimationHistory(fundCode) {
    return axios.get(`/holding/fund-estimation-history/${fundCode}`);
  },
  getFundHoldings(fundCode, params = {}) {
    return axios.get(`/fund_detail/detail/holdings/${fundCode}`, { params,timeout: 60000});
  },
  getFundMovingAverages(fundCode, params = {}) {
  return axios.get(`/fund_detail/detail/moving-averages/${fundCode}`, { params });
},
  checkInWatchlist(fundCode) {
    return axios.get(`/watchlist/check/${fundCode}`)
  },
  // 获取关注列表
  getWatchlist() {
    return axios.get('/watchlist/list')
  },
  // getIntro(fundCode) {
  //   return axios.post('/funds/GetFundIntro', { fund_code: fundCode });
  // },
  // getPrice(fundCode) {
  //   return axios.post('/funds/GetFundPrice', { fund_code: fundCode });
  // },
  // getRealtimePrice(fundCode) {
  //   return axios.post('/funds/GetFundRealTimePrice', { fund_code: fundCode });
  // }
};