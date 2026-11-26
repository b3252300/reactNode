// 管理註冊、登入與 cookie 驗證流程,並確保回應只包含公開使用者資料
// bcryptjs 為純 JavaScript 實作，可在 Node.js 與 Cloudflare Workers 執行，且與原 bcrypt 雜湊相容。
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { z } = require('zod');
const { getConfig } = require('../config');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');

// access token（短效登入憑證）效期 15 分鐘；refresh token（更新憑證）效期 7 天。
const ACCESS_MS = 15 * 60 * 1000;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
// refresh token 由 48 個隨機位元組轉成 96 個十六進位字元。
const REFRESH_TOKEN_PATTERN = /^[a-f0-9]{96}$/;
// Cookie 設定集中管理，避免登入、登出時使用不同的安全選項。
// 延遲到請求階段才讀取 config，避免 Cloudflare Workers 首次部署載入模組時因尚未設定 secret 而失敗。
function getCookieOptions() {
  const config = getConfig();
  const base = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.cookieSameSite,
  };
  return {
    base,
    // 瀏覽器會在每次請求時依 path 決定是否附加對應 cookie。
    access: { ...base, path: '/', maxAge: ACCESS_MS },
    refresh: { ...base, path: '/api/auth', maxAge: REFRESH_MS },
  };
}
// 若登入帳號不存在也用 bcrypt 比對這個假雜湊，降低藉由回應時間猜測帳號的機會。
// 延遲到第一次登入時才產生：Cloudflare Workers 不允許在全域範圍產生亂數或執行耗時運算。
let dummyPasswordHashPromise = null;
function getDummyPasswordHash() {
  dummyPasswordHashPromise ??= bcrypt.hash(
    crypto.randomBytes(32).toString('hex'),
    12
  );
  return dummyPasswordHashPromise;
}

// 登入時的輸入規則；bcrypt 最多處理 72 個 UTF-8 位元組。
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z
    .string()
    .min(1)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
      message: '密碼長度超出限制',
    }),
});

// 註冊欄位規則：姓名必填且最多 100 字、Email 格式正確且最多 254 字，
// 密碼至少 8 字，並遵守 bcrypt 最多處理 72 個 UTF-8 位元組的限制。
const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  password: z
    .string()
    .min(8)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
      message: '密碼長度超出限制',
    }),
});

// 對 token 做 SHA-256 雜湊；資料庫只保存雜湊結果，不保存原始 token。
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// 簽署短效 JWT（JSON Web Token，包含使用者識別資訊的簽章憑證）。
function signAccessToken(userId) {
  return jwt.sign({ sub: String(userId) }, getConfig().jwtAccessSecret, {
    algorithm: 'HS256',
    expiresIn: '15m',
    issuer: 'react-node-auth',
    audience: 'react-node-client',
  });
}

// 建立一組登入憑證：寫入 refresh token 雜湊，並用安全 cookie 傳回瀏覽器。
async function issueTokens(res, userId) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  await RefreshToken.create({
    userId,
    tokenHash: sha256(rawToken),
    expiresAt: new Date(Date.now() + REFRESH_MS),
  });

  const cookies = getCookieOptions();
  res.cookie('access_token', signAccessToken(userId), cookies.access);
  res.cookie('refresh_token', rawToken, cookies.refresh);
}

// 登出或登入過期時清除 cookie；path 必須與設定 cookie 時相同。
function clearAuthCookies(res) {
  const { base } = getCookieOptions();
  res.clearCookie('access_token', { ...base, path: '/' });
  res.clearCookie('refresh_token', { ...base, path: '/api/auth' });
}

// 組合可公開回傳的使用者欄位，不直接回傳整筆資料庫文件。
function publicUser(user) {
  const normalized = {
    id: String(user._id),
    email: user.email,
    name: user.name,
  };

  if (user.createdAt) {
    normalized.createdAt = user.createdAt.toISOString();
  }

  return normalized;
}

