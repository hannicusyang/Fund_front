<template>
  <div class="result-view">
    <!-- 顶部筛选栏 -->
    <a-card size="small" style="margin-bottom: 16px">
      <a-space>
        <a-select
          v-model:value="filterTaskId"
          placeholder="选择任务"
          style="width: 200px"
          allow-clear
          @change="handleTaskChange"
        >
          <a-select-option v-for="task in tasks" :key="task.id" :value="task.id">
            {{ task.task_name }}
          </a-select-option>
        </a-select>
        <a-button @click="loadResults">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </a-space>
    </a-card>

    <!-- 结果列表 -->
    <a-card>
      <template #title>
        <a-space>
          <span>📊 监控结果</span>
          <a-tag v-if="results.length" color="blue">{{ pagination.total }} 条</a-tag>
        </a-space>
      </template>
      <template #extra>
        <a-space>
          <a-button 
            danger
            :disabled="!selectedRowKeys.length" 
            @click="batchDelete"
          >
            批量删除 ({{ selectedRowKeys.length }})
          </a-button>
          <a-button 
            type="primary" 
            :disabled="!selectedRowKeys.length" 
            :loading="aiLoading"
            @click="batchAiSummary"
          >
            批量AI总结 ({{ selectedRowKeys.length }})
          </a-button>
        </a-space>
      </template>
      
      <a-table
        :data-source="results"
        :columns="columns"
        :loading="loading"
        :row-key="record => record.id"
        :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
        :pagination="pagination"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'platform'">
            <a-tag :color="getPlatformColor(record.platform)">{{ getPlatformName(record.platform) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'title'">
            <a :href="record.url" target="_blank" style="max-width: 250px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              {{ record.title }}
            </a>
          </template>
          <template v-else-if="column.key === 'url'">
            <a :href="record.url" target="_blank" style="color: #1890ff;">
              查看链接
            </a>
          </template>
          <template v-else-if="column.key === 'author'">
            {{ record.author || '-' }}
          </template>
          <template v-else-if="column.key === 'publish_time'">
            {{ record.publish_time || '-' }}
          </template>
          <template v-else-if="column.key === 'created_at'">
            {{ formatTime(record.created_at) }}
          </template>
          <template v-else-if="column.key === 'ai_summary'">
            <a-tag v-if="record.ai_summary" color="green">已总结</a-tag>
            <a-tag v-else color="default">未总结</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button size="small" @click="viewDetail(record)">查看</a-button>
              <a-button size="small" type="primary" ghost @click="aiSummaryOne(record)">
                AI总结
              </a-button>
              <a-popconfirm
                title="确定删除此结果吗？"
                @confirm="deleteResult(record.id)"
              >
                <a-button size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 详情弹窗 -->
    <a-modal
      v-model:open="detailVisible"
      :title="currentResult?.title"
      width="800px"
      :footer="null"
    >
      <div v-if="currentResult">
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="链接">
            <a :href="currentResult.url" target="_blank">{{ currentResult.url }}</a>
          </a-descriptions-item>
          <a-descriptions-item label="作者">{{ currentResult.author }}</a-descriptions-item>
          <a-descriptions-item label="发布时间">
            {{ currentResult.publish_time || currentResult.description }}
          </a-descriptions-item>
          <a-descriptions-item label="添加时间">
            {{ formatTime(currentResult.created_at) }}
          </a-descriptions-item>
          <a-descriptions-item label="描述" :span="2">
            {{ currentResult.description || '-' }}
          </a-descriptions-item>
        </a-descriptions>
        
        <!-- AI总结显示 -->
        <a-divider />
        <a-space direction="vertical" style="width: 100%">
          <a-typography-title :level="5">🤖 AI总结</a-typography-title>
          <a-typography-paragraph v-if="currentResult.ai_summary">
            <blockquote>{{ currentResult.ai_summary }}</blockquote>
          </a-typography-paragraph>
          <a-empty v-else-if="!currentResult.subtitle_content" description="暂无AI总结，点击上方'AI总结'按钮生成" />
        </a-space>
        
        <!-- 字幕原文显示 -->
        <a-divider v-if="currentResult.subtitle_content" />
        <a-space v-if="currentResult.subtitle_content" direction="vertical" style="width: 100%">
          <a-typography-title :level="5">📝 字幕原文</a-typography-title>
          <a-typography-paragraph style="max-height: 300px; overflow-y: auto; background: #f5f5f5; padding: 12px; border-radius: 4px;">
            {{ currentResult.subtitle_content }}
          </a-typography-paragraph>
        </a-space>
      </div>
    </a-modal>
    
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { monitorApi } from '@/api/monitor.js'

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '平台', key: 'platform', width: 80 },
  { title: '标题', key: 'title', width: 260 },
  { title: '链接', key: 'url', width: 100 },
  { title: '作者', key: 'author', width: 100 },
  { title: '发布时间', key: 'publish_time', width: 160 },
  { title: '添加时间', key: 'created_at', width: 160 },
  { title: 'AI总结', key: 'ai_summary', width: 100 },
  { title: '操作', key: 'action', width: 180 }
]

