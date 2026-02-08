<!-- QLogo.vue - 量子/量化主题的Q字母Logo -->
<template>
  <div class="q-logo" :class="{ 'small': size === 'small', 'large': size === 'large' }">
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="qGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1890ff;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#722ed1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#eb2f96;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="qGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#40a9ff;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#9254de;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f759ab;stop-opacity:1" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <!-- 外圆环 - 代表量子的轨道 -->
      <circle cx="50" cy="45" r="35" fill="none" stroke="url(#qGradient)" stroke-width="3" opacity="0.9" />
      
      <!-- 内圆环 - 代表量子的核心 -->
      <circle cx="50" cy="45" r="28" fill="none" stroke="url(#qGradient)" stroke-width="2" opacity="0.6" />
      
      <!-- Q的主体 - 大圆 -->
      <path d="M 50 15 A 30 30 0 1 1 50 75 A 30 30 0 1 1 50 15" 
            fill="none" 
            stroke="url(#qGradient)" 
            stroke-width="6" 
            stroke-linecap="round"
            filter="url(#glow)" />
      
      <!-- Q的尾巴 - 量子的跃迁 -->
      <path d="M 72 65 L 88 88" 
            stroke="url(#qGradient)" 
            stroke-width="6" 
            stroke-linecap="round"
            filter="url(#glow)" />
      
      <!-- 中心点 - 量子的奇点 -->
      <circle cx="50" cy="45" r="4" fill="url(#qGradientLight)" />
      
      <!-- 装饰点 - 代表数据点 -->
      <circle cx="25" cy="30" r="2" fill="#1890ff" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="75" cy="35" r="2" fill="#722ed1" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="30" cy="60" r="2" fill="#eb2f96" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
    <span v-if="showText" class="logo-text">QuantLab</span>
  </div>
</template>

<script setup>
defineProps({
  size: {
    type: String,
    default: 'normal',
    validator: (value) => ['small', 'normal', 'large'].includes(value)
  },
  showText: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.q-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    width: 36px;
    height: 36px;
    transition: transform 0.3s ease;
  }
  
  &:hover svg {
    transform: scale(1.05) rotate(5deg);
  }
  
  &.small svg {
    width: 28px;
    height: 28px;
  }
  
  &.large svg {
    width: 48px;
    height: 48px;
  }
  
  .logo-text {
    font-size: 18px;
    font-weight: 700;
    background: linear-gradient(135deg, #1890ff, #722ed1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: 1px;
  }
}
</style>
