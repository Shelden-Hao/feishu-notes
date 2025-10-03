# 飞书笔记 - 协作文档平台

一个现代化的协作笔记应用，模仿飞书文档，支持实时协作编辑。

## 功能特性

- 🎨 现代化的用户界面
- ✏️ 富文本编辑器 (基于 Tiptap)
- 🤝 实时协作编辑
- 📁 文档管理和组织
- 🔍 全文搜索
- 👥 用户认证和权限管理
- 📱 响应式设计

## 技术栈

### 前端
- Next.js 14 + React 18
- TypeScript
- Tailwind CSS
- Tiptap 编辑器
- Socket.io Client

### 后端
- Node.js + Express
- Socket.io (实时通信)
- JWT 认证
- MongoDB (文档存储)
- Redis (缓存和会话)
- Mongoose (ODM)

## 快速开始

### 1. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
cd ..
```

### 2. 数据库准备

#### 方式一：使用 Docker (推荐)
```bash
# 启动 MongoDB 和 Redis
docker-compose up -d mongodb redis

# 或使用一键启动脚本
start-with-docker.bat
```

#### 方式二：本地安装
- 安装 MongoDB (端口 27017)
- 安装 Redis (端口 6379)

### 3. 一键启动 (推荐)

```bash
# Windows 用户 - 完整安装和启动
setup.bat

# 或者使用 npm 命令
npm run setup
```

### 4. 手动启动

#### 方式一：使用 Docker
```bash
# 启动数据库
docker-compose up -d mongodb redis

# 安装依赖
npm install
cd server && npm install && cd ..

# 初始化数据库
cd server && npm run init-db && cd ..

# 启动服务
npm run dev:server  # 后端
npm run dev         # 前端 (新终端)
```

#### 方式二：本地数据库
```bash
# 确保 MongoDB 和 Redis 已启动
# MongoDB: mongodb://localhost:27017
# Redis: redis://localhost:6379

# 安装依赖和启动
npm install
cd server && npm install && npm run init-db && npm run dev
# 新终端: npm run dev
```

### 3. 访问应用

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 项目结构

```
feishu-notes/
├── app/                    # Next.js 应用目录
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── components/            # React 组件
│   ├── Editor.tsx         # 富文本编辑器
│   ├── Header.tsx         # 顶部导航
│   └── Sidebar.tsx        # 侧边栏
├── server/                # 后端服务器
│   ├── routes/            # API 路由
│   ├── index.js           # 服务器入口
│   └── package.json       # 后端依赖
├── package.json           # 前端依赖
└── README.md
```

## 开发计划

- [x] 基础项目结构
- [x] 富文本编辑器
- [x] 用户界面设计
- [x] 基础后端 API
- [x] 用户认证系统
- [x] 状态管理 (Zustand)
- [x] 实时协作基础
- [x] 自动保存功能
- [x] Socket.io 实时通信
- [x] 数据库集成 (MongoDB + Redis)
- [x] 文档权限管理
- [x] 文件夹管理
- [x] 协作者管理
- [x] 全文搜索功能
- [x] 用户设置页面
- [x] 一键安装脚本
- [ ] 移动端优化
- [ ] 文件上传功能
- [ ] 导出功能 (PDF/Word)

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
##
 数据库说明

### MongoDB 集合结构

#### Users (用户)
- 用户基本信息、认证数据
- 支持邮箱登录、密码加密
- 用户状态管理

#### Documents (文档)
- 文档内容、元数据
- 作者和协作者权限
- 版本控制、软删除
- 全文搜索索引

#### Folders (文件夹)
- 文件夹层级结构
- 权限继承
- 颜色标记

### Redis 用途
- 用户会话缓存
- 实时协作状态
- 频繁查询缓存

## 演示账号

初始化数据库后会自动创建演示账号：
- 邮箱：`demo@example.com`
- 密码：`123456`

## Docker 部署

```bash
# 完整部署（包含前后端）
docker-compose up -d

# 仅启动数据库
docker-compose up -d mongodb redis

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## API 文档

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息
- `PUT /api/auth/profile` - 更新用户信息
- `PUT /api/auth/password` - 修改密码

### 文档接口
- `GET /api/documents` - 获取文档列表
- `GET /api/documents/:id` - 获取单个文档
- `POST /api/documents` - 创建文档
- `PUT /api/documents/:id` - 更新文档
- `DELETE /api/documents/:id` - 删除文档
- `POST /api/documents/:id/collaborators` - 添加协作者
- `DELETE /api/documents/:id/collaborators/:userId` - 移除协作者

### 文件夹接口
- `GET /api/folders` - 获取文件夹列表
- `GET /api/folders/tree` - 获取文件夹树
- `GET /api/folders/:id` - 获取单个文件夹
- `POST /api/folders` - 创建文件夹
- `PUT /api/folders/:id` - 更新文件夹
- `DELETE /api/folders/:id` - 删除文件夹
- `PUT /api/folders/:id/move` - 移动文件夹