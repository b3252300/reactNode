const mongoose = require('mongoose');
//'pending'：待指派處理（新工單預設狀態）
//'in_progress'：管家勘查修繕中
//'completed'：已完修結案
const ticketStatusValues = ['pending', 'in_progress', 'completed'];
//'urgent'：緊急（需優先處理的急件）
//'normal'：一般（預設值，一般報修派工使用）
//'inspection'：勘查／點交（例如從「房態與資產盤」點擊「指派管家勘查或點交」跳轉過來建立工單時會自動帶入這個值）
const ticketPriorityValues = ['urgent', 'normal', 'inspection'];

const butlerRepairRequestSchema = new mongoose.Schema(
  {
    //編號
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    //房子編號
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    //地址
    address: {
      type: String,
      default: '',
      trim: true,
    },
    //聯絡房客姓名（選擇房號時自動帶入）
    tenantName: {
      type: String,
      default: '',
      trim: true,
    },
    // 派工類別（如：水電修繕、家電冷氣、退租點交等）
    category: {
      type: String,
      required: true,
      default: '',
      trim: true,
    },
    // 報修／派工事項說明標題
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // 指派的外勤管家姓名
    butlerName: {
      type: String,
      required: true,
      default: '',
      trim: true,
    },
    // 工單優先級（urgent / normal / inspection）
    priority: {
      type: String,
      enum: ticketPriorityValues,
      default: 'normal',
    },
    //目前處理狀態
    status: {
      type: String,
      enum: ticketStatusValues,
      default: 'pending',
    },
    // 預估修繕費用（NT$）
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

butlerRepairRequestSchema.index({ status: 1, createdAt: -1 });
butlerRepairRequestSchema.index({ roomNumber: 1 });

module.exports = mongoose.model('ButlerRepairRequest', butlerRepairRequestSchema);
