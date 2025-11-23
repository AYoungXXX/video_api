const { Hono } = require('hono');
const { cors } = require('hono/cors');
const { logger } = require('hono/logger');
const { prettyJSON } = require('hono/pretty-json');
require('dotenv').config();
require('./polyfills'); // 引入 Polyfills

const parserController = require('./controllers/parserController');

const app = new Hono();

// 中间件
app.use('*', logger());
app.use('*', cors());
app.use('*', prettyJSON());

// 根路由
app.get('/', (c) => {
  return c.json({
    message: 'Welcome to Video API (Hono)',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      parse: '/api/parse',
      parseDetail: '/api/parse/detail',
      parseCategories: '/api/parse/categories'
    }
  });
});

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// API 路由
const api = new Hono();
api.get('/parse', parserController.parsePage);
api.get('/parse/detail', parserController.parseDetail);
api.get('/parse/categories', parserController.parseCategories);

app.route('/api', api);

// 404 处理
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: `Route ${c.req.path} not found`
  }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  }, 500);
});

// 本地开发服务器（仅在非 serverless 环境下运行）
if (process.env.VERCEL !== '1' && !process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  try {
    const { serve } = require('@hono/node-server');
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    console.log(`Server is running on http://localhost:${port}`);
    serve({
      fetch: app.fetch,
      port
    });
  } catch (e) {
    // 忽略错误，可能是因为 @hono/node-server 未安装（在某些 serverless 环境中）
    console.log('Local server not started:', e.message);
  }
}

module.exports = app;
