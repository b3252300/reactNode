const mongoose = require('mongoose');

const statusValues = ['rented', 'vacant', 'overdue', 'expiring', 'maintenance'];

const propertyStatusAssetSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    lat: {
      type: Number,
      default: null,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      default: null,
      min: -180,
      max: 180,
    },
    floor: {
      type: String,
      default: '',
      trim: true,
    },
    roomType: {
      type: String,
      default: '',
      trim: true,
    },
    area: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: statusValues,
      required: true,
      default: 'vacant',
    },
    statusText: {
      type: String,
      required: true,
      default: '空置招租',
    },
    tenantName: {
      type: String,
      default: '',
      trim: true,
    },
    tenantPhone: {
      type: String,
      default: '',
      trim: true,
    },
    monthlyRent: {
      type: Number,
      default: 0,
      min: 0,
    },
    deposit: {
      type: Number,
      default: 0,
      min: 0,
    },
    managementFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    leaseEndDate: {
      type: Date,
      default: null,
    },
    overdueDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    overdueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maintenanceReason: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    features: {
      type: [Number],
      default: [],
    },
    featuresText: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      default: '',
    },
    imageUrls: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

propertyStatusAssetSchema.index({ status: 1, lat: 1, lng: 1 });

module.exports = mongoose.model('PropertyStatusAssets', propertyStatusAssetSchema);