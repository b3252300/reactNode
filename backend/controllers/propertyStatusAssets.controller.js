const crypto = require('node:crypto'); // 載入 Node.js 加密模組，以產生隨機房號尾碼。
const mongoose = require('mongoose'); // 載入 Mongoose，用於驗證 MongoDB 文件識別碼。
const { z } = require('zod'); // 載入 Zod，負責驗證 API 的輸入資料。
const PropertyStatusAsset = require('../models/PropertyStatusAssets'); // 載入房屋物件的 Mongoose 資料模型。
const { geocodeAddress } = require('../utils/geocode'); // 載入地址轉經緯度工具。
const PROPERTY_FEATURES = require('../../shared/propertyFeatures.json'); // 載入前後端共用的物件特色代碼與中文對照表。

// 狀態代碼供資料儲存與篩選使用，顯示文字則由此映射統一管理。
const STATUS_VALUES = ['rented', 'vacant', 'overdue', 'expiring', 'maintenance']; // 定義 API 允許使用的物件狀態代碼。
const STATUS_TEXT_MAP = { // 建立狀態代碼與繁體中文標籤的對照表。
  rented: '出租中', // 將 rented 狀態顯示為「出租中」。
  vacant: '空置招租', // 將 vacant 狀態顯示為「空置招租」。
  overdue: '租金欠繳／逾期待催繳', // 將 overdue 狀態顯示為「租金欠繳／逾期待催繳」。
  expiring: '即將到期', // 將 expiring 狀態顯示為「即將到期」。
  maintenance: '裝修維護', // 將 maintenance 狀態顯示為「裝修維護」。
}; // 結束狀態標籤對照表。

const PROPERTY_FEATURE_CODES = new Set(PROPERTY_FEATURES.map((item) => item.code));
const PROPERTY_FEATURE_VALUE_TO_CODE = Object.fromEntries(
  PROPERTY_FEATURES.map((item) => [item.value, item.code]),
);
const PROPERTY_FEATURE_CODE_TO_VALUE = Object.fromEntries(
  PROPERTY_FEATURES.map((item) => [item.code, item.value]),
);
const featureCodeSchema = z.coerce
  .number()
  .int()
  .refine((code) => PROPERTY_FEATURE_CODES.has(code), {
    message: '無效的物件特色代碼',
  });

function normalizeFeatureCodes(features) {
  if (!Array.isArray(features)) return [];
  return [
    ...new Set(
      features
        .map((item) => (typeof item === 'number' ? item : PROPERTY_FEATURE_VALUE_TO_CODE[item] ?? Number(item)))
        .filter((code) => PROPERTY_FEATURE_CODES.has(code)),
    ),
  ];
}

function mapFeatureCodesToText(features) {
  return normalizeFeatureCodes(features)
    .map((code) => PROPERTY_FEATURE_CODE_TO_VALUE[code])
    .filter(Boolean);
}

const optionalLatitudeSchema = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : value === null ? null : value),
  z.union([z.null(), z.coerce.number().finite().min(-90).max(90)]).optional(),
);

const optionalLongitudeSchema = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : value === null ? null : value),
  z.union([z.null(), z.coerce.number().finite().min(-180).max(180)]).optional(),
);

