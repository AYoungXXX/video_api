// 模拟数据存储（实际项目中应使用数据库）
let users = [
  {
    id: 1,
    name: '张三',
    email: 'zhangsan@example.com',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: '李四',
    email: 'lisi@example.com',
    createdAt: new Date().toISOString()
  }
];

// 获取所有用户
const getUsers = (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length,
        totalPages: Math.ceil(users.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 根据 ID 获取用户
const getUserById = (req, res) => {
  try {
    const { id } = req.params;
    const user = users.find(u => u.id === parseInt(id));

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 创建用户
const createUser = (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // 检查邮箱是否已存在
    if (users.find(u => u.email === email)) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      name,
      email,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    res.status(201).json({
      success: true,
      data: newUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 更新用户
const updateUser = (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const userIndex = users.findIndex(u => u.id === parseInt(id));

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // 如果更新邮箱，检查是否已存在
    if (email && email !== users[userIndex].email) {
      if (users.find(u => u.email === email)) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    users[userIndex] = {
      ...users[userIndex],
      ...(name && { name }),
      ...(email && { email }),
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: users[userIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 删除用户
const deleteUser = (req, res) => {
  try {
    const { id } = req.params;
    const userIndex = users.findIndex(u => u.id === parseInt(id));

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    users.splice(userIndex, 1);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};

