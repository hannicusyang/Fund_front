<!-- src/components/layout/AppLayout.vue -->
<template>
  <a-layout class="app-layout">
    <!-- 顶部导航栏 -->
    <a-layout-header class="header">
      <div class="header-content">
        <!-- 汉堡菜单按钮（移动端显示） -->
        <span class="hamburger" @click="toggleSider">☰</span>
        <div class="logo" @click="goHome">
          <QLogo />
        </div>
        <!-- 顶部主导航菜单 -->
        <a-menu mode="horizontal" :selected-keys="topSelectedKeys" @click="handleTopMenuClick">
          <a-menu-item key="overview">基金概览</a-menu-item>
          <a-menu-item key="experiment">模型实验</a-menu-item>
          <a-menu-item key="backtest">市场资讯</a-menu-item>
        </a-menu>
        <!-- 用户菜单和主题开关移到最右边 -->
        <div style="margin-left: auto; display: flex; align-items: center; gap: 8px">
          <!-- 黑夜模式开关 -->
          <a-switch
            :checked="isDarkMode"
            @change="handleThemeChange"
            checked-children="🌙"
            un-checked-children="☀️"
          />
          <!-- 用户菜单 -->
          <a-dropdown>
            <a-button type="text" class="user-btn">
              <a-avatar size="small" style="background-color: #1890ff">
                <template #icon><UserOutlined /></template>
              </a-avatar>
              <span class="username">{{ userStore.user?.username || '用户' }}</span>
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="logout" @click="handleLogout">
                  <LogoutOutlined />
                  退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>
    </a-layout-header>

    <!-- 主体区域 -->
    <a-layout>
      <!-- 侧边栏 -->
      <a-layout-sider 
        width="200" 
        theme="light" 
        class="sider"
        :class="{ 'sider-mobile': !siderVisible }"
      >
        <a-menu
          mode="inline"
          :selected-keys="sideSelectedKeys"
          :open-keys="sideOpenKeys"
          @click="handleSideMenuClick"
          :style="{ height: '100%' }"
          ref="sideMenuRef"
        >
          <!-- ✅ 优化：基金情况菜单（专业图标 + 逻辑排序） -->
          <a-sub-menu key="fund_situation">
            <template #title>
              <FundProjectionScreenOutlined />
              <span>基金情况</span>
            </template>
            <a-menu-item key="FundSearch">
              <SearchOutlined />
              <span>基金搜索</span>
            </a-menu-item>
            <a-menu-item key="FundStore">
              <WalletOutlined />
              <span>我的持仓</span>
            </a-menu-item>
          </a-sub-menu>

          <!-- ✅ 优化：股票行情菜单（图标统一） -->
          <a-sub-menu v-if="menuReady" key="stock_market">
            <template #title>
              <StockOutlined />
              <span>股票行情</span>
            </template>
            <a-menu-item key="stock_market_overview">
              <BarChartOutlined />
              <span>大盘行情</span>
            </a-menu-item>
            <a-menu-item key="stock_market_list">
              <AppstoreOutlined />
              <span>股票市场</span>
            </a-menu-item>
            <a-menu-item key="stock_watchlist">
              <HeartOutlined />
              <span>股票自选</span>
            </a-menu-item>
          </a-sub-menu>
        </a-menu>
      </a-layout-sider>

      <!-- 页面内容区 -->
      <a-layout style="padding: 0 6px 6px 6px">
        <a-layout-content class="layout-content">
          <slot />
        </a-layout-content>
      </a-layout>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import QLogo from '@/components/common/QLogo.vue'
