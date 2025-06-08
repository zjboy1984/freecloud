import fetch from "node-fetch";

// 环境变量配置
const _0x1a2b = process.env.TELEGRAM_BOT_TOKEN;
const _0x3c4d = process.env.TELEGRAM_CHAT_ID;
const _0x5e6f = process.env.FREECLOUD_ACCOUNTS;
const _0x7g8h = process.env.FREECLOUD_API_KEY;

// 验证配置
if (!_0x5e6f) {
  console.error("❌ 缺少环境变量 FREECLOUD_ACCOUNTS");
  process.exit(1);
}

if (!_0x7g8h) {
  console.error("❌ 缺少环境变量 FREECLOUD_API_KEY");
  process.exit(1);
}

// Worker 端点配置
const _0x9i0j = [
  "https://webkeepalive-server.qldyf.workers.dev",
  "https://webkeepalive-server2.mqiancheng.workers.dev",
  "https://webkeepalive-server3.mqiancheng.workers.dev"
];

// 解析账号配置
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
  console.log(`账号 ${_0xq7r8 + 1}: ${_0xo5p6.username} (端口: ${_0xo5p6.port})`);
});

/**
 * 随机打乱数组顺序
 */
function _0xr1s2(_0xt3u4) {
  const _0xv5w6 = [..._0xt3u4];
  for (let _0xx7y8 = _0xv5w6.length - 1; _0xx7y8 > 0; _0xx7y8--) {
    const _0xz9a0 = Math.floor(Math.random() * (_0xx7y8 + 1));
    [_0xv5w6[_0xx7y8], _0xv5w6[_0xz9a0]] = [_0xv5w6[_0xz9a0], _0xv5w6[_0xx7y8]];
  }
  return _0xv5w6;
}

/**
 * Telegram 消息推送
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
 * Worker 调用处理
 */
