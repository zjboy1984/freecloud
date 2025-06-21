# 🌐 FreeCloud 自动续费系统

> 📋 **项目状态说明**

## 🔀 分支说明

本项目包含两个主要分支：

### 📚 main 分支（当前）- 技术分享版
- **用途**：技术学习和研究
- **状态**：服务已停止，转为技术分享
- **内容**：完整的系统架构文档、代码分享说明
- **适合**：开发者学习分布式系统设计

### 🚀 service 分支 - 服务版本
- **用途**：继续提供续费服务
- **状态**：正常运行中
- **内容**：可用的续费脚本和使用说明
- **适合**：需要续费服务的用户

## 🎯 快速导航

### 想继续使用服务？
👉 **切换到 [service 分支](../../tree/service)**

```bash
git checkout service
```

### 想学习技术实现？
👉 **继续阅读本分支的技术文档**

---

## 📢 技术分享说明

**本分支（main）专注于技术分享：**
- ✅ 完整的系统架构设计
- ✅ 分布式系统实现思路
- ✅ Cloudflare Workers 开发实践
- ✅ 用户权限管理系统设计
- ❌ 不包含可运行的服务代码

## 🎯 技术分享价值

虽然服务已停止，但本项目在技术上具有很高的学习价值：

**系统架构设计：**
- 分布式微服务架构
- 负载均衡和故障转移
- 用户权限管理系统
- 数据统计和监控

**Cloudflare Workers 实践：**
- Serverless 应用开发
- D1 数据库使用
- 边缘计算优化
- 全球CDN部署

## 🏗️ 系统架构概览

### 整体架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端客户端     │───▶│   WorkerA (URL1) │───▶│   WorkerB (管理) │
│   (fcrenew.js)  │    │   请求转发/验证   │    │   API Key管理   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   URL2 服务群   │
                       │   (实际处理)    │
                       └─────────────────┘
```

### 核心技术特点

#### 1. **分布式架构**
- 微服务设计，职责分离
- 负载均衡和故障转移
- 水平扩展能力

#### 2. **用户权限系统**
- API Key 认证机制
- 多级权限管理 (免费/Star/付费)
- GitHub Star 状态自动同步

#### 3. **数据管理**
- Cloudflare D1 数据库
- 完整的CRUD操作
- 数据统计和分析

#### 4. **管理后台**
- 用户友好的Web界面
- 实时数据监控
- 日志查看和管理

## 📁 开源代码结构

### 已公开部分
```
freecloud/                  # 前端客户端
├── fcrenew.js             # 续费脚本 (已公开)
└── README.md              # 项目说明

shared-code/               # 即将公开的代码
├── management-system/     # 完整的管理系统
├── database/             # 数据库设计和操作
├── worker-a/             # 请求处理逻辑 (部分)
└── deployment/           # 部署配置和文档
```

### 技术保护部分
```
private-algorithms/        # 不公开的核心算法
├── captcha-solver/       # 验证码识别处理
├── math-solver/          # 数学验证算法
├── cf-bypass/            # CF挑战绕过方法
└── target-apis/          # 具体接口调用逻辑
-- 主要数据表结构
CREATE TABLE keys (
    key_id TEXT PRIMARY KEY,        -- API密钥
    status TEXT,                    -- 状态(active/disabled)
    max_accounts INTEGER,           -- 最大账号数限制
    used_count INTEGER,             -- 使用次数
    github_username TEXT,           -- GitHub用户名(可选)
    created_time TEXT,              -- 创建时间
    -- 注意：没有任何字段存储用户密码
);

