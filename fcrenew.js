import fetch from "node-fetch";

// 从环境变量读取配置
const _0x1a2b = process.env.TELEGRAM_BOT_TOKEN;
const _0x3c4d = process.env.TELEGRAM_CHAT_ID;
const _0x5e6f = process.env.FREECLOUD_ACCOUNTS;
const _0x7g8h = process.env.FREECLOUD_API_KEY;
const _0x9k1l = process.env.DELAY_SECONDS;
const _0x2m3n = process.env.DELAY_TYPE;

// 验证必要的环境变量
if (!_0x5e6f) {
  console.error("❌ 缺少环境变量 FREECLOUD_ACCOUNTS");
  process.exit(1);
}

if (!_0x7g8h) {
  console.error("❌ 缺少环境变量 FREECLOUD_API_KEY");
  process.exit(1);
}

// Worker URLs (轮转使用)
const _0x9i0j = [
  "https://webkeepalive-server.qldyf.workers.dev",
  "https://webkeepalive-server2.mqiancheng.workers.dev",
  "https://webkeepalive-server3.mqiancheng.workers.dev"
];

// 解析账号数据
let _0xk1l2 = [];
try {
  _0xk1l2 = JSON.parse(_0x5e6f);
  if (!Array.isArray(_0xk1l2) || _0xk1l2.length === 0) {
    throw new Error("账号列表为空或格式错误");
  }
} catch (_0xm3n4) {
  console.error("❌ 解析 FREECLOUD_ACCOUNTS 失败:", _0xm3n4.message);
  console.error("请确保 FREECLOUD_ACCOUNTS 是有效的 JSON 数组格式");
  process.exit(1);
}

console.log(`📋 读取到 ${_0xk1l2.length} 个账号`);
_0xk1l2.forEach((_0xo5p6, _0xq7r8) => {
  const _0xs9t0 = _0xo5p6.type === 'nat.freecloud' ? 'UID' : '端口';
  console.log(`账号 ${_0xq7r8 + 1}: ${_0xo5p6.username} (${_0xs9t0}: ${_0xo5p6.port}) [${_0xo5p6.type || 'freecloud'}]`);
});

/**
 * 向 Telegram 推送消息
 * @param {string} _0xu1v2 - 要发送的文本消息
 */
async function _0xs9t0(_0xu1v2) {
  if (!_0x1a2b || !_0x3c4d) {
    console.warn("⚠️ 未配置 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID，无法推送消息");
    return;
  }

  const _0xw3x4 = `https://api.telegram.org/bot${_0x1a2b}/sendMessage`;

  const _0xy5z6 = {
    chat_id: _0x3c4d,
    text: _0xu1v2,
    parse_mode: "Markdown"
  };

  try {
    const _0xa7b8 = await fetch(_0xw3x4, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(_0xy5z6)
    });

    const _0xc9d0 = await _0xa7b8.text();

    if (!_0xa7b8.ok) {
      console.warn(`⚠️ Telegram 消息推送失败: ${_0xc9d0}`);
    } else {
      console.log("✅ Telegram 消息已发送");
    }
  } catch (_0xe1f2) {
    console.error("❌ 推送 Telegram 消息异常：", _0xe1f2);
  }
}

/**
 * 随机打乱数组顺序
 * @param {Array} _0xt3u4 - 要打乱的数组
 * @returns {Array} 打乱后的新数组
 */
function _0xr1s2(_0xt3u4) {
  const _0xv5w6 = [..._0xt3u4]; // 创建副本，避免修改原数组
  for (let _0xx7y8 = _0xv5w6.length - 1; _0xx7y8 > 0; _0xx7y8--) {
    const _0xz9a0 = Math.floor(Math.random() * (_0xx7y8 + 1));
    [_0xv5w6[_0xx7y8], _0xv5w6[_0xz9a0]] = [_0xv5w6[_0xz9a0], _0xv5w6[_0xx7y8]];
  }
  return _0xv5w6;
}

