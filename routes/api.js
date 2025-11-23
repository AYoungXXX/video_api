const express = require('express');
const router = express.Router();

// 导入控制器
const videoController = require('../controllers/videoController');
const userController = require('../controllers/userController');
const parserController = require('../controllers/parserController');

// 视频相关路由
router.get('/videos', videoController.getVideos);
router.get('/videos/:id', videoController.getVideoById);
router.post('/videos', videoController.createVideo);
router.put('/videos/:id', videoController.updateVideo);
router.delete('/videos/:id', videoController.deleteVideo);

// 用户相关路由
router.get('/users', userController.getUsers);
router.get('/users/:id', userController.getUserById);
router.post('/users', userController.createUser);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

// 网页解析路由
router.get('/parse', parserController.parsePage);
router.get('/parse/detail', parserController.parseDetail);
router.get('/parse/categories', parserController.parseCategories);

// 示例数据路由
router.get('/data', (req, res) => {
  res.json({
    message: 'API data endpoint',
    data: {
      videos: '/api/videos',
      users: '/api/users',
      parse: '/api/parse?url=YOUR_URL',
      parseDetail: '/api/parse/detail?url=YOUR_URL',
      parseCategories: '/api/parse/categories?url=YOUR_URL'
    }
  });
});

module.exports = router;

