// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
// 导入路由对应的组件
import FundSearch from "@/views/FundSearch.vue";
import FundStore from '@/views/FundStore.vue'
import FundDetail from '@/views/FundDetail.vue'
import StockMarketOverview from "@/views/StockOverview.vue";
import StockMarketList from "@/views/StockMarket.vue"
import StockWatchlist from "@/views/StockWatch.vue";
import ModelExperiment from "@/views/ModelExperiment.vue";
import MarketIntelligence from "@/views/MarketIntelligence.vue";
import Monitor from "@/views/monitor/Monitor.vue";
import Login from "@/views/Login.vue";

// 路由守卫 - 检查是否需要登录
const requiresAuth = (to, from, next) => {
  const token = localStorage.getItem('token')
  if (!token) {
    // 未登录，跳转到登录页
    next({ 
      path: '/login', 
      query: { redirect: to.fullPath }
    })
  } else {
    next()
  }
}

const routes = [
  {
    path: '/',
    name: 'index',
    component: FundSearch,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/FundSearch',
    name: 'FundSearch',
    component: FundSearch,
    meta: { requiresAuth: true }
  },
  {
    path: '/FundStore',
    name: 'FundStore',
    component: FundStore,
    meta: { requiresAuth: true }
  },
  { path: '/FundDetail/:Detail_fund_code',
    name: 'FundDetail',
    component: FundDetail,
    meta: { requiresAuth: true }
  },

    {
    path: '/StockMarketOverview',
    name: 'StockMarketOverview',
    component: StockMarketOverview,
    meta: { requiresAuth: true }
  },
        {
    path: '/StockMarketOverview',
    name: 'StockMarketOverview',
    component: StockMarketOverview,
    meta: { requiresAuth: true }
  },
  {
    path: '/StockMarketList',
    name: 'StockMarketList',
    component: StockMarketList,
    meta: { requiresAuth: true }
  },
  {
    path: '/StockWatchlist',
    name: 'StockWatchlist',
    component: StockWatchlist,
    meta: { requiresAuth: true }
  },
  {
    path: '/ModelExperiment',
    name: 'ModelExperiment',
    component: ModelExperiment,
    meta: { requiresAuth: true }
  },
  {
    path: '/MarketIntelligence',
    name: 'MarketIntelligence',
    component: MarketIntelligence,
    meta: { requiresAuth: true }
  },
  {
    path: '/Monitor',
    name: 'Monitor',
    component: Monitor,
    redirect: '/Monitor/Accounts',
    meta: { requiresAuth: true },
    children: [
      { path: 'Accounts', name: 'MonitorAccounts', component: Monitor },
      { path: 'Tasks', name: 'MonitorTasks', component: Monitor },
      { path: 'Logs', name: 'MonitorLogs', component: Monitor },
      { path: 'Results', name: 'MonitorResults', component: Monitor },
      { path: 'Settings', name: 'MonitorSettings', component: Monitor }
    ]
  },

]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 检查登录状态
router.beforeEach((to, from, next) => {
  // 检查 token 是否存在
  const token = localStorage.getItem('token')
  
  // 如果路由需要认证但没有 token，跳转到登录页
  if (to.meta.requiresAuth && !token) {
    next({ 
      path: '/login', 
      query: { redirect: to.fullPath }
    })
  } 
  // 如果已访问登录页且有 token，跳转到首页
  else if (to.path === '/login' && token) {
    next('/ModelExperiment')
  }
  else {
    next()
  }
})

export default router