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
          <!-- ✅ 关键修复：确保 menuReady 被定义且为 true -->
          <a-sub-menu v-if="menuReady" key="fund_situation">
            <template #title>
              <user-outlined />
              <span>基金情况</span>
            </template>
            <a-menu-item key="FundSearch">基金搜索</a-menu-item>
            <a-menu-item key="FundStore">我的持仓</a-menu-item>
            <a-menu-item key="market_situation">大盘情况</a-menu-item>
            <a-menu-item key="fund_rank">基金排行</a-menu-item>
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
import { ref, computed, watch, onMounted, nextTick,inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { UserOutlined } from '@ant-design/icons-vue' // 这个图标是基础图标，通常存在

const router = useRouter()
const route = useRoute()

// ========== 注入主题状态 ==========
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
const sideOpenKeys = ref(['fund_situation'])
// ✅ 【关键】定义并初始化 menuReady
const menuReady = ref(false)
const sideMenuRef = ref(null)

watch(
  () => route.path,
  (newPath) => {
    let key = 'FundSearch'
    if (newPath === '/FundStore') key = 'FundStore'
    else if (newPath === '/MarketSituation') key = 'market_situation'
    else if (newPath === '/FundRank') key = 'fund_rank'
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
    case 'fund_rank': path = '/FundRank'; break
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
</style>