---
name: dashboard
description: 在 React + Express + MongoDB 專案中實作與維護公開首頁（Dashboard 首頁／租屋搜尋平台）。此頁免登入驗證即可瀏覽，供房客透過地點、房屋類型（整層住家、獨立套房、分租套房、雅房、車位）、租金區間、是否含管理費、格局等條件搜尋空置招租物件，並以卡片網格與詳細資訊呈現。
---

# 公開租屋搜尋首頁（Dashboard 首頁）

本技能用於「房屋人資產 — 智慧物業包租代管系統」的公開租屋首頁（路由 `/`）。此頁面**不需任何登入或身份驗證**即可觀看，主要用途是讓潛在房客瀏覽所有「空置招租（`vacant`）」的物件，並透過多元篩選條件快速找到合適的租屋處。

專案前端首頁建立於 `frontend/src/views/dashboard/Home.jsx`，API 封裝於 `frontend/src/api/home.ts`；後端則複用 `backend/controllers/propertyStatusAssets.controller.js` 的 `serializePublicAsset()` 與 `listPublicVacantAssets()`，並透過 `backend/routes/propertyStatusAssets.routes.js` 暴露公開端點。

## 開始前

1. 檢查相關頁面、API client、Express 路由與 controller；沿用專案既有結構與深色黑金（Slate `#090d16` / `#0B1120` + Amber `#f59e0b`）或專案一致的現代質感視覺風格。
2. 確認公開 API 的路由順序：公開端點必須掛載在 `router.use(requireAuth)` **之前**，確保未登入訪客不會收到 `401 Unauthorized`。
3. 確認資料隱私與安全性：公開首頁 API 只能回傳 `serializePublicAsset()` 過濾後的公開招租欄位，**絕對不可**洩漏承租人姓名（`tenantName`）、承租人電話（`tenantPhone`）、租約到期日（`leaseEndDate`）、欠繳天數／金額（`overdueDays` / `overdueAmount`）或內部維修原因（`maintenanceReason`）。

## 資料契約與公開欄位規格

後端透過 `serializePublicAsset(asset)` 將 Mongoose 文件轉換為前端公開首頁使用的格式，單筆公開物件僅包含以下欄位：

| 欄位 | 型別 | 用途與規則 |
|---|---|---|
| `id` | `string` | MongoDB 文件識別碼字串（由 `_id` 轉換）。 |
| `roomNumber` | `string` | 系統產生的房屋編號（如 `A261120-1234`），可供房客詢問或預約看房時報號。 |
| `address` | `string` | 房屋地址／地點（用於地點關鍵字或區域搜尋）。 |
| `floor` | `string` | 樓層資訊（例如 `7F`）。 |
| `roomType` | `string` | 房屋類型／格局描述（例如：整層住家、獨立套房、分租套房、雅房、車位，或含「兩房一廳」等格局字樣）。 |
| `area` | `number` | 坪數，為有限非負數值。 |
| `status` | `string` | 狀態代碼，公開首頁固定僅顯示 `'vacant'`。 |
| `statusText` | `string` | 狀態顯示文字，固定對應為 `'空置招租'`。 |
| `monthlyRent` | `number` | 月租金（NT$），前端顯示時使用 `toLocaleString('zh-TW')` 千分位格式化。 |
| `managementFee` | `number` | 每月管理費（NT$）。若為 `0` 表示「含管理費／免管理費」；若 `> 0` 則顯示具體管理費金額。 |
| `notes` | `string` | 房間設備、格局補充與特色介紹（支援 Tiptap HTML 內容安全渲染或純文字摘要）。 |
| `imageUrl` | `string` | 封面圖片（`imageUrls[0]` 或空字串）。 |
| `imageUrls` | `string[]` | 房屋實景圖片陣列（Base64 Data URL，最多 10 張）。 |

## 後端實作規格

- **檔案位置**：
  - Controller：`backend/controllers/propertyStatusAssets.controller.js` 中的 `serializePublicAsset()` 與 `listPublicVacantAssets()`。
  - Routes：`backend/routes/propertyStatusAssets.routes.js` 中的 `router.get('/public/vacant', propertyStatusAssetsController.listPublicVacantAssets)`（必須置於 `router.use(requireAuth)` 之上）。
- **查詢與篩選邏輯（`listPublicVacantAssets`）**：
  - **強制限定空置物件**：查詢條件固定鎖定 `status: 'vacant'`，不可讓用戶端透過 query string 覆寫或查詢到已出租（`rented`）、欠繳（`overdue`）、即將到期（`expiring`）或裝修維護（`maintenance`）的非公開物件。
  - **支援搜尋與篩選參數**（可於後端查詢或搭配前端即時篩選）：
    - `q` / 地點與關鍵字：不區分大小寫模糊搜尋 `address`、`roomNumber`、`roomType`、`notes`。
    - 類型（`roomType` / `category`）：支援篩選「整層住家」、「獨立套房」、「分租套房」、「雅房」、「車位」。
    - 租金區間（`minRent`、`maxRent`）：依 `monthlyRent` 進行數值區間過濾。
    - 是否含管理費（`includeManagementFee` / `managementFeeType`）：區分「全部」、「含管理費／免管理費（`managementFee === 0`）」或「需另付管理費（`managementFee > 0`）」。
    - 格局（`layout`）：可透過 `roomType` 或 `notes` 比對格局關鍵字（如 1房、2房、3房、開放式格局等）。
  - 排序方式：預設依建立時間由新到舊（`sort({ createdAt: -1 })`）或支援依租金高低排序。
  - 回應格式：回傳 `200 OK` 與 `assets.map((asset) => serializePublicAsset(asset))` 的 JSON 陣列。

