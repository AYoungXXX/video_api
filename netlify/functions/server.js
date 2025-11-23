/**
 * Netlify Serverless Function 入口文件
 * 将 Express 应用包装为 Netlify Function
 * 
 * 这个文件将 Express 应用转换为 Netlify 的 serverless function 格式
 * 所有 HTTP 请求都会被转发到这个函数处理
 */

const express = require('express');
const serverless = require('serverless-http');

// 导入 Express 应用
const app = require('../../app');

/**
 * 将 Express 应用包装为 Netlify serverless function
 * serverless-http 会自动处理 Netlify 的事件格式转换
 */
const handler = serverless(app, {
  // 配置选项
  binary: ['image/*', 'video/*', 'application/octet-stream'], // 支持二进制文件类型
});

/**
 * Netlify Function 导出
 * 处理所有 HTTP 请求（GET, POST, PUT, DELETE 等）
 * 
 * @param {Object} event - Netlify 事件对象，包含请求信息
 * @param {Object} context - Netlify 上下文对象
 * @returns {Promise} HTTP 响应
 */
exports.handler = async (event, context) => {
  // 设置 context.callbackWaitsForEmptyEventLoop = false
  // 这样可以确保函数在响应后立即返回，不会等待其他异步操作
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // 调用 serverless-http 包装的 handler
    const result = await handler(event, context);
    return result;
  } catch (error) {
    // 错误处理
    console.error('Netlify Function Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      })
    };
  }
};

