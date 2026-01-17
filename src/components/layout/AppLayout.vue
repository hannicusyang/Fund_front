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
        <a-menu
          mode="horizontal"
          :selected-keys="topSelectedKeys"
          @click="handleTopMenuClick"
        >
          <a-menu-item key="overview">基金概览</a-menu-item>
          <a-menu-item key="experiment">模型实验</a-menu-item>
          <a-menu-item key="backtest">模型回测</a-menu-item>
        </a-menu>
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
          <!-- ✅ 关键修复：延迟渲染 sub-menu -->
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
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { UserOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()

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
const menuReady = ref(false) // ✅ 控制子菜单是否渲染
const sideMenuRef = ref(null)

// 自动同步路由到侧边栏高亮
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
    case 'FundSearch':
      path = '/FundSearch'
      break
    case 'FundStore':
      path = '/FundStore'
      break
    case 'market_situation':
      path = '/MarketSituation'
      break
    case 'fund_rank':
      path = '/FundRank'
      break
    default:
      return
  }
  if (route.path !== path) {
    router.push(path)
  }
}

// ✅ 关键：延迟渲染子菜单，确保 a-menu 上下文已建立
onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      menuReady.value = true
    }, 0)
  })
})
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

:deep(.ant-menu-horizontal) {
  border: none;
}

:deep(.ant-layout-sider-children) {
  padding-top: 12px;
}
</style>