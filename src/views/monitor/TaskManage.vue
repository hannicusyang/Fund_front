<template>
  <div class="task-manage">
    <!-- 顶部操作栏 -->
    <a-card size="small" style="margin-bottom: 16px">
      <a-space>
        <a-button type="primary" @click="showAddModal">
          <template #icon><PlusOutlined /></template>
          创建任务
        </a-button>
        <a-select
          v-model:value="filterPlatform"
          placeholder="筛选平台"
          style="width: 150px"
          allow-clear
          @change="loadTasks"
        >
          <a-select-option value="bilibili">B站</a-select-option>
          <a-select-option value="gelonghui">格隆汇</a-select-option>
          <a-select-option value="jin10">金十数据</a-select-option>
          <a-select-option value="wallstreetcn">华尔街见闻</a-select-option>
          <a-select-option value="cls">财联社</a-select-option>
          <a-select-option value="caijing">财经网</a-select-option>
          <a-select-option value="eastmoney">东方财富</a-select-option>
        </a-select>
        <a-select
          v-model:value="filterEnabled"
          placeholder="状态"
          style="width: 120px"
          allow-clear
          @change="loadTasks"
        >
          <a-select-option value="true">启用</a-select-option>
          <a-select-option value="false">禁用</a-select-option>
        </a-select>
        <a-button @click="loadTasks">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </a-space>
    </a-card>

    <!-- 任务列表 -->
    <a-card>
      <a-table
        :data-source="tasks"
        :columns="columns"
        :loading="loading"
        :row-key="record => record.id"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'platform'">
            <a-tag color="blue">{{ getPlatformName(record.platform) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'rss_route'">
            <a-tooltip>
              <template #title>{{ record.rss_route }}</template>
              <span style="max-width: 200px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                {{ record.rss_route }}
              </span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'cron_expression'">
            <a-tag v-if="record.cron_expression" color="orange">{{ record.cron_expression }}</a-tag>
            <span v-else style="color: #999;">手动</span>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-switch
              :checked="record.enabled"
              size="small"
              @change="toggleEnabled(record)"
            />
          </template>
          <template v-else-if="column.key === 'last_run_at'">
            {{ formatTime(record.last_run_at) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button size="small" type="primary" @click="runTask(record.id)">执行</a-button>
              <a-button size="small" @click="editTask(record)">编辑</a-button>
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

    <!-- 添加/编辑弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingId ? '编辑任务' : '创建任务'"
      width="700px"
      @ok="handleSubmit"
      :confirm-loading="submitLoading"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 16 }"
      >
        <a-form-item label="任务名称" name="task_name" required>
          <a-input v-model:value="formData.task_name" placeholder="如：趋势天哥视频监控" />
        </a-form-item>
        <a-form-item label="平台" name="platform" required>
          <a-select v-model:value="formData.platform" :disabled="!!editingId" @change="onPlatformChange">
            <a-select-option value="bilibili">B站</a-select-option>
            <a-select-option value="gelonghui">格隆汇</a-select-option>
            <a-select-option value="jin10">金十数据</a-select-option>
            <a-select-option value="wallstreetcn">华尔街见闻</a-select-option>
            <a-select-option value="cls">财联社</a-select-option>
            <a-select-option value="caijing">财经网</a-select-option>
            <a-select-option value="eastmoney">东方财富</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="RSS路由" name="rss_route" required>
          <a-select
            v-model:value="formData.rss_route"
            placeholder="选择RSS路由"
            show-search
            :disabled="!!editingId"
            @change="routeParamValues = {}"
          >
            <a-select-option v-for="route in filteredRoutes" :key="route.value" :value="route.value">
              {{ route.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <!-- 动态路由参数输入 -->
        <template v-if="currentRouteParams.length > 0">
          <a-divider orientation="left">路由参数</a-divider>
          <a-form-item
            v-for="param in currentRouteParams"
            :key="param.key"
            :label="param.label"
            :name="param.key"
          >
            <a-input
              v-model:value="routeParamValues[param.key]"
              :placeholder="param.placeholder"
            >
              <template #prefix>
                <span style="color: red;" v-if="param.required">*</span>
              </template>
            </a-input>
          </a-form-item>
          <!-- URL预览 -->
          <a-alert
            type="info"
            show-icon
            style="margin-bottom: 16px"
          >
            <template #message>
              <span>最终URL: </span>
              <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">{{ previewUrl }}</code>
            </template>
          </a-alert>
        </template>
        
        <a-form-item label="路由参数(JSON)" name="route_params" v-if="false">
          <a-input v-model:value="formData.route_params_str" placeholder='{"uid": "1372241958"}' />
        </a-form-item>
        <a-form-item label="定时规则" name="cron_expression">
          <a-input v-model:value="formData.cron_expression" placeholder="0 * * * * (每小时) 或 0 9 * * * (每天9点)" />
        </a-form-item>
        <a-form-item label="最大获取" name="max_results">
          <a-input-number v-model:value="formData.max_results" :min="1" :max="100" style="width: 100px" />
          <span style="margin-left: 8px; color: #888;">条(每次最多获取)</span>
        </a-form-item>
        <a-form-item label="AI分析提示词" name="ai_prompt">
          <a-textarea v-model:value="formData.ai_prompt" placeholder="请总结这个视频的主要内容要点" :rows="2" />
        </a-form-item>
        <a-form-item label="绑定账号" name="account_id">
          <a-select v-model:value="formData.account_id" placeholder="选择账号(可选)" allow-clear>
            <a-select-option v-for="acc in accounts" :key="acc.id" :value="acc.id">
              {{ acc.account_name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="启用任务" name="enabled">
          <a-switch v-model:checked="formData.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { monitorApi } from '@/api/monitor.js'

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '任务名称', dataIndex: 'task_name', key: 'task_name' },
  { title: '平台', key: 'platform', width: 80 },
  { title: 'RSS路由', key: 'rss_route' },
  { title: '定时', key: 'cron_expression', width: 120 },
  { title: '获取', key: 'max_results', width: 70 },
  { title: '启用', key: 'enabled', width: 60 },
  { title: '上次运行', key: 'last_run_at', width: 160 },
  { title: '操作', key: 'action', width: 180 }
]

const tasks = ref([])
const accounts = ref([])
const loading = ref(false)
const filterPlatform = ref(null)
const filterEnabled = ref(null)
const modalVisible = ref(false)
const editingId = ref(null)
const submitLoading = ref(false)
const formRef = ref()

// 路由参数配置
const routeParamsConfig = {
  // UP主相关
  '/bilibili/user/video/:uid': [
    { key: 'uid', label: '用户ID', placeholder: '如：2267573', required: true }
  ],
  '/bilibili/user/dynamic/:uid': [
    { key: 'uid', label: '用户ID', placeholder: '如：2267573', required: true }
  ],
  '/bilibili/user/article/:uid': [
    { key: 'uid', label: '用户ID', placeholder: '如：2267573', required: true }
  ],
  '/bilibili/user/coin/:uid': [
    { key: 'uid', label: '用户ID', placeholder: '如：2267573', required: true }
  ],
  '/bilibili/user/fav/:uid': [
    { key: 'uid', label: '用户ID', placeholder: '如：2267573', required: true }
  ],
  // 分区
  '/bilibili/partion/:tid': [
    { key: 'tid', label: '分区ID', placeholder: '如：207（财经商业）', required: true }
  ],
  '/bilibili/partion/ranking/:tid/:days': [
    { key: 'tid', label: '分区ID', placeholder: '如：207（财经商业）', required: true },
    { key: 'days', label: '天数', placeholder: '如：7（默认7天）', required: false }
  ],
  // 番剧
  '/bilibili/bangumi/media/:mediaid': [
    { key: 'mediaid', label: '媒体ID', placeholder: '如：9192', required: true }
  ],
  // 直播
  '/bilibili/live/room/:roomID': [
    { key: 'roomid', label: '直播间ID', placeholder: '如：6', required: true }
  ],
  // 热门
  '/bilibili/popular/all': [],
  '/bilibili/weekly': [],
  // 搜索
  '/bilibili/vsearch/:kw': [
    { key: 'kw', label: '搜索关键词', placeholder: '如：Python教程', required: true }
  ],
  // 热搜
  '/bilibili/hot-search': [],
  // 入站必刷
  '/bilibili/precious': [],
  // 财经路由
  '/gelonghui/hot-article': [],
  '/gelonghui/home': [],
  '/jin10': [],
  '/jin10/news': [],
  '/wallstreetcn/news': [],
  '/cls/telegraph': [],
  '/cls/hot': [],
  '/cls/depth': [],
  '/caijing/roll': [],
  '/eastmoney/report/industry': []
}

// 当前路由需要的参数列表
const currentRouteParams = computed(() => {
  const route = formData.value.rss_route
  return routeParamsConfig[route] || []
})

// 预览最终URL
const previewUrl = computed(() => {
  let url = formData.value.rss_route
  const params = routeParamValues.value
  for (const key in params) {
    if (params[key]) {
      url = url.replace(`:${key}`, params[key])
    }
  }
  return url || formData.value.rss_route
})

// 参数输入值
const routeParamValues = ref({})

// 更新参数值时自动生成JSON（去除空格）
watch(routeParamValues, (newVal) => {
  const params = {}
  currentRouteParams.value.forEach(p => {
    if (newVal[p.key]) {
      // 去除输入值的前后空格
      params[p.key] = String(newVal[p.key]).trim()
    }
  })
  formData.value.route_params_str = JSON.stringify(params)
}, { deep: true })

const formData = ref({
  task_name: '',
  platform: 'bilibili',
  rss_route: '/bilibili/user/video/:uid',
  route_params_str: '',
  cron_expression: '',
  max_results: 20,
  ai_prompt: '请总结这个视频的主要内容要点',
  account_id: null,
  enabled: true
})

// 按平台筛选的路由列表
const filteredRoutes = computed(() => {
  const platform = formData.value.platform
  const allRoutes = {
    bilibili: [
      { value: '/bilibili/user/video/:uid', label: 'UP主投稿' },
      { value: '/bilibili/user/dynamic/:uid', label: 'UP主动态' },
      { value: '/bilibili/user/article/:uid', label: 'UP主专栏' },
      { value: '/bilibili/user/coin/:uid', label: 'UP主投币视频' },
      { value: '/bilibili/user/fav/:uid', label: 'UP主收藏' },
      { value: '/bilibili/partion/:tid', label: '分区视频' },
      { value: '/bilibili/partion/ranking/:tid/:days', label: '分区排行榜' },
      { value: '/bilibili/bangumi/media/:mediaid', label: '番剧更新' },
      { value: '/bilibili/live/room/:roomID', label: '直播间' },
      { value: '/bilibili/popular/all', label: '综合热门' },
      { value: '/bilibili/weekly', label: '每周必看' },
      { value: '/bilibili/vsearch/:kw', label: '视频搜索' },
      { value: '/bilibili/hot-search', label: '热搜' },
      { value: '/bilibili/precious', label: '入站必刷' },
    ],
    gelonghui: [
      { value: '/gelonghui/hot-article', label: '热门文章' },
      { value: '/gelonghui/home', label: '首页' },
    ],
    jin10: [
      { value: '/jin10', label: '快讯' },
      { value: '/jin10/news', label: '新闻' },
    ],
    wallstreetcn: [
      { value: '/wallstreetcn/news', label: '新闻' },
    ],
    cls: [
      { value: '/cls/telegraph', label: '电报' },
      { value: '/cls/hot', label: '热门文章' },
      { value: '/cls/depth', label: '深度' },
    ],
    caijing: [
      { value: '/caijing/roll', label: '滚动新闻' },
    ],
    eastmoney: [
      { value: '/eastmoney/report/industry', label: '行业研究报告' },
      { value: '/eastmoney/report/strategyreport', label: '策略研究报告' },
      { value: '/eastmoney/report/macresearch', label: '宏观研究报告' },
      { value: '/eastmoney/report/brokerreport', label: '券商晨报纸' },
      { value: '/eastmoney/report/stock', label: '个股研报' },
    ],
  }
  return allRoutes[platform] || []
})

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
  loading.value = true
  try {
    const params = {}
    if (filterPlatform.value) params.platform = filterPlatform.value
    if (filterEnabled.value) params.enabled = filterEnabled.value
    const res = await monitorApi.getTasks(params)
    tasks.value = res.data || []
  } catch (e) {
    message.error('加载任务失败')
  } finally {
    loading.value = false
  }
}

async function loadAccounts() {
  try {
    const res = await monitorApi.getAccounts()
    accounts.value = res.data || []
  } catch (e) {
    console.error('加载账号失败', e)
  }
}

function onPlatformChange(platform) {
  if (platform === 'bilibili') {
    formData.value.rss_route = '/bilibili/user/video/:uid'
  } else if (platform === 'gelonghui') {
    formData.value.rss_route = '/gelonghui/hot-article'
  } else if (platform === 'jin10') {
    formData.value.rss_route = '/jin10'
  } else if (platform === 'wallstreetcn') {
    formData.value.rss_route = '/wallstreetcn/news'
  } else if (platform === 'cls') {
    formData.value.rss_route = '/cls/telegraph'
  } else if (platform === 'caijing') {
    formData.value.rss_route = '/caijing/roll'
  } else if (platform === 'eastmoney') {
    formData.value.rss_route = '/eastmoney/report/industry'
  }
  routeParamValues.value = {}
}

function showAddModal() {
  editingId.value = null
  routeParamValues.value = {}
  formData.value = {
    task_name: '',
    platform: 'bilibili',
    rss_route: '/bilibili/user/video/:uid',
    route_params_str: '',
    cron_expression: '',
    ai_prompt: '请总结这个视频的主要内容要点',
    account_id: null,
    enabled: true
  }
  modalVisible.value = true
}

function editTask(record) {
  editingId.value = record.id
  let paramsStr = ''
  let params = {}
  if (record.route_params) {
    try {
      params = record.route_params
      paramsStr = JSON.stringify(params)
    } catch (e) {}
  }
  // 加载参数到输入框
  routeParamValues.value = { ...params }
  formData.value = {
    task_name: record.task_name,
    platform: record.platform,
    rss_route: record.rss_route,
    route_params_str: paramsStr,
    cron_expression: record.cron_expression || '',
    max_results: record.max_results || 20,
    ai_prompt: record.ai_prompt || '',
    account_id: record.account_id,
    enabled: record.enabled
  }
  modalVisible.value = true
}

async function handleSubmit() {
  if (!formData.value.task_name || !formData.value.rss_route) {
    message.warning('请填写必填项')
    return
  }
  
  submitLoading.value = true
  try {
    let route_params = {}
    if (formData.value.route_params_str) {
      try {
        route_params = JSON.parse(formData.value.route_params_str)
      } catch (e) {
        message.warning('路由参数格式错误，请输入JSON')
        submitLoading.value = false
        return
      }
    }
    
    const data = {
      task_name: formData.value.task_name,
      platform: formData.value.platform,
      rss_route: formData.value.rss_route,
      route_params: route_params,
      max_results: formData.value.max_results,
      cron_expression: formData.value.cron_expression,
      ai_prompt: formData.value.ai_prompt,
      account_id: formData.value.account_id,
      enabled: formData.value.enabled
    }
    
    if (editingId.value) {
      await monitorApi.updateTask(editingId.value, data)
      message.success('更新成功')
    } else {
      await monitorApi.createTask(data)
      message.success('创建成功')
    }
    modalVisible.value = false
    loadTasks()
  } catch (e) {
    message.error('操作失败: ' + (e.response?.data?.message || e.message))
  } finally {
    submitLoading.value = false
  }
}

async function toggleEnabled(record) {
  try {
    await monitorApi.updateTask(record.id, { enabled: record.enabled })
    message.success(record.enabled ? '已启用' : '已禁用')
  } catch (e) {
    record.enabled = !record.enabled
    message.error('操作失败')
  }
}

async function runTask(id) {
  try {
    await monitorApi.runTask(id)
    message.success('任务已触发执行')
  } catch (e) {
    message.error('执行失败')
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

onMounted(() => {
  loadTasks()
  loadAccounts()
})
</script>

<style scoped>
.task-manage {
  padding: 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .task-manage {
    padding: 0;
  }
  
  .task-manage :deep(.ant-card) {
    margin-bottom: 12px;
  }
  
  .task-manage :deep(.ant-table) {
    font-size: 12px;
  }
  
  .task-manage :deep(.ant-table-thead > tr > th),
  .task-manage :deep(.ant-table-tbody > tr > td) {
    padding: 8px 4px !important;
  }
  
  .task-manage :deep(.ant-form-item) {
    margin-bottom: 12px;
  }
  
  .task-manage :deep(.ant-form-item-label > label) {
    font-size: 12px;
  }
  
  .task-manage :deep(.ant-btn) {
    padding: 4px 8px;
    font-size: 12px;
  }
  
  .task-manage :deep(.ant-select) {
    font-size: 12px;
  }
  
  .task-manage :deep(.ant-modal) {
    max-width: 95vw;
    margin: 8px auto;
  }
  
  .task-manage :deep(.ant-modal-content) {
    padding: 12px;
  }
}
</style>
