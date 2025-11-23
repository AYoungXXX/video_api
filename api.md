# Video API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **Content-Type**: `application/json`
- **请求方式**: `GET`

## 接口列表

### 1. 解析列表页接口

解析网页内容，提取文章卡片信息和分页器数据。

#### 接口地址

```
GET /api/parse
```

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| url | string | 是 | 要解析的网页URL |

#### 请求示例

```bash
GET /api/parse?url=https://wiki.ndyechuz.cc/
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 请求是否成功 |
| data | object | 返回数据对象 |
| data.url | string | 请求的URL |
| data.posts | array | 文章列表数组 |
| data.posts[].index | number | 文章索引（从1开始） |
| data.posts[].title | string | 文章标题 |
| data.posts[].imageUrl | string | 文章封面图片URL |
| data.posts[].link | string | 文章详情页链接（绝对URL） |
| data.posts[].publishTime | string | 发布时间 |
| data.posts[].author | string | 作者名称 |
| data.posts[].categories | array | 分类数组 |
| data.pagination | object\|null | 分页信息对象，如果不存在则为null |
| data.pagination.currentPage | string | 当前页码 |
| data.pagination.totalPages | string | 总页数 |
| data.pagination.pageLinks | array | 分页链接数组 |
| data.pagination.pageLinks[].page | string | 页码文本 |
| data.pagination.pageLinks[].url | string | 页码链接URL |
| data.pagination.prevPage | string\|null | 上一页链接，如果不存在则为null |
| data.pagination.nextPage | string\|null | 下一页链接，如果不存在则为null |
| data.totalPosts | number | 文章总数 |

#### 成功响应示例

```json
{
  "success": true,
  "data": {
    "url": "https://wiki.ndyechuz.cc/",
    "posts": [
      {
        "index": 1,
        "title": "文章标题示例",
        "imageUrl": "https://example.com/image.jpg",
        "link": "https://wiki.ndyechuz.cc/archives/97166/",
        "publishTime": "2025 年 11 月 22 日",
        "author": "传瓜哥",
        "categories": ["今日吃瓜", "反差靓女"]
      }
    ],
    "pagination": {
      "currentPage": "1",
      "totalPages": "749",
      "pageLinks": [
        {
          "page": "1",
          "url": "https://wiki.ndyechuz.cc/page/1/"
        },
        {
          "page": "2",
          "url": "https://wiki.ndyechuz.cc/page/2/"
        }
      ],
      "prevPage": null,
      "nextPage": "https://wiki.ndyechuz.cc/page/2/"
    },
    "totalPosts": 1
  }
}
```

#### 错误响应示例

```json
{
  "success": false,
  "error": "URL parameter is required"
}
```

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

```json
{
  "success": false,
  "error": "Failed to parse page",
  "details": "Error stack trace (仅在开发环境显示)"
}
```

---

### 2. 解析详情页接口

解析详情页内容，提取视频链接、文案和图片。

#### 接口地址

```
GET /api/parse/detail
```

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| url | string | 是 | 要解析的详情页URL |

#### 请求示例

```bash
GET /api/parse/detail?url=https://wiki.ndyechuz.cc/archives/97166/
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 请求是否成功 |
| data | object | 返回数据对象 |
| data.url | string | 请求的URL |
| data.videoUrl | string | 视频链接URL（从dplayer中提取），如果不存在则为空字符串 |
| data.content | array | 内容数组，按DOM顺序排列，包含文案和图片 |
| data.content[].type | string | 内容类型：`"text"` 或 `"image"` |
| data.content[].text | string | 文案内容（当type为"text"时存在） |
| data.content[].url | string | 图片URL（当type为"image"时存在） |
| data.images | array | 所有图片URL数组（去重后的） |

#### 成功响应示例

```json
{
  "success": true,
  "data": {
    "url": "https://wiki.ndyechuz.cc/archives/97166/",
    "videoUrl": "https://hls.liheiat.xyz/videos5/849df38e89595034ea7c397e6fc69870/849df38e89595034ea7c397e6fc69870.m3u8?auth_key=...",
    "content": [
      {
        "type": "text",
        "text": "深圳第一深情，这位顶级约炮大神又出新战绩！他把小红书上拥有30万粉丝的极品瑜伽博主..."
      },
      {
        "type": "image",
        "url": "https://pic.etljnm.cn/upload_01/xiao/20251121/2025112112041574591.jpeg"
      },
      {
        "type": "text",
        "text": "深圳第一深情一开门就把这位小红书瑜伽博主按倒在沙发上..."
      },
      {
        "type": "image",
        "url": "https://pic.etljnm.cn/upload_01/xiao/20251121/2025112112041777033.jpeg"
      }
    ],
    "images": [
      "https://pic.etljnm.cn/upload_01/xiao/20251121/2025112112041574591.jpeg",
      "https://pic.etljnm.cn/upload_01/xiao/20251121/2025112112041777033.jpeg",
      "https://pic.etljnm.cn/upload_01/xiao/20251121/2025112112041926705.jpeg"
    ]
  }
}
```

