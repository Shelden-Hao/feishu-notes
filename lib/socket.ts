import { io, Socket } from 'socket.io-client'

class SocketManager {
  private socket: Socket | null = null
  private currentDocId: string | null = null

  connect(user?: { id: string; name: string; email: string }) {
    if (this.socket?.connected) return this.socket

    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id)

      // 发送用户信息
      if (user) {
        this.socket?.emit('user-join', user)
      }
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.currentDocId = null
    }
  }

  joinDocument(docId: string) {
    if (!this.socket) return

    // 离开之前的文档房间
    if (this.currentDocId && this.currentDocId !== docId) {
      this.socket.emit('leave-document', this.currentDocId)
    }

    // 加入新的文档房间
    this.socket.emit('join-document', docId)
    this.currentDocId = docId
  }

  leaveDocument(docId: string) {
    if (!this.socket) return

    this.socket.emit('leave-document', docId)
    if (this.currentDocId === docId) {
      this.currentDocId = null
    }
  }

  // 发送文档更新
  sendDocumentUpdate(docId: string, content: string) {
    if (!this.socket) return

    this.socket.emit('document-update', {
      docId,
      content,
      timestamp: Date.now()
    })
  }

  // 监听文档更新
  onDocumentUpdate(callback: (data: { docId: string; content: string; timestamp: number }) => void) {
    if (!this.socket) return

    this.socket.on('document-update', callback)
  }

  // 发送光标位置
  sendCursorUpdate(docId: string, position: number, selection?: { from: number; to: number }) {
    if (!this.socket) return

    this.socket.emit('cursor-update', {
      docId,
      position,
      selection,
      timestamp: Date.now()
    })
  }

  // 监听光标更新
  onCursorUpdate(callback: (data: {
    userId: string;
    docId: string;
    position: number;
    selection?: { from: number; to: number };
    timestamp: number
  }) => void) {
    if (!this.socket) return

    this.socket.on('cursor-update', callback)
  }

  // 移除所有监听器
  removeAllListeners() {
    if (!this.socket) return

    this.socket.removeAllListeners('document-update')
    this.socket.removeAllListeners('cursor-update')
  }

  get isConnected() {
    return this.socket?.connected || false
  }
}

// 单例模式
export const socketManager = new SocketManager()
export default socketManager