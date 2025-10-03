import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// 请求拦截器 - 添加认证token
api.interceptors.request.use((config) => {
  // 优先从store获取token，fallback到localStorage
  let token = null

  try {
    // 动态导入store避免循环依赖
    const { useAppStore } = require('./store')
    token = useAppStore.getState().token
  } catch (error) {
    // fallback到localStorage
    token = localStorage.getItem('token')
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token过期，清除所有认证信息
      localStorage.removeItem('token')

      try {
        const { useAppStore } = require('./store')
        useAppStore.getState().logout()
      } catch (e) {
        console.error('清除store状态失败:', e)
      }

      // 避免在服务端执行window操作
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// 认证相关API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password })
    return response.data
  },

  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/api/auth/register', { email, password, name })
    return response.data
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me')
    return response.data
  },

  updateProfile: async (data: { name?: string; avatar?: string }) => {
    const response = await api.put('/api/auth/profile', data)
    return response.data
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put('/api/auth/password', { currentPassword, newPassword })
    return response.data
  }
}

// 文档相关API
export const documentsAPI = {
  getAll: async (params?: { folder?: string; search?: string; page?: number; limit?: number }) => {
    const response = await api.get('/api/documents', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/documents/${id}`)
    return response.data
  },

  create: async (data: { title: string; content?: string; folder?: string; tags?: string[] }) => {
    const response = await api.post('/api/documents', data)
    return response.data
  },

  update: async (id: string, updates: { title?: string; content?: string; tags?: string[] }) => {
    const response = await api.put(`/api/documents/${id}`, updates)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/api/documents/${id}`)
    return response.data
  },

  addCollaborator: async (id: string, email: string, permission: 'read' | 'write' | 'admin' = 'read') => {
    const response = await api.post(`/api/documents/${id}/collaborators`, { email, permission })
    return response.data
  },

  removeCollaborator: async (id: string, collaboratorId: string) => {
    const response = await api.delete(`/api/documents/${id}/collaborators/${collaboratorId}`)
    return response.data
  }
}

// 文件夹相关API
export const foldersAPI = {
  getAll: async (parent?: string) => {
    const response = await api.get('/api/folders', { params: { parent } })
    return response.data
  },

  getTree: async () => {
    const response = await api.get('/api/folders/tree')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/folders/${id}`)
    return response.data
  },

  create: async (data: { name: string; description?: string; parent?: string; color?: string }) => {
    const response = await api.post('/api/folders', data)
    return response.data
  },

  update: async (id: string, updates: { name?: string; description?: string; color?: string }) => {
    const response = await api.put(`/api/folders/${id}`, updates)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/api/folders/${id}`)
    return response.data
  },

  move: async (id: string, parent?: string) => {
    const response = await api.put(`/api/folders/${id}/move`, { parent })
    return response.data
  }
}

export default api