#### 错误响应示例

```json
{
  "success": false,
  "error": "URL parameter is required"
}
```

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

```json
{
  "success": false,
  "error": "Failed to parse detail page",
  "details": "Error stack trace (仅在开发环境显示)"
}
```

---

### 3. 解析分类链接接口

解析网页中的分类链接列表。

#### 接口地址

```
GET /api/parse/categories
```

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| url | string | 是 | 要解析的网页URL |

#### 请求示例

```bash
GET /api/parse/categories?url=https://wiki.ndyechuz.cc/category/zxcghl/
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 请求是否成功 |
| data | object | 返回数据对象 |
| data.url | string | 请求的URL |
| data.categories | array | 分类链接数组 |
| data.categories[].title | string | 分类标题名称 |
| data.categories[].url | string | 分类链接URL（绝对URL） |
| data.categories[].active | boolean | 是否为当前激活的分类 |
| data.total | number | 分类总数 |

#### 成功响应示例

```json
{
  "success": true,
  "data": {
    "url": "https://wiki.ndyechuz.cc/category/zxcghl/",
    "categories": [
      {
        "title": "首页",
        "url": "https://wiki.ndyechuz.cc/",
        "active": false
      },
      {
        "title": "今日吃瓜",
        "url": "https://wiki.ndyechuz.cc/category/zxcghl/",
        "active": true
      },
      {
        "title": "最高点击",
        "url": "https://wiki.ndyechuz.cc/category/rsdg/",
        "active": false
      },
      {
        "title": "必吃大瓜",
        "url": "https://wiki.ndyechuz.cc/category/bcdg/",
        "active": false
      }
    ],
    "total": 17
  }
}
```

#### 错误响应示例

```json
{
  "success": false,
  "error": "URL parameter is required"
}
```

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

```json
{
  "success": false,
  "error": "Failed to parse categories",
  "details": "Error stack trace (仅在开发环境显示)"
}
```

---

## 接口说明

### 解析列表页接口 (`/api/parse`)

- **功能**: 解析网页列表页，提取文章卡片信息和分页器数据
- **提取内容**:
  - 文章标题、封面图、链接
  - 发布时间、作者、分类
  - 分页信息（当前页、总页数、分页链接等）
- **过滤规则**: 自动过滤广告内容，只返回有效的文章数据

### 解析详情页接口 (`/api/parse/detail`)

- **功能**: 解析详情页，提取视频链接、文案和图片
- **提取内容**:
  - 视频链接：从 dplayer 的 `data-config` 属性中提取 `video.url`
  - 文案：从 `blockquote` 后面的 `p` 标签中提取文本内容
  - 图片：从 `img` 标签的 `data-xkrkllgl` 属性中提取图片URL
- **解析范围**: 
  - 从 `blockquote` 元素后开始解析
  - 遇到 `dplayer` 元素后停止解析（不解析 dplayer 后面的内容）
  - 如果没有 `blockquote`，从开头解析，遇到 `dplayer` 后停止
- **内容顺序**: `content` 数组按照 DOM 中的顺序排列，保持文案和图片的原始顺序

### 解析分类链接接口 (`/api/parse/categories`)

- **功能**: 解析网页中的分类导航链接列表
- **提取内容**:
  - 从 `ul.list` 元素中提取所有分类链接
  - 提取分类标题和完整URL
  - 标记当前激活的分类
- **解析规则**: 
  - 优先查找 `ul.list` 元素
  - 如果不存在，尝试查找其他可能的列表容器（`ul[class*="list"]`, `.list ul`, `nav ul` 等）
  - 自动将相对URL转换为绝对URL
  - 自动去重，避免重复的分类链接

---

## HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误（缺少URL或URL格式无效） |
| 500 | 服务器内部错误 |

---

## 注意事项

1. **URL 格式**: 必须提供完整的 URL（包含协议，如 `https://`）
2. **超时设置**: 请求超时时间为 10 秒
3. **相对URL转换**: 所有相对URL会自动转换为绝对URL
4. **图片去重**: 详情页接口返回的 `images` 数组已自动去重
5. **错误处理**: 开发环境下会返回详细的错误堆栈信息，生产环境只返回错误消息

---

## 使用示例
### cURL

```bash
# 解析列表页
curl "http://localhost:3000/api/parse?url=https://wiki.ndyechuz.cc/"

# 解析详情页
curl "http://localhost:3000/api/parse/detail?url=https://wiki.ndyechuz.cc/archives/97166/"

# 解析分类链接
curl "http://localhost:3000/api/parse/categories?url=https://wiki.ndyechuz.cc/category/zxcghl/"
```


## 更新日志

- **v1.1.0** (2025-11-22)
  - 添加分类链接解析接口

- **v1.0.0** (2025-11-22)
  - 初始版本
  - 添加列表页解析接口
  - 添加详情页解析接口

