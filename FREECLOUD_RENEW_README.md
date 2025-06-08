# FreeCloud 自动续期系统

🚀 **基于 GitHub Actions 的 FreeCloud 自动续期解决方案**

## 📋 功能特性

- ✅ **自动续期** - 每2天自动执行续期任务
- ✅ **多账号支持** - 支持批量处理多个 FreeCloud 账号
- ✅ **智能重试** - 多个 Worker URL 轮转，确保高可用性
- ✅ **Telegram 通知** - 实时推送续期结果到 Telegram
- ✅ **详细日志** - 完整的执行日志和错误信息
- ✅ **手动触发** - 支持手动执行续期任务

## 🔧 部署步骤

### 1. Fork 或创建仓库

将此仓库 Fork 到你的 GitHub 账号，或创建新仓库并复制文件。

### 2. 配置环境变量

在 GitHub 仓库中配置以下环境变量：

**Settings → Secrets and variables → Actions**

#### 必需配置

| 变量名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `FREECLOUD_ACCOUNTS` | Secret | FreeCloud 账号列表 (JSON格式) | 见下方示例 |
| `FREECLOUD_API_KEY` | Secret | API 访问密钥 | `A1B2C3D4E5F6` |

#### 可选配置 (Telegram 通知)

| 变量名 | 类型 | 说明 |
|--------|------|------|
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram Bot Token |
| `TELEGRAM_CHAT_ID` | Secret | Telegram Chat ID |

### 3. 账号配置格式

`FREECLOUD_ACCOUNTS` 应该是一个 JSON 数组：

```json
[
  {
    "port": "1000",
    "username": "your_username1",
    "password": "your_password1"
  },
  {
    "port": "1222",
    "username": "your_username2",
    "password": "your_password2"
  }
]
```

### 4. 启用 GitHub Actions

1. 进入仓库的 **Actions** 标签页
2. 如果是第一次使用，点击 **"I understand my workflows, go ahead and enable them"**
3. 找到 **"FreeCloud 自动续期"** 工作流
4. 点击 **"Enable workflow"**

## 🚀 使用方法

### 自动执行

工作流会每2天自动执行一次（北京时间每天 08:00）。

### 手动执行

1. 进入 **Actions** 标签页
2. 选择 **"FreeCloud 自动续期"** 工作流
3. 点击 **"Run workflow"**
4. 选择分支并点击 **"Run workflow"**

## 📊 执行结果

### 成功示例

```
🚀 开始执行 FreeCloud 自动续期
📋 读取到 2 个账号
🔗 尝试调用 Worker: https://webkeepalive-server.qldyf.workers.dev
✅ Worker 调用成功
📊 处理结果: 总计2个账号, 登录成功2个, 续期成功2个, 失败0个
✅ Telegram 消息已发送
🎉 所有账号处理完成
```

### Telegram 通知示例

```
🌤 FreeCloud 续期状态报告

📊 本次处理: 2个账号
✅ 登录成功: 2个  💰 续期成功: 2个  ❌ 失败: 0个

📋 详细结果:
✅ 账号1 `user1` 登录成功
💰 账号1 `user1` 续期成功: 续期成功

✅ 账号2 `user2` 登录成功  
💰 账号2 `user2` 续期成功: 续期成功

⏰ 执行时间: 2024/1/15 08:00:00
```

## 🔍 故障排除

### 常见问题

1. **环境变量配置错误**
   - 检查 `FREECLOUD_ACCOUNTS` 是否为有效 JSON 格式
   - 确认 `FREECLOUD_API_KEY` 是否正确

2. **Worker 调用失败**
   - 检查网络连接
   - 验证 API Key 是否有效
   - 查看 Actions 日志获取详细错误信息

3. **账号处理失败**
   - 检查账号密码是否正确
   - 确认端口号是否存在
   - 查看详细错误信息

### 查看日志

1. 进入 **Actions** 标签页
2. 选择对应的执行记录
3. 点击 **"renew"** 查看详细日志
4. 下载 **"freecloud-renew-logs"** 获取完整日志

## 🔒 安全说明

- ✅ 所有敏感信息都存储在 GitHub Secrets 中
- ✅ 代码经过混淆处理，增强安全性
- ✅ 支持私有仓库部署
- ⚠️ 请勿在公开场所泄露 API Key 和账号信息

## 📞 技术支持

如果遇到问题，请：

1. 查看 Actions 执行日志
2. 检查环境变量配置
3. 确认账号信息正确性
4. 提供详细的错误信息

---

**注意：** 请妥善保管你的 API Key 和账号信息，不要在公开场所泄露。
