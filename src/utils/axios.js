// src/utils/axios.js
import axios from 'axios'
import { message } from 'ant-design-vue'

// 创建一个 axios 实例
const request = axios.create({
  // 使用环境变量配置后端地址
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 180000, // 3分钟超时 - AI分析需要更长时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器（可选：比如加 token）
request.interceptors.request.use(
  (config) => {
    // 如果你有登录态，可以在这里加 token
    // const token = localStorage.getItem('token')
    // if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器（统一处理错误）
request.interceptors.response.use(
  (response) => {
    // 假设你的后端返回格式是：{ code: 200, data: {...}, msg: "success" }
    const res = response.data

    if (res.code === 200 || res.success === true) {
      return res
    } else {
      message.error(res.msg || '请求失败')
      return Promise.reject(new Error(res.msg || 'Error'))
    }
  },
  (error) => {
    // 网络错误或超时
    if (error.response?.status === 401) {
      message.error('请先登录')
      // 可跳转到登录页
    } else {
      message.error('网络错误，请稍后再试')
    }
    return Promise.reject(error)
  }
)

export default request