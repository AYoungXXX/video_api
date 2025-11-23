// 加载 Polyfills
require('./polyfills');

const { getRequestListener } = require('@hono/node-server');
const app = require('./app');

/**
 * Vercel Node.js Runtime 使用标准的 Node.js HTTP 请求/响应对象 (IncomingMessage, ServerResponse)。
 * @hono/node-server 的 getRequestListener 可以将 Hono 应用转换为这种标准的 Node.js 请求处理函数。
 */
const server = getRequestListener(app.fetch);

module.exports = server;
