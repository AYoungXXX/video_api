// 模拟数据存储（实际项目中应使用数据库）
let videos = [
  {
    id: 1,
    title: '示例视频 1',
    description: '这是一个示例视频',
    url: 'https://example.com/video1.mp4',
    duration: 120,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: '示例视频 2',
    description: '这是另一个示例视频',
    url: 'https://example.com/video2.mp4',
    duration: 180,
    createdAt: new Date().toISOString()
  }
];

// 获取所有视频
const getVideos = (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    let filteredVideos = videos;

    // 搜索功能
    if (search) {
      filteredVideos = videos.filter(video =>
        video.title.toLowerCase().includes(search.toLowerCase()) ||
        video.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedVideos = filteredVideos.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedVideos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredVideos.length,
        totalPages: Math.ceil(filteredVideos.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 根据 ID 获取视频
const getVideoById = (req, res) => {
  try {
    const { id } = req.params;
    const video = videos.find(v => v.id === parseInt(id));

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    res.json({
      success: true,
      data: video
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 创建视频
const createVideo = (req, res) => {
  try {
    const { title, description, url, duration } = req.body;

    if (!title || !url) {
      return res.status(400).json({
        success: false,
        error: 'Title and URL are required'
      });
    }

    const newVideo = {
      id: videos.length > 0 ? Math.max(...videos.map(v => v.id)) + 1 : 1,
      title,
      description: description || '',
      url,
      duration: duration || 0,
      createdAt: new Date().toISOString()
    };

    videos.push(newVideo);

    res.status(201).json({
      success: true,
      data: newVideo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 更新视频
const updateVideo = (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, url, duration } = req.body;

    const videoIndex = videos.findIndex(v => v.id === parseInt(id));

    if (videoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    videos[videoIndex] = {
      ...videos[videoIndex],
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(url && { url }),
      ...(duration !== undefined && { duration }),
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: videos[videoIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 删除视频
const deleteVideo = (req, res) => {
  try {
    const { id } = req.params;
    const videoIndex = videos.findIndex(v => v.id === parseInt(id));

    if (videoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    videos.splice(videoIndex, 1);

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo
};

