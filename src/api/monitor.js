// 资讯监控API
import axios from '@/utils/axios'

const API_BASE = '/api/monitor'

export const monitorApi = {
  // 账号管理
  getAccounts(platform) {
    const params = platform ? { platform } : {}
    return axios.get(`${API_BASE}/accounts`, { params })
  },
  
  createAccount(data) {
    return axios.post(`${API_BASE}/accounts`, data)
  },
  
  updateAccount(id, data) {
    return axios.put(`${API_BASE}/accounts/${id}`, data)
  },
  
  deleteAccount(id) {
    return axios.delete(`${API_BASE}/accounts/${id}`)
  },
  
  // 任务管理
  getTasks(accountId) {
    const params = accountId ? { account_id: accountId } : {}
    return axios.get(`${API_BASE}/tasks`, { params })
  },
  
  createTask(data) {
    return axios.post(`${API_BASE}/tasks`, data)
  },
  
  updateTask(id, data) {
    return axios.put(`${API_BASE}/tasks/${id}`, data)
  },
  
  deleteTask(id) {
    return axios.delete(`${API_BASE}/tasks/${id}`)
  },
  
  runTask(id) {
    return axios.post(`${API_BASE}/tasks/${id}/run`)
  },
  
  // 内容管理
  getContents(params) {
    return axios.get(`${API_BASE}/contents`, { params })
  },
  
  getContentDetail(id) {
    return axios.get(`${API_BASE}/contents/${id}`)
  },
  
  summarizeContent(id) {
    return axios.post(`${API_BASE}/contents/${id}/summarize`)
  },

  // 手动添加视频
  addVideo(data) {
    return axios.post(`${API_BASE}/manual/add-video`, data)
  },

  batchAddVideos(data) {
    return axios.post(`${API_BASE}/manual/batch-add`, data)
  }
}