/**
 * 调用 Worker 处理续期
 * @param {Array} _0xk1l2 - 账号列表
 * @param {string} _0xk7l8 - API Key
 * @returns {Object} 处理结果
 */
async function _0xg3h4(_0xk1l2, _0xk7l8) {
  // 随机打乱 URL 顺序
  const _0xb1c2 = _0xr1s2(_0x9i0j);
  console.log(`🎲 随机选择 URL 顺序: ${_0xb1c2.map((_0xw3x4, _0xq7r8) => `${_0xq7r8 + 1}. ${_0xw3x4.split('//')[1].split('.')[0]}`).join(', ')}`);

  for (let _0xx7y8 = 0; _0xx7y8 < _0xb1c2.length; _0xx7y8++) {
    const _0xw3x4 = _0xb1c2[_0xx7y8];
    console.log(`🔗 尝试调用 Worker (${_0xx7y8 + 1}/${_0xb1c2.length}): ${_0xw3x4}`);

    try {
      const _0xa7b8 = await fetch(_0xw3x4, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${_0xk7l8}`
        },
        body: JSON.stringify({ accounts: _0xk1l2 })
      });

      if (_0xa7b8.ok) {
        const _0xs5t6 = await _0xa7b8.json();
        console.log(`✅ Worker 调用成功: ${_0xw3x4}`);
        return _0xs5t6;
      } else if (_0xa7b8.status === 401) {
        // API Key 无效，不需要重试其他URL
        const _0xm3n4 = await _0xa7b8.json();
        throw new Error(`API Key 认证失败: ${_0xm3n4.error}`);
      } else {
        console.warn(`⚠️ Worker 响应错误 (${_0xa7b8.status}): ${_0xw3x4}`);
        if (_0xx7y8 === _0xb1c2.length - 1) {
          const _0xm3n4 = await _0xa7b8.json().catch(() => ({ error: '未知错误' }));
          throw new Error(`所有 Worker URL 都不可用，最后错误: ${_0xm3n4.error}`);
        }
      }
    } catch (_0xm3n4) {
      console.error(`❌ 调用 Worker 失败 (${_0xw3x4}): ${_0xm3n4.message}`);
      if (_0xm3n4.message.includes('API Key 认证失败')) {
        throw _0xm3n4; // API Key 错误不重试
      }
      if (_0xx7y8 === _0xb1c2.length - 1) {
        throw new Error(`所有 Worker URL 都不可用: ${_0xm3n4.message}`);
      }
    }
  }
}

/**
 * 生成 Telegram 通知消息
 * @param {Object} _0xs5t6 - Worker 返回结果
 * @returns {string} 格式化的消息
 */
function _0xa3b4(_0xs5t6) {
  const { processed: _0xe7f8, summary: _0xg9h0, results: _0xi1j2, key_usage: _0xk2l3 } = _0xs5t6;

  let _0xu1v2 = `🌤 *freecloud 多站点续期状态报告*\n\n`;
  _0xu1v2 += `📊 本次处理: ${_0xe7f8}个账号，本执行续期，Key使用${_0xk2l3.this_operation}次，总计使用${_0xk2l3.total_used}次\n`;
  _0xu1v2 += `✅ 登录成功: ${_0xg9h0.loginSuccess}个  `;
  _0xu1v2 += `💰 续期成功: ${_0xg9h0.renewSuccess}个  `;
  _0xu1v2 += `❌ 失败: ${_0xg9h0.failed}个\n\n`;

  _0xu1v2 += `📋 *详细结果:*\n`;

  _0xi1j2.forEach((_0xo5p6, _0xq7r8) => {
    const _0xq9r0 = _0xq7r8 + 1;
    const _0xs1t2 = _0xo5p6.username;
    const _0xu3v4 = _0xo5p6.type || 'freecloud';

    if (_0xo5p6.error) {
      _0xu1v2 += `❌ 账号${_0xq9r0} \`${_0xs1t2}\` (${_0xu3v4}) 处理失败: ${_0xo5p6.error}\n`;
    } else {
      // 登录状态
      if (_0xo5p6.loginSuccess) {
        _0xu1v2 += `✅ 账号${_0xq9r0} \`${_0xs1t2}\` (${_0xu3v4}) 登录成功\n`;
      } else {
        _0xu1v2 += `❌ 账号${_0xq9r0} \`${_0xs1t2}\` (${_0xu3v4}) 登录失败\n`;
      }

      // 续期状态
      if (_0xo5p6.renewSuccess) {
        _0xu1v2 += `💰 账号${_0xq9r0} \`${_0xs1t2}\` (${_0xu3v4}) 续期成功: ${_0xo5p6.message}\n`;
      } else if (_0xo5p6.message) {
        _0xu1v2 += `⚠️ 账号${_0xq9r0} \`${_0xs1t2}\` (${_0xu3v4}) 续期结果: ${_0xo5p6.message}\n`;
      }
    }

    _0xu1v2 += `\n`;
  });

  // 添加延迟信息
  if (_0x9k1l !== undefined && _0x2m3n !== undefined) {
    const _0xw5x6 = parseInt(_0x9k1l) || 0;
    if (_0xw5x6 > 0) {
      const _0xy7z8 = Math.floor(_0xw5x6 / 60);
      const _0xa9b0 = _0xw5x6 % 60;
      _0xu1v2 += `⏱️ 本次${_0x2m3n}: ${_0xw5x6}秒 (${_0xy7z8}分${_0xa9b0}秒)\n`;
    } else {
      _0xu1v2 += `⏱️ 本次${_0x2m3n}\n`;
    }
  }

  _0xu1v2 += `⏰ 执行时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;

  return _0xu1v2;
}

async function _0xu3v4() {
  console.log("🚀 开始执行 FreeCloud 自动续期");

  try {
    // 调用 Worker 处理续期
    console.log("📞 调用 Worker 处理续期...");
    const _0xs5t6 = await _0xg3h4(_0xk1l2, _0x7g8h);

    console.log("✅ Worker 处理完成");
    console.log(`📊 处理结果: 总计${_0xs5t6.processed}个账号, 登录成功${_0xs5t6.summary.loginSuccess}个, 续期成功${_0xs5t6.summary.renewSuccess}个, 失败${_0xs5t6.summary.failed}个，本次Key使用${_0xs5t6.key_usage.this_operation}次，总计使用${_0xs5t6.key_usage.total_used}次`);

    // 生成并发送 Telegram 通知
    const _0xu1v2 = _0xa3b4(_0xs5t6);
    await _0xs9t0(_0xu1v2);

    // 输出详细结果
    console.log("\n📋 详细处理结果:");
    _0xs5t6.results.forEach((_0xo5p6, _0xq7r8) => {
      console.log(`账号 ${_0xq7r8 + 1}: ${_0xo5p6.username}`);
      console.log(`  登录: ${_0xo5p6.loginSuccess ? '✅ 成功' : '❌ 失败'}`);
      console.log(`  续期: ${_0xo5p6.renewSuccess ? '✅ 成功' : '❌ 失败'}`);
      if (_0xo5p6.message) console.log(`  消息: ${_0xo5p6.message}`);
      if (_0xo5p6.error) console.log(`  错误: ${_0xo5p6.error}`);
      console.log('');
    });

    // 如果有失败的账号，以非零状态码退出
    if (_0xs5t6.summary.failed > 0) {
      console.warn(`⚠️ 有 ${_0xs5t6.summary.failed} 个账号处理失败`);
      process.exit(1);
    }

    console.log("🎉 所有账号处理完成");

  } catch (_0xm3n4) {
    console.error("❌ 执行失败:", _0xm3n4.message);

    // 发送错误通知
    const errorMessage = `❌ *多站点续期失败*\n\n错误信息: ${_0xm3n4.message}\n\n⏰ 时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;
    await _0xs9t0(errorMessage);

    process.exit(1);
  }
}

_0xu3v4();
