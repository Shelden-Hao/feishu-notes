const express = require('express')
const Document = require('../models/Document')
const Folder = require('../models/Folder')
const authMiddleware = require('../middleware/auth')
const router = express.Router()

// 获取用户的所有文档
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId
    const { folder, search, page = 1, limit = 20 } = req.query

    // 构建查询条件
    const query = {
      $or: [
        { author: userId },
        { 'collaborators.user': userId },
        { isPublic: true } // 包含公开文档
      ],
      isDeleted: false
    }



    // 文件夹筛选
    if (folder) {
      query.folder = folder === 'null' ? null : folder
    }

    // 搜索功能
    if (search) {
      query.$text = { $search: search }
    }

    // 分页
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const documents = await Document.findActive(query)
      .populate('author', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .populate('folder', 'name color')
      .populate('lastEditedBy', 'name email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Document.countDocuments(query)

    res.json({
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('获取文档列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 获取单个文档
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const documentId = req.params.id
    const userId = req.user.userId

    const document = await Document.findOne({
      _id: documentId,
      isDeleted: false
    })
      .populate('author', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .populate('folder', 'name color')
      .populate('lastEditedBy', 'name email')

    if (!document) {
      return res.status(404).json({ message: '文档不存在' })
    }

    // 检查权限
    if (!document.hasPermission(userId, 'read')) {
      return res.status(403).json({ message: '没有访问权限' })
    }

    // 增加查看次数
    await document.incrementViewCount()

    res.json(document)
  } catch (error) {
    console.error('获取文档错误:', error)

    if (error.name === 'CastError') {
      return res.status(400).json({ message: '无效的文档ID' })
    }

    res.status(500).json({ message: '服务器错误' })
  }
})

// 创建文档
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, content, folder, tags } = req.body
    const userId = req.user.userId

    // 验证文件夹权限（如果指定了文件夹）
    if (folder) {
      const folderDoc = await Folder.findOne({
        _id: folder,
        owner: userId,
        isDeleted: false
      })

      if (!folderDoc) {
        return res.status(400).json({ message: '指定的文件夹不存在或无权限' })
      }
    }

    const document = new Document({
      title: title || '无标题文档',
      content: content || '<p></p>',
      author: userId,
      folder: folder || null,
      tags: tags || [],
      lastEditedBy: userId
    })

    await document.save()

    // 填充关联数据
    await document.populate('author', 'name email avatar')
    await document.populate('folder', 'name color')

    res.status(201).json(document)
  } catch (error) {
    console.error('创建文档错误:', error)

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({ message: messages.join(', ') })
    }

    res.status(500).json({ message: '服务器错误' })
  }
})

// 更新文档
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, content, tags } = req.body
    const documentId = req.params.id
    const userId = req.user.userId

    const document = await Document.findOne({
      _id: documentId,
      isDeleted: false
    })

    if (!document) {
      return res.status(404).json({ message: '文档不存在' })
    }

    // 检查写入权限
    if (!document.hasPermission(userId, 'write')) {
      return res.status(403).json({ message: '没有编辑权限' })
    }

    // 更新字段
    if (title !== undefined) document.title = title
    if (content !== undefined) document.content = content
    if (tags !== undefined) document.tags = tags

    document.lastEditedBy = userId
    document.version += 1

    await document.save()

    // 填充关联数据
    await document.populate('author', 'name email avatar')
    await document.populate('collaborators.user', 'name email avatar')
    await document.populate('folder', 'name color')
    await document.populate('lastEditedBy', 'name email')

    res.json(document)
  } catch (error) {
    console.error('更新文档错误:', error)

    if (error.name === 'CastError') {
      return res.status(400).json({ message: '无效的文档ID' })
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({ message: messages.join(', ') })
    }

    res.status(500).json({ message: '服务器错误' })
  }
})

// 删除文档（软删除）
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const documentId = req.params.id
    const userId = req.user.userId

    const document = await Document.findOne({
      _id: documentId,
      isDeleted: false
    })

    if (!document) {
      return res.status(404).json({ message: '文档不存在' })
    }

    // 检查删除权限（只有作者可以删除）
    if (document.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: '只有文档作者可以删除文档' })
    }

    await document.softDelete()

    res.json({ message: '文档已删除' })
  } catch (error) {
    console.error('删除文档错误:', error)

    if (error.name === 'CastError') {
      return res.status(400).json({ message: '无效的文档ID' })
    }

    res.status(500).json({ message: '服务器错误' })
  }
})

// 添加协作者
router.post('/:id/collaborators', authMiddleware, async (req, res) => {
  try {
    const { email, permission = 'read' } = req.body
    const documentId = req.params.id
    const userId = req.user.userId

    const document = await Document.findOne({
      _id: documentId,
      isDeleted: false
    })

    if (!document) {
      return res.status(404).json({ message: '文档不存在' })
    }

    // 检查管理权限
    if (!document.hasPermission(userId, 'admin') && document.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: '没有管理权限' })
    }

    // 查找要添加的用户
    const User = require('../models/User')
    const collaboratorUser = await User.findOne({ email: email.toLowerCase() })

    if (!collaboratorUser) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 检查是否已经是协作者
    const existingCollaborator = document.collaborators.find(
      collab => collab.user.toString() === collaboratorUser._id.toString()
    )

    if (existingCollaborator) {
      return res.status(400).json({ message: '用户已经是协作者' })
    }

    // 添加协作者
    document.collaborators.push({
      user: collaboratorUser._id,
      permission,
      addedAt: new Date()
    })

    await document.save()

    // 填充用户信息
    await document.populate('collaborators.user', 'name email avatar')

    res.json({
      message: '协作者添加成功',
      collaborators: document.collaborators
    })
  } catch (error) {
    console.error('添加协作者错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 移除协作者
router.delete('/:id/collaborators/:collaboratorId', authMiddleware, async (req, res) => {
  try {
    const { id: documentId, collaboratorId } = req.params
    const userId = req.user.userId

    const document = await Document.findOne({
      _id: documentId,
      isDeleted: false
    })

    if (!document) {
      return res.status(404).json({ message: '文档不存在' })
    }

    // 检查管理权限
    if (!document.hasPermission(userId, 'admin') && document.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: '没有管理权限' })
    }

    // 移除协作者
    document.collaborators = document.collaborators.filter(
      collab => collab.user.toString() !== collaboratorId
    )

    await document.save()

    res.json({ message: '协作者移除成功' })
  } catch (error) {
    console.error('移除协作者错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

module.exports = router