const results = ref([])
const tasks = ref([])
const loading = ref(false)
const aiLoading = ref(false)
const selectedRowKeys = ref([])
const filterTaskId = ref(null)
const pagination = ref({ 
  current: 1, 
  pageSize: 20, 
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`,
  showQuickJumper: true
})
const detailVisible = ref(false)
const currentResult = ref(null)


function getPlatformColor(platform) {
  const colors = {
    'bilibili': 'blue',
    'youtube': 'red',
    'twitter': 'cyan',
    'x': 'cyan',
    'cls': 'orange',
    'eastmoney': 'green',
    'wallstreetcn': 'purple',
    'jin10': 'gold',
    'caijing': 'magenta',
    'gelonghui': 'volcano'
  }
  return colors[platform] || 'default'
}

function getPlatformName(platform) {
  const names = {
    'bilibili': 'B站',
    'youtube': 'YouTube',
    'twitter': 'Twitter',
    'x': 'X',
    'cls': '财联社',
    'eastmoney': '东方财富',
    'wallstreetcn': '华尔街见闻',
    'jin10': '金十数据',
    'caijing': '财经网',
    'gelonghui': '格隆汇'
  }
  return names[platform] || platform
}

function formatTime(timeStr) {
  if (!timeStr) return '-'
  return timeStr
}

async function loadTasks() {
  try {
    const res = await monitorApi.getTasks()
    tasks.value = res.data || []
  } catch (e) {
    console.error('加载任务失败', e)
  }
}

async function loadResults() {
  loading.value = true
  try {
    const params = {
      limit: pagination.value.pageSize,
      offset: (pagination.value.current - 1) * pagination.value.pageSize
    }
    if (filterTaskId.value) params.task_id = filterTaskId.value
    
    const res = await monitorApi.getResults(params)
    results.value = res.data || []
    pagination.value.total = res.total || 0
  } catch (e) {
    message.error('加载结果失败')
  } finally {
    loading.value = false
  }
}

function handleTaskChange() {
  // 切换任务时重置到第一页
  pagination.value.current = 1
  loadResults()
}

function handleTableChange(pag) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  loadResults()
}

async function viewDetail(record) {
  // 直接使用记录数据，如果需要可以后续优化为API调用
  currentResult.value = record
  detailVisible.value = true
}

function onSelectChange(keys) {
  selectedRowKeys.value = keys
}

async function aiSummaryOne(record) {
  aiLoading.value = true
  try {
    const res = await monitorApi.aiSummary([record.id])
    if (res.data && res.data[0]) {
      if (res.data[0].summary) {
        message.success('AI总结成功')
        // 刷新数据以更新UI
        await loadResults()
      } else if (res.data[0].error) {
        message.error('总结失败: ' + res.data[0].error)
      }
    }
  } catch (e) {
    message.error('AI总结失败')
  } finally {
    aiLoading.value = false
  }
}

async function batchAiSummary() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要总结的内容')
    return
  }
  aiLoading.value = true
  try {
    const res = await monitorApi.aiSummary(selectedRowKeys.value)
    message.success('批量AI总结完成')
    loadResults()
    selectedRowKeys.value = []
  } catch (e) {
    message.error('批量总结失败')
  } finally {
    aiLoading.value = false
  }
}

async function batchDelete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要删除的内容')
    return
  }
  try {
    const res = await monitorApi.batchDeleteResults(selectedRowKeys.value)
    message.success('批量删除成功')
    loadResults()
    selectedRowKeys.value = []
  } catch (e) {
    message.error('批量删除失败')
  }
}

async function deleteResult(id) {
  try {
    await monitorApi.deleteResult(id)
    message.success('删除成功')
    loadResults()
  } catch (e) {
    message.error('删除失败')
  }
}

onMounted(() => {
  loadTasks()
  loadResults()
})
</script>

<style scoped>
.result-view {
  padding: 0;
}

.ai-summary,
.ai-reasoning,
.subtitle-content {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.6;
}

.subtitle-content {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .result-view {
    padding: 0;
  }
  
  .result-view :deep(.ant-card) {
    margin-bottom: 8px;
  }
  
  .result-view :deep(.ant-table) {
    font-size: 11px;
  }
  
  .result-view :deep(.ant-table-thead > tr > th),
  .result-view :deep(.ant-table-tbody > tr > td) {
    padding: 6px 2px !important;
  }
  
  .result-view :deep(.ant-btn) {
    padding: 4px 8px;
    font-size: 11px;
  }
  
  .result-view :deep(.ant-select) {
    font-size: 11px;
    min-width: 80px;
  }
  
  .result-view :deep(.ant-modal) {
    max-width: 95vw;
    margin: 8px auto;
  }
  
  .result-view :deep(.ant-modal-content) {
    padding: 8px;
  }
  
  .result-view :deep(.ant-table-column-title) {
    font-size: 11px;
  }
  
  .ai-summary,
  .ai-reasoning,
  .subtitle-content {
    font-size: 12px;
    padding: 8px;
    max-height: 200px;
  }
}
</style>
