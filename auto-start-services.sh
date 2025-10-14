#!/bin/bash

# 飞书笔记数据库自动启动脚本
# 确保 Docker 服务运行后启动数据库容器

PROJECT_DIR="/Users/haoxiugong/Desktop/projects/feishu-notes"
LOG_FILE="$PROJECT_DIR/auto-start.log"

# 记录启动时间
echo "$(date): 开始启动飞书笔记数据库服务..." >> "$LOG_FILE"

# 等待 Docker 服务启动
echo "等待 Docker 服务启动..."
while ! docker info >/dev/null 2>&1; do
    echo "Docker 服务未就绪，等待 5 秒..."
    sleep 5
done

echo "Docker 服务已就绪，启动数据库容器..."

# 进入项目目录并启动数据库服务
cd "$PROJECT_DIR"
docker compose up -d mongodb redis

# 检查启动状态
if [ $? -eq 0 ]; then
    echo "$(date): 数据库服务启动成功" >> "$LOG_FILE"
    echo "数据库服务启动成功！"
else
    echo "$(date): 数据库服务启动失败" >> "$LOG_FILE"
    echo "数据库服务启动失败，请检查日志"
fi
