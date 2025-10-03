const mongoose = require('mongoose')

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '文件夹名称是必填项'],
    trim: true,
    maxlength: [100, '文件夹名称不能超过100个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '描述不能超过500个字符']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  color: {
    type: String,
    default: '#3b82f6',
    match: [/^#[0-9A-F]{6}$/i, '请输入有效的颜色代码']
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// 索引
folderSchema.index({ owner: 1, parent: 1, createdAt: -1 })
folderSchema.index({ isDeleted: 1 })

// 软删除方法
folderSchema.methods.softDelete = function () {
  this.isDeleted = true
  this.deletedAt = new Date()
  return this.save()
}

// 恢复文件夹
folderSchema.methods.restore = function () {
  this.isDeleted = false
  this.deletedAt = null
  return this.save()
}

// 获取子文件夹
folderSchema.methods.getChildren = function () {
  return this.constructor.find({
    parent: this._id,
    isDeleted: false
  }).sort({ createdAt: -1 })
}

// 获取文件夹路径
folderSchema.methods.getPath = async function () {
  const path = [this]
  let current = this

  while (current.parent) {
    current = await this.constructor.findById(current.parent)
    if (current) {
      path.unshift(current)
    } else {
      break
    }
  }

  return path
}

// 查询非删除文件夹
folderSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, isDeleted: false })
}

module.exports = mongoose.model('Folder', folderSchema)