# FreeCloud 系统架构详解

## 🏗️ 整体架构设计

### 系统架构图

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    用户层                                │
                    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
                    │  │ 续费客户端   │  │ 管理后台     │  │ GitHub用户   │     │
                    │  │ (fcrenew.js)│  │ (Web界面)   │  │ (Star验证)  │     │
                    │  └─────────────┘  └─────────────┘  └─────────────┘     │
                    └─────────────────────────────────────────────────────────┘
                                    │              │              │
                                    ▼              ▼              ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │                  接入层 (CDN)                           │
                    │              Cloudflare Edge Network                   │
                    └─────────────────────────────────────────────────────────┘
                                    │              │              │
                                    ▼              ▼              ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │                   应用层                                │
                    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
                    │  │  WorkerA     │  │  WorkerB     │  │ GitHub API  │     │
                    │  │  (URL1)     │  │  (管理系统)  │  │  (Star检查) │     │
                    │  │ 请求转发验证  │  │ 用户权限管理  │  │             │     │
                    │  └─────────────┘  └─────────────┘  └─────────────┘     │
                    └─────────────────────────────────────────────────────────┘
                                    │              │
                                    ▼              ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │                   数据层                                │
                    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
                    │  │ D1 Database │  │ KV Storage  │  │ 日志存储     │     │
                    │  │ 用户数据     │  │ 配置缓存     │  │ 操作记录     │     │
                    │  └─────────────┘  └─────────────┘  └─────────────┘     │
                    └─────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │                  处理层                                 │
                    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
                    │  │   URL2-1    │  │   URL2-2    │  │   URL2-N    │     │
                    │  │ 续费处理服务  │  │ 续费处理服务  │  │ 续费处理服务  │     │
                    │  │ [核心算法]   │  │ [核心算法]   │  │ [核心算法]   │     │
                    │  └─────────────┘  └─────────────┘  └─────────────┘     │
                    └─────────────────────────────────────────────────────────┘
```

## 🔧 核心组件详解

### 1. WorkerA (URL1) - 请求转发层

**主要职责**:
- 接收客户端请求
- API Key 验证
- 版本控制检查
- 请求转发和负载均衡
- 安全控制

**技术实现**:
```javascript
// API Key 验证流程
async function validateApiKey(apiKey, db) {
  const key = await db.first('SELECT * FROM keys WHERE key_id = ? AND status = "active"', [apiKey]);
  
  if (!key) {
    return { valid: false, error: 'API Key 不存在或已被禁用，请重新star项目仓库' };
  }
  
  // 检查使用次数限制
  if (key.max_uses > 0 && key.used_count >= key.max_uses) {
    return { valid: false, error: 'API Key 使用次数已达上限' };
  }
  
  // 检查过期时间
  if (key.expiry_time && new Date(key.expiry_time) < new Date()) {
    return { valid: false, error: 'API Key 已过期' };
  }
  
  return { valid: true, key };
}
```

**负载均衡策略**:
```javascript
// URL2 服务选择算法
function selectURL2Service(services) {
  // 轮询算法
  const index = Math.floor(Math.random() * services.length);
  return services[index];
}
```

### 2. WorkerB - 管理系统

**数据库设计**:
```sql
-- 用户API Key表
CREATE TABLE keys (
    key_id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'active',
    max_accounts INTEGER DEFAULT 1,
    max_uses INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    github_username TEXT,
    is_starred INTEGER DEFAULT 0,
    user_type TEXT DEFAULT 'free',
    project TEXT DEFAULT 'freecloud',
    created_time TEXT,
    updated_time TEXT,
    expiry_time TEXT,
    last_used_date TEXT
);

-- 使用日志表
CREATE TABLE usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id TEXT,
    timestamp TEXT,
    results TEXT,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0
);

-- 系统配置表
CREATE TABLE system_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT
);
```

**权限管理系统**:
```javascript
// 用户权限分级
const USER_TYPES = {
  free: { maxAccounts: 1, dailyLimit: 10 },
  starred: { maxAccounts: 5, dailyLimit: 50 },
  paid: { maxAccounts: 10, dailyLimit: 100 }
};

