'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Editor from '@/components/Editor'
import Header from '@/components/Header'
import { useAppStore } from '@/lib/store'
import { documentsAPI, foldersAPI } from '@/lib/api'
import socketManager from '@/lib/socket'
import { parseHtmlToToc, renderTocToUl, type Node } from '@/utils/parse-document'

export default function Home() {
  const router = useRouter()
  const [toc, setToc] = useState<Node[]>([])
  const [activeTocId, setActiveTocId] = useState<string>('')
  const {
    isAuthenticated,
    user,
    currentDocument,
    sidebarOpen,
    setSidebarOpen,
    setDocuments,
    setCurrentDocument,
    setFolderTree,
    setLoading
  } = useAppStore()

  useEffect(() => {
    // AuthProvider已经处理了认证逻辑，这里只需要初始化应用
    if (!isAuthenticated || !user) {
      return
    }

    // 初始化Socket连接
    socketManager.connect({
      id: user.id,
      name: user.name,
      email: user.email
    })

    // 加载文档列表和文件夹
    loadDocuments()
    loadFolders()

    return () => {
      socketManager.disconnect()
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (currentDocument?.content) {
      const tocData = parseHtmlToToc(currentDocument.content)
      setToc(tocData)
    }
  }, [currentDocument])

  // 处理目录项点击，滚动到对应位置
  const handleTocClick = (id: string) => {
    setActiveTocId(id)
  }

  // 递归渲染目录树
  const renderTocItem = (item: Node, level: number = 0) => {
    const indentStyle = { marginLeft: `${level * 16}px` } // 每级缩进16px
    const isActive = activeTocId === item.id
    const hasChildren = item.children && item.children.length > 0

    // 根据标题级别设置不同的字体大小和颜色
    const getLevelStyles = (level: number) => {
      switch (level) {
        case 0: return 'font-semibold text-gray-900'
        case 1: return 'font-medium text-gray-800'
        case 2: return 'text-gray-700'
        default: return 'text-gray-600'
      }
    }

    return (
      <div key={item.id}>
        <div
          className={`
            cursor-pointer px-3 py-2 text-sm transition-all duration-200 rounded-md mx-2
            ${isActive
              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500 shadow-sm'
              : `text-gray-700 hover:bg-gray-50 hover:text-gray-900 ${getLevelStyles(level)}`
            }
          `}
          style={indentStyle}
          onClick={() => handleTocClick(item.id)}
          title={item.title}
        >
          <div className='flex items-center justify-between'>
            <span className='truncate'>{item.title}</span>
            {hasChildren && (
              <span className='text-xs text-gray-400 ml-2'>
                {item.children?.length}
              </span>
            )}
          </div>
        </div>
        {hasChildren && (
          <div className="space-y-1">
            {item.children.map((child) => renderTocItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await documentsAPI.getAll()
      setDocuments(response.documents || response)
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFolders = async () => {
    try {
      const folderTree = await foldersAPI.getTree()
      setFolderTree(folderTree)
    } catch (error) {
      console.error('Failed to load folders:', error)
    }
  }

  const handleSelectDocument = async (docId: string) => {
    try {
      setLoading(true)
      const document = await documentsAPI.getById(docId)
      setCurrentDocument(document)

      // 加入Socket房间
      socketManager.joinDocument(document._id)
    } catch (error) {
      console.error('Failed to load document:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDocument = async (folderId?: string) => {
    try {
      const newDoc = await documentsAPI.create({
        title: '无标题文档',
        folder: folderId
      })
      await loadDocuments() // 重新加载文档列表
      setCurrentDocument(newDoc)
      socketManager.joinDocument(newDoc._id)
    } catch (error) {
      console.error('Failed to create document:', error)
    }
  }

  const handleCreateFolder = async (name: string, parent?: string) => {
    try {
      await foldersAPI.create({ name, parent })
      await loadFolders() // 重新加载文件夹
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
  }

  // AuthProvider已经处理了认证检查

  return (
    <div className="flex h-screen">
      {/* 侧边栏 */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        selectedDocId={currentDocument?._id || null}
        onSelectDoc={handleSelectDocument}
        onCreateDoc={handleCreateDocument}
        onCreateFolder={handleCreateFolder}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        <div className='overflow-auto'>
          <main className="flex-1 overflow-hidden">
            {currentDocument ? (
              <div className='flex h-full'>
                {/* 目录树侧边栏 */}
                <div className='w-72 lg:w-80 bg-white border-r border-gray-200 hidden md:flex flex-col'>
                  <div className='p-4 border-b border-gray-200 bg-gray-50'>
                    <h3 className='text-sm font-medium text-gray-900 flex items-center'>
                      <svg className='w-4 h-4 mr-2 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 6h16M4 10h16M4 14h16M4 18h16' />
                      </svg>
                      目录
                      <span className='ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full'>
                        {toc.length}
                      </span>
                    </h3>
                  </div>
                  <div className='flex-1 overflow-y-auto'>
                    {toc.length > 0 ? (
                      <div className='p-2 space-y-1'>
                        {toc.map((item) => renderTocItem(item))}
                      </div>
                    ) : (
                      <div className='p-6 text-center'>
                        <svg className='w-12 h-12 mx-auto text-gray-300 mb-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                        </svg>
                        <p className='text-sm text-gray-500'>暂无目录</p>
                        <p className='text-xs text-gray-400 mt-1'>添加标题后会自动生成</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 编辑器区域 */}
                <div className='flex-1 overflow-hidden'>
                  <Editor key={currentDocument._id} document={currentDocument} />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold mb-2">欢迎使用飞书笔记</h2>
                  <p className="mb-4">选择一个文档开始编辑，或创建新文档</p>
                  <button
                    onClick={() => handleCreateDocument()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    创建新文档
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>

      </div>
    </div>
  )
}