// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // 默认错误
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = errorHandler;

