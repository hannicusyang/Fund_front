<template>
  <a-layout class="quant-layout">
    <!-- 顶部导航栏 -->
    <a-layout-header class="header">
      <div class="header-content">
        <div class="logo" @click="goHome">
          <QLogo />
        </div>
        <!-- 顶部主导航菜单 -->
        <a-menu mode="horizontal" :selected-keys="topSelectedKeys" @click="handleTopMenuClick">
          <a-menu-item key="overview">基金概览</a-menu-item>
          <a-menu-item key="experiment">模型实验</a-menu-item>
          <a-menu-item key="backtest">模型回测</a-menu-item>
        </a-menu>
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
      <!-- 量化模型专用侧边栏 -->
      <a-layout-sider width="220" theme="light" class="sider">
        <a-menu
          mode="inline"
          :selected-keys="sideSelectedKeys"
          :open-keys="openKeys"
          @click="handleSideMenuClick"
          :style="{ height: '100%' }"
        >
          <!-- 基金投资模型 -->
          <a-menu-item-group key="fund_model">
            <template #title>
              <span class="group-title">🎯 基金投资模型</span>
            </template>
            
            <a-sub-menu key="fund_screening">
              <template #title>
                <FilterOutlined />
                <span>基金筛选</span>
              </template>
              <a-menu-item key="fund_basic_filter">基础筛选</a-menu-item>
              <a-menu-item key="fund_advanced_filter">高级筛选</a-menu-item>
              <a-menu-item key="fund_pool">我的备选池</a-menu-item>
            </a-sub-menu>

            <a-sub-menu key="fund_analysis">
              <template #title>
                <BarChartOutlined />
                <span>指标分析</span>
              </template>
              <a-menu-item key="fund_metrics">量化指标</a-menu-item>
              <a-menu-item key="fund_comparison">对比分析</a-menu-item>
              <a-menu-item key="fund_attribution">业绩归因</a-menu-item>
            </a-sub-menu>

            <a-sub-menu key="fund_portfolio">
              <template #title>
                <PieChartOutlined />
                <span>组合构建</span>
              </template>
              <a-menu-item key="fund_portfolio_create">创建组合</a-menu-item>
              <a-menu-item key="fund_portfolio_optimize">组合优化</a-menu-item>
              <a-menu-item key="fund_portfolio_rebalance">再平衡</a-menu-item>
            </a-sub-menu>

            <a-sub-menu key="fund_backtest">
              <template #title>
                <LineChartOutlined />
                <span>回测验证</span>
              </template>
              <a-menu-item key="fund_backtest_run">运行回测</a-menu-item>
              <a-menu-item key="fund_backtest_report">回测报告</a-menu-item>
            </a-sub-menu>

            <a-menu-item key="fund_strategy_library">
              <BookOutlined />
              <span>策略库</span>
            </a-menu-item>
          </a-menu-item-group>

          <a-divider style="margin: 8px 0" />

          <!-- 股票投资模型（二期） -->
          <a-menu-item-group key="stock_model">
            <template #title>
              <span class="group-title group-title-secondary">📈 股票投资模型</span>
              <a-tag color="orange" size="small">二期</a-tag>
            </template>

            <a-menu-item key="stock_factor" disabled>
              <ApartmentOutlined />
              <span>多因子研究</span>
            </a-menu-item>

            <a-menu-item key="stock_smartbeta" disabled>
              <ThunderboltOutlined />
              <span>Smart Beta</span>
            </a-menu-item>

            <a-menu-item key="stock_ml" disabled>
              <RobotOutlined />
              <span>AI/ML策略</span>
            </a-menu-item>

            <a-menu-item key="stock_allocation" disabled>
              <PieChartOutlined />
              <span>资产配置</span>
            </a-menu-item>

            <a-menu-item key="stock_risk" disabled>
              <SafetyOutlined />
              <span>风险管理</span>
            </a-menu-item>
          </a-menu-item-group>
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
import { ref, computed, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import QLogo from '@/components/common/QLogo.vue'
import {
  FilterOutlined, BarChartOutlined, PieChartOutlined, LineChartOutlined,
  BookOutlined, ApartmentOutlined, ThunderboltOutlined, RobotOutlined,
  SafetyOutlined
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const { isDarkMode, toggleTheme } = inject('themeState')

// ========== 顶部菜单 ==========
const topMenuMap = {
  overview: '/FundSearch',
  experiment: '/ModelExperiment',
  backtest: '/ModelExperiment'
}
const topSelectedKeys = computed(() => {
  const path = route.path
  if (path.startsWith('/Fund')) return ['overview']
  if (path.startsWith('/ModelExperiment')) return ['experiment']
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
const sideSelectedKeys = ref(['fund_basic_filter'])
const openKeys = ref(['fund_screening', 'fund_analysis', 'fund_portfolio', 'fund_backtest'])

const handleSideMenuClick = ({ key }) => {
  sideSelectedKeys.value = [key]
}

const handleThemeChange = (checked) => {
  toggleTheme()
}

const goHome = () => {
  router.push('/FundSearch')
}
</script>

<style scoped>
.quant-layout {
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
  background: #fff;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .header { padding: 0 12px; }
  .header-content { flex-wrap: wrap; height: auto; padding: 8px 0; }
  :deep(.ant-menu-horizontal) { line-height: 40px; overflow-x: auto; white-space: nowrap; }
  :deep(.ant-menu-horizontal .ant-menu-item) { padding: 0 12px !important; font-size: 13px; }
  .logo { margin-right: 12px; }
  .layout-content { padding: 12px; margin: 8px; }
}
@media (max-width: 576px) {
  .header { padding: 0 8px; }
  :deep(.ant-menu-horizontal .ant-menu-item) { padding: 0 8px !important; font-size: 12px; }
  .layout-content { padding: 8px; margin: 4px; }
}

.layout-content {
  background: #f5f5f5;
  padding: 16px;
  margin-top: 8px;
  min-height: calc(100vh - 64px - 16px);
}

/* 导航栏菜单样式 */
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

/* 侧边栏菜单组样式 */
:deep(.ant-menu-item-group-title) {
  padding: 8px 16px;
  font-size: 12px;
  color: #8c8c8c;
}
:deep(.group-title) {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
}
:deep(.group-title-secondary) {
  color: #8c8c8c;
}
:deep(.ant-layout-sider-children) {
  padding-top: 8px;
}
:deep(.ant-menu-submenu-title) {
  padding: 12px 16px !important;
}
:deep(.ant-menu-item) {
  padding-left: 32px !important;
}
:deep(.ant-menu-item-disabled) {
  color: #bfbfbf !important;
  cursor: not-allowed;
}

/* 暗色模式 */
html[data-theme='dark'] .quant-layout {
  background: #141414;
}
html[data-theme='dark'] .layout-content {
  background: #141414;
}
html[data-theme='dark'] .sider {
  background: #1a1a1a;
  border-right: 1px solid #2d2d2d;
}
html[data-theme='dark'] :deep(.ant-menu) {
  background: #1a1a1a !important;
}
html[data-theme='dark'] :deep(.group-title) {
  color: rgba(255, 255, 255, 0.85);
}
</style>
