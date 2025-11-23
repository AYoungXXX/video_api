/**
 * Netlify Serverless Function 入口文件
 * 将 Hono 应用包装为 Netlify Function
 */

// ============================================
// 加载 Polyfills（必须在所有 require 之前）
// ============================================
require('../../polyfills');

const serverless = require('serverless-http');
const { getRequestListener } = require('@hono/node-server');
const app = require('../../app');

/**
 * 使用 serverless-http 和 @hono/node-server 将 Hono 转换为 Netlify Function
 * 这种方式比 hono/netlify 更稳健，因为它模拟了完整的 Node.js HTTP 环境
 */
const requestListener = getRequestListener(app.fetch);
const handler = serverless(requestListener, {
  binary: ['image/*', 'video/*', 'application/octet-stream'],
});

exports.handler = async (event, context) => {
  // 设置 context.callbackWaitsForEmptyEventLoop = false
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const result = await handler(event, context);
    return result;
  } catch (error) {
    console.error('Netlify Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
};
