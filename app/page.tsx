'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Editor from '@/components/Editor'
import Header from '@/components/Header'
import { useAppStore } from '@/lib/store'
import { documentsAPI, foldersAPI } from '@/lib/api'
import socketManager from '@/lib/socket'
import { parseHtmlToToc, type Node } from '@/utils/parse-document'

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

      // 为页面中的实际标题元素设置ID
      const setHeadingIds = () => {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')

        // 生成ID的辅助函数（与parseHtmlToToc保持一致）
        const generateId = (text: string, index: number): string => {
          const slug = text.toLowerCase()
            .replace(/[\s\u3000]+/g, '-') // 处理空格和中文空格
            .replace(/[^\w\u4e00-\u9fa5-]/g, '') // 保留字母、数字、中文、连字符
            .replace(/^-+|-+$/g, ''); // 去除首尾连字符

          let id = slug || `heading-${index}`;

          // 避免重复 id
          let i = 1;
          while (document.getElementById(id)) {
            id = `${slug}-${i++}`;
          }
          return id;
        }

        // 为没有匹配到目录项的标题设置默认ID(解决标题类型内容重复的问题)
        headings.forEach((heading, index) => {
          const element = heading as HTMLElement

          if (!element.id) {
            const textContent = element.textContent?.trim() || 'heading'
            const id = generateId(textContent, index)
            element.id = id
          }
        })
      }

      setHeadingIds()
    }
  }, [currentDocument])

  // 处理目录项点击，滚动到对应位置
  const handleTocClick = (id: string) => {
    setActiveTocId(id)

    // 查找目标目录项及其在目录树中的位置
    // currentIndex的含义：当前目录项在目录树中的索引位置，规则是：
    // 1. 目录项的索引位置是其在目录树中的绝对位置
    // 2. 子目录项的索引位置是其父目录项的索引位置加上其在父目录项中的位置
    const findTocItemWithIndex = (items: Node[], targetId: string, currentIndex: number = 0): { item: Node, index: number } | null => {      
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.id === targetId) {
          return { item, index: currentIndex + i }
        }
        if (item.children && item.children.length > 0) {
          const found = findTocItemWithIndex(item.children, targetId, currentIndex + i)
          if (found) return found
        }
      }
      return null
    }

    const result = findTocItemWithIndex(toc, id)
    if (!result) return

    const { item: targetItem, index: targetIndex } = result

    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const headingElements = Array.from(headings)

    // 找到所有匹配文本内容的标题
    const matchingHeadings = headingElements.filter(heading =>
      heading.textContent?.trim() === targetItem.title.trim()
    )

    if (matchingHeadings.length === 0) {
      console.error('无法找到标题元素:', targetItem.title)
      return
    }

    let targetHeading: Element | null = null

    if (matchingHeadings.length === 1) {
      // 只有一个匹配的标题，直接使用
      targetHeading = matchingHeadings[0]
    } else {
      // 多个匹配的标题，需要根据目录中的顺序选择正确的
      // 计算目标标题在文档中的预期位置

      // 获取目录中所有标题的扁平化列表（按出现顺序）
      const flattenTocItems = (items: Node[]): Node[] => {
        const result: Node[] = []
        items.forEach(item => {
          result.push(item)
          if (item.children && item.children.length > 0) {
            result.push(...flattenTocItems(item.children))
          }
        })
        return result
      }

      const flatTocItems = flattenTocItems(toc)

      // 找到当前目标项在扁平化列表中的位置（这里的targetPosition是目标项在上述目录树规则中的索引位置）
      const targetPosition = flatTocItems.findIndex(item => item.id === id)
      console.log("🚀 ~ page.tsx:158 ~ handleTocClick ~ targetPosition:", targetPosition)

      if (targetPosition >= 0) {
        // 找到在目录中相同位置的所有标题
        const targetTitle = targetItem.title.trim()
        const targetLevel = targetItem.level

        const samePositionHeadings = matchingHeadings.filter(heading => {
          const headingText = heading.textContent?.trim() || ''
          const headingLevel = parseInt(heading.tagName.charAt(1))
          const headingIndex = headingElements.indexOf(heading)

          // 该标题在文档中（按出现顺序）的第 N 次出现（同标题、同层级）
          const occurrenceInDoc = headingElements
            .slice(0, headingIndex + 1)
            .filter(h => h.textContent?.trim() === headingText && parseInt(h.tagName.charAt(1)) === headingLevel)
            .length

          // 该标题在目录中的第 N 次出现（同标题、同层级），计算到目标位置
          const occurrenceInToc = flatTocItems
            .slice(0, targetPosition + 1)
            .filter(item => item.title.trim() === targetTitle && item.level === targetLevel)
            .length

          return headingText === targetTitle && headingLevel === targetLevel && occurrenceInDoc === occurrenceInToc
        })

        if (samePositionHeadings.length > 0) {
          // 这里取第一项的原因是：
          // 1. 目录项的索引位置是其在目录树中的绝对位置
          // 2. 子目录项的索引位置是其父目录项的索引位置加上其在父目录项中的位置
          // 3. 因此，相同位置的标题中，第一个标题的索引位置就是目标项的索引位置
          targetHeading = samePositionHeadings[0]
        } else {
          // 如果没找到完全匹配的位置，按文档中的顺序选择
          const targetLevel = targetItem.level
          const sameLevelHeadings = matchingHeadings.filter(heading => {
            const headingLevel = parseInt(heading.tagName.charAt(1))
            return headingLevel === targetLevel
          })

          // 选择第N个相同层级的标题（N = 在目录中出现的次数）
          const titleCount = flatTocItems.slice(0, targetPosition + 1).filter(item =>
            item.title.trim() === targetItem.title.trim()
          ).length

          const sameTitleSameLevel = sameLevelHeadings.filter(heading =>
            heading.textContent?.trim() === targetItem.title.trim()
          )

          if (sameTitleSameLevel.length >= titleCount) {
            targetHeading = sameTitleSameLevel[titleCount - 1]
          } else {
            targetHeading = sameLevelHeadings[0]
          }
        }
      } else {
        targetHeading = matchingHeadings[0]
      }
    }

    if (targetHeading) {
      // 滚动到目标元素
      targetHeading.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      })

      // 确保元素有正确的ID
      const element = targetHeading as HTMLElement
      if (element.id !== id) {
        element.id = id
      }
    }
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
      <div className="flex-1 flex flex-col h-screen">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        <div className="flex-1 flex overflow-hidden">
          {currentDocument ? (
            <div className='flex flex-1 h-full'>
              {/* 目录树侧边栏 */}
              <div className='w-72 lg:w-80 bg-white border-r border-gray-200 hidden md:flex flex-col h-full'>
                <div className='p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0'>
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
                <div className='flex-1 overflow-y-auto min-h-0'>
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
              <div className='flex-1 flex flex-col overflow-hidden'>
                <Editor key={currentDocument._id} document={currentDocument} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
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
        </div>
      </div>
    </div>
  )
}