// src/stores/fundStore.js
import { defineStore } from 'pinia'
import { fundApi } from '@/api/fund'

export const useFundStore = defineStore('fund', {
  state: () => ({
    myFunds: [] // 我的持仓列表
  }),
  actions: {
    async loadMyFunds() {
      const res = await fundApi.getMyStore() // 假设有此接口
      this.myFunds = res.data.funds
    },
    async toggleFavorite(fundCode, isAdding) {
      if (isAdding) {
        await fundApi.addToStore(fundCode)
      } else {
        await fundApi.deleteFromStore(fundCode)
      }
      // 可选：局部更新 myFunds，避免全量刷新
    }
  }
})