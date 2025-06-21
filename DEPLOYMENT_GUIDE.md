# 部署指南 - FreeCloud 管理系统

> 📝 本指南展示如何部署管理系统部分，核心处理算法不包含在内

## 🚀 快速开始

### 环境要求

- Cloudflare 账号
- GitHub 账号 (用于Star验证)
- Node.js 18+ (本地开发)
- Wrangler CLI

### 安装 Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

## 📁 项目结构

```
freecloud-management/
├── src/
│   ├── index.js              # Worker入口文件
│   ├── database.js           # 数据库操作
│   ├── auth.js              # 认证逻辑
│   ├── api/                 # API路由
│   │   ├── keys.js          # API Key管理
│   │   ├── users.js         # 用户管理
│   │   ├── logs.js          # 日志管理
│   │   └── stats.js         # 统计分析
│   └── frontend/            # 前端文件
│       ├── index.html       # 管理界面
│       ├── app.js          # 前端逻辑
│       └── styles.css      # 样式文件
├── database/
│   └── schema.sql          # 数据库结构
├── wrangler.toml           # 部署配置
├── package.json            # 依赖配置
└── README.md              # 说明文档
```

## 🗄️ 数据库设置

### 1. 创建 D1 数据库

```bash
wrangler d1 create freecloud-db
```

### 2. 执行数据库迁移

```bash
wrangler d1 execute freecloud-db --file=./database/schema.sql
```

### 3. 数据库结构

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
    last_used_date TEXT,
    daily_uses INTEGER DEFAULT 0
);

-- 使用日志表
CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id TEXT NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    results TEXT,
    account_count INTEGER DEFAULT 0,
    summary TEXT,
    FOREIGN KEY (key_id) REFERENCES keys(key_id)
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 版本控制表
CREATE TABLE IF NOT EXISTS version_control (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_code TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status);
CREATE INDEX IF NOT EXISTS idx_keys_github_username ON keys(github_username);
CREATE INDEX IF NOT EXISTS idx_usage_logs_key_id ON usage_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON usage_logs(timestamp);
```

## ⚙️ 配置文件

### wrangler.toml

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
database_id = "your-database-id-here"

# 开发环境配置
[env.development]
vars = { 
  ENVIRONMENT = "development",
  API_BASE_URL = "http://localhost:8787"
}

[[env.development.d1_databases]]
binding = "DB"
database_name = "freecloud-db"
database_id = "your-database-id-here"
```

### 环境变量设置

```bash
# 设置必需的环境变量
wrangler secret put ADMIN_USERNAME
wrangler secret put ADMIN_PASSWORD
wrangler secret put GITHUB_TOKEN
wrangler secret put JWT_SECRET
```

## 🔧 核心代码结构

### 主入口文件 (src/index.js)

```javascript
import { DatabaseAdapter } from './database.js';
import { AuthHandler } from './auth.js';
import { APIRouter } from './api/router.js';

export default {
  async fetch(request, env, ctx) {
    const db = new DatabaseAdapter(env.DB);
    const auth = new AuthHandler(env);
    const router = new APIRouter(db, auth, env);
    
    try {
      return await router.handle(request);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
```

### 数据库适配器 (src/database.js)

