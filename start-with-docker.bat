@echo off
echo 使用 Docker 启动飞书笔记应用...

echo.
echo 1. 检查 Docker 是否运行...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker 未安装或未运行，请先安装 Docker Desktop
    pause
    exit /b 1
)

echo ✅ Docker 已就绪

echo.
echo 2. 启动数据库服务...
docker-compose up -d mongodb redis

echo.
echo 3. 等待数据库启动...
timeout /t 10 /nobreak > nul

echo.
echo 4. 安装依赖...
call npm install
cd server
call npm install
cd ..

echo.
echo 5. 初始化数据库...
cd server
set MONGODB_URI=mongodb://admin:password123@localhost:27017/feishu-notes?authSource=admin
set REDIS_URL=redis://:redis123@localhost:6379
call npm run init-db
cd ..

echo.
echo 6. 启动后端服务器...
start "后端服务器" cmd /k "cd server && set MONGODB_URI=mongodb://admin:password123@localhost:27017/feishu-notes?authSource=admin && set REDIS_URL=redis://:redis123@localhost:6379 && npm run dev"

echo.
echo 7. 等待后端启动...
timeout /t 5 /nobreak > nul

echo.
echo 8. 启动前端应用...
start "前端应用" cmd /k "npm run dev"

echo.
echo 🎉 应用启动完成！
echo.
echo 📱 前端地址: http://localhost:4000
echo 🔧 后端地址: http://localhost:4001
echo 🗄️  MongoDB: mongodb://localhost:27017
echo 🔴 Redis: redis://localhost:6379
echo.
echo 👤 演示账号: demo@example.com / 123456
echo.
echo 💡 停止服务: docker-compose down
echo.
pause