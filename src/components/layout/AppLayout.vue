<!-- src/components/layout/AppLayout.vue -->
<template>
  <a-layout class="app-layout">
    <!-- 顶部导航栏 -->
    <a-layout-header class="header">
      <div class="header-content">
        <div class="logo">
          <img src="/Q.png" alt="系统标志" />
        </div>
        <!-- 顶部主导航菜单 -->
        <a-menu mode="horizontal" :selected-keys="topSelectedKeys" @click="handleTopMenuClick">
          <a-menu-item key="overview">基金概览</a-menu-item>
          <a-menu-item key="experiment">模型实验</a-menu-item>
          <a-menu-item key="backtest">模型回测</a-menu-item>
        </a-menu>
        <!-- ✅ 黑夜模式开关：使用 emoji，避免图标问题 -->
        <a-switch
          :checked="isDarkMode"
          @change="handleThemeChange"
          checked-children="🌙"
          un-checked-children="☀️"
          style="margin-left: auto"
        />
      </div>
    </a-layout-header>

    <!-- 主体区域 -->
    <a-layout>
      <!-- 侧边栏 -->
      <a-layout-sider width="200" theme="light" class="sider">
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
            <a-menu-item key="fund_rank">
              <TrophyOutlined />
              <span>基金排行</span>
            </a-menu-item>
            <a-menu-item key="FundStore">
              <WalletOutlined />
              <span>我的持仓</span>
            </a-menu-item>
            <a-menu-item key="market_situation">
              <BarChartOutlined />
              <span>市场大盘</span> <!-- ✅ 优化文字：更准确 -->
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

          <!-- ✅ 新增：系统设置菜单（可选，提升完整性） -->
          <a-sub-menu v-if="menuReady" key="system_settings">
            <template #title>
              <SettingOutlined />
              <span>系统设置</span>
            </template>
            <a-menu-item key="theme_settings">
              <UserOutlined />
              <span>主题设置</span>
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
// ✅ 优化图标导入：使用更专业的金融图标
import {
  // 基金相关图标
  FundProjectionScreenOutlined, // 基金情况顶级菜单
  SearchOutlined,               // 基金搜索
  WalletOutlined,               // 我的持仓（钱包图标更贴切）
  BarChartOutlined,             // 大盘情况
  TrophyOutlined,               // 基金排行

  // 股票相关图标
  StockOutlined,                // 股票行情顶级菜单
  AppstoreOutlined,             // 股票市场
  HeartOutlined,                // 股票自选

  // 系统图标
  SettingOutlined,
  UserOutlined
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const { isDarkMode, toggleTheme } = inject('themeState')

// ========== 顶部菜单 ==========
const topMenuMap = {
  overview: '/FundSearch',
  experiment: '/ModelExperiment',
  backtest: '/ModelBacktest'
}
const topSelectedKeys = computed(() => {
  const path = route.path
  if (path.startsWith('/Fund')) return ['overview']
  if (path.startsWith('/ModelExperiment')) return ['experiment']
  if (path.startsWith('/ModelBacktest')) return ['backtest']
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
    else if (newPath === '/FundRank') key = 'fund_rank'
    else if (newPath === '/StockMarketOverview') key = 'stock_market_overview'
    else if (newPath === '/StockMarketList') key = 'stock_market_list'
    else if (newPath === '/StockWatchlist') key = 'stock_watchlist'
    else if (newPath === '/ThemeSettings') key = 'theme_settings'

    sideSelectedKeys.value = [key]
  },
  { immediate: true }
)

const handleSideMenuClick = ({ key }) => {
  let path = ''
  switch (key) {
    case 'FundSearch': path = '/FundSearch'; break
    case 'fund_rank': path = '/FundRank'; break // ✅ 优化顺序
    case 'FundStore': path = '/FundStore'; break
    case 'market_situation': path = '/MarketSituation'; break
    case 'stock_market_overview': path = '/StockMarketOverview'; break
    case 'stock_market_list': path = '/StockMarketList'; break
    case 'stock_watchlist': path = '/StockWatchlist'; break
    case 'theme_settings': path = '/ThemeSettings'; break
    default: return
  }
  if (route.path !== path) {
    router.push(path)
  }
}

// ✅ 延迟渲染子菜单（你的原始逻辑，保留）
onMounted(() => {
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
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}
.header {
  padding: 0 20px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}
/* 暗色模式下覆盖为黑色 */
.dark-theme .header {
  background: #000000 !important;
}
.header-content {
  display: flex;
  align-items: center;
  height: 64px;
}
.logo img {
  height: 28px;
  margin-right: 24px;
}
.sider {
  overflow: auto;
  height: calc(100vh - 64px);
}
.layout-content {
  background: #fff;
  padding: 24px;
  margin-top: 8px;
  min-height: calc(100vh - 64px - 16px);
}

/* 暗色模式下覆盖为黑色 */
.dark-theme .layout-content {
  background: #000000 !important;
}
:deep(.ant-menu-horizontal) {
  border: none;
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