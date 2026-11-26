---
name: butler-repair-request
description: 在 React + Express + MongoDB 專案中實作與維護「管家報修與派工中心」（/butler-repair-request）。適用於報修／點交派工單清單、狀態篩選、頂部 KPI 統計卡片、新增派工對話框、工單狀態推進、房態裝修維護物件自動同步、側邊欄待處理徽章連動，以及與「房態與資產盤」抽屜的跨頁跳轉派工與前後端 API／Mongoose schema 串接。
---

# 管家報修與派工中心（`/butler-repair-request`）

本技能用於「房屋人資產 — 智慧物業包租代管系統」的**管家報修與派工中心**模組，涵蓋工單 CRUD、狀態推進流程、頂部營運統計、與「房態與資產盤」的裝修維護自動同步及跨頁快速派工，以及側邊欄待處理工單徽章的即時連動。前端介面建立於 `frontend/src/views/admin/ButlerRepairRequest/`，沿用專案深色黑金（Slate + Amber `#f59e0b`）與明暗雙主題設計系統。

## 開始前

1. 檢查相關檔案並沿用專案既有架構，不要另造一套：
   - 後端 Model：`backend/models/ButlerRepairRequest.js`
   - 後端 Controller：`backend/controllers/butlerRepairRequest.controller.js`
   - 後端路由：`backend/routes/butlerRepairRequest.routes.js`（掛載於 `backend/app.js` 的 `/api/butler-repair-request`）
   - 前端型別：`frontend/src/types/butlerRepairRequest.ts`
   - 前端 API Client：`frontend/src/api/butlerRepairRequest.ts`（共用 `frontend/src/api/api.js` 的 Axios 實例，`baseURL: /api`、`withCredentials: true`）
   - 前端頁面與表單：`frontend/src/views/admin/ButlerRepairRequest/List.tsx`、`frontend/src/views/admin/ButlerRepairRequest/EditDialog.tsx`
   - 路由與版面連動：`frontend/src/views/App.jsx`、`frontend/src/layouts/index.tsx`、`frontend/src/layouts/component/app-sidebar.tsx`
2. 確認前後端欄位型別（`RepairTicket` / `CreateRepairTicketInput` / `UpdateRepairTicketInput`）、Zod 驗證規則與 Mongoose schema 保持一致。
3. 確認所有需要即時反映工單數量變化的操作（建立、更新狀態、刪除）都有觸發跨模組事件通知。

## 資料模型與欄位規格

以 `frontend/src/types/butlerRepairRequest.ts` 的 `RepairTicket` 與 `backend/models/ButlerRepairRequest.js` 為前後端資料契約基準：

| 欄位 | 型別與用途規則 |
|---|---|
| `id` | API 回傳的 MongoDB `_id` 字串識別碼。 |
| `ticketCode` | 工單編號，必填且資料庫唯一索引（`unique: true`），由後端自動產生，用戶端不可指定或修改。<br>• 手動建立：`WO-XXXX`（4 位隨機數字，最多重試 12 次，衝突回傳 `409`）。<br>• 系統同步裝修物件：`WO-${roomNumber}`。 |
| `roomNumber` | 房號，必填（1–50 字元），建立索引 `{ roomNumber: 1 }`。 |
| `address` | 物件地址，選填（0–200 字元）；無值時序列化預設顯示 `未填寫地址`。 |
| `tenantName` | 聯絡房客姓名，選填（0–100 字元）；選擇房號時自動帶入，無值時序列化預設顯示 `無特定房客`。 |
| `category` | 派工類別（1–50 字元），常用選項：`水電修繕`、`家電冷氣`、`退租點交`、`裝修維護`、`定期巡檢`。 |
| `title` | 報修／派工事項說明標題，必填（1–200 字元）。 |
| `butlerName` | 指派的外勤管家姓名（1–50 字元），常用選項：`張志豪 管家`、`王建銘 管家`、`陳品妤 管家`。 |
| `priority` | 工單優先級，僅允許 `urgent`（緊急）、`normal`（一般，預設）、`inspection`（勘查／點交）。 |
| `status` | 工單狀態代碼，僅允許 `pending`、`in_progress`、`completed`（預設 `pending`）；建立複合索引 `{ status: 1, createdAt: -1 }`。 |
| `estimatedCost` | 預估修繕費用（NT$），有限非負數值（`0` 至 `1000000000`，預設 `0`）；前端以 `NT$ ${Number(cost).toLocaleString('zh-TW')}` 格式化。 |
| `createdAt` | 由 Mongoose `timestamps: true` 維護，API 序列化為 `YYYY/MM/DD` 字串。 |