// 建立與更新共用欄位規則；建立時再透過下方 schema 指定必要欄位及預設值。
const assetBaseSchema = z.object({ // 建立物件欄位的共用 Zod 驗證規則。
  city: z.string().trim().max(30).optional(), // 驗證縣市為去除首尾空白後不超過 30 字元的字串，允許未提供。
  address: z.string().trim().min(1).max(200).optional(), // 驗證地址為去除首尾空白後長度 1 至 200 的字串。
  lat: optionalLatitudeSchema, // 驗證緯度為 -90 至 90 的數值或 null，允許未提供。
  lng: optionalLongitudeSchema, // 驗證經度為 -180 至 180 的數值或 null，允許未提供。
  floor: z.string().trim().max(50).optional(), // 驗證樓層為去除首尾空白後不超過 50 字元的字串，允許未提供。
  roomType: z.string().trim().min(1).max(80).optional(), // 驗證房屋類型為去除首尾空白後長度 1 至 80 的字串。
  area: z.coerce.number().finite().nonnegative().max(100000).optional(), // 驗證坪數為不超過 100000 的有限非負數值。
  status: z.enum(STATUS_VALUES).optional(), // 驗證狀態必須是允許的狀態代碼之一。
  tenantName: z.string().trim().max(100).optional(), // 驗證承租人姓名去除空白後不得超過 100 字元。
  tenantPhone: z.string().trim().max(30).optional(), // 驗證承租人電話去除空白後不得超過 30 字元。
  monthlyRent: z.coerce.number().finite().nonnegative().max(1000000000).optional(), // 驗證月租金為不超過上限的有限非負數值。
  deposit: z.coerce.number().finite().nonnegative().max(1000000000).optional(), // 驗證押金為不超過上限的有限非負數值。
  managementFee: z.coerce.number().finite().nonnegative().max(1000000000).optional(), // 驗證管理費為不超過上限的有限非負數值。
  leaseEndDate: z // 開始定義租約到期日的字串驗證規則。
    .string() // 要求租約到期日以字串形式傳入。
    .trim() // 移除日期字串前後的空白。
    .refine((value) => value === '' || !Number.isNaN(Date.parse(value)), { // 確認日期字串為空或可被 JavaScript 日期解析器解析。
      message: '租約到期日格式錯誤', // 日期無法解析時提供明確的驗證錯誤訊息。
    }) // 結束租約日期的自訂驗證規則。
    .optional(), // 允許更新請求省略租約到期日欄位。
  overdueDays: z.coerce.number().int().nonnegative().max(36500).optional(), // 驗證欠繳天數為不超過 36500 的整數非負值。
  overdueAmount: z.coerce.number().finite().nonnegative().max(1000000000).optional(), // 驗證欠繳金額為不超過上限的有限非負數值。
  maintenanceReason: z.string().trim().max(200).optional(), // 驗證維修原因去除空白後不得超過 200 字元。
  notes: z.string().trim().max(1000).optional(), // 驗證備註去除空白後不得超過 500 字元。
  features: z.array(featureCodeSchema).max(PROPERTY_FEATURES.length).optional(),
  imageUrl: z.string().trim().max(2800000).refine(
    (value) => value === '' || /^data:image\/(jpeg|png|webp);base64,/i.test(value),
    { message: '圖片格式僅支援 JPG、PNG 或 WebP' },
  ).optional(),
  imageUrls: z.array(z.string().trim().max(2800000).refine(
    (value) => /^data:image\/(jpeg|png|webp);base64,/i.test(value),
    { message: '圖片格式僅支援 JPG、PNG 或 WebP' },
  )).max(10).optional(),
}); // 結束物件欄位的共用驗證規則。
//沒有 .optional() 或 .default() 的欄位就是必填
const createAssetSchema = assetBaseSchema.extend({ // 擴充共用規則，定義新增物件時的必填欄位與預設值。
  city: z.string().trim().max(30).default(''), // 新增物件時允許縣市留空，預設為空字串。
  address: z.string().trim().min(1).max(200), // 新增物件時要求提供有效地址。*必填
  floor: z.string().trim().max(50).default(''), // 新增物件時允許樓層留空。
  roomType: z.string().trim().min(1).max(80), // 新增物件時要求提供有效房屋類型。*必填
  area: z.coerce.number().finite().nonnegative().max(100000), // 新增物件時要求提供有限且非負的坪數。
  status: z.enum(STATUS_VALUES), // 新增物件時要求提供有效狀態代碼。*必填
  tenantName: z.string().trim().max(100).default(''), // 未提供承租人姓名時預設為空字串。
  tenantPhone: z.string().trim().max(30).default(''), // 未提供承租人電話時預設為空字串。
  monthlyRent: z.coerce.number().finite().nonnegative().max(1000000000), // 新增物件時要求提供有效的月租金。*必填
  deposit: z.coerce.number().finite().nonnegative().max(1000000000).default(0), // 未提供押金時預設為零。
  managementFee: z.coerce.number().finite().nonnegative().max(1000000000).default(0), // 未提供管理費時預設為零。
  leaseEndDate: z.string().trim().refine((value) => value === '' || !Number.isNaN(Date.parse(value)), { // 新增物件時允許空值或有效租約日期。
    message: '租約到期日格式錯誤', // 日期格式不正確時回傳明確訊息。
  }).optional(), // 結束新增資料的租約日期驗證。
  overdueDays: z.coerce.number().int().nonnegative().max(36500).default(0), // 未提供欠繳天數時預設為零。
  overdueAmount: z.coerce.number().finite().nonnegative().max(1000000000).default(0), // 未提供欠繳金額時預設為零。
  maintenanceReason: z.string().trim().max(200).default(''), // 未提供維修原因時預設為空字串。
  notes: z.string().trim().max(1000).default(''), // 未提供備註時預設為空字串。
  features: z.array(featureCodeSchema).max(PROPERTY_FEATURES.length).default([]),
  imageUrl: z.string().trim().max(2800000).refine(
    (value) => value === '' || /^data:image\/(jpeg|png|webp);base64,/i.test(value),
    { message: '圖片格式僅支援 JPG、PNG 或 WebP' },
  ).default(''),
  imageUrls: z.array(z.string().trim().max(2800000).refine(
    (value) => /^data:image\/(jpeg|png|webp);base64,/i.test(value),
    { message: '圖片格式僅支援 JPG、PNG 或 WebP' },
  )).max(10).default([]),
}); // 結束新增物件的驗證規則。