// 驗證註冊資料、建立使用者，並在成功後發出登入 cookie。
async function register(req, res) {
  // safeParse 會回傳驗證結果，不符合欄位規則時不會進入資料庫操作。
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: '輸入格式錯誤' });
  }

  // 將 Email 統一轉成小寫後再查詢，確保與資料庫儲存格式一致。
  const email = parsed.data.email.toLowerCase();
  const existingUser = await User.exists({ email });
  if (existingUser) {
    return res.status(409).json({ message: '此電子郵件已註冊' });
  }

  // bcrypt 會加鹽並雜湊密碼；資料庫不會收到明文密碼。
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let user;
  try {
    user = await User.create({
      email,
      name: parsed.data.name,
      passwordHash,
    });
  } catch (error) {
    // 即使兩個相同 Email 的請求同時通過前面的查詢，資料庫唯一索引仍會擋住重複資料。
    // 只將 Email 重複轉成一般回應，其餘錯誤交由錯誤處理器處理。
    if (
      error?.code === 11000 &&
      (error.keyPattern?.email || error.keyValue?.email)
    ) {
      return res.status(409).json({ message: '此電子郵件已註冊' });
    }
    throw error;
  }

  await issueTokens(res, user._id);
  return res.status(201).json({ user: publicUser(user) });
}

// 驗證帳密；無論帳號不存在或密碼錯誤，都回傳相同訊息。
async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: '輸入格式錯誤' });
  }

  const email = parsed.data.email.toLowerCase();
  // passwordHash 預設不會被查詢；登入時用 +passwordHash 明確取回供 bcrypt 比對。
  const user = await User.findOne({ email }).select('+passwordHash');
  // 帳號不存在時改用假雜湊執行同樣的比對，降低帳號枚舉風險。
  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    user?.passwordHash || (await getDummyPasswordHash())
  );

  if (!user || !passwordMatches) {
    return res.status(401).json({ message: '帳號或密碼錯誤' });
  }

  await issueTokens(res, user._id);
  return res.json({ user: publicUser(user) });
}

// 使用一次性的 refresh token 換發新憑證，避免舊 token 重複使用。
async function refresh(req, res) {
  const rawToken = req.cookies?.refresh_token;
  // 先檢查 token 格式，避免把任意輸入送進後續查詢。
  if (typeof rawToken !== 'string' || !REFRESH_TOKEN_PATTERN.test(rawToken)) {
    clearAuthCookies(res);
    return res.status(401).json({ message: '登入已過期' });
  }

  // 查詢並同時刪除舊 token，確保同一張更新憑證只能成功使用一次。
  const tokenRecord = await RefreshToken.findOneAndDelete({
    tokenHash: sha256(rawToken),
    expiresAt: { $gt: new Date() },
  });
  if (!tokenRecord) {
    clearAuthCookies(res);
    return res.status(401).json({ message: '登入已過期' });
  }

  // 使用者若已不存在，這張更新憑證也不能繼續換發登入憑證。
  const user = await User.findById(tokenRecord.userId);
  if (!user) {
    clearAuthCookies(res);
    return res.status(401).json({ message: '登入已過期' });
  }

  await issueTokens(res, user._id);
  return res.status(204).end();
}

// 刪除資料庫中的更新憑證並清除瀏覽器 cookie，完成真正的登出。
async function logout(req, res) {
  const rawToken = req.cookies?.refresh_token;
  try {
    if (typeof rawToken === 'string' && REFRESH_TOKEN_PATTERN.test(rawToken)) {
      await RefreshToken.deleteOne({ tokenHash: sha256(rawToken) });
    }
  } finally {
    clearAuthCookies(res);
  }

  return res.status(204).end();
}

// 取得目前登入者的公開資料；此路由應搭配 requireAuth 中介層使用。
async function me(req, res) {
  if (!mongoose.isValidObjectId(req.userId)) {
    return res.status(401).json({ message: '未登入' });
  }
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(401).json({ message: '未登入' });
  }
  return res.json({ user: publicUser(user) });
}

// 會員清單只查詢並回傳公開欄位，避免洩漏 passwordHash 或 token 等敏感資料。
async function listUsers(req, res) {
  const users = await User.find({})
    .select('name email createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return res.json({
    users: users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    })),
  });
}

module.exports = { register, login, logout, refresh, me, listUsers };
