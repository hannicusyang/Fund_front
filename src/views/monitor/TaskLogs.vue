<template>
  <div class="task-logs">
    <!-- 顶部筛选栏 -->
    <a-card size="small" style="margin-bottom: 16px">
      <a-space>
        <a-select
          v-model:value="filterTaskId"
          placeholder="选择任务"
          style="width: 200px"
          allow-clear
          @change="loadLogs"
        >
          <a-select-option v-for="task in tasks" :key="task.id" :value="task.id">
            {{ task.task_name }}
          </a-select-option>
        </a-select>
        <a-select
          v-model:value="filterLevel"
          placeholder="日志级别"
          style="width: 120px"
          allow-clear
          @change="loadLogs"
        >
          <a-select-option value="INFO">INFO</a-select-option>
          <a-select-option value="WARNING">WARNING</a-select-option>
          <a-select-option value="ERROR">ERROR</a-select-option>
        </a-select>
        <a-button @click="loadLogs">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-switch v-model:checked="autoRefresh" /> 自动刷新
      </a-space>
    </a-card>

    <!-- 日志控制台 -->
    <a-card>
      <template #title>
        <a-space>
          <span>📋 运行日志</span>
          <a-tag v-if="logs.length" color="blue">{{ logs.length }} 条</a-tag>
        </a-space>
      </template>
      <template #extra>
        <a-button size="small" @click="clearLogs">清空显示</a-button>
      </template>
      
      <div class="log-console" ref="consoleRef">
        <div
          v-for="log in logs"
          :key="log.id"
          class="log-item"
          :class="'log-' + log.level.toLowerCase()"
        >
          <span class="log-time">{{ formatTime(log.created_at) }}</span>
          <a-tag :color="getLevelColor(log.level)" size="small">{{ log.level }}</a-tag>
          <span class="log-message">{{ log.message }}</span>
        </div>
        <a-empty v-if="!logs.length" description="暂无日志" />
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { monitorApi } from '@/api/monitor.js'

const logs = ref([])
const tasks = ref([])
const filterTaskId = ref(null)
const filterLevel = ref(null)
const autoRefresh = ref(true)
const consoleRef = ref()
let refreshTimer = null

function formatTime(timeStr) {
  if (!timeStr) return ''
  return timeStr.split(' ')[1] || timeStr
}

function getLevelColor(level) {
  const colors = {
    'INFO': 'blue',
    'WARNING': 'orange',
    'ERROR': 'red',
    'DEBUG': 'default'
  }
  return colors[level] || 'default'
}

async function loadTasks() {
  try {
    const res = await monitorApi.getTasks()
    tasks.value = res.data || []
  } catch (e) {
    console.error('加载任务失败', e)
  }
}

async function loadLogs() {
  try {
    const params = {}
    if (filterTaskId.value) params.task_id = filterTaskId.value
    if (filterLevel.value) params.level = filterLevel.value
    params.limit = 100
    
    const res = await monitorApi.getLogs(params)
    logs.value = res.data || []
    
    // 滚动到底部
    if (consoleRef.value) {
      setTimeout(() => {
        consoleRef.value.scrollTop = consoleRef.value.scrollHeight
      }, 100)
    }
  } catch (e) {
    console.error('加载日志失败', e)
  }
}

function clearLogs() {
  // 调用后端API清空日志
  monitorApi.clearLogs(filterTaskId.value).then(() => {
    message.success('日志已清空')
    loadLogs()
  }).catch(e => {
    message.error('清空失败: ' + e.message)
  })
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(() => {
    if (autoRefresh.value) {
      loadLogs()
    }
  }, 3000)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(() => {
  loadTasks()
  loadLogs()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.task-logs {
  padding: 0;
}

.log-console {
  height: 500px;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 6px;
  color: #d4d4d4;
}

.log-time {
  color: #858585;
  margin-right: 8px;
  min-width: 80px;
}

.log-message {
  flex: 1;
  word-break: break-all;
}

.log-info .log-message {
  color: #d4d4d4;
}

.log-warning .log-message {
  color: #dcdcaa;
}

.log-error .log-message {
  color: #f48771;
}

.log-debug .log-message {
  color: #858585;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .task-logs {
    padding: 0;
  }
  
  .task-logs :deep(.ant-card) {
    margin-bottom: 8px;
  }
  
  .task-logs :deep(.ant-timeline) {
    padding-left: 8px;
  }
  
  .task-logs :deep(.ant-timeline-item-content) {
    margin-left: 8px;
  }
  
  .task-logs :deep(.log-time) {
    font-size: 10px;
  }
  
  .task-logs :deep(.log-message) {
    font-size: 11px;
  }
  
  .task-logs :deep(.ant-btn) {
    padding: 4px 8px;
    font-size: 11px;
  }
  
  .task-logs :deep(.ant-select) {
    font-size: 11px;
    min-width: 80px;
  }
  
  .task-logs :deep(.ant-input) {
    font-size: 12px;
  }
}
</style>