// 更新僅接受明確列出的欄位，並拒絕房號等未授權欄位。
const updateAssetSchema = assetBaseSchema.strict(); // 建立嚴格更新規則，拒絕白名單以外的欄位。
const listQuerySchema = z.object({ // 建立清單查詢參數的驗證規則。
  status: z.enum(['all', ...STATUS_VALUES]).optional(), // 僅允許查詢全部或指定的有效狀態。
  q: z.string().trim().max(100).optional(), // 驗證關鍵字長度不得超過 100 字元。
}); // 結束清單查詢參數驗證規則。

const geocodeQuerySchema = z.object({
  city: z.string().trim().max(30).optional().default(''),
  address: z.string().trim().max(200).optional().default(''),
});

const optionalNonNegativeNumber = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? undefined : value),
  z.coerce.number().finite().nonnegative().max(1000000000).optional(),
);

const optionalBoundLatitude = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? undefined : value),
  z.coerce.number().finite().min(-90).max(90).optional(),
);

const optionalBoundLongitude = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? undefined : value),
  z.coerce.number().finite().min(-180).max(180).optional(),
);

const publicVacantQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().trim().max(30).optional(),
  roomType: z.string().trim().max(80).optional(),
  minRent: optionalNonNegativeNumber,
  maxRent: optionalNonNegativeNumber,
  managementFeeType: z.enum(['all', 'included', 'extra']).optional(),
  layout: z.string().trim().max(50).optional(),
  sort: z.enum(['newest', 'rent_asc', 'rent_desc', 'area_desc']).optional(),
  north: optionalBoundLatitude,
  south: optionalBoundLatitude,
  east: optionalBoundLongitude,
  west: optionalBoundLongitude,
});

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toTitleCase(value) { // 定義字串正規化函式。
  return String(value ?? '').trim(); // 將空值轉成空字串並移除首尾空白。
} // 結束字串正規化函式。

