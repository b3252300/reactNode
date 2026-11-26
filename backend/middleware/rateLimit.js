// 速率限制中介層：
// - Cloudflare Workers：使用 Rate Limiting binding（跨 isolate 共享計數）。
// - 本機 Node.js：沿用 express-rate-limit（記憶體計數）。
const { isWorkers, getWorkerEnv } = require('../utils/runtime');

function rateLimit({ binding, message, ...options }) {
  if (isWorkers) {
    return async (req, res, next) => {
      const limiter = getWorkerEnv()?.[binding];
      if (!limiter) {
        // 未設定 binding 時不阻擋請求，但記錄警告方便排查。
        console.warn(`Rate limiting binding "${binding}" is not configured`);
        return next();
      }
      try {
        const key = req.get('cf-connecting-ip') || 'unknown';
        const { success } = await limiter.limit({ key });
        if (!success) {
          return res.status(429).json(message);
        }
        return next();
      } catch (error) {
        return next(error);
      }
    };
  }

  // 延遲載入，避免 Workers bundle 在全域範圍建立計時器。
  let limiter = null;
  return (req, res, next) => {
    limiter ??= require('express-rate-limit')({ message, ...options });
    return limiter(req, res, next);
  };
}

module.exports = { rateLimit };
