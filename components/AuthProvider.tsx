'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { authAPI } from '@/lib/api'

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user, setUser, setLoading, logout } = useAppStore()

  // 不需要认证的页面
  const publicPages = ['/login', '/register']
  const isPublicPage = publicPages.includes(pathname)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true)
        
        // 检查本地存储的token
        const token = localStorage.getItem('token')
        
        if (!token) {
          if (!isPublicPage) {
            router.push('/login')
          }
          return
        }

        // 如果已经认证，跳过验证
        if (isAuthenticated) {
          return
        }
        
        // 验证token并获取用户信息
        const response = await authAPI.getCurrentUser()
        
        // 恢复用户状态
        setUser(response.user, token)
        
      } catch (error: any) {
        console.error('Token验证失败:', error.response?.data || error.message)
        
        // 清除无效token
        localStorage.removeItem('token')
        logout()
        
        // 如果不在公开页面，跳转到登录页
        if (!isPublicPage) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
        setIsInitialized(true)
      }
    }

    initializeAuth()
  }, [pathname]) // 依赖pathname，在路由变化时重新检查

  // 监听认证状态变化，处理页面跳转
  useEffect(() => {
    if (!isInitialized) return

    if (isAuthenticated && isPublicPage) {
      router.replace('/')
    } else if (!isAuthenticated && !isPublicPage) {
      router.replace('/login')
    }
  }, [isAuthenticated, isPublicPage, isInitialized, router])

  // 在初始化完成前显示加载状态
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p>初始化中...</p>
        </div>
      </div>
    )
  }

  // 对于需要认证的页面，检查认证状态
  if (!isPublicPage && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p>验证登录状态...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}