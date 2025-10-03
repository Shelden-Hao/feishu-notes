const mongoose = require('mongoose')
const Redis = require('ioredis')

// MongoDB 连接
const connectMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/feishu-notes'

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log('✅ MongoDB 连接成功')
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message)
    process.exit(1)
  }
}

// Redis 连接
const connectRedis = () => {
  try {
    const redisURL = process.env.REDIS_URL || 'redis://localhost:6379'

    const redis = new Redis(redisURL, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })

    redis.on('connect', () => {
      console.log('✅ Redis 连接成功')
    })

    redis.on('error', (error) => {
      console.error('❌ Redis 连接失败:', error.message)
    })

    return redis
  } catch (error) {
    console.error('❌ Redis 初始化失败:', error.message)
    return null
  }
}

module.exports = {
  connectMongoDB,
  connectRedis
}