狀態代碼與顯示文字固定對應：
- `pending` ＝ `待指派處理`（篩選標籤顯示 `待派工`，色票 `rose-400` / `.status-overdue`）
- `in_progress` ＝ `勘查修繕中`（色票 `amber-400` / `.status-expiring`）
- `completed` ＝ `已完修結案`（色票 `emerald-400` / `.status-rented`）

狀態代碼是資料與篩選依據，不要以中文顯示文字取代代碼。

## 後端實作規格

- **權限保護**：`backend/routes/butlerRepairRequest.routes.js` 全路由套用 `requireAuth` middleware，未登入回傳 `401`。
- **裝修維護物件自動同步（`syncMaintenanceAssetsToTickets`）**：
  - 每次呼叫 `GET /api/butler-repair-request` 時，先查詢 `PropertyStatusAsset` 中 `status === 'maintenance'` 的物件。
  - 若該 `roomNumber` 尚未存在於 `ButlerRepairRequest`，使用 `updateOne({ ticketCode: 'WO-' + roomNumber }, { $setOnInsert: { ... } }, { upsert: true })` 自動建立一筆 `status: 'in_progress'`、`category: '裝修維護'`、`priority: 'normal'` 的工單（標題採用 `asset.maintenanceReason` 或預設文案），並忽略並行寫入造成的 `11000` 重複鍵錯誤。
- **Zod 驗證與防 Mass Assignment**：
  - 查詢參數使用 `listQuerySchema` 驗證 `status`（`all` | `pending` | `in_progress` | `completed`）。
  - 新增使用 `createTicketSchema`；更新使用 `updateTicketSchema.strict()`，僅允許更新白名單欄位，拒絕 `ticketCode`、`_id` 及未定義欄位。
  - 修改 `category` / `butlerName` 預設值或驗證時，須同步檢查 `ButlerRepairRequest.js` 的 `required` 約束與 `EditDialog.tsx` 的初始選單值，避免送出空字串導致 Mongoose 驗證失敗。
- **端點規格**：
  - `GET /api/butler-repair-request`：支援可選 query `status`，回傳 `{ tickets, counts, roomOptions }`：
    - `tickets`：依 `createdAt` 降冪排序並套用狀態篩選後的工單清單。
    - `counts`：依全部工單計算 `{ all, pending, in_progress, completed, totalCost }`。
    - `roomOptions`：從 `PropertyStatusAsset` 取得 `{ id, roomNumber, roomType, address, tenantName }` 供前端下拉選擇與自動帶入。
  - `POST /api/butler-repair-request`：驗證後由後端產生唯一 `ticketCode` 並建立工單，成功回傳 `201` 與序列化後的工單物件。
  - `PATCH /api/butler-repair-request/:id`：驗證 `mongoose.isValidObjectId(id)` 與白名單欄位後部分更新，成功回傳更新後工單，找不到回傳 `404`。
  - `DELETE /api/butler-repair-request/:id`：驗證 ID 後刪除指定工單，成功回傳 `204`，找不到回傳 `404`。
- **錯誤回應格式**：統一使用 `{ "message": "..." }`，參數或 ID 錯誤回傳 `400`、未登入 `401`、找不到工單 `404`、編號衝突 `409`。

## 前端頁面與互動規格

- **路由與頁面標題**：
  - 註冊於 `frontend/src/views/App.jsx` 的受保護路由 `/butler-repair-request`。
  - `frontend/src/layouts/index.tsx` 對應頁面標題為「管家報修與派工中心」。
- **頂部 KPI 統計卡片（4 欄）**：
  - 待指派／待處理工單（`counts.pending`，`rose-400`）
  - 管家勘查修繕中（`counts.in_progress`，`amber-400`）
  - 本月已完修結案（`counts.completed`，`emerald-400`）
  - 工單預估修繕總費用（`NT$ ${counts.totalCost.toLocaleString('zh-TW')}`）
