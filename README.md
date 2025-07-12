# FreeCloud 多站点自动续期系统（禁止滥用）

🚀 **基于 GitHub Actions 的多站点自动续期解决方案**

🚀 项目地址：[github.com/mqiancheng/freecloud](https://github.com/mqiancheng/freecloud)

---

## ⚠️ 🔴 重要安全警告 🔴 ⚠️

> **🚨 隐私风险提示：本项目服务调用本人部署的API，会收集用户密码等敏感信息！**
>
> **🔒 如果您介意隐私安全问题，请勿使用本项目！**
>
> **💡 建议：如有技术能力，请自行部署API服务以确保数据安全。**
>
> **免责声明：本项目仅用于技术学习和自动化研究，使用本工具可能存在账号被官方封禁的风险。**

📚 **想了解技术实现？查看技术文档和系统架构：[tech-sharing 分支](../../tree/tech-sharing)**

---

## 📋 功能特性

- ✅ **多站点支持** - 支持 freecloud.ltd 和 nat.freecloud.ltd 两个站点
- ✅ **自动续期** - 每天早上8点后随机15分钟内自动执行续期任务
- ✅ **多账号支持** - 支持批量处理多个账号
- ✅ **Telegram 通知** - 实时推送续期结果到 Telegram
- ✅ **详细日志** - 完整的执行日志和错误信息
- ✅ **手动触发** - 支持手动执行续期任务
- ✅ **统一配置** - 所有站点使用相同的配置格式

## 🔧 部署步骤

### 1. Fork 或创建仓库

加⭐收藏本项目，然后将此仓库 Fork 到你的 GitHub 账号。

### 2. 配置环境变量

在 GitHub 仓库中配置以下环境变量：

**方式1：直接跳转** 👉 [点击进入Secrets配置页面](../../settings/secrets/actions) → 点击 **"New repository secret"** 按钮

**方式2：手动导航**：Settings → Secrets and variables → Actions → New repository secret

#### 可选配置 (Telegram 通知)

| 变量名 | 类型 | 说明 |
|--------|------|------|
| `TELEGRAM_BOT_TOKEN` | Secret | Telegram Bot Token |
| `TELEGRAM_CHAT_ID` | Secret | Telegram Chat ID |

#### 必需配置

| 变量名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `FREECLOUD_ACCOUNTS` | Secret | FreeCloud 账号 (JSON格式) | 见下方示例 |
| `FREECLOUD_API_KEY` | Secret | API Key | 见下方获取方法 |

#### 🔑 API Key 获取方法

**方式一：自助获取（推荐）**
1. 访问 [fc.whoer.pp.ua](https://fc.whoer.pp.ua)
2. 输入您的 GitHub 用户名
3. 系统会自动验证您的 Star 状态并生成相应权限的 API Key

**权限说明：**
- 🆓 **未Star用户**：1个账号，每日1次
- ⭐ **Star用户**：5个账号，每日1次（给[本项目](https://github.com/mqiancheng/freecloud)加Star即可获得）
- 💎 **付费用户**：无限制账号和次数
   

#### 📋 FreeCloud 账号配置示例

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
    "password": "ABDFSW21FA33v",
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

#### 🔧 FreeCloud 账号配置说明

| 字段 | freecloud站点 | nat.freecloud站点 | 说明 |
|------|-------------|-----------------|------|
| type | "freecloud" | "nat.freecloud" | 固定填写 |
| username | 注册时的邮箱/用户名 | 注册时的邮箱 | |
| password | 账号登陆密码 | 账号登陆密码 | |
| port | 端口号 | 用户ID | 见下方获取方法 |


**freecloud.ltd如何获取 port 值：**
1. 登录 [https://freecloud.ltd/server/lxc](https://freecloud.ltd/server/lxc)
2. 查看服务器地区前面显示的编号，格式为 `#1234`
3. 其中 `1234` 即为该账号的 port 值

**nat.freecloud.ltd 如何获取 port 值：**
1. 登录 [https://nat.freecloud.ltd/clientarea](https://nat.freecloud.ltd/clientarea)
2. 用户名旁的ID即为该账号的 port 值

#### ⚠️ 重要注意事项

1. **字段含义说明**：
   - 对于 `freecloud` 类型：`username` 是用户名，`port` 是端口号
   - 对于 `nat.freecloud` 类型：`username` 是邮箱地址，`port` 是用户ID

2. **配置验证**：
   - 确保 JSON 格式正确，注意中括号，逗号和引号
   - 每个账号都必须包含 `type` 字段
   - 不同类型的账号可以混合配置

### 3. 启用 GitHub Actions

**注意：** 确保您在 main 分支上启用工作流！

1. 确保在 **main 分支**
2. 进入仓库的 [**Actions**](../../actions/workflows/freecloud-renew.yml) 标签页
3. 如果是第一次使用，点击 **"I understand my workflows, go ahead and enable them"**
4. 找到 **"FreeCloud 自动续期"** 工作流
5. 点击 **"Enable workflow"**

## 🚀 使用方法

### 自动执行

工作流会每天早上8点（北京时间）后随机15分钟内自动执行一次。（为了保证你的定时续期任务能成功执行，强烈建议大家随机修改这个定时时间，比如将 "0 2 * * *"，将2修改为0-16都可以）

💡 **修改定时时间**：👉 [点击编辑工作流文件](.github/workflows/freecloud-renew.yml) 修改第12行的cron表达式

### 手动执行

1. 确保您在 **main 分支** 上
2. 进入 [**Actions**](../../actions/workflows/freecloud-renew.yml) 标签页
3. 选择 **"FreeCloud 自动续期"** 工作流
4. 点击 **"Run workflow"**
5. 可选择是否 **"跳过延迟执行"**（默认勾选，立即执行）
6. 点击 **"Run workflow"** 开始执行

**说明**：
- ✅ **跳过延迟执行**（默认）：立即开始续期，无延迟
- ❌ **不跳过延迟执行**：也会有0-15分钟的随机延迟

## 📊 执行结果

### 成功示例

```
🚀 开始执行 FreeCloud 自动续期
📋 读取到 2 个账号
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

## 🔒 安全说明

- ✅ 所有敏感信息都存储在 GitHub Secrets 中
- ✅ 支持私有仓库部署
- ⚠️ 请勿在公开场所泄露 API Key 和账号信息

## 🤝 支持项目发展

### 💡 提供测试账号

由于测试续期服务器被封过账号，本人账号有限，**希望您能提供多余的测试账号**用于：

- 🔧 **功能测试** - 验证续期功能的稳定性
- 🐛 **问题排查** - 快速定位和修复bug
- ⚡ **性能优化** - 测试不同场景下的处理效果

**如何提供测试账号：**

1. 访问 [fc.whoer.pp.ua](https://fc.whoer.pp.ua) 获取API Key页面
2. 滚动到页面底部找到 **"💬 账号提供留言板"**
3. 选择项目类型（freecloud.ltd 或 nat.freecloud）
4. 填写账号用户名/邮箱和密码
5. 可选填写留言说明
6. 点击提交

**您的贡献将帮助：**
- ✅ 提升服务稳定性
- ✅ 减少续期失败率
- ✅ 优化用户体验
- ✅ 加快问题修复速度

> **隐私保护承诺**：提供的测试账号仅用于功能测试，不会用于其他用途。测试完成后会及时清理相关数据。

---

## 📞 技术支持

如果遇到问题，请：

1. 查看 Actions 执行日志
2. 检查环境变量配置
3. 确认账号信息正确性
4. 提供详细的错误信息

---

**注意：** 请妥善保管你的 API Key 和账号信息，不要在公开场所泄露。
