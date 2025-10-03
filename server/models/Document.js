const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '文档标题是必填项'],
    trim: true,
    maxlength: [200, '标题不能超过200个字符'],
    default: '无标题文档'
  },
  content: {
    type: String,
    default: '<p></p>'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'write', 'admin'],
      default: 'read'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, '标签不能超过30个字符']
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  version: {
    type: Number,
    default: 1
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

// 索引
documentSchema.index({ author: 1, createdAt: -1 })
documentSchema.index({ title: 'text', content: 'text' })
documentSchema.index({ isDeleted: 1, createdAt: -1 })

// 软删除方法
documentSchema.methods.softDelete = function () {
  this.isDeleted = true
  this.deletedAt = new Date()
  return this.save()
}

// 恢复文档
documentSchema.methods.restore = function () {
  this.isDeleted = false
  this.deletedAt = null
  return this.save()
}

// 增加查看次数
documentSchema.methods.incrementViewCount = function () {
  this.viewCount += 1
  return this.save()
}

// 检查用户权限
documentSchema.methods.hasPermission = function (userId, requiredPermission = 'read') {
  // 作者拥有所有权限
  const authorId = this.author._id ? this.author._id.toString() : this.author.toString()
  const userIdStr = userId.toString()

  if (authorId === userIdStr) {
    return true
  }

  // 检查协作者权限
  const collaborator = this.collaborators.find(
    collab => {
      const collabUserId = collab.user._id ? collab.user._id.toString() : collab.user.toString()
      return collabUserId === userIdStr
    }
  )

  if (!collaborator) {
    return this.isPublic && requiredPermission === 'read'
  }

  const permissions = {
    'read': ['read', 'write', 'admin'],
    'write': ['write', 'admin'],
    'admin': ['admin']
  }

  return permissions[requiredPermission].includes(collaborator.permission)
}

// 查询非删除文档
documentSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, isDeleted: false })
}

module.exports = mongoose.model('Document', documentSchema)