- **狀態篩選與新增派工**：
  - 篩選按鈕顯示各狀態即時件數，目前選中項套用 `tab-btn-soft-active`。
  - 載入中顯示 6 張 `Skeleton` 骨架屏卡片，不加人工延遲。
  - 點擊「新增報修／點交派工」開啟 `EditDialog`，若有 `roomOptions` 則提供房號下拉選單並在選擇房號時自動帶入 `address` 與 `tenantName`；若無物件清單則退回手動文字輸入框。
  - 送出期間以 `submitting` 鎖定按鈕防止重複建立。
- **工單卡片與狀態推進**：
  - 每張卡片顯示工單編號（`badge-amber`）、類別（`badge-neutral`）、狀態徽章、報修標題、房號與地址、負責外勤管家、預估修繕費用、立案日期與聯絡房客。
  - 狀態單向推進按鈕：
    - `pending` → 顯示「開始派工處理」，點擊後呼叫 `PATCH` 更新為 `in_progress`。
    - `in_progress` → 顯示「標記完修結案」，點擊後呼叫 `PATCH` 更新為 `completed`。
    - `completed` → 隱藏狀態推進按鈕。
  - 建立或更新工單後重新呼叫 `getButlerRepairRequestsApi()` 同步列表與統計，並於右下角顯示 3.2 秒非阻斷式 `.toast-success` 通知。

## 跨模組連動規格

- **側邊欄待處理徽章同步（`butler-repair-updated`）**：
  - 建立工單或變更工單狀態成功後，必須觸發 `window.dispatchEvent(new CustomEvent("butler-repair-updated"))`。
  - `frontend/src/layouts/index.tsx` 同時監聽 `butler-repair-updated` 與 `property-assets-updated` 事件，重新拉取工單統計並計算 `pendingRepairCount = counts.pending + counts.in_progress`，傳入 `AppSidebar` 顯示琥珀色待處理件數徽章（`pendingRepairCount > 0` 時顯示）。
- **由「房態與資產盤」快速跳轉派工**：
  - 在 `/property-status-assets` 詳細資料抽屜點擊「指派管家勘查或點交」時，會導向 `/butler-repair-request?room=<房號>&address=<地址>&tenant=<承租人>`。
  - `ButlerRepairRequest/List.tsx` 透過 `useSearchParams()` 偵測 `room` 參數，自動開啟 `EditDialog` 並預填：
    - `roomNumber`、`address`、`tenantName`
    - `category: "退租點交"`
    - `priority: "inspection"`
    - `title: "房號 ${room} 現場屋況勘查與設備點交"`
  - 讀取參數後立即呼叫 `setSearchParams({}, { replace: true })` 清除查詢字串，避免頁面重新整理時重複彈出對話框。

## 驗收與測試

沿用專案現有工具進行驗證：

- **權限檢查**：未登入請求 `/api/butler-repair-request` 各端點皆回傳 `401`。
- **列表與自動同步**：登入後開啟 `/butler-repair-request`，確認能載入工單、KPI 統計與 `roomOptions`；在「房態與資產盤」將任一物件設為 `maintenance` 後，重新整理派工頁應自動同步出現 `WO-<房號>` 工單且不會重複建立。
- **新增與防呆**：建立派工單後由後端自動產生唯一 `WO-XXXX` 編號，缺少 `roomNumber` 或 `title` 時不可送出（API 回傳 `400`）；建立成功後 Toast 提示、KPI 統計與側邊欄徽章同步更新。
- **狀態推進與篩選**：依序操作「開始派工處理」與「標記完修結案」，確認狀態從 `pending` → `in_progress` → `completed` 正確寫入資料庫，篩選計數與側邊欄待處理徽章即時遞減。
- **跨頁跳轉帶入**：從 `/property-status-assets` 抽屜點擊「指派管家勘查或點交」，確認自動跳轉並開啟已預填房號、地址、房客與勘查標題的對話框，且網址 query 已被清除。
- **建置與語法檢查**：
  - 修改前端後執行 `npm --prefix frontend run build` 確認 TypeScript 與 Vite 打包無錯誤。
  - 修改後端後執行 `node -c backend/models/ButlerRepairRequest.js backend/controllers/butlerRepairRequest.controller.js backend/routes/butlerRepairRequest.routes.js` 確認語法無誤。
