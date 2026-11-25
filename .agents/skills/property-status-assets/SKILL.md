---
name: property-status-assets
description: 在 React + Express + MongoDB 專案中維護租屋物件與房屋狀態清單，以及與頂部營運指標、財務收支圖表、管家報修派工的連動。適用於物件清單、狀態篩選、關鍵字搜尋、房屋新增／編輯／刪除、多圖上傳與燈箱檢視、詳細資料側欄，以及其後端 API、Mongoose schema 或前後端串接。
---

# 租屋物件與房屋狀態管理（含營運指標、財務收支與管家派工連動）

本技能用於「房屋人資產 — 智慧物業包租代管系統」的房屋物件清單與 CRUD（新增、讀取、更新、刪除）功能，以及以物件資料為核心延伸的**頂部即時營運指標**、**財務收支圖表**與**管家報修派工**連動。專案前端核心介面建立於 `frontend/src/views/admin/PropertyStatusAssets/`，並與 `frontend/src/layouts/`、`frontend/src/views/admin/FinancialChart.tsx/`、`frontend/src/views/admin/ButlerRepairRequest/` 共用深色黑金（Slate `#090d16` / `#0B1120` + Amber `#f59e0b`）設計系統。

## 開始前

1. 檢查相關頁面、型別、API client、Express 路由、middleware、Mongoose model 與既有驗證方式；沿用專案既有結構，不要另造一套。
2. 確認資料庫欄位與前端型別是否一致。此專案使用 Express、Mongoose、MongoDB，前端共用 `frontend/src/api/api.js` 的 Axios client（`baseURL: /api`、`withCredentials: true`），物件 API 封裝於 `frontend/src/api/propertyStatusAssets.ts`。
3. 不要假設已存在的 UI 已接上資料庫。檢查載入、搜尋、篩選、新增、編輯、刪除、詳細資料、頂部統計指標與財務報表是否實際呼叫 API，並補上缺漏。

## 既有前端與資料需求

沿用 `frontend/src/views/admin/PropertyStatusAssets/` 的卡片網格／橫排列表切換檢視、狀態快捷篩選（含選中高亮狀態）、關鍵字搜尋（含一鍵清除）、新增編輯對話框、自訂刪除確認對話框、圖片輪播燈箱及詳細資料側欄抽屜。以 `frontend/src/types/propertyStatusAssets.ts` 的 `PropertyAsset` 為前後端資料契約基準；如需調整，讓 API 回應與前端型別保持一致。

一筆物件支援以下欄位：

| 欄位 | 用途與規則 |
|---|---|
| `id` | API 回傳的 MongoDB 文件識別碼字串；資料庫仍使用 Mongoose `_id`。 |
| `roomNumber` | 物件／房屋編號，必填，由後端自動產生（格式如 `AYYMMDD-XXXX`）且不可重複；新增與編輯都不可由用戶端任意指定或修改。 |
| `city` | 縣市名稱（例如 `台北市`），選填（0–30 字元），搭配 `TAIWAN_CITIES` 清單供篩選與地圖定位使用。 |
| `address` | 房屋地址，新增時必填（1–200 字元）。 |
| `lat`, `lng` | 經緯度座標（`lat` 介於 `-90` 至 `90`、`lng` 介於 `-180` 至 `180`，未定位為 `null`）；可由後台迷你地圖拖曳圖釘精準設定，未提供時由後端自動地理編碼補算。 |
| `floor` | 樓層（例如 `7F`），選填。 |
| `roomType` | 房屋類型（例如獨立套房、兩房一廳、電梯華廈、透天），新增時必填（1–80 字元）。 |
| `area` | 坪數，為有限且非負的數值。 |
| `status` | 狀態代碼，僅允許 `rented`、`vacant`、`overdue`、`expiring`、`maintenance`。 |
| `statusText` | 與狀態代碼對應的繁體中文標籤，由後端統一映射產生，不接受彼此矛盾的用戶端值。 |
| `tenantName`, `tenantPhone` | 承租人姓名與聯絡電話；當狀態為 `rented`、`expiring`、`overdue` 時前端要求填寫承租人姓名，`vacant`（空置招租）或 `maintenance`（裝修維護）時可留空（後端預設為空字串 `""`）。 |
| `monthlyRent`, `deposit`, `managementFee` | 月租金、押金與管理費；金額應為有限且非負的數值，前端顯示時統一使用 `toLocaleString('zh-TW')` 千分位格式化。 |
| `leaseEndDate` | 租約到期日；出租相關狀態（`rented`、`expiring`、`overdue`）為必填，空置或裝修維護可留空（`""` 或 `null`）。API 回應有值時使用 ISO 8601 字串，無值時回傳 `""`；前端透過 `GetDateYYYYMMDD` 格式化，無效或空日期顯示 `—`（不可顯示 `Invalid date`）。 |
| `overdueDays`, `overdueAmount` | 欠繳天數與金額，非欠繳狀態可省略或為 `0`。當 `overdueAmount > 0` 時，詳細側欄需顯示累計逾期待催繳警示卡與「發送急件催繳通知」操作按鈕。 |
| `maintenanceReason` | 維修原因／派工項目，當狀態為 `maintenance` 時於表單與詳細側欄顯示。 |
| `notes` | 房間設備與備註介紹，支援 Tiptap（`@tiptap/react` + `StarterKit`）富文本 HTML 編輯與唯讀預覽（上限 1000 字元）。 |
| `imageUrl` | 房屋封面圖片的 Data URL（與 `imageUrls[0]` 同步）；選填，僅接受 JPG、PNG 或 WebP 的 Base64 `data:image` 格式，單張原始檔案大小限制為 2MB。 |
| `imageUrls` | 房屋圖片清單；最多 10 張，每張限 JPG、PNG 或 WebP 且原始檔案大小 ≤ 2MB。 |