CREATE TABLE usage_logs (
    id INTEGER PRIMARY KEY,
    key_id TEXT,                    -- 关联的API Key
    timestamp TEXT,                 -- 使用时间
    results TEXT,                   -- 处理结果(JSON格式)
    -- 注意：results只包含处理状态，不包含密码
);
```

## 🔍 代码安全审查

### 关键安全点分析

#### 1. **API Key验证逻辑**
```javascript
// 位置：workerA/cf_worker_gemini_v2-调试版不要修改.js
async validateApiKey(apiKey, db) {
  // 只查询API Key的状态和限制信息
  const key = await db.first('SELECT * FROM keys WHERE key_id = ? AND status = "active"', [apiKey]);

  if (!key) {
    return { valid: false, error: 'API Key 不存在或已被禁用' };
  }

  // 验证使用限制，不涉及用户密码
  // ... 其他验证逻辑
}
```

#### 2. **请求转发机制**
```javascript
// 核心转发逻辑 - 透明代理
async function proxyRequest(originalRequest, targetUrl) {
  // 1. 复制原始请求的所有信息
  const newRequest = new Request(targetUrl, {
    method: originalRequest.method,
    headers: originalRequest.headers,  // 保持用户原始认证信息
    body: originalRequest.body         // 透明转发请求体
  });

  // 2. 直接转发，不解析或修改用户数据
  const response = await fetch(newRequest);

  // 3. 返回原始响应，不进行内容修改
  return response;
}
```

#### 3. **日志记录范围**
```javascript
// 只记录元数据，不记录敏感信息
const logData = {
  keyId: apiKey,                    // API Key标识
  timestamp: new Date().toISOString(), // 时间戳
  results: JSON.stringify([{        // 处理结果
    username: "处理成功的账号名",     // 只记录账号名，不记录密码
    type: "服务类型",
    status: "success"               // 处理状态
  }])
};
```

## 🛡️ 隐私保护措施

### 1. **数据最小化原则**
- 只收集服务运行必需的最少数据
- 不存储用户密码、邮箱等敏感信息
- 定期清理历史日志数据

### 2. **透明化设计**
- 所有代码开源，可公开审查
- 数据库结构公开，无隐藏字段
- 处理逻辑清晰，无混淆代码

### 3. **技术限制**
- 使用Cloudflare Workers无状态架构
- 无法持久化存储大量用户数据
- 请求处理时间限制，无法进行复杂的数据挖掘

## 🔧 技术实现细节

### 请求处理流程

1. **接收请求**
   ```javascript
   // 用户发送API请求到Worker

## 📚 技术文档

### 详细文档
- 📖 [技术架构详解](ARCHITECTURE_GUIDE.md)
- 🔧 [代码分享说明](SHARED_CODE_GUIDE.md)
- 🚀 [技术分享文档](TECHNICAL_SHARING.md)
- 🚀 [部署指南](DEPLOYMENT_GUIDE.md)

### 学习资源
- **系统架构设计**：分布式微服务架构实践
- **Cloudflare Workers**：Serverless应用开发
- **用户权限系统**：完整的认证授权机制
- **数据库设计**：D1数据库使用和优化
- **前端开发**：原生JavaScript应用构建

## ⚠️ 重要声明

### 服务终止
- **停止时间**：2024年6月21日
- **原因**：避免安全性争议，专注技术分享
- **影响**：所有API Key失效，服务不再可用
- **后续**：转为开源技术分享项目

### 技术分享承诺
- ✅ 公开完整的系统架构设计
- ✅ 分享用户管理和权限系统
- ✅ 提供数据库设计和API文档
- ✅ 开源前端管理界面代码
- ❌ 不公开核心算法和绕过技术

### 使用限制
- 📚 **仅供学习研究**：代码仅用于技术学习
- 🚫 **禁止商业使用**：不得用于商业目的
- 🔒 **技术保护**：核心算法保持私有
- ⚖️ **法律合规**：使用需遵守相关法律

## 🤝 技术交流

### 欢迎讨论
- 💬 系统架构设计思路
- 🔧 Cloudflare Workers开发经验
- 📊 数据库设计和优化
- 🎨 前端技术实现

### 贡献方式
- 📝 完善技术文档
- 🐛 报告代码问题
- 💡 提出改进建议
- 🔍 代码审查和优化

## 📄 许可证

MIT License - 仅限学习和研究用途

