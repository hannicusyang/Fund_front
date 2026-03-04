// src/stores/user.js
// 用户状态管理

import { defineStore } from 'pinia'
import axios from '@/utils/axios'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
    isLoggedIn: !!localStorage.getItem('token')
  }),

  actions: {
    // 登录
    async login(username, password) {
      try {
        const response = await axios.post('/auth/login', { username, password })
        if (response.success) {
          this.token = response.data.token
          this.user = response.data.user
          this.isLoggedIn = true
          // 存储到 localStorage
          localStorage.setItem('token', this.token)
          localStorage.setItem('user', JSON.stringify(this.user))
          return { success: true }
        }
        return { success: false, message: response.message }
      } catch (error) {
        return { success: false, message: error.message || '登录失败' }
      }
    },

    // 注册
    async register(username, password, nickname, inviteCode) {
      try {
        const response = await axios.post('/auth/register', {
          username,
          password,
          nickname,
          invite_code: inviteCode
        })
        if (response.success) {
          this.token = response.data.token
          this.user = response.data.user
          this.isLoggedIn = true
          localStorage.setItem('token', this.token)
          localStorage.setItem('user', JSON.stringify(this.user))
          return { success: true }
        }
        return { success: false, message: response.message }
      } catch (error) {
        return { success: false, message: error.message || '注册失败' }
      }
    },

    // 登出
    logout() {
      this.token = null
      this.user = null
      this.isLoggedIn = false
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },

    // 验证 Token
    async verifyToken() {
      if (!this.token) return false
      try {
        const response = await axios.get('/auth/verify')
        if (response.success) {
          this.user = response.data.user
          this.isLoggedIn = true
          localStorage.setItem('user', JSON.stringify(this.user))
          return true
        }
        this.logout()
        return false
      } catch (error) {
        this.logout()
        return false
      }
    },

    // 从 localStorage 恢复用户状态
    restoreState() {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      if (token && userStr) {
        this.token = token
        try {
          this.user = JSON.parse(userStr)
          this.isLoggedIn = true
        } catch (e) {
          this.logout()
        }
      }
    }
  }
})
