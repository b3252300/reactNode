---
name: test-admin
description: 本指南用瀏覽器、curl 與型別檢查工具驗收管理員後台（/property-status-assets）的新增、編輯、刪除、權限控管與資料型別驗證。專案目前沒有設定自動化測試框架，因此以下測試需手動執行。
---

## 執行與授權

- 執行本機命令、啟動或停止服務、開啟瀏覽器、呼叫 API，或清理測試資料／暫存檔前，先確認使用者已授權該操作，並遵守工具顯示的確認流程。
- 若使用者或工具拒絕操作，立即停止該操作；不得改用其他工具或命令重試、繞過授權，或聲稱測試已執行。改提供使用者可自行操作的步驟。
- 只在使用者確認為本機或專用測試環境後，才執行會新增、修改或刪除資料庫物件的測試。
- 登入測試只使用使用者提供或確認的測試帳號；不得讀取、輸出或記錄 `.env` 機密、密碼、Cookie 或 token。
- 測試過程建立的測試物件應於測試結束後刪除，避免殘留假資料；若刪除或清理暫存檔遭拒，告知使用者該物件 ID 與檔案位置。

# 測試前準備

1. 啟動 MongoDB，並確認 `backend/.env` 已依 `backend/.env.example` 設定。
2. 啟動後端（預設 `http://localhost:4000`）：
   ```bash
   cd backend
   npm run dev
   ```
3. 啟動前端（預設 `http://localhost:5173`）：
   ```bash
   cd frontend
   npm run dev
   ```
4. 準備一組可登入後台的測試帳號，並確認本機資料庫可接受測試資料寫入與刪除。

---

## 一、瀏覽器測試（CRUD 與介面驗證）

| 編號 | 模組 | 情境 | 操作 | 預期結果 |
|---|---|---|---|---|
| A-01 | 權限 | 未登入進入後台 | 登出狀態開啟 `http://localhost:5173/property-status-assets` | 自動導向 `/login`；登入成功後回到 `/property-status-assets`。 |
| A-02 | 讀取 | 清單載入與篩選 | 進入後台，切換狀態標籤、輸入關鍵字搜尋與清除搜尋 | 正常載入物件清單；各狀態統計數量與篩選結果正確；切換卡片／列表視圖正常。 |
| A-03 | 新增 | 新增空置招租物件 | 點擊新增，填寫縣市、地址、房屋類型、坪數、月租金，狀態選 `空置招租`（不填承租人與租約到期日），勾選特色標籤後送出 | 成功建立並顯示 Toast；後端自動產生唯一 `roomNumber`；清單與頂部 Header 統計即時更新。 |
| A-04 | 新增 | 出租狀態表單驗證 | 新增時狀態選 `出租中`／`即將到期`／`租金欠繳`，留空「承租人姓名」或「租約到期日」並送出 | 前端阻擋送出並顯示明確錯誤訊息（要求填寫承租人姓名或租約到期日）。 |
| A-05 | 新增 | 圖片上傳格式與大小驗證 | 上傳非 JPG/PNG/WebP 檔案、超過 2MB 檔案，或超過 10 張圖片 | 前端拒絕並顯示對應錯誤提示，不會送出無效圖片。 |
| A-06 | 編輯 | 編輯欄位與狀態切換 | 編輯剛建立的測試物件：修改月租金、備註、將狀態改為 `出租中` 並補上承租人與租約到期日，送出儲存 | 更新成功並顯示 Toast；`roomNumber` 維持不變；`statusText` 同步變為「出租中」；Header 出租率即時更新。 |
| A-07 | 編輯 | 地圖定位與清除定位 | 於編輯視窗點擊「依地址自動定位」或拖曳圖釘微調座標後儲存；再測試「清除定位」並儲存 | 經緯度正確寫入與更新；清除定位後 `lat`/`lng` 回到 `null`。 |
| A-08 | 刪除 | 取消刪除 | 點擊測試物件的刪除按鈕，於自訂確認 Dialog 中按「取消」 | Dialog 關閉，物件仍保留於清單中。 |
| A-09 | 刪除 | 確認刪除 | 再次點擊刪除並於確認 Dialog 按下確認 | 顯示刪除成功 Toast，物件自清單移除，重新整理頁面後確認已不存在，Header 統計同步更新。 |

