<template>
  <div class="account-manage">
    <!-- 顶部操作栏 -->
    <a-card size="small" style="margin-bottom: 16px">
      <a-space>
        <a-button type="primary" @click="showAddModal">
          <template #icon><PlusOutlined /></template>
          添加账号
        </a-button>
        <a-select
          v-model:value="filterPlatform"
          placeholder="筛选平台"
          style="width: 150px"
          allow-clear
          @change="loadAccounts"
        >
          <a-select-option value="bilibili">B站</a-select-option>
          <a-select-option value="youtube">YouTube</a-select-option>
        </a-select>
        <a-button @click="loadAccounts">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </a-space>
    </a-card>

    <!-- 账号列表 -->
    <a-card>
      <a-table
        :data-source="accounts"
        :columns="columns"
        :loading="loading"
        :row-key="record => record.id"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'platform'">
            <a-tag :color="record.platform === 'bilibili' ? 'blue' : 'red'">
              {{ record.platform === 'bilibili' ? 'B站' : 'YouTube' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 1 ? 'green' : 'default'">
              {{ record.status === 1 ? '启用' : '禁用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'created_at'">
            {{ formatTime(record.created_at) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button size="small" @click="editAccount(record)">编辑</a-button>
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

    <!-- 添加/编辑弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingId ? '编辑账号' : '添加账号'"
      @ok="handleSubmit"
      :confirm-loading="submitLoading"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 16 }"
      >
        <a-form-item label="平台" name="platform" required>
          <a-select v-model:value="formData.platform" :disabled="!!editingId">
            <a-select-option value="bilibili">B站</a-select-option>
            <a-select-option value="youtube">YouTube</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="账号名称" name="account_name" required>
          <a-input v-model:value="formData.account_name" placeholder="如：趋势天哥" />
        </a-form-item>
        <a-form-item label="Cookie" name="cookie">
          <a-textarea v-model:value="formData.cookie" placeholder="登录Cookie" :rows="3" />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-switch v-model:checked="formData.statusSwitch" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { monitorApi } from '@/api/monitor.js'

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '平台', key: 'platform', width: 100 },
  { title: '账号名称', dataIndex: 'account_name', key: 'account_name' },
  { title: '状态', key: 'status', width: 80 },
  { title: '添加时间', key: 'created_at', width: 160 },
  { title: '操作', key: 'action', width: 150 }
]

const accounts = ref([])
const loading = ref(false)
const filterPlatform = ref(null)
const modalVisible = ref(false)
const editingId = ref(null)
const submitLoading = ref(false)
const formRef = ref()

const formData = ref({
  platform: 'bilibili',
  account_name: '',
  cookie: '',
  statusSwitch: true
})

function formatTime(timeStr) {
  if (!timeStr) return '-'
  return timeStr
}

async function loadAccounts() {
  loading.value = true
  try {
    const res = await monitorApi.getAccounts(filterPlatform.value)
    accounts.value = res.data || []
  } catch (e) {
    message.error('加载账号失败')
  } finally {
    loading.value = false
  }
}

function showAddModal() {
  editingId.value = null
  formData.value = {
    platform: 'bilibili',
    account_name: '',
    cookie: '',
    statusSwitch: true
  }
  modalVisible.value = true
}

function editAccount(record) {
  editingId.value = record.id
  formData.value = {
    platform: record.platform,
    account_name: record.account_name,
    cookie: record.cookie || '',
    statusSwitch: record.status === 1
  }
  modalVisible.value = true
}

async function handleSubmit() {
  if (!formData.value.account_name) {
    message.warning('请输入账号名称')
    return
  }
  
  submitLoading.value = true
  try {
    const data = {
      platform: formData.value.platform,
      account_name: formData.value.account_name,
      cookie: formData.value.cookie,
      status: formData.value.statusSwitch ? 1 : 0
    }
    
    if (editingId.value) {
      await monitorApi.updateAccount(editingId.value, data)
      message.success('更新成功')
    } else {
      await monitorApi.createAccount(data)
      message.success('添加成功')
    }
    modalVisible.value = false
    loadAccounts()
  } catch (e) {
    message.error('操作失败: ' + (e.response?.data?.message || e.message))
  } finally {
    submitLoading.value = false
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

onMounted(() => {
  loadAccounts()
})
</script>

<style scoped>
.account-manage {
  padding: 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .account-manage {
    padding: 0;
  }
  
  .account-manage :deep(.ant-card) {
    margin-bottom: 8px;
  }
  
  .account-manage :deep(.ant-table) {
    font-size: 11px;
  }
  
  .account-manage :deep(.ant-table-thead > tr > th),
  .account-manage :deep(.ant-table-tbody > tr > td) {
    padding: 6px 2px !important;
  }
  
  .account-manage :deep(.ant-btn) {
    padding: 4px 8px;
    font-size: 11px;
  }
  
  .account-manage :deep(.ant-form-item) {
    margin-bottom: 8px;
  }
  
  .account-manage :deep(.ant-modal) {
    max-width: 95vw;
    margin: 8px auto;
  }
  
  .account-manage :deep(.ant-modal-content) {
    padding: 8px;
  }
}
</style>
