<!-- src/components/BodyBackgroundUpdater.vue -->
<script setup>
import { onMounted } from 'vue'
import { theme } from 'ant-design-vue'

// 在 ConfigProvider 内部安全地使用 useToken
const { token } = theme.useToken()

onMounted(() => {
  // 监听 token 变化并更新背景
  const observer = new MutationObserver(() => {
    if (token.value) {
      document.body.style.backgroundColor = token.value.colorBgLayout
    }
  })

  // 初始设置
  if (token.value) {
    document.body.style.backgroundColor = token.value.colorBgLayout
  }

  // 监听 token 变化（简单轮询替代）
  const interval = setInterval(() => {
    if (token.value?.colorBgLayout) {
      document.body.style.backgroundColor = token.value.colorBgLayout
    }
  }, 100)

  onUnmounted(() => {
    clearInterval(interval)
    observer.disconnect()
  })
})
</script>

<template>
  <!-- 空组件，仅用于副作用 -->
</template>