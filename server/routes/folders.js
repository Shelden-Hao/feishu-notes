const express = require('express')
const Folder = require('../models/Folder')
const Document = require('../models/Document')
const authMiddleware = require('../middleware/auth')
const router = express.Router()

// 获取用户的所有文件夹
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId
    const { parent } = req.query

    const query = {
      owner: userId,
      isDeleted: false
    }

    // 如果指定了父文件夹
    if (parent !== undefined) {
      query.parent = parent === 'null' ? null : parent
    }

    const folders = await Folder.findActive(query)
      .populate('owner', 'name email')
      .populate('parent', 'name')
      .sort({ createdAt: -1 })

    res.json(folders)
  } catch (error) {
    console.error('获取文件夹列表错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 获取文件夹树结构
router.get('/tree', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId

    // 获取所有根文件夹
    const rootFolders = await Folder.findActive({
      owner: userId,
      parent: null
    }).sort({ createdAt: -1 })

    // 递归构建树结构
    const buildTree = async (folders) => {
      const tree = []

      for (const folder of folders) {
        const children = await Folder.findActive({
          owner: userId,
          parent: folder._id
        }).sort({ createdAt: -1 })

        const folderNode = {
          ...folder.toJSON(),
          children: children.length > 0 ? await buildTree(children) : []
        }

        tree.push(folderNode)
      }

      return tree
    }

    const tree = await buildTree(rootFolders)
    res.json(tree)
  } catch (error) {
    console.error('获取文件夹树错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 获取单个文件夹
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const folderId = req.params.id
    const userId = req.user.userId

    const folder = await Folder.findOne({
      _id: folderId,
      owner: userId,
      isDeleted: false
    })
      .populate('owner', 'name email')
      .populate('parent', 'name')

    if (!folder) {
      return res.status(404).json({ message: '文件夹不存在' })
    }

    // 获取文件夹路径
    const path = await folder.getPath()

    // 获取子文件夹
    const children = await folder.getChildren()

    // 获取文件夹中的文档
    const documents = await Document.findActive({
      folder: folderId,
      $or: [
        { author: userId },
        { 'collaborators.user': userId }
      ]
    })
      .populate('author', 'name email')
      .sort({ updatedAt: -1 })

    res.json({
      folder,
      path,
      children,
      documents
    })
  } catch (error) {
    console.error('获取文件夹错误:', error)

    if (error.name === 'CastError') {
      return res.status(400).json({ message: '无效的文件夹ID' })
    }

    res.status(500).json({ message: '服务器错误' })
  }
})

// 创建文件夹
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, parent, color } = req.body
    const userId = req.user.userId

    if (!name || !name.trim()) {
      return res.status(400).json({ message: '文件夹名称不能为空' })
    }

    // 验证父文件夹权限（如果指定了父文件夹）
    if (parent) {
      const parentFolder = await Folder.findOne({
        _id: parent,
        owner: userId,
        isDeleted: false
      })

      if (!parentFolder) {
        return res.status(400).json({ message: '指定的父文件夹不存在或无权限' })
      }
    }

    // 检查同级文件夹名称是否重复
    const existingFolder = await Folder.findOne({
      name: name.trim(),
      owner: userId,
      parent: parent || null,
      isDeleted: false
    })

    if (existingFolder) {
      return res.status(400).json({ message: '同级目录下已存在同名文件夹' })
    }

    const folder = new Folder({
      name: name.trim(),
      description: description?.trim(),
      owner: userId,
      parent: parent || null,
      color: color || '#3b82f6'
    })

    await folder.save()

    // 填充关联数据
    await folder.populate('owner', 'name email')
    await folder.populate('parent', 'name')

    res.status(201).json(folder)
  } catch (error) {
    console.error('创建文件夹错误:', error)

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({ message: messages.join(', ') })
    }

    res.status(500).json({ message: '服务器错误' })
  }
})

