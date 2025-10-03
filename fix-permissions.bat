@echo off
echo 🔧 修复文档权限问题...
echo.

echo 1. 停止现有服务器...
taskkill /f /im node.exe >nul 2>&1

echo.
echo 2. 重置数据库...
cd server
call npm run reset-db

echo.
echo 3. 重新启动后端服务器...
start "飞书笔记-后端" cmd /k "npm run dev"

echo.
echo 4. 等待后端启动...
timeout /t 3 /nobreak > nul

echo.
echo 5. 重新启动前端...
cd ..
start "飞书笔记-前端" cmd /k "npm run dev"

echo.
echo 🎉 修复完成！
echo.
echo 📝 现在可以：
echo   1. 使用演示账号登录: demo@example.com / 123456
echo   2. 注册新账号（会自动创建示例文档）
echo   3. 查看公开的示例文档
echo.
pause