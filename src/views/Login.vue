<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>🎯 投研管理系统</h1>
        <p>Investment Research Management System</p>
      </div>
      
      <a-tabs v-model:activeKey="activeTab" class="login-tabs">
        <a-tab-pane key="login" tab="登录">
          <a-form
            :model="loginForm"
            @finish="handleLogin"
            layout="vertical"
          >
            <a-form-item label="用户名" name="username">
              <a-input
                v-model:value="loginForm.username"
                placeholder="请输入用户名"
                size="large"
              >
                <template #prefix><UserOutlined /></template>
              </a-input>
            </a-form-item>
            
            <a-form-item label="密码" name="password">
              <a-input-password
                v-model:value="loginForm.password"
                placeholder="请输入密码"
                size="large"
              >
                <template #prefix><LockOutlined /></template>
              </a-input-password>
            </a-form-item>
            
            <a-form-item>
              <a-button type="primary" html-type="submit" block size="large" :loading="loginLoading">
                登录
              </a-button>
            </a-form-item>
          </a-form>
        </a-tab-pane>
        
        <a-tab-pane key="register" tab="注册">
          <a-form
            :model="registerForm"
            @finish="handleRegister"
            layout="vertical"
          >
            <a-form-item 
              label="用户名" 
              name="username"
              :rules="[{ required: true, message: '请输入用户名' }, { min: 3, max: 20, message: '用户名长度3-20字符' }]"
            >
              <a-input
                v-model:value="registerForm.username"
                placeholder="请输入用户名"
                size="large"
              >
                <template #prefix><UserOutlined /></template>
              </a-input>
            </a-form-item>
            
            <a-form-item 
              label="昵称" 
              name="nickname"
            >
              <a-input
                v-model:value="registerForm.nickname"
                placeholder="请输入昵称（可选）"
                size="large"
              >
                <template #prefix><SmileOutlined /></template>
              </a-input>
            </a-form-item>
            
            <a-form-item 
              label="密码" 
              name="password"
              :rules="[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]"
            >
              <a-input-password
                v-model:value="registerForm.password"
                placeholder="请输入密码"
                size="large"
              >
                <template #prefix><LockOutlined /></template>
              </a-input-password>
            </a-form-item>
            
            <a-form-item 
              label="邀请码" 
              name="inviteCode"
              :rules="[{ required: true, message: '请输入邀请码' }]"
            >
              <a-input
                v-model:value="registerForm.inviteCode"
                placeholder="请输入邀请码"
                size="large"
              >
                <template #prefix><KeyOutlined /></template>
              </a-input>
            </a-form-item>
            
            <a-form-item>
              <a-button type="primary" html-type="submit" block size="large" :loading="registerLoading">
                注册
              </a-button>
            </a-form-item>
          </a-form>
        </a-tab-pane>
      </a-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined, SmileOutlined, KeyOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeTab = ref('login')

const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  nickname: '',
  password: '',
  inviteCode: ''
})

const loginLoading = ref(false)
const registerLoading = ref(false)

const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    message.error('请输入用户名和密码')
    return
  }
  
  loginLoading.value = true
  try {
    const result = await userStore.login(loginForm.username, loginForm.password)
    if (result.success) {
      message.success('登录成功')
      // 跳转到首页或之前的页面
      const redirect = route.query.redirect || '/'
      router.push(redirect)
    } else {
      message.error(result.message || '登录失败')
    }
  } catch (error) {
    message.error('登录失败，请稍后重试')
  } finally {
    loginLoading.value = false
  }
}

const handleRegister = async () => {
  if (!registerForm.username || !registerForm.password || !registerForm.inviteCode) {
    message.error('请填写完整信息')
    return
  }
  
  registerLoading.value = true
  try {
    const result = await userStore.register(
      registerForm.username,
      registerForm.password,
      registerForm.nickname,
      registerForm.inviteCode
    )
    if (result.success) {
      message.success('注册成功')
      // 跳转到首页
      router.push('/')
    } else {
      message.error(result.message || '注册失败')
    }
  } catch (error) {
    message.error('注册失败，请稍后重试')
  } finally {
    registerLoading.value = false
  }
}
</script>

<style scoped lang="less">
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 480px) {
    width: 90%;
    padding: 24px;
  }
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
  
  h1 {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
  }
  
  p {
    font-size: 12px;
    color: #999;
    margin: 0;
  }
}

.login-tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: 24px;
  }
  
  :deep(.ant-tabs-tab) {
    font-size: 16px;
    padding: 12px 0;
  }
}

:deep(.ant-form-item-label > label) {
  font-weight: 500;
}

:deep(.ant-input-affix-wrapper) {
  padding: 10px 12px;
}

:deep(.ant-btn-lg) {
  height: 44px;
  font-size: 16px;
}
</style>
