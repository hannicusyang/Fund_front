<template>
  <AppLayout menu-key="FundSearch"> <!-- 👈 传递 prop -->
    <SearchTable />
  </AppLayout>
</template>
<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SearchTable from '@/components/fund/SearchTable.vue'
</script>