'use client'

import { useState, useEffect } from 'react'
import { Menu, Search, User, Settings, LogOut } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { documentsAPI } from '@/lib/api'

interface HeaderProps {
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

export default function Header({ onToggleSidebar, sidebarOpen }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  const { user, logout, setCurrentDocument, searchQuery: storeSearchQuery, setSearchQuery: setStoreSearchQuery } = useAppStore()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    localStorage.removeItem('token')
    router.push('/login')
  }

  // 搜索功能
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true)
        try {
          const response = await documentsAPI.getAll({ search: searchQuery.trim() })
          setSearchResults(response.documents || response)
          setShowSearchResults(true)
        } catch (error) {
          console.error('搜索失败:', error)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
        setShowSearchResults(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [searchQuery])

  const handleSearchSelect = async (docId: string) => {
    try {
      const document = await documentsAPI.getById(docId)
      setCurrentDocument(document)
      setShowSearchResults(false)
      setSearchQuery('')
    } catch (error) {
      console.error('打开文档失败:', error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
        
        <h1 className="text-xl font-semibold text-gray-800">
          飞书笔记
        </h1>
      </div>

      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索文档..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            onFocus={() => searchQuery && setShowSearchResults(true)}
          />
          
          {/* 搜索结果下拉框 */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
              {isSearching ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mx-auto mb-2"></div>
                  搜索中...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map((doc) => (
                    <button
                      key={doc._id}
                      onClick={() => handleSearchSelect(doc._id)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <div className="w-8 h-8 bg-primary-100 rounded flex items-center justify-center">
                        <Search size={14} className="text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {doc.folder?.name || '根目录'} • {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <Search size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">没有找到相关文档</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button 
          onClick={() => router.push('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings size={20} />
        </button>
        
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <User size={20} />
            <span className="text-sm font-medium">{user?.name}</span>
          </button>
          
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <LogOut size={16} />
                <span>退出登录</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* 点击外部关闭菜单 */}
      {(showUserMenu || showSearchResults) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false)
            setShowSearchResults(false)
          }}
        />
      )}
    </header>
  )
}