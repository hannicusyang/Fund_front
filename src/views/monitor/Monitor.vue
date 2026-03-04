<template>
  <AppLayout menu-key="Monitor">
    <div class="monitor-container">
      <a-tabs v-model:activeKey="activeTab">
        <!-- 账号管理 -->
        <a-tab-pane key="accounts" tab="📱 账号管理">
          <a-card>
            <template #title>
              <a-space>
                <span>监控账号</span>
                <a-button type="primary" size="small" @click="showAccountModal()">
                  <PlusOutlined /> 添加账号
                </a-button>
              </a-space>
            </template>
            <a-table
              :data-source="accounts"
              :columns="accountColumns"
              :loading="loading"
              :row-key="record => record.id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'platform'">
                  <a-tag :color="getPlatformColor(record.platform)">
                    {{ getPlatformName(record.platform) }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="record.status === 'active' ? 'green' : 'default'">
                    {{ record.status === 'active' ? '启用' : '禁用' }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-space>
                    <a-button size="small" @click="showAccountModal(record)">编辑</a-button>
                    <a-popconfirm
                      title="确定删除此账号吗？"
                      @confirm="deleteAccount(record.id)"
                    >
                      <a-button size="small" danger>删除</a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-tab-pane>

        <!-- 任务管理 -->
        <a-tab-pane key="tasks" tab="⚙️ 监控任务">
          <a-card>
            <template #title>
              <a-space>
                <span>监控任务</span>
                <a-button type="primary" size="small" @click="showTaskModal()">
                  <PlusOutlined /> 创建任务
                </a-button>
              </a-space>
            </template>
            <a-table
              :data-source="tasks"
              :columns="taskColumns"
              :loading="loading"
              :row-key="record => record.id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'platform'">
                  <a-tag :color="getPlatformColor(record.platform)">
                    {{ getPlatformName(record.platform) }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'is_enabled'">
                  <a-switch
                    :checked="record.is_enabled"
                    size="small"
                    @change="toggleTask(record.id, $event)"
                  />
                </template>
                <template v-else-if="column.key === 'last_run'">
                  {{ record.last_run ? record.last_run.substring(0, 16) : '从未运行' }}
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-space>
                    <a-button size="small" type="primary" @click="runTask(record.id)">
                      <PlayCircleOutlined /> 执行
                    </a-button>
                    <a-button size="small" @click="showTaskModal(record)">编辑</a-button>
                    <a-popconfirm
                      title="确定删除此任务吗？"
                      @confirm="deleteTask(record.id)"
                    >
                      <a-button size="small" danger>删除</a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-tab-pane>

        <!-- 内容列表 -->
        <a-tab-pane key="contents" tab="📺 监控内容">
          <a-card>
            <template #title>
              <a-space>
                <span>内容列表</span>
                <a-select
                  v-model:value="contentFilter.status"
                  placeholder="筛选状态"
                  style="width: 120px"
                  allow-clear
                  @change="loadContents"
                >
                  <a-select-option value="pending">待总结</a-select-option>
                  <a-select-option value="summarized">已总结</a-select-option>
                </a-select>
                <a-button size="small" @click="loadContents">
                  <ReloadOutlined /> 刷新
                </a-button>
              </a-space>
            </template>
            <a-table
              :data-source="contents"
              :columns="contentColumns"
              :loading="loading"
              :pagination="contentPagination"
              :row-key="record => record.id"
              @change="handleContentTableChange"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'content_type'">
                  <a-tag :color="record.content_type === 'video' ? 'blue' : 'green'">
                    {{ record.content_type === 'video' ? '视频' : '文章' }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="getStatusColor(record.status)">
                    {{ getStatusText(record.status) }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'title'">
                  <a :href="record.url" target="_blank" style="max-width: 300px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ record.title }}
                  </a>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-space>
                    <a-button size="small" @click="viewContent(record)">查看</a-button>
                    <a-button
                      size="small"
                      type="primary"
                      :disabled="!record.content || record.status === 'summarized'"
                      @click="summarizeContent(record.id)"
                    >
                      总结
                    </a-button>
                  </a-space>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-tab-pane>
      </a-tabs>

      <!-- 账号弹窗 -->
      <a-modal
        v-model:open="accountModal.visible"
        :title="accountModal.id ? '编辑账号' : '添加账号'"
        @ok="saveAccount"
        :confirm-loading="accountModal.loading"
      >
        <a-form :model="accountModal.form" layout="vertical">
          <a-form-item label="平台" required>
            <a-select v-model:value="accountModal.form.platform" placeholder="选择平台">
              <a-select-option value="bilibili">B站</a-select-option>
              <a-select-option value="douyin">抖音</a-select-option>
              <a-select-option value="wechat">微信公众号</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="账号/UP主名称">
            <a-input v-model:value="accountModal.form.account_name" placeholder="如：老高" />
          </a-form-item>
          <a-form-item label="平台ID">
            <a-input v-model:value="accountModal.form.account_id" placeholder="B站为UP主mid" />
          </a-form-item>
          <a-form-item label="Cookie">
            <a-textarea
              v-model:value="accountModal.form.cookie"
              placeholder="登录后的SESSDATA"
              :rows="3"
            />
          </a-form-item>
          <a-form-item label="备注">
            <a-input v-model:value="accountModal.form.remark" placeholder="可选备注" />
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 任务弹窗 -->
      <a-modal
        v-model:open="taskModal.visible"
        :title="taskModal.id ? '编辑任务' : '创建任务'"
        @ok="saveTask"
        :confirm-loading="taskModal.loading"
      >
        <a-form :model="taskModal.form" layout="vertical">
          <a-form-item label="所属账号" required>
            <a-select v-model:value="taskModal.form.account_id" placeholder="选择账号">
              <a-select-option v-for="acc in accounts" :key="acc.id" :value="acc.id">
                {{ acc.account_name || acc.platform }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="任务名称" required>
            <a-input v-model:value="taskModal.form.task_name" placeholder="如：老高视频监控" />
          </a-form-item>
          <a-form-item label="监控类型">
            <a-select v-model:value="taskModal.form.target_type">
              <a-select-option value="up主">UP主</a-select-option>
              <a-select-option value="关键词">关键词</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="目标值">
            <a-input
              v-model:value="taskModal.form.target_value"
              :placeholder="taskModal.form.target_type === 'up主' ? 'UP主ID(mid)' : '搜索关键词'"
            />
          </a-form-item>
          <a-form-item label="执行间隔">
            <a-select v-model:value="taskModal.form.schedule">
              <a-select-option value="0 * * * *">每小时</a-select-option>
              <a-select-option value="0 */2 * * *">每2小时</a-select-option>
              <a-select-option value="0 */6 * * *">每6小时</a-select-option>
              <a-select-option value="0 0 * * *">每天</a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 内容详情弹窗 -->
      <a-modal
        v-model:open="contentModal.visible"
        :title="contentModal.data?.title"
        width="700px"
        :footer="null"
      >
        <div v-if="contentModal.data">
          <a-descriptions :column="2" size="small">
            <a-descriptions-item label="类型">
              <a-tag :color="contentModal.data.content_type === 'video' ? 'blue' : 'green'">
                {{ contentModal.data.content_type }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag :color="getStatusColor(contentModal.data.status)">
                {{ getStatusText(contentModal.data.status) }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="发布时间">
              {{ contentModal.data.publish_time || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="获取时间">
              {{ contentModal.data.fetch_time || '-' }}
            </a-descriptions-item>
          </a-descriptions>
          
          <a-divider>AI总结</a-divider>
          <div v-if="contentModal.data.summary" class="summary-content">
            {{ contentModal.data.summary }}
          </div>
          <a-empty v-else description="暂无总结" />
          
          <a-divider>原始内容</a-divider>
          <div class="original-content">
            {{ contentModal.data.content || '无' }}
          </div>
        </div>
      </a-modal>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, PlayCircleOutlined } from '@ant-design/icons-vue'
import { monitorApi } from '@/api/monitor.js'
import AppLayout from '@/components/layout/AppLayout.vue'

const activeTab = ref('accounts')
const loading = ref(false)

// 账号数据
const accounts = ref([])
const accountColumns = [
  { title: '平台', key: 'platform', width: 100 },
  { title: '账号名称', dataIndex: 'account_name' },
  { title: '账号ID', dataIndex: 'account_id' },
  { title: '状态', key: 'status', width: 80 },
  { title: '备注', dataIndex: 'remark' },
  { title: '操作', key: 'action', width: 150 }
]

// 任务数据
const tasks = ref([])
const taskColumns = [
  { title: '任务名称', dataIndex: 'task_name' },
  { title: '平台', key: 'platform', width: 80 },
  { title: '监控类型', dataIndex: 'target_type' },
  { title: '目标值', dataIndex: 'target_value' },
  { title: '执行间隔', dataIndex: 'schedule' },
  { title: '状态', key: 'is_enabled', width: 60 },
  { title: '上次执行', key: 'last_run', width: 150 },
  { title: '操作', key: 'action', width: 200 }
]

// 内容数据
const contents = ref([])
const contentFilter = ref({ status: null })
const contentPagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})
const contentColumns = [
  { title: '类型', key: 'content_type', width: 80 },
  { title: '标题', key: 'title', ellipsis: true },
  { title: '状态', key: 'status', width: 100 },
  { title: '发布时间', dataIndex: 'publish_time', width: 160 },
  { title: '操作', key: 'action', width: 150 }
]

// 弹窗状态
const accountModal = ref({
  visible: false,
  id: null,
  loading: false,
  form: {}
})

const taskModal = ref({
  visible: false,
  id: null,
  loading: false,
  form: {}
})

const contentModal = ref({
  visible: false,
  data: null
})

// 工具函数
function getPlatformColor(platform) {
  const colors = { bilibili: 'blue', douyin: 'red', wechat: 'green' }
  return colors[platform] || 'default'
}

function getPlatformName(platform) {
  const names = { bilibili: 'B站', douyin: '抖音', wechat: '微信' }
  return names[platform] || platform
}

function getStatusColor(status) {
  const colors = { pending: 'orange', summarized: 'green', error: 'red' }
  return colors[status] || 'default'
}

function getStatusText(status) {
  const texts = { pending: '待总结', summarized: '已总结', error: '失败' }
  return texts[status] || status
}

// 加载数据
async function loadAccounts() {
  try {
    const res = await monitorApi.getAccounts()
    accounts.value = res.data || []
  } catch (e) {
    console.error('加载账号失败:', e)
  }
}

async function loadTasks() {
  try {
    const res = await monitorApi.getTasks()
    tasks.value = res.data || []
  } catch (e) {
    console.error('加载任务失败:', e)
  }
}

async function loadContents() {
  loading.value = true
  try {
    const res = await monitorApi.getContents({
      page: contentPagination.value.current,
      page_size: contentPagination.value.pageSize,
      status: contentFilter.value.status
    })
    contents.value = res.data?.items || []
    contentPagination.value.total = res.data?.total || 0
  } catch (e) {
    console.error('加载内容失败:', e)
  } finally {
    loading.value = false
  }
}

// 账号操作
function showAccountModal(record = null) {
  accountModal.value = {
    visible: true,
    id: record?.id || null,
    loading: false,
    form: record ? { ...record } : { platform: 'bilibili', account_name: '', account_id: '', cookie: '', remark: '' }
  }
}

async function saveAccount() {
  accountModal.value.loading = true
  try {
    if (accountModal.value.id) {
      await monitorApi.updateAccount(accountModal.value.id, accountModal.value.form)
      message.success('更新成功')
    } else {
      await monitorApi.createAccount(accountModal.value.form)
      message.success('添加成功')
    }
    accountModal.value.visible = false
    loadAccounts()
  } catch (e) {
    message.error('操作失败')
  } finally {
    accountModal.value.loading = false
  }
}

async function deleteAccount(id) {
  try {
    await monitorApi.deleteAccount(id)
    message.success('删除成功')
    loadAccounts()
  } catch (e) {
    message.error('删除失败')
  }
}

// 任务操作
function showTaskModal(record = null) {
  taskModal.value = {
    visible: true,
    id: record?.id || null,
    loading: false,
    form: record ? { ...record } : { account_id: null, task_name: '', platform: 'bilibili', target_type: 'up主', target_value: '', schedule: '0 * * * *' }
  }
}

async function saveTask() {
  taskModal.value.loading = true
  try {
    if (taskModal.value.id) {
      await monitorApi.updateTask(taskModal.value.id, taskModal.value.form)
      message.success('更新成功')
    } else {
      await monitorApi.createTask(taskModal.value.form)
      message.success('创建成功')
    }
    taskModal.value.visible = false
    loadTasks()
  } catch (e) {
    message.error('操作失败')
  } finally {
    taskModal.value.loading = false
  }
}

async function deleteTask(id) {
  try {
    await monitorApi.deleteTask(id)
    message.success('删除成功')
    loadTasks()
  } catch (e) {
    message.error('删除失败')
  }
}

async function toggleTask(id, enabled) {
  try {
    await monitorApi.updateTask(id, { is_enabled: enabled })
    message.success(enabled ? '已启用' : '已禁用')
  } catch (e) {
    message.error('操作失败')
    loadTasks()
  }
}

async function runTask(id) {
  loading.value = true
  try {
    const res = await monitorApi.runTask(id)
    message.success(`执行完成，发现${res.data?.new_videos || 0}个新内容`)
    loadContents()
  } catch (e) {
    message.error('执行失败')
  } finally {
    loading.value = false
  }
}

// 内容操作
async function viewContent(record) {
  try {
    const res = await monitorApi.getContentDetail(record.id)
    contentModal.value.data = res.data
    contentModal.value.visible = true
  } catch (e) {
    message.error('加载失败')
  }
}

async function summarizeContent(id) {
  loading.value = true
  try {
    const res = await monitorApi.summarizeContent(id)
    message.success('总结完成')
    loadContents()
    // 更新弹窗内容
    if (contentModal.value.visible) {
      contentModal.value.data.summary = res.data?.summary
    }
  } catch (e) {
    message.error('总结失败')
  } finally {
    loading.value = false
  }
}

function handleContentTableChange(pagination) {
  contentPagination.value.current = pagination.current
  loadContents()
}

onMounted(() => {
  loadAccounts()
  loadTasks()
  loadContents()
})
</script>

<style scoped lang="less">
.monitor-container {
  padding: 16px;
}

.summary-content {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  line-height: 1.8;
  max-height: 300px;
  overflow-y: auto;
}

.original-content {
  background: #fafafa;
  padding: 12px;
  border-radius: 6px;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-size: 12px;
  color: #666;
}
</style>