---

## 二、API 測試（curl：權限、新增、編輯、刪除）

先登入取得測試用 Cookie jar（替換為本機測試帳密）：

```bash
curl -i -c /tmp/react-node-admin-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"ReplaceWithTestPassword"}' \
  http://localhost:4000/api/auth/login
```

### A. 未登入權限防護（401）

不帶 Cookie 呼叫以下端點，皆應回傳 HTTP `401`：

```bash
curl -i http://localhost:4000/api/property-status-assets
curl -i -X POST -H 'Content-Type: application/json' -d '{}' http://localhost:4000/api/property-status-assets
curl -i -X PATCH -H 'Content-Type: application/json' -d '{}' http://localhost:4000/api/property-status-assets/000000000000000000000000
curl -i -X DELETE http://localhost:4000/api/property-status-assets/000000000000000000000000
```

### B. 新增物件（POST -> 201）

```bash
curl -i -b /tmp/react-node-admin-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{
    "city": "台北市",
    "address": "信義區測試路100號",
    "floor": "5F",
    "roomType": "獨立套房",
    "area": 12.5,
    "status": "vacant",
    "monthlyRent": 18000,
    "deposit": 36000,
    "managementFee": 1200,
    "features": [1, 4, 6],
    "notes": "<p>後台測試物件</p>"
  }' \
  http://localhost:4000/api/property-status-assets
```

預期：
- HTTP `201`，回應包含系統自動產生的 `id` 與 `roomNumber`（格式 `AYYMMDD-XXXX`）。
- `statusText` 為 `"空置招租"`，`features` 為 `[1, 4, 6]`，`featuresText` 為 `["免服務費", "拎包入住", "有電梯"]`。
- 記錄回傳的 `id` 為 `<ASSET_ID>` 供後續編輯、型別與刪除測試使用。

### C. 讀取清單與單筆（GET -> 200）

```bash
curl -i -b /tmp/react-node-admin-cookies.txt \
  "http://localhost:4000/api/property-status-assets?status=vacant&q=測試路100號"

curl -i -b /tmp/react-node-admin-cookies.txt \
  http://localhost:4000/api/property-status-assets/<ASSET_ID>
```

預期：皆回傳 HTTP `200`，且可查得剛建立的測試物件。

### D. 編輯物件（PATCH -> 200）

```bash
curl -i -X PATCH -b /tmp/react-node-admin-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "rented",
    "tenantName": "測試房客",
    "tenantPhone": "0912345678",
    "monthlyRent": 19500,
    "leaseEndDate": "2027-12-31",
    "lat": 25.033964,
    "lng": 121.564468
  }' \
  http://localhost:4000/api/property-status-assets/<ASSET_ID>
```

預期：
- HTTP `200`，`roomNumber` 未改變。
- `status` 為 `"rented"`、`statusText` 自動同步為 `"出租中"`、`monthlyRent` 為 `19500`、`leaseEndDate` 為 ISO 8601 字串、`lat`/`lng` 保留為傳入的數值。

### E. 刪除物件（DELETE -> 204）

```bash
curl -i -X DELETE -b /tmp/react-node-admin-cookies.txt \
  http://localhost:4000/api/property-status-assets/<ASSET_ID>
```

預期：HTTP `204`（無回應內容）。再以 `GET /api/property-status-assets/<ASSET_ID>` 查詢應回傳 `404`（`找不到房屋物件`）。

---

## 三、型別測試（執行期 Schema、回應契約、靜態型別）

### 1. 後端執行期輸入型別與邊界驗證（Zod / Mongoose）

使用登入 Cookie 對 `POST /api/property-status-assets` 或 `PATCH /api/property-status-assets/<ASSET_ID>` 測試以下異常輸入，確認皆回傳預期的 HTTP 狀態碼與 `{ "message": "..." }`：