狀態顯示文字固定對應為：
- `rented` ＝ `出租中`
- `vacant` ＝ `空置招租`
- `overdue` ＝ `租金欠繳／逾期待催繳`
- `expiring` ＝ `即將到期`
- `maintenance` ＝ `裝修維護`

狀態代碼是資料與篩選依據，不要以顯示文字取代代碼。不要把「逾期待催繳」誤認為「預期催繳」；依 UI 現有代碼 `overdue` 表示欠繳。

## 後端實作規格

- 使用 Mongoose model（`backend/models/PropertyStatusAssets.js`）儲存物件。`roomNumber` 必須是唯一字串欄位，並由資料庫唯一索引防止並行新增時產生重複編號。不要把自動生成的編號欄位定義成 ObjectId。
- 編號必須由伺服器端（`backend/controllers/propertyStatusAssets.controller.js` 的 `generateRoomNumber`）產生，採 `A` + 日期 `YYMMDD` + `-` + 4 位隨機碼格式，最多重試檢查 12 次並處理唯一索引衝突（HTTP `409`）。
- 建立獨立的物件路由／controller，掛載於 `/api/property-status-assets`。遵循專案現有 CommonJS 與 Express 錯誤處理模式。
- 所有物件 API 都使用既有 `requireAuth` middleware。
- 使用專案既有 Zod 驗證請求資料與查詢參數：
  - `leaseEndDate` 允許空字串 `""` 或可被 `Date.parse` 解析的有效日期字串；空字串於正規化時存為 `null`。
  - `tenantName` 與 `tenantPhone` 在後端 schema 預設為 `""`，支援空置或裝修維護物件免填承租人。
  - 只允許更新白名單欄位（`updateAssetSchema = assetBaseSchema.strict()`），拒絕用戶端傳入的 `_id`、`roomNumber` 及未定義欄位，避免 mass assignment。
- 端點規格：
  - `GET /api/property-status-assets`：回傳物件清單；支援可選 `status` 與 `q` 查詢參數。`status=all` 或未提供狀態時回傳全部；`q` 可不區分大小寫搜尋 `roomNumber`、`address`、`tenantName` 與 `roomType`。
  - `GET /api/property-status-assets/geocode`：受 `requireAuth` 保護（路由須宣告在 `/:id` **之前**），接受 `city` 與 `address` query 參數，透過 `backend/utils/geocode.js` 回傳 `{ lat, lng }`（查無結果時回傳 `{ lat: null, lng: null, message: '...' }`），供後台表單「依地址自動定位」按鈕使用，避免前端直連第三方 Nominatim 產生 CORS 或限流問題。
  - `GET /api/property-status-assets/:id`：取得單筆詳細資料。
  - `POST /api/property-status-assets`：驗證後建立物件，由後端產生 `roomNumber`，成功回傳 `201` 與序列化後的新物件；若請求已附帶有效 `lat`/`lng` 則直接採用，未提供時才自動呼叫 `geocodeAddress`。
  - `PATCH /api/property-status-assets/:id`：部分更新白名單欄位，不可更改 `roomNumber`，並依更新後的 `status` 自動同步 `statusText`；若用戶端明確傳入 `lat`/`lng`（例如拖曳圖釘校正後），後端須優先保留該座標而不以自動地理編碼覆蓋。
  - `DELETE /api/property-status-assets/:id`：刪除指定物件，成功回傳 `204`。
