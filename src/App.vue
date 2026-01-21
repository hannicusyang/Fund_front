<!-- src/App.vue -->

<script setup>
import { ref, watchEffect } from 'vue';

// 创建一个响应式引用，用于跟踪当前主题
const isDarkMode = ref(false);

// 从 localStorage 读取用户偏好并初始化
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  isDarkMode.value = savedTheme === 'dark';
};

// 切换主题的方法
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light');
};

// 将方法暴露给模板
defineExpose({
  toggleTheme
});

// 初始化主题
initTheme();

// 监听 isDarkMode 的变化，并动态设置 CSS 变量
watchEffect(() => {
  if (isDarkMode.value) {
    // 应用 Ant Design Vue 的暗色主题变量
    document.documentElement.style.setProperty('--ant-primary-color', '#177ddc');
    document.documentElement.style.setProperty('--ant-bg-layout', '#000c17');
    document.documentElement.style.setProperty('--ant-bg-container', '#001529');
    document.documentElement.style.setProperty('--ant-bg-elevated', '#001f3f');
    document.documentElement.style.setProperty('--ant-text-color', 'rgba(255, 255, 255, 0.85)');
    document.documentElement.style.setProperty('--ant-text-color-secondary', 'rgba(255, 255, 255, 0.65)');
    document.documentElement.style.setProperty('--ant-border-color-split', 'rgba(255, 255, 255, 0.12)');
    // ... 你可以根据需要添加更多变量
  } else {
    // 清除自定义变量，恢复默认亮色主题
    document.documentElement.style.removeProperty('--ant-primary-color');
    document.documentElement.style.removeProperty('--ant-bg-layout');
    document.documentElement.style.removeProperty('--ant-bg-container');
    document.documentElement.style.removeProperty('--ant-bg-elevated');
    document.documentElement.style.removeProperty('--ant-text-color');
    document.documentElement.style.removeProperty('--ant-text-color-secondary');
    document.documentElement.style.removeProperty('--ant-border-color-split');
  }
});
</script>

<template>
  <!--
    ✅ 关键修改: 为根 div 添加动态 class 和 id
    这样我们就可以通过 #app.dark 来精确控制作用域
  -->
  <div id="app" :class="{ dark: isDarkMode }">
    <router-view />
  </div>
</template>

<style scoped>
/* 可留空 */
</style>

<!--
  ✅ 关键修改: 添加全局样式，将 Ant Design 的 CSS 变量作用域限定在 #app 内
  这样可以避免影响页面其他部分（如果有的话）
-->
<style>
/* 亮色主题是默认的，所以不需要额外定义 */

/* 暗色主题 */
#app.dark {
  /* 这里可以放一些全局的暗色背景等 */
  background-color: var(--ant-bg-layout);
  min-height: 100vh;
}

/* 让 Ant Design 组件读取 #app 上的 CSS 变量 */
#app.dark,
#app.dark * {
  --ant-primary-color: #177ddc;
  --ant-bg-layout: #000c17;
  --ant-bg-container: #001529;
  --ant-bg-elevated: #001f3f;
  --ant-text-color: rgba(255, 255, 255, 0.85);
  --ant-text-color-secondary: rgba(255, 255, 255, 0.65);
  --ant-border-color-split: rgba(255, 255, 255, 0.12);
}
</style>