const jwt = require('jsonwebtoken')

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ message: '访问被拒绝，缺少token' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    req.user = decoded

    next()
  } catch (error) {
    res.status(401).json({ message: 'Token无效' })
  }
}

module.exports = authMiddleware