| 編號 | 測試項目 | 測試資料範例 | 預期結果 |
|---|---|---|---|
| T-01 | 必填欄位缺漏 | `POST` 缺少 `address`、`roomType`、`area`、`status` 或 `monthlyRent` | HTTP `400` |
| T-02 | 數值型別錯誤與負數 | `monthlyRent: "abc"`、`area: -5`、`deposit: -100`、`managementFee: -1` | HTTP `400` |
| T-03 | 整數型別驗證 | `overdueDays: 1.5` 或 `overdueDays: -1` | HTTP `400` |
| T-04 | 狀態列舉（Enum）驗證 | `status: "unknown_status"` 或查詢 `?status=invalid` | HTTP `400` |
| T-05 | 經緯度範圍與型別 | `lat: 95`、`lng: 200`、`lat: "north"`；另測 `lat: null, lng: null` | 超出範圍或非數字回 `400`；`null` 合法（`200`） |
| T-06 | 日期字串驗證 | `leaseEndDate: "not-a-date"`；另測 `leaseEndDate: ""` | 無效日期回 `400`（`租約到期日格式錯誤`）；空字串合法 |
| T-07 | 特色代碼陣列型別 | `features: [999]`（不存在代碼）或 `features: "免服務費"`（非陣列） | HTTP `400` |
| T-08 | 圖片格式與數量上限 | `imageUrl: "https://example.com/a.jpg"`、`data:image/gif;base64,R0lGOD...`，或 `imageUrls` 傳入 11 筆 | HTTP `400` |
| T-09 | 嚴格白名單（禁止修改保留／未知欄位） | `PATCH` 傳入 `{"roomNumber": "A999999-9999"}`、`{"_id": "..."}` 或 `{"unknownField": 123}` | HTTP `400`（`updateAssetSchema.strict()` 攔截） |
| T-10 | 路徑 ID 格式與不存在資源 | `GET`/`PATCH`/`DELETE` 帶入 `/not-an-object-id` 與 `/000000000000000000000000` | 無效 ObjectId 回 `400`（`無效的資產 ID`）；合法但不存在回 `404` |

### 2. API 回應型別契約驗證（對應 `PropertyAsset`）

確認 `POST` / `GET` / `PATCH` 回傳 JSON 欄位型別與 `frontend/src/types/propertyStatusAssets.ts` 完全一致：

- `id`、`roomNumber`、`city`、`address`、`floor`、`roomType`、`status`、`statusText`、`tenantName`、`tenantPhone`、`leaseEndDate`、`maintenanceReason`、`notes`、`imageUrl`：皆為 `string`
- `area`、`monthlyRent`、`deposit`、`managementFee`、`overdueDays`、`overdueAmount`：皆為 `number`（非字串）
- `lat`、`lng`：`number | null`
- `features`：`number[]`；`featuresText`：`string[]`
- `imageUrls`：`string[]`

### 3. 前端靜態型別檢查與建置、後端語法檢查

```bash
# 前端 TypeScript 型別檢查（若有安裝 typescript）與 Vite 建置檢查
npx --prefix frontend tsc --noEmit
npm --prefix frontend run build

# 後端語法檢查
node -c backend/controllers/propertyStatusAssets.controller.js
node -c backend/routes/propertyStatusAssets.routes.js
node -c backend/models/PropertyStatusAssets.js
```

預期：無 TypeScript 型別錯誤、Vite build 成功、後端 `node -c` 無語法錯誤。

---

## 四、測試後清理

確認所有測試建立的物件皆已透過 `DELETE` 移除，並刪除本機 Cookie jar：

```bash
rm /tmp/react-node-admin-cookies.txt
```

## 測試紀錄

| 測試項目 | 結果（通過 / 失敗 / 未測） | 備註 |
|---|---|---|
| 瀏覽器 A-01 至 A-05（權限、讀取、新增） |  |  |
| 瀏覽器 A-06 至 A-09（編輯、定位、刪除） |  |  |
| API A 至 E（401、CRUD 完整流程） |  |  |
| 型別測試 T-01 至 T-05（必填、數值、列舉、座標） |  |  |
| 型別測試 T-06 至 T-10（日期、陣列、圖片、嚴格欄位、ID） |  |  |
| API 回應型別契約與前後端靜態檢查 |  |  |

## 測試結果回報
測試完後要條列式測試哪些，測試過就打勾。
