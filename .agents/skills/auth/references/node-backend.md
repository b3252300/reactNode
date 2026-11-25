# Node.js (Express) 後端範本

## 目錄

- 套件與環境變數
- app.js 設定
- auth.routes.js
- auth.controller.js
- requireAuth middleware
- 資料庫介面說明

註冊預設建立帳號後直接簽發登入 cookie,讓使用者立即進入已登入狀態。若專案要求電子郵件驗證,應先完成驗證再簽發登入 cookie。

## 套件與環境變數

```bash
npm i express bcrypt jsonwebtoken cookie-parser cors helmet express-rate-limit zod dotenv
```

`.env.example`(真正的 `.env` 不可提交到 Git):

```
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=請換成至少32字元的隨機字串
```

產生隨機密鑰:`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## app.js

```js
// 設定 Express 安全中介層、跨網域 cookie 與驗證路由
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(helmet());                       // 加上常見的安全標頭
app.use(express.json());
app.use(cookieParser());                 // 讓 req.cookies 可用
app.use(cors({
  origin: process.env.CLIENT_ORIGIN,     // 必須是明確網址,不能用 *
  credentials: true,                     // 允許瀏覽器帶 cookie
}));

app.use('/api/auth', authRoutes);

app.listen(process.env.PORT || 4000);
```

## routes/auth.routes.js

```js
// 集中定義驗證端點與對應的請求頻率限制
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/requireAuth');

// 登入嘗試限制:15 分鐘最多 10 次,防暴力破解
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: '嘗試次數過多,請稍後再試' },
});

// 限制註冊頻率,降低自動化建立大量帳號的風險
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: '註冊次數過多,請稍後再試' },
});

router.post('/register', registerLimiter, ctrl.register);
router.post('/login', loginLimiter, ctrl.login);
router.post('/logout', ctrl.logout);
router.post('/refresh', ctrl.refresh);
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
```

## controllers/auth.controller.js

```js
// 驗證註冊與登入資料,並管理使用者和登入 token 的生命週期
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const db = require('../db'); // 見下方「資料庫介面說明」

const isProd = process.env.NODE_ENV === 'production';
const ACCESS_MS = 15 * 60 * 1000;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

const baseCookie = { httpOnly: true, secure: isProd, sameSite: 'lax' };
const accessCookie = { ...baseCookie, path: '/', maxAge: ACCESS_MS };
// refresh cookie 只送給 /api/auth,縮小暴露範圍
const refreshCookie = { ...baseCookie, path: '/api/auth', maxAge: REFRESH_MS };

// 用來讓「帳號不存在」也花同樣時間比對,避免被從回應時間探測帳號
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

// 註冊時限制密碼長度,避免 bcrypt 的 72 位元組上限造成密碼被截斷
const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string()
    .min(12)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, '密碼不可超過 72 個位元組'),
  name: z.string().trim().min(1).max(100),
});

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function signAccess(userId) {
  return jwt.sign({ sub: String(userId) }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

async function issueTokens(res, userId) {
  const refreshToken = crypto.randomBytes(48).toString('hex');
  // 資料庫只存雜湊值:就算資料庫外洩,攻擊者也拿不到可用的 token
  await db.saveRefreshToken({
    userId,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_MS),
  });
  res.cookie('access_token', signAccess(userId), accessCookie);
  res.cookie('refresh_token', refreshToken, refreshCookie);
}

// 建立新帳號並立即登入;資料庫唯一索引仍須負責處理並行的重複註冊
exports.register = async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: '輸入格式錯誤' });

  const { email, password, name } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const existingUser = await db.findUserByEmail(normalizedEmail);
  if (existingUser) return res.status(409).json({ message: '此電子郵件已註冊' });

  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await db.createUser({ email: normalizedEmail, name, passwordHash });
  } catch (error) {
    if (db.isUniqueEmailError?.(error)) {
      return res.status(409).json({ message: '此電子郵件已註冊' });
    }
    throw error;
  }

  await issueTokens(res, user.id);
  res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } });
};

exports.login = async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: '輸入格式錯誤' });

  const { email, password } = parsed.data;
  const user = await db.findUserByEmail(email.toLowerCase());
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  // 不論是帳號不存在或密碼錯誤,回覆都一樣
  if (!user || !ok) return res.status(401).json({ message: '帳號或密碼錯誤' });

  await issueTokens(res, user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
};

exports.refresh = async (req, res) => {
  const token = req.cookies.refresh_token;
  if (!token) return res.status(401).json({ message: '未登入' });

  const record = await db.findRefreshToken(sha256(token));
  if (!record || record.expiresAt < new Date()) {
    res.clearCookie('refresh_token', refreshCookie);
    return res.status(401).json({ message: '登入已過期' });
  }

  // rotation:舊的作廢,換發新的。若舊 token 被重複使用,代表可能被偷
  await db.deleteRefreshToken(record.tokenHash);
  await issueTokens(res, record.userId);
  res.status(204).end();
};

exports.logout = async (req, res) => {
  const token = req.cookies.refresh_token;
  if (token) await db.deleteRefreshToken(sha256(token)); // 真正讓 token 失效
  res.clearCookie('access_token', { ...baseCookie, path: '/' });
  res.clearCookie('refresh_token', { ...baseCookie, path: '/api/auth' });
  res.status(204).end();
};

exports.me = async (req, res) => {
  const user = await db.findUserById(req.userId);
  if (!user) return res.status(401).json({ message: '未登入' });
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
};
```

注意:`clearCookie` 的 `path` 等選項要和設定時一致,否則瀏覽器不會清掉。

## middleware/requireAuth.js

```js
// 驗證 access token cookie,只讓已登入使用者繼續呼叫受保護 API
const jwt = require('jsonwebtoken');

exports.requireAuth = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ message: '未登入' });
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: '登入已過期' });
  }
};
```

## 資料庫介面說明

`../db` 是一層薄薄的介面,依使用者的資料庫實作。需要這些函式:

- `findUserByEmail(email)`、`findUserById(id)` → `{ id, email, name, passwordHash }` 或 `null`
- `createUser({ email, name, passwordHash })` → 建立使用者並回傳 `{ id, email, name }`; email 欄位需有資料庫唯一索引
- `isUniqueEmailError(error)` → 判斷資料庫唯一索引衝突,使用該資料庫/ORM 的正式錯誤型別判斷
- `saveRefreshToken({ userId, tokenHash, expiresAt })`
- `findRefreshToken(tokenHash)` → `{ userId, tokenHash, expiresAt }` 或 `null`
- `deleteRefreshToken(tokenHash)`

建議為 refresh token 的 `expiresAt` 建立過期自動清理(MongoDB 用 TTL index,SQL 用排程刪除)。
註冊時密碼用 `bcrypt.hash(password, 12)` 產生 `passwordHash`。若資料庫操作失敗,應交由專案既有的錯誤處理器回報,不可吞掉錯誤;唯一索引衝突則轉成安全且明確的註冊回應。
