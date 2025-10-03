import { useAppStore } from './store'
import { authAPI } from './api'

// 初始化认证状态
export const initializeAuth = async () => {
  const { setUser, setLoading } = useAppStore.getState()

  try {
    setLoading(true)

    // 检查本地存储的token
    const token = localStorage.getItem('token')
    if (!token) {
      return false
    }

    // 验证token并获取用户信息
    const response = await authAPI.getCurrentUser()

    // 恢复用户状态
    setUser(response.user, token)

    return true
  } catch (error) {
    console.error('Token验证失败:', error)

    // 清除无效token
    localStorage.removeItem('token')
    useAppStore.getState().logout()

    return false
  } finally {
    setLoading(false)
  }
}

// 检查认证状态
export const checkAuthStatus = () => {
  const { isAuthenticated } = useAppStore.getState()
  const token = localStorage.getItem('token')

  return isAuthenticated && token
}