```javascript
export class DatabaseAdapter {
  constructor(db) {
    this.db = db;
  }

  // API Key 管理
  async createKey(keyData) {
    const stmt = this.db.prepare(`
      INSERT INTO keys (key_id, status, max_accounts, max_uses, github_username, user_type, project, created_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return await stmt.bind(
      keyData.key_id,
      keyData.status || 'active',
      keyData.max_accounts || 1,
      keyData.max_uses || 0,
      keyData.github_username,
      keyData.user_type || 'free',
      keyData.project || 'freecloud',
      new Date().toISOString()
    ).run();
  }

  async getKeys(page = 1, limit = 20, search = '') {
    let query = 'SELECT * FROM keys';
    let params = [];

    if (search) {
      query += ' WHERE key_id LIKE ? OR github_username LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_time DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...params).all();

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM keys';
    let countParams = [];

    if (search) {
      countQuery += ' WHERE key_id LIKE ? OR github_username LIKE ?';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countStmt = this.db.prepare(countQuery);
    const countResult = await countStmt.bind(...countParams).first();

    return {
      keys: result.results || [],
      total: countResult.total || 0,
      page,
      limit
    };
  }

  // 使用日志管理
  async addUsageLog(keyId, results, accountCount = 0) {
    const stmt = this.db.prepare(`
      INSERT INTO usage_logs (key_id, timestamp, results, account_count)
      VALUES (?, ?, ?, ?)
    `);
    
    return await stmt.bind(
      keyId,
      new Date().toISOString(),
      JSON.stringify(results),
      accountCount
    ).run();
  }

  async getUsageLogs(page = 1, limit = 20, search = '') {
    // 实现日志查询逻辑
    // ...
  }

  // 统计信息
  async getStats() {
    const totalKeys = await this.db.prepare('SELECT COUNT(*) as count FROM keys').first();
    const activeKeys = await this.db.prepare('SELECT COUNT(*) as count FROM keys WHERE status = "active"').first();
    
    return {
      totalKeys: totalKeys.count || 0,
      activeKeys: activeKeys.count || 0,
      // 更多统计...
    };
  }
}
```

### 认证处理 (src/auth.js)

```javascript
export class AuthHandler {
  constructor(env) {
    this.env = env;
  }

  async verifyAdmin(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: '缺少认证令牌' };
    }

    const token = authHeader.substring(7);
    
    try {
      // 简化的JWT验证
      const payload = this.decodeJWT(token);
      
      if (payload.username !== this.env.ADMIN_USERNAME) {
        return { valid: false, error: '无效的用户' };
      }
      
      return { valid: true, user: payload };
    } catch (error) {
      return { valid: false, error: '令牌验证失败' };
    }
  }

  async login(username, password) {
    if (username === this.env.ADMIN_USERNAME && password === this.env.ADMIN_PASSWORD) {
      const token = this.generateJWT({ username, exp: Date.now() + 24 * 60 * 60 * 1000 });
      return { success: true, token };
    }
    
    return { success: false, error: '用户名或密码错误' };
  }

  generateJWT(payload) {
    // 简化的JWT生成
    return btoa(JSON.stringify(payload));
  }

  decodeJWT(token) {
    // 简化的JWT解码
    return JSON.parse(atob(token));
  }
}
```

## 🌐 前端界面

### HTML 结构 (src/frontend/index.html)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FreeCloud 管理系统</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>🌐 FreeCloud 管理系统</h1>
            <nav>
                <button class="nav-btn active" data-tab="dashboard">仪表板</button>
                <button class="nav-btn" data-tab="keys">卡密管理</button>
                <button class="nav-btn" data-tab="logs">使用日志</button>
                <button class="nav-btn" data-tab="settings">系统设置</button>
            </nav>
        </header>

        <main>
            <div id="dashboard" class="tab-content active">
                <h2>📊 系统概览</h2>
                <div id="stats-container"></div>
            </div>

            <div id="keys" class="tab-content">
                <h2>🔑 API Key 管理</h2>
                <div class="toolbar">
                    <button onclick="showCreateKeyModal()">创建新Key</button>
                    <input type="text" id="search-keys" placeholder="搜索...">
                </div>
                <div id="keys-table"></div>
            </div>

            <div id="logs" class="tab-content">
                <h2>📋 使用日志</h2>
                <div id="logs-table"></div>
            </div>
        </main>
    </div>

    <script src="/app.js"></script>
</body>
</html>
```

## 🚀 部署步骤

### 1. 本地开发

```bash
# 克隆项目
git clone <your-repo>
cd freecloud-management

# 安装依赖
npm install

# 本地开发
wrangler dev
```

### 2. 生产部署

```bash
# 部署到生产环境
wrangler deploy --env production

# 设置自定义域名
wrangler route add "your-domain.com/*" your-worker-name
```

### 3. 验证部署

```bash
# 检查Worker状态
wrangler tail

# 测试API
curl https://your-domain.com/api/stats
```

## 🔒 安全配置

### 1. 环境变量安全

```bash
# 使用强密码
ADMIN_PASSWORD="your-very-secure-password"

# 生成随机JWT密钥
JWT_SECRET="your-random-jwt-secret-key"

# GitHub Token权限最小化
GITHUB_TOKEN="ghp_xxxxxxxxxxxx"  # 只需要public_repo权限
```

### 2. CORS 配置

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

## 📊 监控和维护

### 1. 日志监控

```bash
# 实时查看日志
wrangler tail --env production

# 过滤错误日志
wrangler tail --env production --format pretty | grep ERROR
```

### 2. 数据库维护

```bash
# 备份数据库
wrangler d1 export freecloud-db --output backup.sql

# 查看数据库状态
wrangler d1 info freecloud-db
```

### 3. 性能优化

- 定期清理旧日志
- 优化数据库查询
- 监控Worker使用量
- 设置合理的缓存策略

---

> 📝 **说明**: 本部署指南展示了管理系统的完整部署流程，但不包含核心的续费处理算法。适合用于学习Cloudflare Workers开发和分布式系统设计。
