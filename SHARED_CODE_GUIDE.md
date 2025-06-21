# 代码分享说明

## 📁 开源代码结构

### 将要公开的代码部分

```
shared-code/
├── database/
│   ├── schema.sql              # 数据库表结构
│   ├── database-adapter.js     # 数据库操作封装
│   └── migrations/             # 数据库迁移脚本
├── management-system/
│   ├── api/
│   │   ├── auth.js            # 认证相关API
│   │   ├── keys.js            # API Key管理
│   │   ├── users.js           # 用户管理
│   │   ├── logs.js            # 日志管理
│   │   └── stats.js           # 统计分析
│   ├── frontend/
│   │   ├── index.html         # 管理界面
│   │   ├── app.js             # 前端逻辑
│   │   └── styles.css         # 样式文件
│   └── utils/
│       ├── github-api.js      # GitHub集成
│       ├── validation.js      # 数据验证
│       └── helpers.js         # 工具函数
├── worker-a/
│   ├── request-handler.js     # 请求处理 (部分公开)
│   ├── auth-validator.js      # 认证验证
│   ├── version-control.js     # 版本控制
│   └── load-balancer.js       # 负载均衡
├── deployment/
│   ├── wrangler.toml.example  # 部署配置示例
│   ├── env.example            # 环境变量示例
│   └── deploy-guide.md        # 部署指南
└── docs/
    ├── api-reference.md       # API文档
    ├── database-design.md     # 数据库设计
    └── security-guide.md      # 安全指南
```

### 不公开的核心算法部分

```
private-algorithms/
├── captcha-solver/            # 验证码识别算法
├── math-solver/               # 数学验证处理
├── cf-bypass/                 # CF挑战绕过
└── target-apis/               # 目标站点接口
```

## 🔧 数据库设计 (完整公开)

### 主要数据表

```sql
-- API Key管理表
CREATE TABLE IF NOT EXISTS keys (
    key_id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'active',
    max_accounts INTEGER DEFAULT 1,
    max_uses INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    github_username TEXT,
    is_starred INTEGER DEFAULT 0,
    user_type TEXT DEFAULT 'free',
    project TEXT DEFAULT 'freecloud',
    created_time TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_time TEXT DEFAULT CURRENT_TIMESTAMP,
    expiry_time TEXT,
    last_used_date TEXT
);

-- 使用日志表
CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id TEXT NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    results TEXT,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    FOREIGN KEY (key_id) REFERENCES keys(key_id)
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status);
CREATE INDEX IF NOT EXISTS idx_keys_github_username ON keys(github_username);
CREATE INDEX IF NOT EXISTS idx_usage_logs_key_id ON usage_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON usage_logs(timestamp);
```

## 🎯 API 设计 (完整公开)

### 认证相关

```javascript
// POST /api/login - 管理员登录
{
  "username": "admin",
  "password": "password"
}

// Response
{
  "success": true,
  "token": "jwt_token_here"
}
```

### API Key 管理

```javascript
// GET /api/keys - 获取API Key列表
// Query: page, limit, search

// POST /api/keys - 创建API Key
{
  "length": 32,
  "maxUses": 100,
  "expiryDays": 30,
  "project": "freecloud",
  "userType": "free"
}

// PUT /api/keys/:keyId - 更新API Key
{
  "status": "active",
  "maxAccounts": 5,
  "userType": "starred"
}

// DELETE /api/keys/:keyId - 删除API Key
```

### 用户管理

```javascript
// GET /api/stats - 获取系统统计
{
  "totalKeys": 100,
  "activeKeys": 80,
  "todayUsage": 500,
  "starredUsers": 20
}

// POST /api/admin/check-star-status - 检查Star状态
// Response
{
  "success": true,
  "summary": {
    "total": 100,
    "disabled": 5,
    "enabled": 3,
    "unchanged": 92
  }
}
```

### 日志管理

```javascript
// GET /api/logs - 获取使用日志
// Query: page, limit, search

// POST /api/admin/clean-logs - 清理日志
{
  "days": 30
}
```

## 🔐 认证系统 (完整公开)

### JWT Token 验证

```javascript
async function verifyAdmin(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: '缺少认证令牌' };
  }

  const token = authHeader.substring(7);
  
  try {
    // 验证JWT token (简化版本)
    const payload = await verifyJWT(token, env.JWT_SECRET);
    
    if (payload.username !== env.ADMIN_USERNAME) {
      return { valid: false, error: '无效的用户' };
    }
    
    return { valid: true, user: payload };
  } catch (error) {
    return { valid: false, error: '令牌验证失败' };
  }
}
```

### API Key 验证

