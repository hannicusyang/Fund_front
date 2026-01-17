<template>
  <!-- 详情页通常属于“基金搜索”的子集，所以高亮 FundSearch -->
  <AppLayout menu-key="FundSearch">
    <FundDetailContent :fund-code="route.params.Detail_fund_code" />
  </AppLayout>
</template>
<script setup>
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import FundDetailContent from '@/components/fund/FundDetailContent.vue'

const route = useRoute()
</script>