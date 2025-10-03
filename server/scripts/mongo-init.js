// MongoDB 初始化脚本
// 这个脚本会在 Docker 容器启动时自动执行

// 切换到应用数据库
db = db.getSiblingDB('feishu-notes');

// 创建应用用户
db.createUser({
  user: 'feishu-notes-user',
  pwd: 'feishu-notes-password',
  roles: [
    {
      role: 'readWrite',
      db: 'feishu-notes'
    }
  ]
});

// 创建集合和索引
db.createCollection('users');
db.createCollection('documents');
db.createCollection('folders');

// 用户集合索引
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "isActive": 1 });

// 文档集合索引
db.documents.createIndex({ "author": 1, "createdAt": -1 });
db.documents.createIndex({ "title": "text", "content": "text" });
db.documents.createIndex({ "isDeleted": 1, "createdAt": -1 });
db.documents.createIndex({ "collaborators.user": 1 });

// 文件夹集合索引
db.folders.createIndex({ "owner": 1, "parent": 1, "createdAt": -1 });
db.folders.createIndex({ "isDeleted": 1 });
db.folders.createIndex({ "owner": 1, "name": 1, "parent": 1 }, { unique: true });

print('MongoDB 初始化完成！');