// GitHub Star 状态检查
async function checkStarStatus(username, githubToken) {
  const response = await fetch(`https://api.github.com/repos/mqiancheng/freecloud/stargazers`, {
    headers: { 'Authorization': `token ${githubToken}` }
  });
  
  const stargazers = await response.json();
  return stargazers.some(user => user.login.toLowerCase() === username.toLowerCase());
}
```

### 3. 前端管理界面

**技术栈**:
- 原生JavaScript (无框架依赖)
- 响应式CSS设计
- 实时数据更新
- 模态框交互

**核心功能模块**:
```javascript
// 主要功能模块
const modules = {
  dashboard: '仪表板 - 系统概览和统计',
  keyManagement: '卡密管理 - CRUD操作',
  userLogs: '使用日志 - 操作记录查看',
  starManagement: 'Star管理 - GitHub集成',
  systemConfig: '系统配置 - 参数设置'
};
```

## 🔄 数据流程图

### 续费请求流程

```
客户端发起续费请求
        │
        ▼
   API Key验证
        │
        ▼
    版本检查
        │
        ▼
   权限验证
        │
        ▼
  选择URL2服务
        │
        ▼
   转发请求
        │
        ▼
  [核心处理逻辑]
        │
        ▼
   返回结果
        │
        ▼
   记录日志
        │
        ▼
  更新统计数据
```

### Star状态同步流程

```
定时任务触发
        │
        ▼
获取GitHub Star列表
        │
        ▼
对比数据库用户状态
        │
        ▼
批量更新用户权限
        │
        ▼
发送状态变更通知
        │
        ▼
记录操作日志
```

## 🛡️ 安全设计

### 1. 多层验证机制

**第一层 - 客户端验证**:
- API Key 格式检查
- 版本兼容性验证
- 基础参数校验

**第二层 - 服务端验证**:
- API Key 有效性检查
- 使用次数和频率限制
- 权限级别验证

**第三层 - 业务验证**:
- 账号信息格式验证
- 重复请求检测
- 异常行为监控

### 2. 数据保护措施

**传输安全**:
- 全程HTTPS加密
- 敏感数据不记录日志
- 请求参数混淆

**存储安全**:
- 不存储用户密码
- API Key 哈希存储
- 定期数据清理

## 📊 监控和运维

### 1. 系统监控指标

**性能指标**:
- 请求响应时间
- 成功率统计
- 错误类型分布
- 并发用户数

**业务指标**:
- 日活跃用户数
- 续费成功率
- 用户权限分布
- Star状态变化

### 2. 日志系统设计

**日志分类**:
```javascript
const LOG_TYPES = {
  ACCESS: '访问日志',
  ERROR: '错误日志', 
  BUSINESS: '业务日志',
  SECURITY: '安全日志'
};
```

**日志格式**:
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "type": "BUSINESS",
  "keyId": "abc123",
  "action": "renew",
  "result": "success",
  "details": {...}
}
```

## 🚀 部署架构

### 1. Cloudflare Workers 配置

**Worker 配置**:
```toml
# wrangler.toml
name = "freecloud-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
vars = { ENVIRONMENT = "production" }

[[env.production.d1_databases]]
binding = "DB"
database_name = "freecloud-db"
database_id = "your-database-id"
```

### 2. 环境变量配置

**必需的环境变量**:
```bash
GITHUB_TOKEN=your_github_token
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password
ENCRYPTION_KEY=your_encryption_key
```

## 💡 技术亮点

### 1. 无服务器架构优势
- 自动扩缩容
- 全球边缘部署
- 零运维成本
- 高可用性保证

### 2. 分布式设计模式
- 微服务架构
- 负载均衡
- 故障隔离
- 数据一致性

### 3. 现代化开发实践
- 代码模块化
- 配置外部化
- 日志标准化
- 监控可观测

---

> 📝 **说明**: 本文档展示了完整的系统架构设计思路，核心处理算法部分因技术保护原因未公开，但整体架构和设计模式具有很好的学习参考价值。
