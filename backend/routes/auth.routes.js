// 定義驗證端點,並對登入與註冊請求套用速率限制
const express = require('express');
const { rateLimit } = require('../middleware/rateLimit');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
const loginLimiter = rateLimit({
  // Cloudflare Workers 上使用的 Rate Limiting binding 名稱（見 wrangler.jsonc）。
  binding: 'LOGIN_LIMITER',
  // 限制統計期間：15 分鐘內累計請求次數。
  windowMs: 15 * 60 * 1000,
  // 每個統計期間內，單一來源最多可嘗試登入 10 次。
  limit: 10,
  // 使用標準 RateLimit 標頭回報限制狀態。
  standardHeaders: 'draft-8',
  // 不另外回傳舊版的 X-RateLimit-* 標頭。
  legacyHeaders: false,
  // 超過次數限制時，回傳給用戶端的錯誤內容。
  message: { message: '嘗試次數過多，請稍後再試' },
});

const registerLimiter = rateLimit({
  binding: 'REGISTER_LIMITER',
  // 限制統計期間：1 小時內累計請求次數。
  windowMs: 60 * 60 * 1000,
  // 每個統計期間內，單一來源最多可註冊 12 次。
  limit: 12,
  // 使用標準 RateLimit 標頭回報限制狀態。
  standardHeaders: 'draft-8',
  // 不另外回傳舊版的 X-RateLimit-* 標頭。
  legacyHeaders: false,
  // 超過次數限制時，回傳給用戶端的錯誤內容。
  message: { message: '註冊次數過多，請稍後再試' },
});

router.post('/register', registerLimiter, authController.register); //註冊
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', requireAuth, authController.me); // 顯示目前登入使用者
router.get('/users', requireAuth, authController.listUsers); // 會員清單
router.get('/members', requireAuth, authController.listUsers); // 兼容 member list 命名

module.exports = router;
