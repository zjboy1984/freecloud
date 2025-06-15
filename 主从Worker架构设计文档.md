# 多站点Worker协同架构设计文档

## 📋 概述

为解决多站点续期中的卡密使用限制冲突和数据来源显示问题，采用Worker协同处理架构。

## 🎯 解决的问题

1. **卡密使用限制冲突** - 避免多个Worker重复检查和扣除使用次数
2. **数据来源显示混乱** - 统一为一条数据库记录
3. **每日使用限制冲突** - 避免多次扣除每日使用次数
4. **业务逻辑一致性** - 保证原子操作

## 🏗️ 架构设计

### 数据流向
```
GitHub Actions → fcrenew.js → 主处理器 →
├── 验证API Key和总账号限制
├── 处理freecloud账号
├── 调用辅助处理器处理nat账号
├── 合并所有结果
├── 记录使用情况（1条记录）
└── 返回完整结果给fcrenew.js
```

### 角色分工

#### 主处理器（URL1 - webkeepalive-server）
- ✅ 验证API Key
- ✅ 检查总账号数量限制（freecloud + nat）
- ✅ 检查使用次数和每日限制
- ✅ 处理freecloud.ltd账号
- ✅ 调用辅助处理器处理nat账号
- ✅ 合并所有处理结果
- ✅ 记录使用情况到数据库
- ✅ 返回完整结果

#### 辅助处理器（URL3 - webkeepalive-server3）
- ❌ 跳过API Key验证（由主处理器保证）
- ❌ 跳过使用限制检查
- ✅ 处理nat.freecloud.ltd账号
- ✅ 返回处理结果
- ❌ 不记录使用情况

## 🔧 技术实现

### fcrenew.js修改
```javascript
async function callWorkerWithRetry(accounts, apiKey) {
  const groups = groupAccountsByType(accounts);
  
  // 只调用主Worker，传递所有账号
  const allAccounts = {
    freecloud: groups.freecloud,
    natFreecloud: groups.natFreecloud
  };
  
  const result = await callSingleWorker(MASTER_WORKER_URL, allAccounts, apiKey);
  return result;
}
```

### 主Worker处理逻辑
```javascript
async function handleRequest(request, env) {
  // 1. 验证API Key和总账号限制
  const totalAccounts = freecloud.length + natFreecloud.length;
  const limitCheck = await checkAccountAndDailyLimit(apiKey, totalAccounts, db);
  
  // 2. 处理freecloud账号
  const freecloudResults = await processAccounts(freecloud, env);
  
  // 3. 调用从Worker处理nat账号
  const natResults = await callSlaveWorker(natFreecloud, apiKey, env);
  
  // 4. 合并结果并记录使用情况
  const allResults = [...freecloudResults, ...natResults];
  await recordUsage(apiKey, totalAccounts, allResults, db, request);
  
  return allResults;
}
```

### 从Worker处理逻辑
```javascript
async function handleRequest(request, env) {
  const isSlaveMode = request.headers.get('X-Slave-Mode') === 'true';

  if (isSlaveMode) {
    // 从模式：跳过所有验证，直接处理账号
    const results = await processAccounts(accounts, env);
    return { success: true, results };
  }
  // 正常模式逻辑...
}
```

## 📊 数据库记录

### 显示效果
- **记录数量**: 1条
- **数据来源**: `多站点-freecloud+nat`
- **处理账号数**: 总账号数（如：7个）
- **使用次数**: 按总账号数扣除（如：7次）
- **每日使用**: 只扣除1次

### 示例记录
```
时间: 2025/6/15 08:00:00
卡密: BRELP38Y4H6V
数据来源: 多站点-freecloud+nat
处理账号数: 7
成功/失败: 7登录成功，7续期成功，0失败
```

## 🔄 时序图

```
T1: fcrenew.js → 主Worker1
T2: 主Worker1验证API Key和限制
T3: 主Worker1处理freecloud账号
T4: 主Worker1 → 从Worker3
T5: 从Worker3处理nat账号
T6: 从Worker3 → 主Worker1（返回结果）
T7: 主Worker1合并结果并记录使用情况
T8: 主Worker1 → fcrenew.js（返回完整结果）
T9: fcrenew.js发送Telegram通知
```

## ⚠️ 错误处理

### 从Worker失败处理
```javascript
try {
  natResults = await callSlaveWorker(natFreecloud, apiKey, env);
} catch (error) {
  // 从Worker失败，为nat账号生成失败记录
  natResults = natFreecloud.map(account => ({
    username: account.username,
    type: account.type,
    loginSuccess: false,
    renewSuccess: false,
    error: `从Worker调用失败: ${error.message}`
  }));
}
```

## 🎯 配置要求

### 环境变量
- **主Worker**: 需要数据库连接变量（REMOTE_DB_*）
- **从Worker**: 需要GEMINI_API_KEY，不需要数据库变量
- **GitHub Actions**: 只需要API Key，不需要数据库变量

### URL配置
- **URL1**: 主Worker（webkeepalive-server）
- **URL2**: 弃用
- **URL3**: 从Worker（webkeepalive-server3）

## ✅ 优势

1. **业务逻辑正确** - 避免重复扣费
2. **数据显示统一** - 一条记录显示所有账号
3. **架构清晰** - 主从关系明确
4. **错误隔离** - 一个Worker失败不影响另一个
5. **符合约束** - 工作流不触及数据库

## 📝 实施步骤

1. ✅ 创建设计文档
2. 🔄 修改fcrenew.js工作流代码
3. 🔄 修改主Worker代码
4. 🔄 修改从Worker代码
5. 🔄 测试验证
6. 🔄 部署上线

---

*文档版本: v1.0*  
*创建时间: 2025-06-14*  
*最后更新: 2025-06-14*
