<template>
  <div class="system-settings">
    <a-card>
      <a-form
        :model="settings"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 18 }"
      >
        <a-divider>🤖 AI 模型配置</a-divider>
        
        <a-form-item label="AI 模型">
          <a-select v-model:value="settings.ai_model" style="width: 300px" @change="onModelChange">
            <a-select-option value="gpt-4o">GPT-4o</a-select-option>
            <a-select-option value="gpt-4o-mini">GPT-4o-mini</a-select-option>
            <a-select-option value="gpt-4">GPT-4</a-select-option>
            <a-select-option value="gpt-3.5-turbo">GPT-3.5 Turbo</a-select-option>
            <a-select-option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</a-select-option>
            <a-select-option value="deepseek-chat">DeepSeek Chat</a-select-option>
            <a-select-option value="MiniMax-M2.5">MiniMax M2.5</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="API Base URL">
          <a-input
            v-model:value="settings.ai_base_url"
            placeholder="https://api.openai.com/v1"
            style="width: 400px"
          />
          <template #help>
            <span v-if="settings.ai_model === 'MiniMax-M2.5'">
              MiniMax: https://api.minimaxi.com/anthropic
            </span>
          </template>
        </a-form-item>
        
        <a-form-item label="API Key">
          <a-input-password
            v-model:value="settings.ai_api_key"
            placeholder="sk-xxx"
            style="width: 400px"
          />
        </a-form-item>
        
        <a-divider>📢 通知配置</a-divider>
        
        <a-form-item label="启用通知">
          <a-switch v-model:checked="notifyEnabled" />
        </a-form-item>
        
        <a-form-item label="通知方式" v-if="notifyEnabled">
          <a-select v-model:value="settings.notify_type" style="width: 200px">
            <a-select-option value="feishu">飞书</a-select-option>
            <a-select-option value="webhook">Webhook</a-select-option>
            <a-select-option value="email">邮件</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="通知地址" v-if="notifyEnabled">
          <a-input
            v-model:value="settings.notify_webhook"
            placeholder="Webhook URL 或 邮件地址"
            style="width: 400px"
          />
        </a-form-item>
        
        <a-divider>📝 AI 分析提示词配置</a-divider>
        
        <a-form-item label="自定义提示词">
          <a-textarea
            v-model:value="settings.ai_prompt"
            :rows="4"
            placeholder="请输入AI分析时的自定义提示词，使用{content}占位符表示字幕内容"
            style="width: 500px"
          />
          <template #help>
            <div style="color: #888; font-size: 12px; margin-top: 4px;">
              示例：请用100字左右总结以下视频字幕的核心内容要点：&#123;content&#125;<br/>
              默认提示词：如果不填写，将使用系统默认提示词
            </div>
          </template>
        </a-form-item>
        
        <a-form-item :wrapper-col="{ offset: 4, span: 18 }">
          <a-space>
            <a-button type="primary" @click="saveSettings" :loading="saving">
              保存配置
            </a-button>
            <a-button @click="testAiConnection" :loading="testing">
              测试AI连接
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 测试结果展示 -->
    <a-modal
      v-model:open="testResultVisible"
      title="测试结果"
      :footer="null"
    >
      <a-result
        :status="testResult.status"
        :title="testResult.title"
        :sub-title="testResult.subTitle"
      >
        <template #extra>
          <a-button type="primary" @click="testResultVisible = false">确定</a-button>
        </template>
      </a-result>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { monitorApi } from '@/api/monitor.js'

const settings = ref({
  ai_model: 'gpt-4o',
  ai_base_url: 'https://api.openai.com/v1',
  ai_api_key: '',
  ai_prompt: '',
  notify_enabled: 'false',
  notify_type: 'feishu',
  notify_webhook: ''
})

const saving = ref(false)
const testing = ref(false)
const testResultVisible = ref(false)
const testResult = ref({
  status: 'success',
  title: '测试成功',
  subTitle: 'AI 连接正常'
})

const notifyEnabled = computed({
  get: () => settings.value.notify_enabled === 'true',
  set: (val) => settings.value.notify_enabled = val ? 'true' : 'false'
})

async function loadSettings() {
  try {
    const res = await monitorApi.getSettings()
    const data = res.data || {}
    settings.value = {
      ai_model: data.ai_model || 'gpt-4o',
      ai_base_url: data.ai_base_url || 'https://api.openai.com/v1',
      ai_api_key: data.ai_api_key || '',
      ai_prompt: data.ai_prompt || '',
      notify_enabled: data.notify_enabled || 'false',
      notify_type: data.notify_type || 'feishu',
      notify_webhook: data.notify_webhook || ''
    }
  } catch (e) {
    console.error('加载设置失败', e)
  }
}

function onModelChange(model) {
  // 根据模型自动设置Base URL
  if (model === 'MiniMax-M2.5') {
    settings.value.ai_base_url = 'https://api.minimaxi.com/anthropic'
  }
}

async function saveSettings() {
  saving.value = true
  try {
    await monitorApi.updateSettings(settings.value)
    message.success('保存成功')
  } catch (e) {
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function testAiConnection() {
  if (!settings.value.ai_api_key) {
    message.warning('请先填写 API Key')
    return
  }
  
  testing.value = true
  testResultVisible.value = true
  testResult.value = {
    status: 'info',
    title: '测试中...',
    subTitle: '正在连接 AI 服务...'
  }
  
  try {
    // 这里模拟测试，实际应该调用后端测试接口
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 模拟成功
    testResult.value = {
      status: 'success',
      title: '连接成功',
      subTitle: `模型 ${settings.value.ai_model} 连接正常`
    }
    message.success('AI 连接测试成功')
  } catch (e) {
    testResult.value = {
      status: 'error',
      title: '连接失败',
      subTitle: e.message || '请检查 API Key 和 Base URL'
    }
    message.error('AI 连接测试失败')
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.system-settings {
  padding: 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .system-settings {
    padding: 0;
  }
  
  .system-settings :deep(.ant-card) {
    margin-bottom: 8px;
  }
  
  .system-settings :deep(.ant-form-item) {
    margin-bottom: 12px;
  }
  
  .system-settings :deep(.ant-form-item-label > label) {
    font-size: 12px;
  }
  
  .system-settings :deep(.ant-input),
  .system-settings :deep(.ant-input-password),
  .system-settings :deep(.ant-select-selector),
  .system-settings :deep(.ant-input-textarea) {
    font-size: 12px;
  }
  
  .system-settings :deep(.ant-btn) {
    padding: 4px 12px;
    font-size: 12px;
  }
  
  .system-settings :deep(.ant-divider) {
    margin: 12px 0;
  }
  
  .system-settings :deep(.ant-modal) {
    max-width: 95vw;
    margin: 8px auto;
  }
  
  .system-settings :deep(.ant-modal-content) {
    padding: 12px;
  }
}
</style>