```javascript
async function validateApiKey(apiKey, db) {
  try {
    const key = await db.first(
      'SELECT * FROM keys WHERE key_id = ? AND status = "active"', 
      [apiKey]
    );

    if (!key) {
      return { 
        valid: false, 
        error: 'API Key 不存在或已被禁用，请重新star项目仓库 https://github.com/mqiancheng/freecloud' 
      };
    }

    // 检查使用次数限制
    if (key.max_uses > 0 && key.used_count >= key.max_uses) {
      return { valid: false, error: 'API Key 使用次数已达上限' };
    }

    // 检查过期时间
    if (key.expiry_time && new Date(key.expiry_time) < new Date()) {
      return { valid: false, error: 'API Key 已过期' };
    }

    // 检查每日使用限制
    const today = new Date().toISOString().split('T')[0];
    const todayUsage = await getTodayUsage(db, apiKey);
    const dailyLimit = getUserDailyLimit(key.user_type);
    
    if (todayUsage >= dailyLimit) {
      return { valid: false, error: '今日使用次数已达上限' };
    }

    return { valid: true, key };
  } catch (error) {
    return { valid: false, error: '验证失败: ' + error.message };
  }
}
```

## 🌟 GitHub 集成 (完整公开)

### Star 状态检查

```javascript
async function checkAllUsersStarStatus(githubToken) {
  try {
    // 获取所有star用户
    const stargazersUrl = 'https://api.github.com/repos/mqiancheng/freecloud/stargazers';
    const response = await fetch(stargazersUrl, {
      headers: {
        'User-Agent': 'FCAlive-Admin',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${githubToken}`
      }
    });
    
    const allStarUsers = await response.json();
    const starUsernames = new Set(allStarUsers.map(u => u.login.toLowerCase()));
    
    // 获取数据库中的用户
    const allKeys = await db.prepare(`
      SELECT key_id, github_username, is_starred, status 
      FROM keys 
      WHERE github_username IS NOT NULL
    `).all();
    
    let updateCount = 0;
    
    // 批量更新状态
    for (const key of allKeys.results || []) {
      const username = key.github_username.toLowerCase();
      const shouldBeStarred = starUsernames.has(username);
      const currentlyStarred = key.is_starred === 1;
      
      if (currentlyStarred !== shouldBeStarred) {
        await updateUserStarStatus(key.key_id, shouldBeStarred);
        updateCount++;
      }
    }
    
    return {
      success: true,
      updated: updateCount,
      total: allKeys.results?.length || 0
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## 📊 统计分析 (完整公开)

### 数据统计函数

```javascript
async function getSystemStats(db) {
  try {
    // 总卡密数
    const totalKeys = await db.first('SELECT COUNT(*) as count FROM keys');
    
    // 活跃卡密数
    const activeKeys = await db.first('SELECT COUNT(*) as count FROM keys WHERE status = "active"');
    
    // 今日使用量
    const today = new Date().toISOString().split('T')[0];
    const todayUsage = await db.first(`
      SELECT COUNT(*) as count FROM usage_logs 
      WHERE DATE(timestamp) = ?
    `, [today]);
    
    // Star用户数
    const starredUsers = await db.first('SELECT COUNT(*) as count FROM keys WHERE is_starred = 1');
    
    return {
      totalKeys: totalKeys.count || 0,
      activeKeys: activeKeys.count || 0,
      todayUsage: todayUsage.count || 0,
      starredUsers: starredUsers.count || 0
    };
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return {
      totalKeys: 0,
      activeKeys: 0,
      todayUsage: 0,
      starredUsers: 0
    };
  }
}
```

## 🚀 部署配置 (完整公开)

### Wrangler 配置示例

```toml
name = "freecloud-management"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
vars = { 
  ENVIRONMENT = "production",
  API_BASE_URL = "https://your-domain.com"
}

[[env.production.d1_databases]]
binding = "DB"
database_name = "freecloud-db"
database_id = "your-database-id"

[env.production.vars]
ADMIN_USERNAME = "admin"
GITHUB_TOKEN = "your_github_token"
```

### 环境变量说明

```bash
# 必需的环境变量
ADMIN_USERNAME=admin                    # 管理员用户名
ADMIN_PASSWORD=your_secure_password     # 管理员密码
GITHUB_TOKEN=ghp_xxxxxxxxxxxx          # GitHub API Token
JWT_SECRET=your_jwt_secret              # JWT签名密钥

# 可选的环境变量
API_BASE_URL=https://your-domain.com    # API基础URL
LOG_LEVEL=info                          # 日志级别
RATE_LIMIT=100                          # 请求频率限制
```

---

> 📝 **说明**: 以上代码将完整公开，供学习和研究使用。核心的验证码处理、CF绕过等算法部分将保持私有。
