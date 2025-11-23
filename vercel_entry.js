// 加载 Polyfills
require('./polyfills');

const { handle } = require('hono/vercel');
const app = require('./app');

// 使用 Hono 的 Vercel 适配器
module.exports = handle(app);
