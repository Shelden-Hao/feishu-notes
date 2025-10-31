@echo off
echo 启动飞书笔记应用...

echo.
echo 1. 检查 MongoDB 和 Redis 是否运行...
echo 请确保 MongoDB (端口 27017) 和 Redis (端口 6379) 已启动
echo 如果没有安装，可以使用 Docker: docker-compose up -d mongodb redis
echo.
pause

echo.
echo 2. 安装依赖...
call npm install
cd server
call npm install
cd ..

echo.
echo 3. 初始化数据库...
cd server
call npm run init-db
cd ..

echo.
echo 4. 启动后端服务器...
start "后端服务器" cmd /k "cd server && npm run dev"

echo.
echo 5. 等待后端启动...
timeout /t 5 /nobreak > nul

echo.
echo 6. 启动前端应用...
start "前端应用" cmd /k "npm run dev"

echo.
echo 应用启动完成！
echo 前端地址: http://localhost:4000
echo 后端地址: http://localhost:4001
echo MongoDB: mongodb://localhost:27017/feishu-notes
echo Redis: redis://localhost:6379
echo.
echo 演示账号: demo@example.com / 123456
echo.
pause