// 將已驗證的輸入轉成一致的資料型別與狀態顯示文字，再交由 Model 儲存。
function normalizeAssetPayload(payload) { // 定義物件資料正規化函式。
  const imageUrls = Array.isArray(payload.imageUrls)
    ? payload.imageUrls
    : payload.imageUrl
      ? [payload.imageUrl]
      : [];
  return { // 回傳欄位型別與格式統一後的物件資料。
    city: toTitleCase(payload.city ?? ''), // 正規化縣市字串。
    address: toTitleCase(payload.address), // 正規化地址字串。
    lat: typeof payload.lat === 'number' && Number.isFinite(payload.lat) ? payload.lat : null,
    lng: typeof payload.lng === 'number' && Number.isFinite(payload.lng) ? payload.lng : null,
    floor: toTitleCase(payload.floor), // 正規化樓層字串。
    roomType: toTitleCase(payload.roomType), // 正規化房屋類型字串。
    area: Number(payload.area), // 將坪數轉成數值型別。
    status: payload.status, // 保留已驗證的狀態代碼。
    tenantName: toTitleCase(payload.tenantName ?? ''), // 正規化承租人姓名並處理空值。
    tenantPhone: String(payload.tenantPhone ?? '').trim(), // 將承租人電話轉成字串並移除首尾空白。
    monthlyRent: Number(payload.monthlyRent), // 將月租金轉成數值型別。
    deposit: Number(payload.deposit ?? 0), // 將押金轉成數值，未提供時使用零。
    managementFee: Number(payload.managementFee ?? 0), // 將管理費轉成數值，未提供時使用零。
    leaseEndDate: payload.leaseEndDate ? new Date(payload.leaseEndDate) : null, // 將到期日轉成日期，缺值時儲存 null。
    overdueDays: Number(payload.overdueDays ?? 0), // 將欠繳天數轉成數值，未提供時使用零。
    overdueAmount: Number(payload.overdueAmount ?? 0), // 將欠繳金額轉成數值，未提供時使用零。
    maintenanceReason: String(payload.maintenanceReason ?? '').trim(), // 將維修原因轉成字串並移除首尾空白。
    notes: String(payload.notes ?? '').trim(), // 將備註轉成字串並移除首尾空白。
    features: normalizeFeatureCodes(payload.features),
    featuresText: mapFeatureCodesToText(payload.features),
    imageUrl: imageUrls[0] || '',
    imageUrls,
    statusText: STATUS_TEXT_MAP[payload.status], // 依狀態代碼產生一致的繁體中文標籤。
  }; // 結束正規化資料物件。
} // 結束物件資料正規化函式。

// 將 Mongoose 文件或純物件轉成前端使用的 API 格式。
function serializeAsset(asset) { // 定義 API 回應序列化函式。
  const normalized = asset.toObject ? asset.toObject() : asset; // 將 Mongoose 文件轉成一般物件，或直接使用傳入物件。
  const imageUrls = Array.isArray(normalized.imageUrls) && normalized.imageUrls.length
    ? normalized.imageUrls
    : normalized.imageUrl
      ? [normalized.imageUrl]
      : [];

  return { // 回傳符合前端資料契約的物件內容。
    id: String(normalized._id), // 將 MongoDB 文件識別碼轉成字串 id。
    roomNumber: normalized.roomNumber, // 回傳由系統產生的房屋編號。
    city: normalized.city || '', // 回傳縣市，缺值時使用空字串。
    address: normalized.address || '', // 回傳地址，缺值時使用空字串。
    lat: typeof normalized.lat === 'number' && Number.isFinite(normalized.lat) ? normalized.lat : null,
    lng: typeof normalized.lng === 'number' && Number.isFinite(normalized.lng) ? normalized.lng : null,
    floor: normalized.floor || '', // 回傳樓層，缺值時使用空字串。
    roomType: normalized.roomType || '', // 回傳房屋類型，缺值時使用空字串。
    area: Number(normalized.area || 0), // 將坪數整理為數值，缺值時使用零。
    status: normalized.status, // 回傳狀態代碼。
    statusText: STATUS_TEXT_MAP[normalized.status] || normalized.statusText || '空置招租', // 優先依狀態代碼產生標籤，缺值時使用既有文字或預設標籤。
    tenantName: normalized.tenantName || '', // 回傳承租人姓名，缺值時使用空字串。
    tenantPhone: normalized.tenantPhone || '', // 回傳承租人電話，缺值時使用空字串。
    monthlyRent: Number(normalized.monthlyRent || 0), // 將月租金整理為數值，缺值時使用零。
    deposit: Number(normalized.deposit || 0), // 將押金整理為數值，缺值時使用零。
    managementFee: Number(normalized.managementFee || 0), // 將管理費整理為數值，缺值時使用零。
    leaseEndDate: normalized.leaseEndDate ? new Date(normalized.leaseEndDate).toISOString() : '', // 將有效到期日轉成 ISO 8601 字串，缺值時使用空字串。
    overdueDays: Number(normalized.overdueDays || 0), // 將欠繳天數整理為數值，缺值時使用零。
    overdueAmount: Number(normalized.overdueAmount || 0), // 將欠繳金額整理為數值，缺值時使用零。
    maintenanceReason: normalized.maintenanceReason || '', // 回傳維修原因，缺值時使用空字串。
    notes: normalized.notes || '', // 回傳備註，缺值時使用空字串。
    features: normalizeFeatureCodes(normalized.features),
    featuresText: mapFeatureCodesToText(normalized.features),
    imageUrl: imageUrls[0] || '',
    imageUrls,
  }; // 結束 API 回應物件。
} // 結束 API 回應序列化函式。

