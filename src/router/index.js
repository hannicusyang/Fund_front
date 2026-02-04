// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
// 导入路由对应的组件
import FundSearch from "@/views/FundSearch.vue";
import FundStore from '@/views/FundStore.vue'
import FundDetail from '@/views/FundDetail.vue'
import StockMarketOverview from "@/components/stock/StockMarketOverview.vue";
import StockMarketList from "@/components/stock/StockMarketList.vue"
import StockWatchlist from "@/components/stock/StockWatchlist.vue";

const routes = [
    {
    path: '/',
    name: 'index',
    component: FundSearch
  },
  {
    path: '/FundSearch',
    name: 'FundSearch',
    component: FundSearch
  },
  {
    path: '/FundStore',
    name: 'FundStore',
    component: FundStore
  },
  { path: '/FundDetail/:Detail_fund_code',
    name: 'FundDetail',
    component: FundDetail },

    {
    path: '/StockMarketOverview',
    name: 'StockMarketOverview',
    component: StockMarketOverview
  },
        {
    path: '/StockMarketOverview',
    name: 'StockMarketOverview',
    component: StockMarketOverview
  },
  {
    path: '/StockMarketList',
    name: 'StockMarketList',
    component: StockMarketList
  },
  {
    path: '/StockWatchlist',
    name: 'StockWatchlist',
    component: StockWatchlist
  },

]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router