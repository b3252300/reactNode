const mongoose = require('mongoose');

// Refresh token（更新憑證）效期較長，用來換發新的短效 access token。
const refreshTokenSchema = new mongoose.Schema(
  {
    // 記錄憑證所屬使用者；index 讓依使用者查詢時更有效率。
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // 資料庫只存 token 的雜湊值，不存可直接使用的原始憑證。
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    // 到期時間；TTL 索引會在到期後由 MongoDB 自動清理（清理可能稍有延遲）。
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  // 自動加入建立與更新時間，方便追蹤記錄。
  { timestamps: true }
);

// 將 schema 編譯成可用來讀寫 MongoDB 的模型。
module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
