import fetch from "node-fetch";

// 从环境变量读取配置
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const FREECLOUD_ACCOUNTS = process.env.FREECLOUD_ACCOUNTS;
const FREECLOUD_API_KEY = process.env.FREECLOUD_API_KEY;
const DELAY_SECONDS = process.env.DELAY_SECONDS;
const DELAY_TYPE = process.env.DELAY_TYPE;

// 验证必要的环境变量
if (!FREECLOUD_ACCOUNTS) {
  console.error("❌ 缺少环境变量 FREECLOUD_ACCOUNTS");
  process.exit(1);
}

if (!FREECLOUD_API_KEY) {
  console.error("❌ 缺少环境变量 FREECLOUD_API_KEY");
  process.exit(1);
}

// Worker URLs 配置 - 混淆存储
const _parts = {
  // 主处理器（URL1）
  primary: ['aHR0cHM6Ly93ZWJr', 'ZWVwYWxpdmUtc2Vy', 'dmVyLnFsZHlmLndv', 'cmtlcnMuZGV2'],
  // 辅助处理器（URL2）-
  secondary: ['aHR0cHM6Ly9mcmVl', 'Y2xvdWRuYXR0dWwu', 'd2hvZXIucHAudWEv']
};

// 重建URL
function _buildUrls() {
  return {
    primary: Buffer.from(_parts.primary.join(''), 'base64').toString(),
    secondary: Buffer.from(_parts.secondary.join(''), 'base64').toString()
  };
}

const WORKER_URLS = _buildUrls();

// 解析账号数据
let accounts = [];
try {
  accounts = JSON.parse(FREECLOUD_ACCOUNTS);
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error("账号列表为空或格式错误");
  }
} catch (error) {
  console.error("❌ 解析 FREECLOUD_ACCOUNTS 失败:", error.message);
  console.error("请确保 FREECLOUD_ACCOUNTS 是有效的 JSON 数组格式");
  process.exit(1);
}

console.log(`📋 读取到 ${accounts.length} 个账号`);
accounts.forEach((account, index) => {
  const portLabel = account.type === 'nat.freecloud' ? 'UID' : '端口';
  console.log(`账号 ${index + 1}: ${account.username} (${portLabel}: ${account.port}) [${account.type || 'freecloud'}]`);
});

/**
 * 向 Telegram 推送消息
 * @param {string} message - 要发送的文本消息
 */
async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("⚠️ 未配置 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID，无法推送消息");
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "Markdown"
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    if (!response.ok) {
      console.warn(`⚠️ Telegram 消息推送失败: ${text}`);
    } else {
      console.log("✅ Telegram 消息已发送");
    }
  } catch (err) {
    console.error("❌ 推送 Telegram 消息异常：", err);
  }
}



/**
 * 根据账号类型分组
 * @param {Array} accounts - 账号列表
 * @returns {Object} 分组后的账号
 */
function groupAccountsByType(accounts) {
  const groups = {
    freecloud: [],
    natFreecloud: []
  };

  accounts.forEach(account => {
    if (account.type === 'nat.freecloud') {
      groups.natFreecloud.push(account);
    } else {
      groups.freecloud.push(account);
    }
  });

  return groups;
}

/**
 * 调用Worker处理所有账号
 * @param {Object} accountGroups - 分组后的账号 {freecloud: [], natFreecloud: []}
 * @param {string} apiKey - API Key
 * @returns {Object} 处理结果
 */
