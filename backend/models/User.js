const mongoose = require('mongoose');

// 定義使用者資料的欄位與資料庫驗證規則。
const userSchema = new mongoose.Schema(
  {
    // Email 必填且不可重複；統一小寫並去除前後空白，避免大小寫造成重複帳號。
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // 姓名可留空；儲存前去除空白，並限制最大長度。
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    // 只儲存密碼雜湊（不可逆的比對結果），不儲存明文密碼。
    // select: false 代表一般查詢不會取出此欄位；登入時才會明確要求讀取。
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  // Mongoose 自動加入 createdAt 與 updatedAt 時間欄位。
  { timestamps: true }
);

// 將 schema 編譯成可用來讀寫 MongoDB 的模型。
module.exports = mongoose.model('User', userSchema);
