'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, ListOrdered, Quote, Code, Undo, Redo, Save, Users, Share } from 'lucide-react'
import CollaboratorModal from './CollaboratorModal'
import { documentsAPI } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import socketManager from '@/lib/socket'

interface Document {
  _id: string
  title: string
  content: string
  author: {
    _id: string
    name: string
    email: string
    avatar?: string
  }
  collaborators: Array<{
    user: {
      _id: string
      name: string
      email: string
      avatar?: string
    }
    permission: 'read' | 'write' | 'admin'
  }>
  tags: string[]
  version: number
  viewCount: number
  createdAt: string
  updatedAt: string
}

interface EditorProps {
  document: Document
}

export default function Editor({ document }: EditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [title, setTitle] = useState(document.title)
  const [collaborators, setCollaborators] = useState<string[]>([])
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const { updateDocument } = useAppStore()

  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: document.content || '<p></p>',
    editorProps: {
      attributes: {
        class: 'editor-content min-h-[500px] p-6 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      // 防抖保存
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        handleSave(editor.getHTML())
      }, 1000) // 1秒后自动保存
      
      // 发送实时更新
      socketManager.sendDocumentUpdate(document._id, editor.getHTML())
    },

  })

  // 监听文档变化，更新编辑器内容
  useEffect(() => {
    if (!editor || !document) return
    
    // 更新标题
    setTitle(document.title)
    
    // 更新编辑器内容
    if (document.content) {
      const currentContent = editor.getHTML()
      if (currentContent !== document.content) {
        editor.commands.setContent(document.content, false)
      }
    }
  }, [editor, document])

  useEffect(() => {
    if (!editor) return

    // 监听实时文档更新
    const handleDocumentUpdate = (data: { docId: string; content: string; timestamp: number }) => {
      if (data.docId === document._id) {
        // 避免循环更新
        const currentContent = editor.getHTML()
        if (currentContent !== data.content) {
          editor.commands.setContent(data.content, false)
        }
      }
    }

    socketManager.onDocumentUpdate(handleDocumentUpdate)

    return () => {
      socketManager.removeAllListeners()
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [editor, document._id])

  const handleSave = async (content?: string) => {
    if (!editor) return

    try {
      setIsSaving(true)
      const contentToSave = content || editor.getHTML()
      
      await documentsAPI.update(document._id, {
        title,
        content: contentToSave
      })
      
      updateDocument(document._id, {
        title,
        content: contentToSave,
        updatedAt: new Date().toISOString()
      })
      
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save document:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    
    // 防抖保存标题
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      handleSave()
    }, 500)
  }

  const handleUpdateCollaborators = async () => {
    try {
      const updatedDoc = await documentsAPI.getById(document._id)
      updateDocument(document._id, updatedDoc)
    } catch (error) {
      console.error('Failed to update collaborators:', error)
    }
  }

  const formatLastSaved = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) { // 小于1分钟
      return '刚刚保存'
    } else if (diff < 3600000) { // 小于1小时
      return `${Math.floor(diff / 60000)}分钟前保存`
    } else {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p>加载编辑器中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 文档标题栏 */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-2xl font-bold bg-transparent border-none outline-none flex-1 mr-4"
            placeholder="无标题文档"
          />
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Users size={16} />
              <span>{document.collaborators.length + 1}人协作</span>
              <button
                onClick={() => setShowCollaboratorModal(true)}
                className="ml-2 p-1 hover:bg-gray-100 rounded"
                title="管理协作者"
              >
                <Share size={16} />
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              {isSaving ? (
                <span className="text-blue-600">保存中...</span>
              ) : lastSaved ? (
                <span>{formatLastSaved(lastSaved)}</span>
              ) : null}
              
              <button
                onClick={() => handleSave()}
                disabled={isSaving}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Save size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-100 ${
              editor.isActive('bold') ? 'bg-gray-200' : ''
            }`}
            title="粗体"
          >
            <Bold size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-100 ${
              editor.isActive('italic') ? 'bg-gray-200' : ''
            }`}
            title="斜体"
          >
            <Italic size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-2" />
          
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-100 ${
              editor.isActive('bulletList') ? 'bg-gray-200' : ''
            }`}
            title="无序列表"
          >
            <List size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-gray-100 ${
              editor.isActive('orderedList') ? 'bg-gray-200' : ''
            }`}
            title="有序列表"
          >
            <ListOrdered size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded hover:bg-gray-100 ${
              editor.isActive('blockquote') ? 'bg-gray-200' : ''
            }`}
            title="引用"
          >
            <Quote size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-2 rounded hover:bg-gray-100 ${
              editor.isActive('codeBlock') ? 'bg-gray-200' : ''
            }`}
            title="代码块"
          >
            <Code size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-2" />
          
          <button
            onClick={() => editor.chain().focus().undo().run()}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            disabled={!editor.can().undo()}
            title="撤销"
          >
            <Undo size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().redo().run()}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            disabled={!editor.can().redo()}
            title="重做"
          >
            <Redo size={16} />
          </button>
        </div>
      </div>
      
      {/* 编辑器内容 */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      
      {/* 协作者管理模态框 */}
      <CollaboratorModal
        isOpen={showCollaboratorModal}
        onClose={() => setShowCollaboratorModal(false)}
        documentId={document._id}
        collaborators={document.collaborators}
        onUpdate={handleUpdateCollaborators}
      />
    </div>
  )
}