## 前端實作規格

### 1. API 封裝（`frontend/src/api/home.ts`）

- 使用專案共用的 Axios instance（`frontend/src/api/api.js`）。
- 定義公開物件型別 `PublicPropertyAsset`（對應 `serializePublicAsset` 回傳結構）與查詢參數型別 `PublicVacantQueryParams`。
- 匯出查詢函式（如 `getPublicVacantAssetsApi(params)`），發送 `GET /property-status-assets/public/vacant` 請求並回傳清單資料。

### 2. 首頁介面與搜尋互動（`frontend/src/views/dashboard/Home.jsx`）

- **免驗證公開瀏覽**：
  - 掛載於 `frontend/src/views/App.jsx` 的 `<Route index element={<Home />} />`，不包裹在 `<ProtectedRoute />` 內。
  - 頂部導覽列（Header）提供品牌識別，並依據 `useAuth()` 狀態顯示「管理後台（`/admin`）」或「房東／管理員登入（`/login`）」、「註冊（`/register`）」快捷入口。
- **多維度搜尋與篩選列（Search & Filter Bar）**：
  - **地點／關鍵字搜尋**：輸入框支援搜尋地址、路段、行政區、房號或特色關鍵字，並提供清除按鈕。
  - **房屋類型篩選**：提供快捷標籤或下拉選單，包含：`全部`、`整層住家`、`獨立套房`、`分租套房`、`雅房`、`車位`。
  - **租金預算篩選**：提供預設租金區間選項（如：不限、10,000 元以下、10,000–20,000 元、20,000–35,000 元、35,000 元以上）或最低／最高租金輸入。
  - **是否含管理費**：提供篩選選項（如：不限、含管理費／免管理費 `managementFee === 0`、另計管理費 `managementFee > 0`）。
  - **格局篩選**：提供常見格局篩選（如：不限、1 房、2 房、3 房以上、開放式／套房、車位），比對 `roomType` 與 `notes` 內容。
  - **一鍵重設與結果統計**：顯示「共找到 X 間空置招租物件」及「重設篩選條件」按鈕。
- **卡片清單呈現（Property Cards Grid）**：
  - 以響應式卡片網格（Grid）呈現每筆招租物件。
  - **卡片內容包含**：
    - 房屋封面圖片（`imageUrl` 或 `imageUrls[0]`）；若無上傳圖片則顯示質感預設建築佔位圖；若有超過 1 張圖片可標示圖片張數徽章（如 `1/5`）。
    - 房屋類型標籤（`roomType`）、樓層徽章（`floor`）與坪數（`area` 坪）。
    - 明顯標示「空置招租」狀態徽章與「免管理費／含管理費」或「管理費 NT$ X/月」標籤。
    - 房屋地址／地點（`address`）與系統房號（`roomNumber`）。
    - 月租金價格（`NT$ ${monthlyRent.toLocaleString('zh-TW')} / 月`）。
    - 房間設備與介紹摘要（將 `notes` 的 HTML 標籤去除後顯示簡短文字預覽，或於點擊卡片後開啟詳情彈窗／抽屜檢視完整富文本介紹與多圖輪播）。
- **載入與空狀態處理**：
  - 資料載入中顯示骨架屏（Skeleton）或載入動畫。
  - 當沒有符合篩選條件的物件時，顯示友善的空狀態提示與「清除所有篩選條件」按鈕。
  - API 發生錯誤時顯示明確的錯誤提示與「重新載入」按鈕。

## 驗收與測試

1. **無須登入即可存取**：
   - 在未登入（無 Cookie）狀態下，瀏覽器開啟 `/` 或以 `curl http://localhost:4000/api/property-status-assets/public/vacant` 測試，皆應回傳 `200` 且不會被導向 `/login`。
2. **資料隔離與隱私檢查**：
   - 確認回傳的 JSON 清單中**只包含** `status === 'vacant'` 的物件。
   - 確認回傳欄位**不包含** `tenantName`、`tenantPhone`、`deposit`、`leaseEndDate`、`overdueDays`、`overdueAmount`、`maintenanceReason`。
3. **搜尋與篩選功能驗證**：
   - 測試地點關鍵字、類型（雅房、車位、整層住家、獨立套房、分租套房）、租金範圍、是否含管理費、格局等條件，卡片清單應即時且正確地過濾出符合的物件。
4. **建置檢查**：
   - 修改前端後執行 `npm --prefix frontend run build` 確認打包無語法與型別錯誤；修改後端後以 `node -c backend/controllers/propertyStatusAssets.controller.js` 確認語法正確。
