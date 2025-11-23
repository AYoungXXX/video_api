# Video API

一个基于 Node.js 和 Express 的 Web API 项目，为前端应用提供接口数据。

## 功能特性

- ✅ RESTful API 设计
- ✅ CORS 跨域支持
- ✅ 请求日志记录
- ✅ 安全头设置（Helmet）
- ✅ 错误处理中间件
- ✅ 数据验证
- ✅ 分页支持
- ✅ 搜索功能
- ✅ HTML 网页解析（提取文章卡片和分页信息）

## 项目结构

```
video_api/
├── app.js                 # 主应用文件
├── package.json          # 项目配置和依赖
├── .env.example          # 环境变量示例
├── .gitignore           # Git 忽略文件
├── routes/              # 路由文件
│   └── api.js          # API 路由
├── controllers/         # 控制器
│   ├── videoController.js
│   ├── userController.js
│   └── parserController.js
└── middleware/          # 中间件
    ├── errorHandler.js
    └── validator.js
```

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

### 3. 启动服务器

开发模式（使用 nodemon 自动重启）：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

## API 端点

### 健康检查

- `GET /health` - 检查 API 状态

### 视频接口

- `GET /api/videos` - 获取所有视频（支持分页和搜索）
  - 查询参数：`page`, `limit`, `search`
- `GET /api/videos/:id` - 根据 ID 获取视频
- `POST /api/videos` - 创建新视频
- `PUT /api/videos/:id` - 更新视频
- `DELETE /api/videos/:id` - 删除视频

### 用户接口

- `GET /api/users` - 获取所有用户（支持分页）
  - 查询参数：`page`, `limit`
- `GET /api/users/:id` - 根据 ID 获取用户
- `POST /api/users` - 创建新用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 网页解析接口

- `GET /api/parse` - 解析网页内容，提取文章卡片和分页信息
  - 查询参数：`url` (必需) - 要解析的网页URL
  - 返回数据：
    - `posts`: 文章列表，包含：
      - `title`: 标题
      - `imageUrl`: 图片链接
      - `link`: 跳转链接
      - `publishTime`: 发布时间
      - `author`: 作者
      - `categories`: 分类数组
    - `pagination`: 分页信息，包含：
      - `currentPage`: 当前页码
      - `totalPages`: 总页数
      - `pageLinks`: 分页链接数组
      - `prevPage`: 上一页链接（如果有）
      - `nextPage`: 下一页链接（如果有）

## 请求示例

### 创建视频

```bash
curl -X POST http://localhost:3000/api/videos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新视频",
    "description": "视频描述",
    "url": "https://example.com/video.mp4",
    "duration": 120
  }'
```

### 获取视频列表（带分页）

```bash
curl "http://localhost:3000/api/videos?page=1&limit=10&search=示例"
```

### 创建用户

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "email": "zhangsan@example.com"
  }'
```

### 解析网页内容

```bash
curl "http://localhost:3000/api/parse?url=https://wiki.ndyechuz.cc/category/zxcghl/"
```

响应示例：

```json
{
  "success": true,
  "data": {
    "url": "https://wiki.ndyechuz.cc/category/zxcghl/",
    "posts": [
      {
        "index": 1,
        "title": "文章标题",
        "imageUrl": "https://example.com/image.jpg",
        "link": "https://example.com/article/123",
        "publishTime": "2025年11月22日",
        "author": "作者名",
        "categories": ["分类1", "分类2"]
      }
    ],
    "pagination": {
      "currentPage": "1",
      "totalPages": "749",
      "pageLinks": [
        {"page": "1", "url": "https://..."},
        {"page": "2", "url": "https://..."}
      ],
      "nextPage": "https://..."
    },
    "totalPosts": 20
  }
}
```

## 响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... }  // 仅列表接口
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误信息"
}
```

## 技术栈

- **Node.js** - 运行环境
- **Express** - Web 框架
- **CORS** - 跨域资源共享
- **Helmet** - 安全头设置
- **Morgan** - HTTP 请求日志
- **dotenv** - 环境变量管理
- **Cheerio** - HTML 解析和操作
- **Axios** - HTTP 客户端

## 开发建议

1. **数据库集成**：当前使用内存存储，生产环境建议集成数据库（如 MongoDB、PostgreSQL、MySQL）
2. **身份认证**：添加 JWT 或 OAuth 认证机制
3. **API 文档**：使用 Swagger/OpenAPI 生成 API 文档
4. **单元测试**：添加测试框架（如 Jest、Mocha）
5. **数据验证**：使用 Joi 或 express-validator 进行更严格的验证
6. **限流**：添加 rate limiting 防止滥用

## 许可证

ISC

