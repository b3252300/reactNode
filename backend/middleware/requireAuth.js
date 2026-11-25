const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { getConfig } = require('../config');

// 驗證需要登入的 API：確認請求帶有有效的 access token（短效登入憑證）。
function requireAuth(req, res, next) {
  // httpOnly cookie 會由瀏覽器自動附加，前端 JavaScript 無法直接讀取。
  const token = req.cookies?.access_token;
  if (!token) {
    return res.status(401).json({ message: '未登入' });
  }

  try {
    // 驗證簽章與 token 的發行者、接收對象，避免接受其他用途的 token。
    const payload = jwt.verify(token, getConfig().jwtAccessSecret, {
      algorithms: ['HS256'],
      issuer: 'react-node-auth',
      audience: 'react-node-client',
    });

    // sub 是 token 中代表使用者的欄位；先檢查格式，避免無效 ID 傳入資料庫。
    if (
      typeof payload.sub !== 'string' ||
      !mongoose.isValidObjectId(payload.sub)
    ) {
      return res.status(401).json({ message: '登入已過期' });
    }

    // 把已確認的使用者 ID 放到請求物件，讓後續路由可以使用。
    req.userId = payload.sub;
    return next();
  } catch (error) {
    // token 格式錯誤或過期屬於未登入；其他錯誤交給 Express 的錯誤處理器。
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: '登入已過期' });
    }
    return next(error);
  }
}

module.exports = { requireAuth };
