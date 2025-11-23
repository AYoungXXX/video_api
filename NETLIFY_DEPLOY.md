# Netlify 部署指南

本文档说明如何将 Video API 项目部署到 Netlify。

## 项目技术栈

- **框架**: Hono (替代了 Express，更轻量，原生支持 Serverless)
- **解析库**: Cheerio
- **HTTP 客户端**: Axios (带 Polyfill 支持)

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
│       └── server.js     # Netlify Function 入口 (Hono Adapter)
├── polyfills.js          # Polyfills (File API)
├── app.js                # Hono 应用入口
├── controllers/          # 控制器
│   └── parserController.js
└── package.json          # 项目依赖
```

## 故障排除

### 问题：File is not defined 错误
**已解决**: 项目包含 `polyfills.js`，自动在所有环境加载 File API polyfill。

### 问题：依赖安装失败
确保 Node.js 版本至少为 18。推荐使用 Node.js 20。
在 `netlify.toml` 中已配置 `NODE_VERSION = "20"`。