// 房屋編號由伺服器產生；先檢查候選值，並以重試降低隨機編號碰撞機率。
async function generateRoomNumber() { // 定義非同步房屋編號產生函式。
  const base = `A${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`; // 以日期建立房屋編號前綴。

  for (let attempt = 0; attempt < 12; attempt += 1) { // 最多嘗試產生十二個不重複的房屋編號。
    const suffix = String(crypto.randomInt(1000, 9999)); // 產生隨機數字作為房屋編號尾碼。
    const roomNumber = `${base}-${suffix}`; // 組合房屋編號前綴與隨機尾碼。
    const existing = await PropertyStatusAsset.exists({ roomNumber }); // 查詢資料庫確認候選房屋編號是否已存在。
    if (!existing) { // 候選房屋編號不存在時即可使用。
      return roomNumber; // 回傳可用的房屋編號。
    } // 結束房屋編號不存在時的處理。
  } // 結束房屋編號重試迴圈。

  throw new Error('房屋編號生成失敗'); // 重試仍無法產生房屋編號時拋出錯誤。
} // 結束房屋編號產生函式。

// 首頁顯示清單（僅回傳公開招租欄位，絕不包含承租人個資與內部財務欄位）
function serializePublicAsset(asset) {
  const normalized = asset.toObject ? asset.toObject() : asset;
  const imageUrls = Array.isArray(normalized.imageUrls) && normalized.imageUrls.length
    ? normalized.imageUrls
    : normalized.imageUrl
      ? [normalized.imageUrl]
      : [];

  return {
    id: String(normalized._id),
    roomNumber: normalized.roomNumber,
    city: normalized.city || '',
    address: normalized.address || '',
    lat: typeof normalized.lat === 'number' && Number.isFinite(normalized.lat) ? normalized.lat : null,
    lng: typeof normalized.lng === 'number' && Number.isFinite(normalized.lng) ? normalized.lng : null,
    floor: normalized.floor || '',
    roomType: normalized.roomType || '',
    area: Number(normalized.area || 0),
    status: 'vacant',
    statusText: STATUS_TEXT_MAP.vacant,
    monthlyRent: Number(normalized.monthlyRent || 0),
    managementFee: Number(normalized.managementFee || 0),
    notes: normalized.notes || '',
    features: normalizeFeatureCodes(normalized.features),
    featuresText: mapFeatureCodesToText(normalized.features),
    imageUrl: imageUrls[0] || '',
    imageUrls,
  };
}

const PUBLIC_LAYOUT_PATTERNS = {
  '1房': '1\\s*房|一房',
  '2房': '2\\s*房|二房|兩房',
  '3房以上': '[3-9]\\s*房|[1-9][0-9]+\\s*房|三房|四房|五房|六房',
  '開放式/套房': '開放式|套房|雅房',
  '車位': '車位',
};

const PUBLIC_SORT_MAP = {
  newest: { createdAt: -1 },
  rent_asc: { monthlyRent: 1, createdAt: -1 },
  rent_desc: { monthlyRent: -1, createdAt: -1 },
  area_desc: { area: -1, createdAt: -1 },
};

