#!/bin/bash

echo "🚀 使用 Docker 启动飞书笔记应用..."

echo
echo "1. 检查 Docker 是否运行..."
if ! docker --version >/dev/null 2>&1; then
    echo "❌ Docker 未安装或未运行，请先安装 Docker Desktop"
    exit 1
fi

echo "✅ Docker 已就绪"

echo
echo "2. 启动数据库服务..."
docker compose up -d mongodb redis

echo
echo "3. 等待数据库启动..."
sleep 10

echo
echo "4. 检查数据库连接..."
# 测试 MongoDB 连接
if docker exec feishu-notes-mongodb mongosh --host 127.0.0.1 --port 27017 -u admin -p hxg20021126 --authenticationDatabase admin --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    echo "✅ MongoDB 连接正常"
else
    echo "❌ MongoDB 连接失败"
    exit 1
fi

# 测试 Redis 连接
if docker exec feishu-notes-redis redis-cli -a hxg20021126 ping >/dev/null 2>&1; then
    echo "✅ Redis 连接正常"
else
    echo "❌ Redis 连接失败"
    exit 1
fi

echo
echo "5. 安装前端依赖..."
npm install

echo
echo "6. 安装后端依赖..."
cd server
npm install
cd ..

echo
echo "7. 初始化数据库..."
cd server
export MONGODB_URI="mongodb://admin:hxg20021126@localhost:27017/feishu-notes?authSource=admin"
export REDIS_URL="redis://:hxg20021126@localhost:6379"
npm run init-db
cd ..

echo
echo "8. 启动后端服务器..."
cd server
export MONGODB_URI="mongodb://admin:hxg20021126@localhost:27017/feishu-notes?authSource=admin"
export REDIS_URL="redis://:hxg20021126@localhost:6379"
npm run dev &
BACKEND_PID=$!
cd ..

echo
echo "9. 等待后端启动..."
sleep 5

echo
echo "10. 启动前端应用..."
npm run dev &
FRONTEND_PID=$!

echo
echo "🎉 应用启动完成！"
echo
echo "📱 前端地址: http://localhost:3000"
echo "🔧 后端地址: http://localhost:3001"
echo "🗄️  MongoDB: mongodb://localhost:27017"
echo "🔴 Redis: redis://localhost:6379"
echo
echo "👤 演示账号: demo@example.com / 123456"
echo
echo "💡 停止服务: docker compose down"
echo "🛑 停止应用: 按 Ctrl+C"
echo

# 等待用户中断
wait
