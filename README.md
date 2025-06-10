# FreeCloud 多站点自动续期系统

🚀 **基于 GitHub Actions 的多站点自动续期解决方案**

## 📋 功能特性

- ✅ **多站点支持** - 支持 freecloud.ltd 和 nat.freecloud.ltd 两个站点
- ✅ **自动续期** - 每天早上8点后随机5分钟内自动执行续期任务
- ✅ **多账号支持** - 支持批量处理多个账号
- ✅ **智能重试** - 多个 Worker URL 轮转，确保高可用性
- ✅ **Telegram 通知** - 实时推送续期结果到 Telegram
- ✅ **详细日志** - 完整的执行日志和错误信息
- ✅ **手动触发** - 支持手动执行续期任务
- ✅ **统一配置** - 所有站点使用相同的配置格式

## 🔧 部署步骤

### 1. Fork 或创建仓库

加⭐收藏本项目，然后将此仓库 Fork 到你的 GitHub 账号。

### 2. 配置环境变量

在 GitHub 仓库中配置以下环境变量：

**Settings → Secrets and variables → Actions**

#### 必需配置

| 变量名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `FREECLOUD_ACCOUNTS` | Secret | FreeCloud 账号列表 (JSON格式) | 见下方示例 |
| `FREECLOUD_API_KEY` | Secret | 访问密钥使用`TEST123456789ABC` | `TEST123456789ABC` |

#### 可选配置 (Telegram 通知)

| 变量名 | 类型 | 说明 |
|--------|------|------|
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram Bot Token |
| `TELEGRAM_CHAT_ID` | Secret | Telegram Chat ID |


#### 🔧 站点类型说明

##### **freecloud.ltd 站点配置**

| 字段 | 说明 | 获取方法 |
|------|------|----------|
| `type` | 固定填写 `"freecloud"` | - |
| `username` | 用户名 | 注册时的邮箱/用户名 |
| `password` | 密码 | 注册时的密码 |
| `port` | 端口号 | 见下方获取方法 |

**freecloud.ltd如何获取 port 值：**
1. 登录 [https://freecloud.ltd/server/lxc](https://freecloud.ltd/server/lxc)
2. 查看服务器地区前面显示的编号，格式为 `#1234`
3. 其中 `1234` 即为该账号的 port 值

##### **nat.freecloud.ltd 站点配置**

| 字段 | 说明 | 获取方法 |
|------|------|----------|
| `type` | 固定填写 `"nat.freecloud"` | - |
| `username` | 邮箱地址（注意：这里填邮箱，不是用户名） | 注册时的邮箱 |
| `password` | 编码后的密码 | 见下方获取方法 |
| `port` | 用户UID | 见下方获取方法 |

**nat.freecloud.ltd 如何获取编码后的密码：**
1. 打开浏览器开发者工具（F12）
2. 登录 [https://nat.freecloud.ltd/login](https://nat.freecloud.ltd/login)
3. 在 Network 标签页中找到登录请求，名称为/login?action=email
4. 复制 负载 请求的参数中找到 `password` 值，类似 "ABDFSW21FA33vsq=="
5. 进入 [https://www.json.cm/urlencode/](https://www.json.cm/urlencode/)，将 
   编码后的密码粘贴到解码框中，点击Url编码即可得到编码后的 `password` 真实值


**nat.freecloud.ltd 如何获取 port 值：**
1. 登录 [https://nat.freecloud.ltd/clientarea](https://nat.freecloud.ltd/clientarea)
2. 用户名旁的ID即为该账号的 port 值

#### ⚠️ 重要注意事项

1. **字段含义说明**：
   - 对于 `freecloud` 类型：`username` 是用户名，`port` 是端口号
   - 对于 `nat.freecloud` 类型：`username` 是邮箱地址，`port` 是用户ID

2. **密码处理**：
   - `freecloud` 类型使用原始密码
   - `nat.freecloud` 类型必须使用编码后的密码

3. **配置验证**：
   - 确保 JSON 格式正确，注意逗号和引号
   - 每个账号都必须包含 `type` 字段
   - 不同类型的账号可以混合配置

#### 📋 完整配置示例

```json
[
  {
    "type": "freecloud",
    "username": "myuser1",
    "password": "mypassword1",
    "port": "1000"
  },
  {
    "type": "freecloud",
    "username": "myuser2",
    "password": "mypassword2",
    "port": "1222"
  },
  {
    "type": "nat.freecloud",
    "username": "myemail@gmail.com",
    "password": "ABDFSW21FA33vsq==",
    "port": "131"
  },
  {
    "type": "nat.freecloud",
    "username": "another@email.com",
    "password": "encoded_password_here",
    "port": "456"
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

工作流会每天早上8点（北京时间）后随机5分钟内自动执行一次。

### 手动执行

1. 进入 **Actions** 标签页
2. 选择 **"FreeCloud 自动续期"** 工作流
3. 点击 **"Run workflow"**
4. 可选择是否 **"跳过延迟执行"**（默认勾选，立即执行）
5. 选择分支并点击 **"Run workflow"**

**说明**：
- ✅ **跳过延迟执行**（默认）：立即开始续期，无延迟
- ❌ **不跳过延迟执行**：也会有0-5分钟的随机延迟

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
🌤 多站点续期状态报告

📊 本次处理: 3个账号
✅ 登录成功: 3个  💰 续期成功: 3个  ❌ 失败: 0个

📋 详细结果:
✅ 账号1 `user1` (freecloud) 登录成功
💰 账号1 `user1` (freecloud) 续期成功: 续期成功

✅ 账号2 `user@gmail.com` (nat.freecloud) 登录成功
💰 账号2 `user@gmail.com` (nat.freecloud) 续期成功: 今天你已经签到过了！

✅ 账号3 `user2` (freecloud) 登录成功
💰 账号3 `user2` (freecloud) 续期成功: 续期成功

⏰ 执行时间: 2025/6/15 08:00:00
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
   - **freecloud.ltd**: 检查用户名、密码和端口号是否正确
   - **nat.freecloud.ltd**: 检查邮箱地址、编码密码和UID是否正确
   - 查看详细错误信息和日志

4. **站点特定问题**
   - **freecloud.ltd**: 确认端口号在服务器列表中存在
   - **nat.freecloud.ltd**: 确认邮箱格式正确，密码已正确编码
   - 检查站点类型 `type` 字段是否正确填写


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