// 更新文件夹
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, color } = req.body
    const folderId = req.params.id
    const userId = req.user.userId

    const folder = await Folder.findOne({
      _id: folderId,
      owner: userId,
      isDeleted: false
    })

    if (!folder) {
      return res.status(404).json({ message: '文件夹不存在' })
    }

    // 检查同级文件夹名称是否重复（如果修改了名称）
    if (name && name.trim() !== folder.name) {
      const existingFolder = await Folder.findOne({
        name: name.trim(),
        owner: userId,
        parent: folder.parent,
        isDeleted: false,
        _id: { $ne: folderId }
      })

      if (existingFolder) {
        return res.status(400).json({ message: '同级目录下已存在同名文件夹' })
      }
    }

    // 更新字段
    if (name) folder.name = name.trim()
    if (description !== undefined) folder.description = description?.trim()
    if (color) folder.color = color

    await folder.save()

    // 填充关联数据
    await folder.populate('owner', 'name email')
    await folder.populate('parent', 'name')

    res.json(folder)
  } catch (error) {
    console.error('更新文件夹错误:', error)

    if (error.name === 'CastError') {
      return res.status(400).json({ message: '无效的文件夹ID' })
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({ message: messages.join(', ') })
    }

    res.status(500).json({ message: '服务器错误' })
  }
})

// 删除文件夹（软删除）
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const folderId = req.params.id
    const userId = req.user.userId

    const folder = await Folder.findOne({
      _id: folderId,
      owner: userId,
      isDeleted: false
    })

    if (!folder) {
      return res.status(404).json({ message: '文件夹不存在' })
    }

    // 检查文件夹是否为空
    const hasChildren = await Folder.countDocuments({
      parent: folderId,
      isDeleted: false
    })

    const hasDocuments = await Document.countDocuments({
      folder: folderId,
      isDeleted: false
    })

    if (hasChildren > 0 || hasDocuments > 0) {
      return res.status(400).json({
        message: '文件夹不为空，请先删除或移动其中的内容'
      })
    }

    await folder.softDelete()

    res.json({ message: '文件夹已删除' })
  } catch (error) {
    console.error('删除文件夹错误:', error)

    if (error.name === 'CastError') {
      return res.status(400).json({ message: '无效的文件夹ID' })
    }

    res.status(500).json({ message: '服务器错误' })
  }
})

// 移动文件夹
router.put('/:id/move', authMiddleware, async (req, res) => {
  try {
    const { parent } = req.body
    const folderId = req.params.id
    const userId = req.user.userId

    const folder = await Folder.findOne({
      _id: folderId,
      owner: userId,
      isDeleted: false
    })

    if (!folder) {
      return res.status(404).json({ message: '文件夹不存在' })
    }

    // 验证目标父文件夹
    if (parent) {
      const parentFolder = await Folder.findOne({
        _id: parent,
        owner: userId,
        isDeleted: false
      })

      if (!parentFolder) {
        return res.status(400).json({ message: '目标文件夹不存在' })
      }

      // 防止循环引用
      if (parent === folderId) {
        return res.status(400).json({ message: '不能将文件夹移动到自身' })
      }

      // 检查是否会创建循环引用
      let current = parentFolder
      while (current.parent) {
        if (current.parent.toString() === folderId) {
          return res.status(400).json({ message: '不能将文件夹移动到其子文件夹中' })
        }
        current = await Folder.findById(current.parent)
        if (!current) break
      }
    }

    // 检查目标位置是否已有同名文件夹
    const existingFolder = await Folder.findOne({
      name: folder.name,
      owner: userId,
      parent: parent || null,
      isDeleted: false,
      _id: { $ne: folderId }
    })

    if (existingFolder) {
      return res.status(400).json({ message: '目标位置已存在同名文件夹' })
    }

    folder.parent = parent || null
    await folder.save()

    await folder.populate('parent', 'name')

    res.json({
      message: '文件夹移动成功',
      folder
    })
  } catch (error) {
    console.error('移动文件夹错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

module.exports = router