// 首頁顯示清單：強制只查詢空置招租（vacant）物件，並支援公開搜尋與多維度篩選
async function listPublicVacantAssets(req, res) {
  const parsed = publicVacantQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: '查詢參數格式錯誤' });
  }


  const { q, city, roomType, minRent, maxRent, managementFeeType, layout, sort, north, south, east, west } = parsed.data;

  const andConditions = [{ status: 'vacant' }];

  if (
    north !== undefined &&
    south !== undefined &&
    east !== undefined &&
    west !== undefined
  ) {
    andConditions.push({
      lat: { $gte: Math.min(south, north), $lte: Math.max(south, north) },
      lng: { $gte: Math.min(west, east), $lte: Math.max(west, east) },
    });
  }

  if (q) {
    const keywordRegex = new RegExp(escapeRegExp(q), 'i');
    andConditions.push({
      $or: [
        { roomNumber: keywordRegex },
        { city: keywordRegex },
        { address: keywordRegex },
        { roomType: keywordRegex },
        { notes: keywordRegex },
      ],
    });

  }

  if (city && city !== 'all' && city !== '全部' && city !== '不限') {
    const cityPattern = escapeRegExp(city).replace(/[台臺]/g, '[台臺]');
    const cityRegex = new RegExp(cityPattern, 'i');
    andConditions.push({
      $or: [
        { city: cityRegex },
        {
          $and: [
            { $or: [{ city: '' }, { city: { $exists: false } }] },
            { address: cityRegex },
          ],
        },
      ],
    });
  }

  if (roomType && roomType !== 'all' && roomType !== '全部') {
    const roomTypeRegex = new RegExp(escapeRegExp(roomType), 'i');
    andConditions.push({ roomType: roomTypeRegex });
  }

  if (minRent !== undefined || maxRent !== undefined) {
    const rentCondition = {};
    if (minRent !== undefined) {
      rentCondition.$gte = minRent;
    }
    if (maxRent !== undefined) {
      rentCondition.$lte = maxRent;
    }
    andConditions.push({ monthlyRent: rentCondition });
  }

  if (managementFeeType === 'included') {
    andConditions.push({ managementFee: { $lte: 0 } });
  } else if (managementFeeType === 'extra') {
    andConditions.push({ managementFee: { $gt: 0 } });
  }

  if (layout && layout !== 'all' && layout !== '不限') {
    const pattern = PUBLIC_LAYOUT_PATTERNS[layout] || escapeRegExp(layout);
    const layoutRegex = new RegExp(pattern, 'i');
    andConditions.push({
      $or: [
        { roomType: layoutRegex },
        { notes: layoutRegex },
      ],
    });
  }

  const query = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
  const sortOrder = PUBLIC_SORT_MAP[sort || 'newest'] || PUBLIC_SORT_MAP.newest;

  const assets = await PropertyStatusAsset.find(query).sort(sortOrder).lean();
  return res.json(assets.map((asset) => serializePublicAsset(asset)));
}
// 取得房屋編號物件清單
async function listPropertyAssets(req, res) {
  // 驗證篩選條件，並依狀態與關鍵字組合資料庫查詢。
  const parsed = listQuerySchema.safeParse(req.query); // 驗證清單查詢參數。
  if (!parsed.success) { // 查詢參數不符合規則時回傳錯誤。
    return res.status(400).json({ message: '查詢參數格式錯誤' }); // 以 HTTP 400 回應參數格式錯誤。
  }

  const { status, q } = parsed.data; // 取出已驗證的狀態篩選與關鍵字。
  const query = {}; // 初始化資料庫查詢條件。

  if (status && status !== 'all') { // 指定狀態且不是全部時才套用狀態條件。
    query.status = status; // 將指定狀態加入查詢條件。
  }

  if (q) { // 提供關鍵字時才加入文字搜尋條件。
    const keyword = q.trim(); // 移除關鍵字前後空白。
    query.$or = [ // 以任一欄位符合關鍵字作為搜尋條件。
      { roomNumber: { $regex: keyword, $options: 'i' } }, // 不區分大小寫搜尋房屋編號。
      { city: { $regex: keyword, $options: 'i' } }, // 不區分大小寫搜尋縣市。
      { address: { $regex: keyword, $options: 'i' } }, // 不區分大小寫搜尋地址。
      { tenantName: { $regex: keyword, $options: 'i' } }, // 不區分大小寫搜尋承租人姓名。
      { roomType: { $regex: keyword, $options: 'i' } }, // 不區分大小寫搜尋房屋類型。
    ];
  }

  const assets = await PropertyStatusAsset.find(query).sort({ createdAt: -1 }).lean(); // 依建立時間由新到舊查詢物件清單。
  return res.json(assets.map((asset) => serializeAsset(asset))); // 將每筆資料序列化後回傳 JSON 清單。
}
// 取得單筆物件
async function getPropertyAssetById(req, res) {
  // 先確認路徑參數是有效的 MongoDB ID，再查詢並序列化回應。
  const id = req.params.id; // 從路徑參數讀取物件識別碼。
  if (!mongoose.isValidObjectId(id)) { // 識別碼不是有效的 MongoDB ObjectId 時回傳錯誤。
    return res.status(400).json({ message: '無效的資產 ID' }); // 以 HTTP 400 回應無效識別碼。
  }

  const asset = await PropertyStatusAsset.findById(id).lean(); // 依識別碼查詢物件並取得一般物件結果。
  if (!asset) { // 查詢結果不存在時回傳找不到資源。
    return res.status(404).json({ message: '找不到房屋物件' }); // 以 HTTP 404 回應物件不存在。
  }

  return res.json(serializeAsset(asset)); // 序列化物件資料後回傳 JSON。
}
// 新增房屋物件
async function createPropertyAsset(req, res) {
  // 驗證並正規化建立資料；房號由伺服器產生，避免用戶端指定。
  const parsed = createAssetSchema.safeParse(req.body); // 依新增規則驗證請求內容。
  if (!parsed.success) { // 請求內容不符合新增規則時回傳錯誤。
    return res.status(400).json({ message: parsed.error.issues[0]?.message || '輸入格式錯誤' }); // 回傳首個欄位驗證訊息，讓用戶可修正輸入。
  }

  const payload = normalizeAssetPayload(parsed.data); // 將驗證後的請求內容正規化。
  if ((payload.lat === null || payload.lng === null) && (payload.city || payload.address)) {
    const coords = await geocodeAddress(payload.city, payload.address);
    if (coords) {
      payload.lat = coords.lat;
      payload.lng = coords.lng;
    }
  }
  let roomNumber; // 宣告變數以保存伺服器產生的房號。

  try { // 開始處理房號產生可能發生的錯誤。
    roomNumber = await generateRoomNumber(); // 產生尚未使用的房屋編號。
  } catch (error) { // 捕捉房號產生失敗的錯誤。
    return res.status(409).json({ message: '房號生成失敗，請稍後再試' }); // 以 HTTP 409 回應房號無法產生。
  }

  try { // 開始建立資料庫物件並處理唯一索引衝突。
    const asset = await PropertyStatusAsset.create({ // 建立新的房屋物件文件。
      ...payload, // 加入正規化後的物件欄位。
      roomNumber, // 加入由伺服器產生的房號。
    });

    return res.status(201).json(serializeAsset(asset)); // 以 HTTP 201 回傳新建物件資料。
  } catch (error) { // 捕捉建立物件時可能發生的資料庫錯誤。
    if (error?.code === 11000 && error?.keyPattern?.roomNumber) { // 判斷是否發生房號唯一索引衝突。
      return res.status(409).json({ message: '房號已存在，請稍後再試' }); // 以 HTTP 409 回應房號衝突。
    }
    throw error; // 將其他非預期錯誤交由 Express 錯誤處理中介軟體處理。
  }
}
// 更新房屋物件
async function updatePropertyAsset(req, res) {
  // 僅更新白名單欄位，並依更新後的狀態同步產生狀態顯示文字。
  const id = req.params.id; // 從路徑參數讀取待更新物件的識別碼。
  if (!mongoose.isValidObjectId(id)) { // 識別碼不是有效的 MongoDB ObjectId 時回傳錯誤。
    return res.status(400).json({ message: '無效的資產 ID' }); // 以 HTTP 400 回應無效識別碼。
  }

  const parsed = updateAssetSchema.safeParse(req.body); // 依更新白名單驗證請求內容。
  if (!parsed.success) { // 請求內容不符合更新規則時回傳錯誤。
    return res.status(400).json({ message: '輸入格式錯誤' }); // 以 HTTP 400 回應輸入格式錯誤。
  }

  const existing = await PropertyStatusAsset.findById(id); // 查詢目前存在的物件資料。
  if (!existing) { // 查無物件時回傳找不到資源。
    return res.status(404).json({ message: '找不到房屋物件' }); // 以 HTTP 404 回應物件不存在。
  }

  const payload = normalizeAssetPayload({ // 合併既有資料與更新欄位後進行正規化。
    ...existing.toObject(), // 先以資料庫既有欄位作為完整物件內容。
    ...parsed.data, // 再以通過驗證的欄位覆蓋既有值。
  });

  const hasManualCoords =
    typeof parsed.data.lat === 'number' &&
    Number.isFinite(parsed.data.lat) &&
    typeof parsed.data.lng === 'number' &&
    Number.isFinite(parsed.data.lng);
  const explicitlyClearedCoords = parsed.data.lat === null && parsed.data.lng === null;
  const locationChanged =
    (parsed.data.city !== undefined && payload.city !== (existing.city || '')) ||
    (parsed.data.address !== undefined && payload.address !== (existing.address || ''));
  const missingCoords = payload.lat === null || payload.lng === null;

  if (
    !hasManualCoords &&
    !explicitlyClearedCoords &&
    (locationChanged || missingCoords) &&
    (payload.city || payload.address)
  ) {
    const coords = await geocodeAddress(payload.city, payload.address);
    if (coords) {
      payload.lat = coords.lat;
      payload.lng = coords.lng;
    } else if (locationChanged && parsed.data.lat === undefined && parsed.data.lng === undefined) {
      payload.lat = null;
      payload.lng = null;
    }
  }

  const nextStatus = payload.status || existing.status; // 取得更新後狀態，未變更時保留原狀態。
  const nextStatusText = STATUS_TEXT_MAP[nextStatus] || payload.statusText || existing.statusText; // 依新狀態同步決定中文標籤。

  const updated = await PropertyStatusAsset.findByIdAndUpdate( // 依識別碼更新資料庫中的物件。
    id, // 指定待更新物件的 MongoDB 識別碼。
    { // 開始提供更新後的欄位內容。
      ...payload, // 加入正規化後的完整物件欄位。
      status: nextStatus, // 儲存更新後的狀態代碼。
      statusText: nextStatusText, // 儲存與狀態代碼一致的中文標籤。
    },
    { new: true, runValidators: true } // 回傳更新後文件，並執行 Mongoose 欄位驗證。
  );

  return res.json(serializeAsset(updated)); // 序列化更新後的物件並回傳 JSON。
}
// 依縣市與地址轉換經緯度（供後台表單「依地址自動定位」使用）
async function geocodePropertyAddress(req, res) {
  const parsed = geocodeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: '地址查詢參數格式錯誤' });
  }

  const { city, address } = parsed.data;
  if (!city && !address) {
    return res.status(400).json({ message: '請先輸入縣市或地址再進行定位' });
  }

  const coords = await geocodeAddress(city, address);
  if (!coords) {
    return res.json({
      lat: null,
      lng: null,
      message: '找不到精準門牌，請直接在地圖上點選或拖曳圖釘定位',
    });
  }

  return res.json({
    lat: Number(coords.lat.toFixed(6)),
    lng: Number(coords.lng.toFixed(6)),
  });
}

