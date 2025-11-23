/**
 * Netlify Serverless Function 入口文件
 * 将 Hono 应用包装为 Netlify Function
 */

// ============================================
// 加载 Polyfills（必须在所有 require 之前）
// ============================================
// 仍然保留 polyfills，因为 parserController 中使用了 axios
require('../../polyfills');

const { handle } = require('hono/netlify');
const app = require('../../app');

/**
 * Hono 提供了针对 Netlify 的适配器
 * 它可以直接处理 Netlify 的事件
 */
exports.handler = handle(app);
