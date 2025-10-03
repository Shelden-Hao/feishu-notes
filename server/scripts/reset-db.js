const mongoose = require('mongoose')
const User = require('../models/User')
const Document = require('../models/Document')
const Folder = require('../models/Folder')
require('dotenv').config()

const resetDatabase = async () => {
  try {
    // 连接数据库
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/feishu-notes'
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log('✅ 数据库连接成功')

    // 清空现有数据
    console.log('🗑️  清空现有数据...')
    await User.deleteMany({})
    await Document.deleteMany({})
    await Folder.deleteMany({})

    // 重新初始化
    console.log('🌱 重新初始化数据...')

    // 创建演示用户
    const demoUser = new User({
      name: '演示用户',
      email: 'demo@example.com',
      password: '123456'
    })

    await demoUser.save()
    console.log('👤 创建演示用户: demo@example.com / 123456')

    // 创建示例文件夹
    const workFolder = new Folder({
      name: '工作文档',
      description: '工作相关的文档',
      owner: demoUser._id,
      color: '#3b82f6'
    })

    await workFolder.save()

    const personalFolder = new Folder({
      name: '个人笔记',
      description: '个人学习和思考记录',
      owner: demoUser._id,
      color: '#10b981'
    })

    await personalFolder.save()

    // 创建公开示例文档
    const welcomeDoc = new Document({
      title: '欢迎使用飞书笔记',
      content: `
        <h1>欢迎使用飞书笔记！</h1>
        <p>这是一个功能强大的协作文档平台，支持：</p>
        <ul>
          <li>富文本编辑</li>
          <li>实时协作</li>
          <li>文档管理</li>
          <li>权限控制</li>
        </ul>
        <h2>快速开始</h2>
        <p>1. 创建新文档或文件夹</p>
        <p>2. 邀请团队成员协作</p>
        <p>3. 开始编写和分享你的想法</p>
        <blockquote>
          <p>💡 提示：文档会自动保存，无需担心数据丢失！</p>
        </blockquote>
      `,
      author: demoUser._id,
      lastEditedBy: demoUser._id,
      isPublic: true // 公开文档，所有用户都可以查看
    })

    await welcomeDoc.save()

    const projectDoc = new Document({
      title: '项目计划模板',
      content: `
        <h1>项目计划</h1>
        <h2>项目概述</h2>
        <p>在这里描述项目的基本信息...</p>
        <h2>目标和里程碑</h2>
        <ul>
          <li>目标1：完成需求分析</li>
          <li>目标2：完成系统设计</li>
          <li>目标3：完成开发和测试</li>
        </ul>
        <h2>时间安排</h2>
        <p>项目预计耗时：X周</p>
        <h2>团队成员</h2>
        <p>列出参与项目的团队成员...</p>
      `,
      author: demoUser._id,
      folder: workFolder._id,
      lastEditedBy: demoUser._id,
      tags: ['项目', '计划', '模板'],
      isPublic: true // 公开文档
    })

    await projectDoc.save()

    console.log('📄 创建公开示例文档完成')
    console.log('🎉 数据库重置完成！')

  } catch (error) {
    console.error('❌ 数据库重置失败:', error)
  } finally {
    await mongoose.disconnect()
    console.log('👋 数据库连接已关闭')
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  resetDatabase()
}

module.exports = resetDatabase