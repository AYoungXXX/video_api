// 请求验证中间件

// 验证视频创建/更新请求
const validateVideo = (req, res, next) => {
  const { title, url } = req.body;

  if (req.method === 'POST' && (!title || !url)) {
    return res.status(400).json({
      success: false,
      error: 'Title and URL are required'
    });
  }

  if (url && !isValidUrl(url)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL format'
    });
  }

  next();
};

// 验证用户创建/更新请求
const validateUser = (req, res, next) => {
  const { name, email } = req.body;

  if (req.method === 'POST' && (!name || !email)) {
    return res.status(400).json({
      success: false,
      error: 'Name and email are required'
    });
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  next();
};

// URL 验证
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// 邮箱验证
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

module.exports = {
  validateVideo,
  validateUser
};

