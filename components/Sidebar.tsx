'use client'

import { useState, useEffect } from 'react'
import { Plus, FileText, Folder, ChevronRight, ChevronDown, MoreHorizontal, Edit, Trash2, FolderPlus } from 'lucide-react'
import { useAppStore } from '@/lib/store'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  selectedDocId: string | null
  onSelectDoc: (docId: string) => void
  onCreateDoc: (folderId?: string) => void
  onCreateFolder: (name: string, parent?: string) => void
}

interface TreeNode {
  _id: string
  name: string
  type: 'folder' | 'document'
  color?: string
  children?: TreeNode[]
  parent?: string
}

export default function Sidebar({ 
  isOpen, 
  selectedDocId, 
  onSelectDoc, 
  onCreateDoc, 
  onCreateFolder 
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: TreeNode } | null>(null)
  
  const { documents, folderTree } = useAppStore()

  // 构建文档树结构
  const buildDocumentTree = (): TreeNode[] => {
    const tree: TreeNode[] = []
    
    // 添加文件夹
    folderTree.forEach(folder => {
      const folderNode: TreeNode = {
        _id: folder._id,
        name: folder.name,
        type: 'folder',
        color: folder.color,
        children: []
      }
      
      // 添加文件夹中的文档
      const folderDocs = documents.filter(doc => doc.folder?._id === folder._id)
      folderDocs.forEach(doc => {
        folderNode.children!.push({
          _id: doc._id,
          name: doc.title,
          type: 'document'
        })
      })
      
      tree.push(folderNode)
    })
    
    // 添加根目录文档（没有文件夹的文档）
    const rootDocs = documents.filter(doc => !doc.folder)
    rootDocs.forEach(doc => {
      tree.push({
        _id: doc._id,
        name: doc.title,
        type: 'document'
      })
    })
    
    return tree
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim())
      setNewFolderName('')
      setShowCreateFolder(false)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, item: TreeNode) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    })
  }

  const renderTreeNode = (node: TreeNode, level = 0) => {
    const isExpanded = expandedFolders.has(node._id)
    const isSelected = selectedDocId === node._id

    return (
      <div key={node._id}>
        <div
          className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors group ${
            isSelected ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node._id)
            } else {
              onSelectDoc(node._id)
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {node.type === 'folder' ? (
            <>
              {isExpanded ? (
                <ChevronDown size={16} className="mr-2" />
              ) : (
                <ChevronRight size={16} className="mr-2" />
              )}
              <Folder 
                size={16} 
                className="mr-2" 
                style={{ color: node.color }}
              />
            </>
          ) : (
            <FileText size={16} className="mr-2 ml-6" />
          )}
          
          <span className="flex-1 truncate">{node.name}</span>
          
          {node.type === 'folder' && (
            <button
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
              onClick={(e) => {
                e.stopPropagation()
                onCreateDoc(node._id)
              }}
            >
              <Plus size={14} />
            </button>
          )}
        </div>
        
        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  // 点击外部关闭右键菜单
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  if (!isOpen) {
    return null
  }

  const documentTree = buildDocumentTree()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex space-x-2">
          <button 
            onClick={() => onCreateDoc()}
            className="flex-1 flex items-center justify-center px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
          >
            <Plus size={14} className="mr-1" />
            新建文档
          </button>
          
          <button
            onClick={() => setShowCreateFolder(true)}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            title="新建文件夹"
          >
            <FolderPlus size={14} />
          </button>
        </div>
        
        {showCreateFolder && (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="文件夹名称"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 px-3 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                创建
              </button>
              <button
                onClick={() => {
                  setShowCreateFolder(false)
                  setNewFolderName('')
                }}
                className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {documentTree.length > 0 ? (
            documentTree.map(node => renderTreeNode(node))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <FileText size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">还没有文档</p>
              <p className="text-xs">点击上方按钮创建第一个文档</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.item.type === 'folder' ? (
            <>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2"
                onClick={() => {
                  onCreateDoc(contextMenu.item._id)
                  setContextMenu(null)
                }}
              >
                <Plus size={14} />
                <span>新建文档</span>
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2"
                onClick={() => {
                  // TODO: 实现重命名功能
                  setContextMenu(null)
                }}
              >
                <Edit size={14} />
                <span>重命名</span>
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 flex items-center space-x-2"
                onClick={() => {
                  // TODO: 实现删除功能
                  setContextMenu(null)
                }}
              >
                <Trash2 size={14} />
                <span>删除</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2"
                onClick={() => {
                  onSelectDoc(contextMenu.item._id)
                  setContextMenu(null)
                }}
              >
                <Edit size={14} />
                <span>打开</span>
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 flex items-center space-x-2"
                onClick={() => {
                  // TODO: 实现删除功能
                  setContextMenu(null)
                }}
              >
                <Trash2 size={14} />
                <span>删除</span>
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  )
}