## 🙏 致谢

感谢所有使用过本服务的用户，以及为项目发展提供建议的开发者们。虽然服务已停止，但希望这些技术分享能对大家的学习和工作有所帮助。

特别感谢：
- 🌟 所有Star过项目的用户
- 💬 提供反馈和建议的用户
- 🔧 参与技术讨论的开发者
- 🏢 Cloudflare提供的优秀平台

---

> 💡 **技术传承**：虽然服务结束了，但技术的价值在于分享和传承。希望这个项目能为云原生应用开发和分布式系统设计提供一些参考价值。
   const request = await fetch(workerUrl, userRequest);
   ```

2. **身份验证**
   ```javascript
   // 验证API Key有效性（不涉及用户密码）
   const validation = await validateApiKey(apiKey);
   ```

3. **请求转发**
   ```javascript
   // 透明转发到目标服务
   const response = await fetch(targetApi, {
     method: request.method,
     headers: request.headers,  // 保持用户原始认证
     body: request.body
   });
   ```

4. **响应返回**
   ```javascript
   // 直接返回目标服务的响应
   return new Response(response.body, {
     status: response.status,
     headers: response.headers
   });
   ```

### 关键安全特性

#### 1. **无密码接触设计**
- Worker只处理API Key验证
- 用户的账号密码直接发送给目标服务
- 代理层不解析或存储认证信息

#### 2. **请求透明转发**
- 保持HTTP请求的完整性
- 不修改用户的认证头信息
- 不缓存用户的请求内容

#### 3. **最小权限原则**
- Worker只有转发请求的权限
- 数据库只存储必要的元数据
- 无权访问用户的原始密码

## 📊 可验证的安全证据

### 1. **代码审查邀请**
- 欢迎任何技术专家审查源代码
- 所有核心逻辑都在开源仓库中
- 可以通过GitHub Issues提出安全问题

### 2. **数据库查询示例**
```sql
-- 查看所有存储的数据类型
SELECT name FROM sqlite_master WHERE type='table';

-- 查看keys表结构（无密码字段）
PRAGMA table_info(keys);

-- 查看实际存储的数据示例
SELECT key_id, status, github_username, created_time FROM keys LIMIT 5;
```

### 3. **网络流量分析**
- 可以通过浏览器开发者工具查看网络请求
- Worker的响应头中无用户敏感信息
- 请求转发过程完全透明

## ❓ 常见安全疑问解答

### Q: 为什么需要API Key？
**A:** API Key用于：
- 防止服务被滥用
- 统计使用情况
- 实现访问控制
- 不用于获取用户密码

### Q: 服务器会记录我的密码吗？
**A:** 绝对不会，因为：
- 代码中没有解析密码的逻辑
- 数据库表结构中无密码字段
- 请求透明转发，不经过解析

### Q: 如何确保代码没有后门？
**A:** 通过以下方式验证：
- 完整的开源代码审查
- 简洁的架构设计
- 可验证的数据库结构
- 社区监督和反馈

### Q: 为什么要信任这个服务？
**A:** 基于以下技术事实：
- 开源透明，代码可审查
- 技术架构简单，无复杂隐藏逻辑
- 使用成熟的Cloudflare基础设施
- 遵循最佳安全实践

## 🤝 社区参与

### 安全审查
- 欢迎提交安全相关的Issue
- 接受代码审查和改进建议
- 定期更新安全文档

### 透明度承诺
- 所有重要更新都会公开说明
- 安全相关的修改会特别标注
- 接受社区监督和质疑

## 📞 联系方式

如果您对项目的安全性有任何疑问或建议，欢迎通过以下方式联系：

- GitHub Issues: [项目Issues页面]
- 技术讨论: 欢迎在代码仓库中提出技术问题
- 安全报告: 如发现安全问题，请及时报告

---

**最后声明：本项目致力于提供安全、透明、可信的服务。我们欢迎任何形式的技术审查和安全质疑，并承诺持续改进项目的安全性和透明度。**