- 使用一致的 JSON 錯誤格式（`{ "message": "..." }`）：格式或欄位驗證錯誤 `400`、未登入 `401`、找不到物件 `404`、編號衝突 `409`。

## 前端串接與互動規格

- **共用 API Client**：透過 `frontend/src/api/propertyStatusAssets.ts` 呼叫 `frontend/src/api/api.js`，確保自動攜帶 `httpOnly cookie` 與 `401` 自動 refresh token 機制。
- **載入、空狀態與回饋體驗**：
  - 載入期間顯示 8 張卡片的 `Skeleton` 骨架屏（不得加入人工 `setTimeout` 延遲）。
  - 查無符合條件的物件時顯示結構化空狀態卡片，並提供「重設所有篩選條件」按鈕。
  - 新增、更新、刪除物件或點擊「發送急件催繳通知」時，於畫面右下角顯示非阻斷式浮動 Toast 通知。
  - 刪除物件必須透過自訂確認 `Dialog`（顯示房號與地址警示），不使用瀏覽器原生 `window.confirm`。
- **搜尋、狀態篩選與視圖切換**：
  - `TagList.tsx` 根據實際資料即時計算各狀態數量，並高亮標示目前選中的狀態按鈕（`activeStatus`）。
  - 搜尋框支援即時過濾房號、地址、承租人、房型，並在有輸入文字時顯示清除（`×`）按鈕。
  - 支援「卡片網格（`EventListViewCardOpaz`）」與「列表橫排（`EventListViewCardCol`）」兩種檢視切換，且切換按鈕需顯示當前選中態。
- **狀態色彩與資料格式**：
  - 統一沿用狀態色票：出租中 `emerald-400`（`.status-rented`）、即將到期 `amber-400`（`.status-expiring`）、租金欠繳 `rose-400`（`.status-overdue` / `.status-badge`）、裝修維護 `purple-400`（`.status-maintenance`）、空置招租 `slate-400`（`.status-vacant`）。
  - 所有金額（月租金、管理費、押金、逾期金額）均以 `NT$ ${Number(amount || 0).toLocaleString('zh-TW')}` 顯示。
  - 未設定承租人時顯示「待招租」或「待招租 / 尚無房客」；無圖片時顯示建築圖示預設佔位封面（`尚未上傳物件實景`），確保卡片高度一致。
- **跨模組即時連動**：
  - **頂部 Header 與側邊欄（`frontend/src/layouts/index.tsx`、`app-sidebar.tsx`）**：當物件清單載入、新增、修改或刪除時，觸發 `window.dispatchEvent(new CustomEvent('property-assets-updated'))`，讓頂部 Header 的「託管出租率」、「逾期待催繳戶數與金額」及側邊欄的「房態與資產盤總數徽章」、「管家報修派工待處理徽章」即時同步更新。
  - **管家報修派工連動（`/butler-repair-request`）**：點擊詳細側欄抽屜底部的「指派管家勘查或點交」按鈕時，導向 `/butler-repair-request?room=<房號>&address=<地址>&tenant=<承租人>`，自動開啟新增派工單對話框並帶入該物件資訊；同時處於 `maintenance` 狀態的物件會自動同步至派工清單。
  - **財務收支圖表連動（`/financial-chart`）**：直接讀取 `/api/property-status-assets` 資料，即時計算本月應收租金總額、預估實收淨額、收現達成率、逾期待催繳總額、保管押金水位、平均每坪租金坪效、各房型收益佔比，並支援匯出 UTF-8 BOM CSV 財務報表。

## 地圖拖曳定位與經緯度校正規格（`EditDialog.tsx`）

為消除免費地址轉座標（Nominatim）對台灣巷弄門牌的誤差，後台新增／編輯對話框（`EditDialog.tsx`）比照 591 刊登體驗，整合迷你 Leaflet 互動地圖供管理員手動確認與微調位置：