import {
  FundProjectionScreenOutlined, SearchOutlined, WalletOutlined,
  BarChartOutlined, TrophyOutlined, StockOutlined, AppstoreOutlined,
  HeartOutlined, SettingOutlined, UserOutlined, LogoutOutlined
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const router = useRouter()
const route = useRoute()
const { isDarkMode, toggleTheme } = inject('themeState')

// 侧边栏状态（移动端切换）
const siderVisible = ref(true)
const toggleSider = () => {
  siderVisible.value = !siderVisible.value
}

// ========== 顶部菜单 ==========
const topMenuMap = {
  overview: '/FundSearch',
  experiment: '/ModelExperiment',
  backtest: '/MarketIntelligence'
}
const topSelectedKeys = computed(() => {
  const path = route.path
  if (path.startsWith('/Fund')) return ['overview']
  if (path.startsWith('/ModelExperiment')) return ['experiment']
  if (path.startsWith('/MarketIntelligence')) return ['backtest']
  if (path.startsWith('/Stock')) return ['overview']
  return ['overview']
})
const handleTopMenuClick = ({ key }) => {
  const targetPath = topMenuMap[key]
  if (targetPath && route.path !== targetPath) {
    router.push(targetPath)
  }
}

// ========== 侧边菜单 ==========
const sideSelectedKeys = ref([])
// ✅ 优化：菜单项逻辑排序（从搜索 → 排行 → 持仓 → 大盘）
const sideOpenKeys = ref(['fund_situation', 'stock_market']) // 默认展开

// ✅ 【关键】定义并初始化 menuReady
const menuReady = ref(false)
const sideMenuRef = ref(null)

watch(
  () => route.path,
  (newPath) => {
    let key = 'FundSearch'
    // ✅ 按优化后的顺序映射
    if (newPath === '/FundStore') key = 'FundStore'
    else if (newPath === '/MarketSituation') key = 'market_situation'
    else if (newPath === '/StockMarketOverview') key = 'stock_market_overview'
    else if (newPath === '/StockMarketList') key = 'stock_market_list'
    else if (newPath === '/StockWatchlist') key = 'stock_watchlist'

    sideSelectedKeys.value = [key]
  },
  { immediate: true }
)

const handleSideMenuClick = ({ key }) => {
  let path = ''
  switch (key) {
    case 'FundSearch': path = '/FundSearch'; break
    case 'FundStore': path = '/FundStore'; break
    case 'market_situation': path = '/MarketSituation'; break
    case 'stock_market_overview': path = '/StockMarketOverview'; break
    case 'stock_market_list': path = '/StockMarketList'; break
    case 'stock_watchlist': path = '/StockWatchlist'; break
    default: return
  }
  if (route.path !== path) {
    router.push(path)
  }
}

// ✅ 延迟渲染子菜单（你的原始逻辑，保留）
onMounted(() => {
  // 恢复用户登录状态
  userStore.restoreState()
  nextTick(() => {
    setTimeout(() => {
      menuReady.value = true
    }, 0)
  })
})

// ========== 黑夜模式 ==========

// 切换主题
const handleThemeChange = (checked) => {
  // 直接调用 App.vue 提供的方法
  toggleTheme()
}

const goHome = () => {
  router.push('/FundSearch')
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}
.header {
  padding: 0 20px;
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
}
.header-content {
  display: flex;
  align-items: center;
  height: 64px;
}
.logo {
  margin-right: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.logo :deep(svg) {
  filter: brightness(0) invert(1);
}
.sider {
  overflow: auto;
  height: calc(100vh - 64px);
}

/* 汉堡菜单按钮 - 桌面端隐藏 */
.hamburger {
  display: none;
}

.layout-content {
  background: #fff;
  padding: 24px;
  margin-top: 8px;
  min-height: calc(100vh - 64px - 16px);
}

.user-btn {
  color: #fff !important;
  display: flex;
  align-items: center;
  gap: 6px;
}

.username {
  margin-left: 6px;
  @media (max-width: 768px) {
    display: none;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .header { padding: 0 12px; height: auto; min-height: 56px; }
  .header-content { 
    flex-wrap: wrap; 
    height: auto; 
    padding: 4px 0; 
    gap: 4px;
    width: 100%;
  }
  :deep(.ant-menu-horizontal) { 
    flex: 1;
    line-height: 28px; 
    overflow-x: auto;
    min-width: 0;
    white-space: nowrap;
  }
  :deep(.ant-menu-horizontal .ant-menu-item) { 
    padding: 0 4px !important; 
    font-size: 11px; 
    margin: 0 1px;
    flex-shrink: 0;
  }
  /* 隐藏菜单项之间的竖线 */
  :deep(.ant-menu-horizontal .ant-menu-item)::before,
  :deep(.ant-menu-horizontal .ant-menu-item)::after {
    display: none !important;
  }
  :deep(.ant-menu) {
    border: none !important;
  }
  .header {
    border: none !important;
  }
  .logo { margin-right: 4px; flex-shrink: 0; font-size: 12px; }
  .logo :deep(svg) { width: 60px !important; height: 20px !important; }
  .username { display: none; }
  .user-btn { padding: 2px 6px !important; }
  .layout-content { padding: 4px; margin: 4px; min-height: calc(100vh - 70px); }
  
  /* 侧边栏默认隐藏 */
  .sider { display: none; }
  .sider.sider-mobile { display: block; position: fixed; z-index: 1000; height: calc(100vh - 56px); box-shadow: 2px 0 8px rgba(0,0,0,0.15); }
  
  /* 汉堡菜单按钮 */
  .hamburger {
    display: inline-block;
    font-size: 18px;
    cursor: pointer;
    margin-right: 4px;
    padding: 2px;
    color: #fff;
    flex-shrink: 0;
  }
  /* 主题按钮 */
  :deep(.ant-switch) {
    margin-left: 4px;
    flex-shrink: 0;
    transform: scale(0.8);
  }
}
@media (max-width: 576px) {
  .header { padding: 0 4px; }
  :deep(.ant-menu-horizontal .ant-menu-item) { padding: 0 3px !important; font-size: 10px; margin: 0; }
  .layout-content { padding: 4px; margin: 2px; }
  .hamburger { font-size: 16px; }
  .logo { font-size: 11px; }
  .logo :deep(svg) { width: 50px !important; height: 18px !important; }
}

/* 暗色模式下覆盖为黑色 */
.dark-theme .layout-content {
  background: #000000 !important;
}
:deep(.ant-menu-horizontal) {
  border: none;
  background: transparent;
  line-height: 64px;
}
:deep(.ant-menu-horizontal .ant-menu-item) {
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
  padding: 0 24px;
  margin: 0 4px;
  border-radius: 4px 4px 0 0;
  transition: all 0.3s;
}
:deep(.ant-menu-horizontal .ant-menu-item:hover) {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}
:deep(.ant-menu-horizontal .ant-menu-item-selected) {
  color: #fff;
  background: rgba(255, 255, 255, 0.15) !important;
}
:deep(.ant-menu-horizontal .ant-menu-item-selected::after) {
  border-bottom: 3px solid #fff !important;
  border-radius: 2px;
  bottom: 0;
}
:deep(.ant-menu-horizontal .ant-menu-item::after) {
  border-bottom: none;
}
:deep(.ant-layout-sider-children) {
  padding-top: 12px;
}

/* ... 其他样式保持不变 ... */

/* 优化子菜单样式 */
:deep(.ant-menu-submenu-title) {
  padding: 12px 24px !important;
}

/* 优化菜单项样式 */
:deep(.ant-menu-item) {
  padding-left: 44px !important;
}


/* 侧边菜单暗色模式优化 */
.dark-theme :deep(.ant-layout-sider) {
  background: #1a1a1a !important;
  border-right: 1px solid #2d2d2d;
}

.dark-theme :deep(.ant-menu) {
  background: #1a1a1a !important;
  color: rgba(255, 255, 255, 0.85);
}

.dark-theme :deep(.ant-menu-item:hover),
.dark-theme :deep(.ant-menu-submenu-title:hover) {
  background: #2d2d2d !important;
}

.dark-theme :deep(.ant-menu-item-selected) {
  background: #1890ff !important;
}

</style>