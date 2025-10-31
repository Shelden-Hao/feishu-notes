const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { connectMongoDB, connectRedis } = require('./config/database')
require('dotenv').config()

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4000",
    methods: ["GET", "POST"]
  }
})

// 连接数据库
connectMongoDB()
const redis = connectRedis()

// 中间件
app.use(helmet())
app.use(cors())
app.use(express.json())

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制每个IP 15分钟内最多100个请求
})
app.use('/api/', limiter)

// 路由
app.use('/api/auth', require('./routes/auth'))
app.use('/api/documents', require('./routes/documents'))
app.use('/api/folders', require('./routes/folders'))

// 存储在线用户信息
const onlineUsers = new Map()

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id)

  // 用户加入
  socket.on('user-join', (userData) => {
    onlineUsers.set(socket.id, userData)
    console.log(`用户 ${userData.name} (${socket.id}) 已连接`)
  })

  // 加入文档房间
  socket.on('join-document', (docId) => {
    socket.join(docId)
    console.log(`用户 ${socket.id} 加入文档 ${docId}`)

    // 通知房间内其他用户有新用户加入
    const user = onlineUsers.get(socket.id)
    if (user) {
      socket.to(docId).emit('user-joined-document', {
        userId: socket.id,
        user: user,
        docId: docId
      })
    }

    // 获取房间内的所有用户
    const room = io.sockets.adapter.rooms.get(docId)
    if (room) {
      const usersInRoom = Array.from(room).map(socketId => {
        const userData = onlineUsers.get(socketId)
        return userData ? { socketId, ...userData } : null
      }).filter(Boolean)

      socket.emit('room-users', usersInRoom)
    }
  })

  // 离开文档房间
  socket.on('leave-document', (docId) => {
    socket.leave(docId)
    console.log(`用户 ${socket.id} 离开文档 ${docId}`)

    // 通知房间内其他用户有用户离开
    const user = onlineUsers.get(socket.id)
    if (user) {
      socket.to(docId).emit('user-left-document', {
        userId: socket.id,
        user: user,
        docId: docId
      })
    }
  })

  // 处理文档更新
  socket.on('document-update', (data) => {
    // 广播给房间内的其他用户
    socket.to(data.docId).emit('document-update', {
      ...data,
      userId: socket.id,
      user: onlineUsers.get(socket.id)
    })
  })

  // 处理光标位置
  socket.on('cursor-update', (data) => {
    socket.to(data.docId).emit('cursor-update', {
      ...data,
      userId: socket.id,
      user: onlineUsers.get(socket.id)
    })
  })

  // 处理用户正在输入状态
  socket.on('typing-start', (data) => {
    socket.to(data.docId).emit('user-typing', {
      userId: socket.id,
      user: onlineUsers.get(socket.id),
      docId: data.docId
    })
  })

  socket.on('typing-stop', (data) => {
    socket.to(data.docId).emit('user-stop-typing', {
      userId: socket.id,
      user: onlineUsers.get(socket.id),
      docId: data.docId
    })
  })

  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id)

    // 通知所有房间该用户已离线
    const user = onlineUsers.get(socket.id)
    if (user) {
      socket.broadcast.emit('user-offline', {
        userId: socket.id,
        user: user
      })
    }

    // 清除用户信息
    onlineUsers.delete(socket.id)
  })
})

const PORT = process.env.PORT || 4001

// 将 redis 实例传递给应用
app.set('redis', redis)

server.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`)
  console.log(`📝 前端地址: http://localhost:4000`)
  console.log(`🔧 API地址: http://localhost:${PORT}/api`)
})