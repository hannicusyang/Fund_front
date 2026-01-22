<script setup>
import { ref, watch, onMounted, provide, computed } from 'vue'
import { ConfigProvider, theme } from 'ant-design-vue'

const isDarkMode = ref(false)

// 初始化主题
onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved) {
    isDarkMode.value = saved === 'dark'
  }
})

watch(isDarkMode, () => {
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
}, { immediate: true })

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
}
provide('themeState', { isDarkMode, toggleTheme })

const appTheme = computed(() => ({
  algorithm: isDarkMode.value ? theme.darkAlgorithm : theme.defaultAlgorithm
}))
</script>

<template>
  <div :class="['app-container', { 'dark-theme': isDarkMode }]">
    <a-config-provider :theme="appTheme">
      <div id="app">
        <router-view />
      </div>
    </a-config-provider>
  </div>
</template>

<style>
.app-container {
  min-height: 100vh;
}
</style>