// 刪除房屋物件
async function deletePropertyAsset(req, res) {
  // 刪除前檢查 ID；查無資料時回傳明確的 404。
  const id = req.params.id; // 從路徑參數讀取待刪除物件的識別碼。
  if (!mongoose.isValidObjectId(id)) { // 識別碼不是有效的 MongoDB ObjectId 時回傳錯誤。
    return res.status(400).json({ message: '無效的資產 ID' }); // 以 HTTP 400 回應無效識別碼。
  }

  const asset = await PropertyStatusAsset.findByIdAndDelete(id); // 依識別碼刪除物件並取得刪除前文件。
  if (!asset) { // 查無文件表示指定物件不存在。
    return res.status(404).json({ message: '找不到房屋物件' }); // 以 HTTP 404 回應物件不存在。
  }

  return res.status(204).end(); // 以 HTTP 204 回應成功且不包含回應本文。
}

module.exports = { // 匯出控制器函式供 Express 路由使用。
  listPropertyAssets, // 匯出取得物件清單的處理函式。
  getPropertyAssetById, // 匯出取得單筆物件的處理函式。
  createPropertyAsset, // 匯出新增物件的處理函式。
  updatePropertyAsset, // 匯出更新物件的處理函式。
  deletePropertyAsset, // 匯出刪除物件的處理函式。
  geocodePropertyAddress, // 匯出依地址轉換經緯度的處理函式。
  listPublicVacantAssets// 首頁清單
}; 
