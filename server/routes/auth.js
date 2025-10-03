const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const router = express.Router()

// 注册
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body

    // 验证输入
    if (!email || !password || !name) {
      return res.status(400).json({ message: '请填写所有必填字段' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: '密码至少需要6个字符' })
    }

    // 检查用户是否已存在
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({ message: '该邮箱已被注册' })
    }

    // 创建用户
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password
    })

    await user.save()

    // 为新用户创建示例文档
    try {
      const Document = require('../models/Document')

      const welcomeDoc = new Document({
        title: '欢迎使用飞书笔记！',
        content: `
          <h1>欢迎 ${user.name}！</h1>
          <p>恭喜你成功注册飞书笔记！这是你的第一个文档。</p>
          <h2>功能介绍</h2>
          <ul>
            <li>📝 富文本编辑 - 支持格式化、列表、引用等</li>
            <li>🤝 实时协作 - 邀请团队成员一起编辑</li>
            <li>📁 文件夹管理 - 组织你的文档</li>
            <li>🔍 全文搜索 - 快速找到需要的内容</li>
            <li>💾 自动保存 - 不用担心数据丢失</li>
          </ul>
          <h2>快速开始</h2>
          <p>1. 点击左侧的"新建文档"按钮创建文档</p>
          <p>2. 使用工具栏进行文本格式化</p>
          <p>3. 创建文件夹来组织你的文档</p>
          <p>4. 使用顶部搜索框快速查找文档</p>
          <blockquote>
            <p>💡 提示：这个文档会自动保存，你可以随时编辑！</p>
          </blockquote>
        `,
        author: user._id,
        lastEditedBy: user._id
      })

      await welcomeDoc.save()
      console.log('为新用户创建示例文档成功')
    } catch (error) {
      console.error('创建示例文档失败:', error)
      // 不影响注册流程，继续执行
    }

    // 生成JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('注册错误:', error)

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({ message: messages.join(', ') })
    }

    res.status(500).json({ message: '服务器错误，请稍后重试' })
  }
})

// 登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // 验证输入
    if (!email || !password) {
      return res.status(400).json({ message: '请输入邮箱和密码' })
    }

    // 查找用户
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      isActive: true
    })

    if (!user) {
      return res.status(400).json({ message: '邮箱或密码错误' })
    }

    // 验证密码
    const isValidPassword = await user.comparePassword(password)
    if (!isValidPassword) {
      return res.status(400).json({ message: '邮箱或密码错误' })
    }

    // 更新最后登录时间
    await user.updateLastLogin()

    // 生成JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        lastLoginAt: user.lastLoginAt
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({ message: '服务器错误，请稍后重试' })
  }
})

// 获取当前用户信息
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password')

    if (!user || !user.isActive) {
      return res.status(404).json({ message: '用户不存在' })
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 更新用户信息
router.put('/profile', require('../middleware/auth'), async (req, res) => {
  try {
    const { name, avatar } = req.body
    const userId = req.user.userId

    const updateData = {}
    if (name) updateData.name = name.trim()
    if (avatar) updateData.avatar = avatar

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password')

    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    res.json({
      message: '用户信息更新成功',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role
      }
    })
  } catch (error) {
    console.error('更新用户信息错误:', error)

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({ message: messages.join(', ') })
    }

    res.status(500).json({ message: '服务器错误' })
  }
})

// 修改密码
router.put('/password', require('../middleware/auth'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user.userId

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '请输入当前密码和新密码' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码至少需要6个字符' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 验证当前密码
    const isValidPassword = await user.comparePassword(currentPassword)
    if (!isValidPassword) {
      return res.status(400).json({ message: '当前密码错误' })
    }

    // 更新密码
    user.password = newPassword
    await user.save()

    res.json({ message: '密码修改成功' })
  } catch (error) {
    console.error('修改密码错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

module.exports = router