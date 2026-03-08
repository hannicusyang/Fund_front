// 资讯监控API - 重构版
import axios from '@/utils/axios'

const API_BASE = '/monitor'

export const monitorApi = {
  // ==================== 账号管理 ====================
  // 获取账号列表
  getAccounts(platform) {
    const params = platform ? { platform } : {}
    return axios.get(`${API_BASE}/accounts`, { params })
  },
  
  // 创建账号
  createAccount(data) {
    return axios.post(`${API_BASE}/accounts`, data)
  },
  
  // 更新账号
  updateAccount(id, data) {
    return axios.put(`${API_BASE}/accounts/${id}`, data)
  },
  
  // 删除账号
  deleteAccount(id) {
    return axios.delete(`${API_BASE}/accounts/${id}`)
  },
  
  // ==================== 任务管理 ====================
  // 获取任务列表
  getTasks(params) {
    return axios.get(`${API_BASE}/tasks`, { params })
  },
  
  // 创建任务
  createTask(data) {
    return axios.post(`${API_BASE}/tasks`, data)
  },
  
  // 更新任务
  updateTask(id, data) {
    return axios.put(`${API_BASE}/tasks/${id}`, data)
  },
  
  // 删除任务
  deleteTask(id) {
    return axios.delete(`${API_BASE}/tasks/${id}`)
  },
  
  // 手动运行任务
  runTask(id) {
    return axios.post(`${API_BASE}/tasks/${id}/run`)
  },
  
  // ==================== 日志管理 ====================
  // 获取日志列表
  getLogs(params) {
    return axios.get(`${API_BASE}/logs`, { params })
  },
  
  // 获取实时日志流
  streamLogs(taskId) {
    const params = taskId ? { task_id: taskId } : {}
    return axios.get(`${API_BASE}/logs/stream`, { params })
  },
  
  // 清空日志
  clearLogs(taskId) {
    const params = taskId ? { task_id: taskId } : {}
    return axios.post(`${API_BASE}/logs/clear`, null, { params })
  },
  
  // ==================== 结果查看 ====================
  // 获取结果列表
  getResults(params) {
    return axios.get(`${API_BASE}/results`, { params })
  },
  
  // 获取结果详情
  getResult(id) {
    return axios.get(`${API_BASE}/results/${id}`)
  },
  
  // 删除结果
  deleteResult(id) {
    return axios.delete(`${API_BASE}/results/${id}`)
  },
  
  // 批量删除结果
  batchDeleteResults(ids) {
    return axios.delete(`${API_BASE}/results/batch`, { data: { result_ids: ids } })
  },
  
  // AI总结
  aiSummary(resultIds) {
    return axios.post(`${API_BASE}/results/ai-summary`, { result_ids: resultIds })
  },
  
  // ==================== 系统设置 ====================
  // 获取设置
  getSettings() {
    return axios.get(`${API_BASE}/settings`)
  },
  
  // 更新设置
  updateSettings(data) {
    return axios.put(`${API_BASE}/settings`, data)
  },
  
  // 获取单个设置
  getSetting(key) {
    return axios.get(`${API_BASE}/settings/${key}`)
  }
}