async function callWorkerForAllAccounts(accountGroups, apiKey) {
  try {
    console.log(`🔄 调用Worker处理所有账号...`);

    const response = await fetch(WORKER_URLS.primary, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Multi-Site-Mode': 'true',  // 标识多站点模式
        'X-Secondary-Worker-URL': WORKER_URLS.secondary  // 传递辅助Worker URL
      },
      body: JSON.stringify({
        accounts: accountGroups
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Worker处理完成`);
      return result;
    } else if (response.status === 401) {
      const error = await response.json();
      throw new Error(`API Key 认证失败: ${error.error}`);
    } else {
      const error = await response.json().catch(() => ({ error: '未知错误' }));
      throw new Error(`Worker调用失败: ${error.error}`);
    }
  } catch (error) {
    console.error(`❌ 调用Worker失败: ${error.message}`);
    throw error;
  }
}

/**
 * 调用Worker处理续期（多站点模式）
 * @param {Array} accounts - 账号列表
 * @param {string} apiKey - API Key
 * @returns {Object} 处理结果
 */
async function callWorkerWithRetry(accounts, apiKey) {
  // 按站点类型分组账号
  const groups = groupAccountsByType(accounts);

  console.log(`📋 账号分组情况:`);
  console.log(`  - freecloud.ltd: ${groups.freecloud.length} 个账号`);
  console.log(`  - nat.freecloud.ltd: ${groups.natFreecloud.length} 个账号`);

  try {
    // 调用Worker处理所有账号
    const result = await callWorkerForAllAccounts(groups, apiKey);
    return result;
  } catch (error) {
    console.error(`❌ 多站点处理失败: ${error.message}`);

    // 为所有账号生成失败记录
    const allResults = [];
    let totalFailed = 0;

    [...groups.freecloud, ...groups.natFreecloud].forEach(account => {
      allResults.push({
        username: account.username,
        type: account.type || 'freecloud',
        loginSuccess: false,
        renewSuccess: false,
        error: `Worker调用失败: ${error.message}`
      });
      totalFailed++;
    });

    return {
      processed: accounts.length,
      summary: {
        loginSuccess: 0,
        renewSuccess: 0,
        failed: totalFailed
      },
      results: allResults,
      key_usage: {
        this_operation: 0,
        total_used: 0
      }
    };
  }
}



/**
 * 生成 Telegram 通知消息
 * @param {Object} result - Worker 返回结果
 * @returns {string} 格式化的消息
 */
function generateTelegramMessage(result) {
  const { processed, summary, results, key_usage } = result;

  let message = `🌤 *freecloud 多站点续期状态报告*\n\n`;
  message += `📊 本次处理: ${processed}个账号，本执行续期，Key使用${key_usage.this_operation}次，总计使用${key_usage.total_used}次\n`;
  message += `✅ 登录成功: ${summary.loginSuccess}个  `;
  message += `💰 续期成功: ${summary.renewSuccess}个  `;
  message += `❌ 失败: ${summary.failed}个\n\n`;

  message += `📋 *详细结果:*\n`;

  results.forEach((account, index) => {
    const num = index + 1;
    const username = account.username;
    const siteType = account.type || 'freecloud';

    if (account.error) {
      message += `❌ 账号${num} \`${username}\` (${siteType}) 处理失败: ${account.error}\n`;
    } else {
      // 登录状态
      if (account.loginSuccess) {
        message += `✅ 账号${num} \`${username}\` (${siteType}) 登录成功\n`;
      } else {
        message += `❌ 账号${num} \`${username}\` (${siteType}) 登录失败\n`;
      }

      // 续期状态
      if (account.renewSuccess) {
        message += `💰 账号${num} \`${username}\` (${siteType}) 续期成功: ${account.message}\n`;
      } else if (account.message) {
        message += `⚠️ 账号${num} \`${username}\` (${siteType}) 续期结果: ${account.message}\n`;
      }
    }

    message += `\n`;
  });

  // 添加延迟信息
  if (DELAY_SECONDS !== undefined && DELAY_TYPE !== undefined) {
    const delaySeconds = parseInt(DELAY_SECONDS) || 0;
    if (delaySeconds > 0) {
      const minutes = Math.floor(delaySeconds / 60);
      const seconds = delaySeconds % 60;
      message += `⏱️ 本次执行${DELAY_TYPE}: ${delaySeconds}秒 (${minutes}分${seconds}秒)\n`;
    } else {
      message += `⏱️ 本次执行${DELAY_TYPE}\n`;
    }
  }

  message += `⏰ 执行时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;

  return message;
}

async function main() {
  console.log("🚀 开始执行 FreeCloud 自动续期");

  try {
    // 调用Worker处理续期
    const result = await callWorkerWithRetry(accounts, FREECLOUD_API_KEY);
    console.log(`📊 处理结果: 总计${result.processed}个账号, 登录成功${result.summary.loginSuccess}个, 续期成功${result.summary.renewSuccess}个, 失败${result.summary.failed}个，本次Key使用${result.key_usage.this_operation}次，总计使用${result.key_usage.total_used}次`);

    // 生成并发送 Telegram 通知
    const message = generateTelegramMessage(result);
    await sendTelegramMessage(message);

    // 输出详细结果
    console.log("\n📋 详细处理结果:");
    result.results.forEach((account, index) => {
      console.log(`账号 ${index + 1}: ${account.username}`);
      console.log(`  登录: ${account.loginSuccess ? '✅ 成功' : '❌ 失败'}`);
      console.log(`  续期: ${account.renewSuccess ? '✅ 成功' : '❌ 失败'}`);
      if (account.message) console.log(`  消息: ${account.message}`);
      if (account.error) console.log(`  错误: ${account.error}`);
      console.log('');
    });

    // 如果有失败的账号，以非零状态码退出
    if (result.summary.failed > 0) {
      console.warn(`⚠️ 有 ${result.summary.failed} 个账号处理失败`);
      process.exit(1);
    }

    console.log("🎉 所有账号处理完成");

  } catch (error) {
    console.error("❌ 执行失败:", error.message);

    // 发送错误通知
    const errorMessage = `❌ *多站点续期失败*\n\n错误信息: ${error.message}\n\n⏰ 时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;
    await sendTelegramMessage(errorMessage);

    process.exit(1);
  }
}

main();