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
    console.log(currentDocument);
    console.log(parseHtmlToToc(currentDocument?.content || ''))
    console.log(renderTocToUl(parseHtmlToToc(currentDocument?.content || '')));
  }, [currentDocument])

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
        
        <main className="flex-1 overflow-hidden">
          {currentDocument ? (
            // <Editor key={currentDocument._id} document={currentDocument} />
            <div className='flex'>
              <div className='w-1/5'>
                <div className='w-full h-full bg-gray-50'>目录</div>
              </div>
              <div className='flex-1'>
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
  )
}