async function _0xg3h4(_0xi5j6, _0xk7l8) {
  // 随机打乱 URL 顺序
  const _0xb1c2 = _0xr1s2(_0x9i0j);
  console.log(`🎲 随机选择 URL 顺序: ${_0xb1c2.map((_0xd3e4, _0xf5g6) => `${_0xf5g6 + 1}. ${_0xd3e4.split('//')[1].split('.')[0]}`).join(', ')}`);

  for (let _0xm9n0 = 0; _0xm9n0 < _0xb1c2.length; _0xm9n0++) {
    const _0xo1p2 = _0xb1c2[_0xm9n0];
    console.log(`🔗 尝试调用 Worker (${_0xm9n0 + 1}/${_0xb1c2.length}): ${_0xo1p2}`);

    try {
      const _0xq3r4 = await fetch(_0xo1p2, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${_0xk7l8}`
        },
        body: JSON.stringify({ accounts: _0xi5j6 })
      });

      if (_0xq3r4.ok) {
        const _0xs5t6 = await _0xq3r4.json();
        console.log(`✅ Worker 调用成功: ${_0xo1p2}`);
        return _0xs5t6;
      } else if (_0xq3r4.status === 401) {
        const _0xu7v8 = await _0xq3r4.json();
        throw new Error(`API Key 认证失败: ${_0xu7v8.error}`);
      } else {
        console.warn(`⚠️ Worker 响应错误 (${_0xq3r4.status}): ${_0xo1p2}`);
        if (_0xm9n0 === _0xb1c2.length - 1) {
          const _0xw9x0 = await _0xq3r4.json().catch(() => ({ error: '未知错误' }));
          throw new Error(`所有 Worker URL 都不可用，最后错误: ${_0xw9x0.error}`);
        }
      }
    } catch (_0xy1z2) {
      console.error(`❌ 调用 Worker 失败 (${_0xo1p2}): ${_0xy1z2.message}`);
      if (_0xy1z2.message.includes('API Key 认证失败')) {
        throw _0xy1z2;
      }
      if (_0xm9n0 === _0xb1c2.length - 1) {
        throw new Error(`所有 Worker URL 都不可用: ${_0xy1z2.message}`);
      }
    }
  }
}

/**
 * 生成通知消息
 */
function _0xa3b4(_0xc5d6) {
  const { processed: _0xe7f8, summary: _0xg9h0, results: _0xi1j2 } = _0xc5d6;

  let _0xk3l4 = `🌤 *FreeCloud 续期状态报告*\n\n`;
  _0xk3l4 += `📊 本次处理: ${_0xe7f8}个账号\n`;
  _0xk3l4 += `✅ 登录成功: ${_0xg9h0.loginSuccess}个  `;
  _0xk3l4 += `💰 续期成功: ${_0xg9h0.renewSuccess}个  `;
  _0xk3l4 += `❌ 失败: ${_0xg9h0.failed}个\n\n`;

  _0xk3l4 += `📋 *详细结果:*\n`;

  _0xi1j2.forEach((_0xm5n6, _0xo7p8) => {
    const _0xq9r0 = _0xo7p8 + 1;
    const _0xs1t2 = _0xm5n6.username;

    if (_0xm5n6.error) {
      _0xk3l4 += `❌ 账号${_0xq9r0} \`${_0xs1t2}\` 处理失败: ${_0xm5n6.error}\n`;
    } else {
      if (_0xm5n6.loginSuccess) {
        _0xk3l4 += `✅ 账号${_0xq9r0} \`${_0xs1t2}\` 登录成功\n`;
      } else {
        _0xk3l4 += `❌ 账号${_0xq9r0} \`${_0xs1t2}\` 登录失败\n`;
      }

      if (_0xm5n6.renewSuccess) {
        _0xk3l4 += `💰 账号${_0xq9r0} \`${_0xs1t2}\` 续期成功: ${_0xm5n6.message}\n`;
      } else if (_0xm5n6.message) {
        _0xk3l4 += `⚠️ 账号${_0xq9r0} \`${_0xs1t2}\` 续期结果: ${_0xm5n6.message}\n`;
      }
    }

    _0xk3l4 += `\n`;
  });

  _0xk3l4 += `⏰ 执行时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;

  return _0xk3l4;
}

async function _0xu3v4() {
  console.log("🚀 开始执行 FreeCloud 自动续期");

  try {
    console.log("📞 调用 Worker 处理续期...");
    const _0xw5x6 = await _0xg3h4(_0xk1l2, _0x7g8h);

    console.log("✅ Worker 处理完成");
    console.log(`📊 处理结果: 总计${_0xw5x6.processed}个账号, 登录成功${_0xw5x6.summary.loginSuccess}个, 续期成功${_0xw5x6.summary.renewSuccess}个, 失败${_0xw5x6.summary.failed}个`);

    const _0xy7z8 = _0xa3b4(_0xw5x6);
    await _0xs9t0(_0xy7z8);

    console.log("\n📋 详细处理结果:");
    _0xw5x6.results.forEach((_0xa9b0, _0xc1d2) => {
      console.log(`账号 ${_0xc1d2 + 1}: ${_0xa9b0.username}`);
      console.log(`  登录: ${_0xa9b0.loginSuccess ? '✅ 成功' : '❌ 失败'}`);
      console.log(`  续期: ${_0xa9b0.renewSuccess ? '✅ 成功' : '❌ 失败'}`);
      if (_0xa9b0.message) console.log(`  消息: ${_0xa9b0.message}`);
      if (_0xa9b0.error) console.log(`  错误: ${_0xa9b0.error}`);
      console.log('');
    });

    if (_0xw5x6.summary.failed > 0) {
      console.warn(`⚠️ 有 ${_0xw5x6.summary.failed} 个账号处理失败`);
      process.exit(1);
    }

    console.log("🎉 所有账号处理完成");

  } catch (_0xe3f4) {
    console.error("❌ 执行失败:", _0xe3f4.message);

    const _0xg5h6 = `❌ *FreeCloud 续期失败*\n\n错误信息: ${_0xe3f4.message}\n\n⏰ 时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;
    await _0xs9t0(_0xg5h6);

    process.exit(1);
  }
}

_0xu3v4();
