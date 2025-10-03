'use client'

import { useState } from 'react'
import { X, Plus, Mail, Shield, Edit, Trash2 } from 'lucide-react'
import { documentsAPI } from '@/lib/api'

interface Collaborator {
  user: {
    _id: string
    name: string
    email: string
    avatar?: string
  }
  permission: 'read' | 'write' | 'admin'
  addedAt: string
}

interface CollaboratorModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  collaborators: Collaborator[]
  onUpdate: () => void
}

const permissionLabels = {
  read: '只读',
  write: '编辑',
  admin: '管理'
}

const permissionColors = {
  read: 'text-blue-600 bg-blue-50',
  write: 'text-green-600 bg-green-50',
  admin: 'text-purple-600 bg-purple-50'
}

export default function CollaboratorModal({
  isOpen,
  onClose,
  documentId,
  collaborators,
  onUpdate
}: CollaboratorModalProps) {
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'read' | 'write' | 'admin'>('read')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAddCollaborator = async () => {
    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      
      await documentsAPI.addCollaborator(documentId, email.trim(), permission)
      
      setEmail('')
      setPermission('read')
      onUpdate()
    } catch (error: any) {
      setError(error.response?.data?.message || '添加协作者失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      await documentsAPI.removeCollaborator(documentId, collaboratorId)
      onUpdate()
    } catch (error: any) {
      console.error('移除协作者失败:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">管理协作者</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* 添加协作者 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">邀请新协作者</h3>
            
            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="输入邮箱地址"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'read' | 'write' | 'admin')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="read">只读权限</option>
                <option value="write">编辑权限</option>
                <option value="admin">管理权限</option>
              </select>
              
              <button
                onClick={handleAddCollaborator}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={16} className="mr-2" />
                {isLoading ? '添加中...' : '添加协作者'}
              </button>
            </div>
          </div>

          {/* 协作者列表 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              当前协作者 ({collaborators.length})
            </h3>
            
            {collaborators.length > 0 ? (
              <div className="space-y-2">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.user._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        {collaborator.user.avatar ? (
                          <img
                            src={collaborator.user.avatar}
                            alt={collaborator.user.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <span className="text-primary-600 text-sm font-medium">
                            {collaborator.user.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {collaborator.user.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {collaborator.user.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${permissionColors[collaborator.permission]}`}>
                        {permissionLabels[collaborator.permission]}
                      </span>
                      
                      <button
                        onClick={() => handleRemoveCollaborator(collaborator.user._id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="移除协作者"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Shield size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">还没有协作者</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}