- **元件拆分**：建立 `frontend/src/views/admin/PropertyStatusAssets/LocationPickerMap.tsx`，封裝 `react-leaflet`（v4）`MapContainer`、`TileLayer` 與可拖曳 `Marker`（`draggable={true}`），並處理在 `Dialog` 開啟時呼叫 `map.invalidateSize()` 避免圖磚顯示不全或灰塊。
- **表單欄位與型別同步**：
  - `frontend/src/types/propertyStatusAssets.ts` 的 `PropertyAsset` 與 `PropertyAssetInput` 補上 `lat?: number | null`、`lng?: number | null`。
  - `frontend/src/api/propertyStatusAssets.ts` 新增 `geocodePropertyAddressApi({ city, address })` 呼叫 `GET /api/property-status-assets/geocode`。
- **互動流程**：
  1. **初始視角**：編輯既有物件且已有有效 `lat`/`lng` 時，迷你地圖自動聚焦該座標（`zoom: 16`）並顯示圖釘；若尚無座標，則依所選 `city`（`getCityMapView(form.city)`）定位至該縣市中心，尚未放置圖釘並提示管理員點擊定位。
  2. **依地址自動定位**：在地址欄位旁或迷你地圖標題列提供「依地址自動定位」按鈕，點擊後呼叫 `geocodePropertyAddressApi`；成功時將圖釘移至回傳座標並平滑 `flyTo`，失敗時顯示友善提示（如「找不到精準門牌，請直接在地圖上點選位置」）。
  3. **點擊地圖與拖曳圖釘微調**：管理員可**直接點擊地圖任一處**放置圖釘，或**按住圖釘拖曳**至正確大樓／路口，即時更新 `form.lat` 與 `form.lng`（四捨五入至小數點後 6 位）。
  4. **座標顯示與重設**：地圖統一使用標準 OpenStreetMap 圖磚方便辨識街道與門牌（不需要深色底圖）；地圖下方顯示目前經緯度數值（例如 `25.033964, 121.564468`）或「尚未精準定位」狀態，並提供「清除定位」按鈕將 `lat`/`lng` 重設為 `null`。
  5. **送出規則**：表單送出時一併傳送 `lat`、`lng`；若使用者手動定位過，後端直接保存該精準座標，前台 `/map` 地圖找房將即時以精準標記呈現（不再顯示為約略位置）。

## 圖片新增、預覽與燈箱規格

- 新增及編輯表單（`EditDialog.tsx`）提供視覺化圖片上傳區，支援 `multiple` 多選圖片並即時顯示縮圖預覽（第一張標示為「封面」）。
- 編輯時可保留、單獨移除既有圖片並追加新圖片；單筆物件最多保留 10 張圖片，超出上限時明確提示剩餘可上傳張數。
- 前端只接受 `image/jpeg`、`image/png`、`image/webp`，並限制單張原始檔案大小不得超過 2MB。
- 透過 `FileReader.readAsDataURL` 轉為 Base64 Data URL，同步寫入表單的 `imageUrls`（完整陣列）與 `imageUrl`（第一張封面圖）。
- 後端 Express `express.json({ limit: '30mb' })` 支援最多 10 張 2MB 圖片的 Base64 傳輸；Zod 驗證每張圖片格式須符合 `^data:image/(jpeg|png|webp);base64,`。
- 詳細側欄抽屜（`DrawerContent`）使用 `Carousel` 輪播呈現多張圖片，點擊任一圖片可開啟全螢幕 `Dialog` Lightbox 放大檢視與左右切換。

## 驗收與測試

沿用專案已安裝的工具驗證：

- 未登入請求所有物件 API 會收到 `401`。
- 登入後能新增、讀取清單與單筆、編輯及刪除物件，且新增／編輯／刪除後頂部 Header 的「託管出租率」與「逾期待催繳」統計會即時同步。
- 新增物件的 `roomNumber` 由伺服器產生且唯一；用戶端不能指定或修改編號。
- 空置招租（`vacant`）或裝修維護（`maintenance`）狀態下，不填寫承租人或租約到期日仍可正常新增與儲存；出租相關狀態（`rented`、`expiring`、`overdue`）則需驗證承租人與到期日。
- 無效狀態、缺少必填欄位、無效 ID 與錯誤數值會得到適當的 `400`；不存在的物件得到 `404`；重複編號得到 `409`。
- 若修改前端，執行 `npm --prefix frontend run build` 確認 TypeScript 與 Vite 打包通過無誤；若修改後端，使用 `node -c` 檢查語法並確認 API 行為正常。
