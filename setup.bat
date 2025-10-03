@echo off
echo 🚀 飞书笔记 - 完整安装和启动脚本
echo.

echo 📋 检查系统要求...
echo.

REM 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js 16+ 
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js 已安装

REM 检查 npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm 未安装
    pause
    exit /b 1
)
echo ✅ npm 已安装

echo.
echo 🔧 选择启动方式:
echo 1. 使用 Docker (推荐 - 自动安装数据库)
echo 2. 使用本地数据库 (需要手动安装 MongoDB 和 Redis)
echo.
set /p choice="请选择 (1 或 2): "

if "%choice%"=="1" (
    echo.
    echo 🐳 使用 Docker 启动...
    
    REM 检查 Docker
    docker --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Docker 未安装，请先安装 Docker Desktop
        echo 下载地址: https://www.docker.com/products/docker-desktop
        pause
        exit /b 1
    )
    echo ✅ Docker 已安装
    
    echo.
    echo 📦 启动数据库容器...
    docker-compose up -d mongodb redis
    
    echo.
    echo ⏳ 等待数据库启动 (15秒)...
    timeout /t 15 /nobreak > nul
    
    set MONGODB_URI=mongodb://admin:password123@localhost:27017/feishu-notes?authSource=admin
    set REDIS_URL=redis://:redis123@localhost:6379
    
) else if "%choice%"=="2" (
    echo.
    echo 🏠 使用本地数据库...
    echo.
    echo ⚠️  请确保以下服务已启动:
    echo   - MongoDB (端口 27017)
    echo   - Redis (端口 6379)
    echo.
    pause
    
    set MONGODB_URI=mongodb://localhost:27017/feishu-notes
    set REDIS_URL=redis://localhost:6379
    
) else (
    echo ❌ 无效选择
    pause
    exit /b 1
)

echo.
echo 📦 安装前端依赖...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 前端依赖安装失败
    pause
    exit /b 1
)

echo.
echo 📦 安装后端依赖...
cd server
call npm install
if %errorlevel% neq 0 (
    echo ❌ 后端依赖安装失败
    pause
    exit /b 1
)

echo.
echo 🗄️  初始化数据库...
call npm run init-db
if %errorlevel% neq 0 (
    echo ❌ 数据库初始化失败
    pause
    exit /b 1
)

cd ..

echo.
echo 🚀 启动应用...
echo.

echo 📡 启动后端服务器...
start "飞书笔记-后端" cmd /k "cd server && npm run dev"

echo.
echo ⏳ 等待后端启动 (5秒)...
timeout /t 5 /nobreak > nul

echo.
echo 🌐 启动前端应用...
start "飞书笔记-前端" cmd /k "npm run dev"

echo.
echo 🎉 应用启动完成！
echo.
echo 📱 前端地址: http://localhost:3000
echo 🔧 后端地址: http://localhost:3001
echo.
if "%choice%"=="1" (
    echo 🗄️  MongoDB: mongodb://localhost:27017
    echo 🔴 Redis: redis://localhost:6379
    echo 💡 停止数据库: docker-compose down
)
echo.
echo 👤 演示账号:
echo    邮箱: demo@example.com
echo    密码: 123456
echo.
echo 📚 功能说明:
echo    ✅ 用户注册登录
echo    ✅ 富文本编辑
echo    ✅ 实时协作
echo    ✅ 文件夹管理
echo    ✅ 文档搜索
echo    ✅ 权限管理
echo    ✅ 自动保存
echo.
pause