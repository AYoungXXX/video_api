# Netlify 部署指南

本文档说明如何将 Video API 项目部署到 Netlify。

## 前置要求

1. 拥有 Netlify 账号（免费版即可）
2. 项目已推送到 Git 仓库（GitHub、GitLab 或 Bitbucket）

## 部署步骤

### 方法一：通过 Netlify 网站部署（推荐）

1. **登录 Netlify**
   - 访问 [https://app.netlify.com](https://app.netlify.com)
   - 使用 GitHub/GitLab/Bitbucket 账号登录

2. **创建新站点**
   - 点击 "Add new site" → "Import an existing project"
   - 选择你的 Git 仓库

3. **配置构建设置**
   - **Build command**: 留空（或填写 `npm install`）
   - **Publish directory**: 留空
   - **Functions directory**: `netlify/functions`

4. **环境变量（可选）**
   - 在 "Site settings" → "Environment variables" 中添加：
     - `NODE_ENV`: `production`
     - `PORT`: `3000`（可选，Netlify 会自动分配）
     - 其他需要的环境变量

5. **部署**
   - 点击 "Deploy site"
   - 等待构建完成

### 方法二：通过 Netlify CLI 部署

1. **安装 Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **登录 Netlify**
   ```bash
   netlify login
   ```

3. **初始化项目**
   ```bash
   netlify init
   ```
   按照提示选择或创建站点

4. **部署**
   ```bash
   netlify deploy --prod
   ```

## 项目结构

```
video_api/
├── netlify.toml          # Netlify 配置文件
├── netlify/
│   └── functions/
│       └── server.js     # Netlify Function 入口
├── app.js                 # Express 应用
└── package.json           # 项目依赖
```

## 配置说明

### netlify.toml

- **Functions 目录**: `netlify/functions`
- **重定向规则**: 所有请求转发到 `/.netlify/functions/server`
- **Node.js 版本**: 18
- **CORS 支持**: 已配置允许跨域请求

### server.js

- 使用 `serverless-http` 将 Express 应用包装为 Netlify Function
- 自动处理所有 HTTP 方法（GET、POST、PUT、DELETE 等）
- 支持二进制文件类型（图片、视频等）

## API 端点

部署后，你的 API 端点将变为：

- `https://your-site.netlify.app/api/*`
- `https://your-site.netlify.app/health`
- `https://your-site.netlify.app/`

## 本地测试 Netlify Functions

使用 Netlify CLI 在本地测试：

```bash
# 安装依赖
npm install

# 启动本地开发服务器
netlify dev
```

这将启动一个本地服务器，模拟 Netlify 环境。

## 注意事项

1. **冷启动**: Netlify Functions 在首次请求时可能有冷启动延迟（通常 < 1 秒）
2. **超时限制**: 
   - 免费版：10 秒
   - Pro 版：26 秒
   - 企业版：可自定义
3. **内存限制**: 默认 1024 MB
4. **请求大小限制**: 6 MB（请求体）

## 故障排除

### 问题：函数超时
- 检查代码中是否有长时间运行的操作
- 考虑使用异步处理或队列

### 问题：CORS 错误
- 检查 `netlify.toml` 中的 CORS 头部配置
- 确保前端请求的域名已添加到允许列表

### 问题：依赖安装失败
- 确保 `package.json` 中所有依赖版本正确
- 检查 Node.js 版本兼容性

## 相关链接

- [Netlify Functions 文档](https://docs.netlify.com/functions/overview/)
- [serverless-http 文档](https://github.com/dougmoscrop/serverless-http)
- [Netlify 部署文档](https://docs.netlify.com/site-deploys/overview/)

