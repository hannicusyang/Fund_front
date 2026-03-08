<template>
  <AppLayout menu-key="Monitor">
    <div class="monitor-container">
      <!-- 平台账号管理 -->
      <AccountManage v-if="currentView === 'accounts'" />
      <!-- 监控任务管理 -->
      <TaskManage v-else-if="currentView === 'tasks'" />
      <!-- 任务运行日志 -->
      <TaskLogs v-else-if="currentView === 'logs'" />
      <!-- 结果查看 -->
      <ResultView v-else-if="currentView === 'results'" />
      <!-- 系统设置 -->
      <SystemSettings v-else-if="currentView === 'settings'" />
      <!-- 默认显示账号管理 -->
      <AccountManage v-else />
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import AccountManage from './AccountManage.vue'
import TaskManage from './TaskManage.vue'
import TaskLogs from './TaskLogs.vue'
import ResultView from './ResultView.vue'
import SystemSettings from './SystemSettings.vue'

const route = useRoute()

const currentView = computed(() => {
  const path = route.path
  if (path.includes('Accounts')) return 'accounts'
  if (path.includes('Tasks')) return 'tasks'
  if (path.includes('Logs')) return 'logs'
  if (path.includes('Results')) return 'results'
  if (path.includes('Settings')) return 'settings'
  return 'accounts'
})
</script>

<style scoped>
.monitor-container {
  padding: 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .monitor-container {
    padding: 0;
  }
  
  .monitor-container :deep(.ant-tabs-nav) {
    margin-bottom: 8px;
  }
  
  .monitor-container :deep(.ant-tabs-tab) {
    padding: 8px 12px;
    font-size: 12px;
  }
  
  .monitor-container :deep(.ant-tabs-tab-active) {
    font-size: 12px;
  }
  
  .monitor-container :deep(.ant-card) {
    margin-bottom: 8px;
  }
  
  .monitor-container :deep(.ant-card-head) {
    padding: 8px 12px;
    min-height: auto;
  }
  
  .monitor-container :deep(.ant-card-head-title) {
    font-size: 14px;
  }
  
  .monitor-container :deep(.ant-card-body) {
    padding: 12px;
  }
  
  .monitor-container :deep(.ant-menu) {
    font-size: 12px;
  }
  
  .monitor-container :deep(.ant-menu-item) {
    padding: 8px 12px;
  }
}
</style>
