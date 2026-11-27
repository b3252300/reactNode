# 房屋人資產（House Rental Platform）

一套結合 **公開租屋搜尋平台（前台）** 與 **房東／管理員資產管理系統（後台）** 的全端 Web 應用程式。採用 React + Vite 前端與 Node.js + Express + MongoDB 後端架構，並支援以 Cloudflare Workers（Static Assets + Durable Objects）搭配 MongoDB Atlas 進行雲端部署。

---

## 核心功能

### 1. 公開招租前台（免登入即可瀏覽）
- **列表找房（`/`）**
  - 即時瀏覽空置招租中的房屋物件，支援卡片式列表、骨架屏載入與詳細資訊彈窗（含多圖輪播）。
  - 支援多條件複合篩選：關鍵字防抖搜尋、縣市、房屋類型、租金區間、管理費計算方式、格局、房屋特色標籤與排序，篩選條件會即時同步至 URL 查詢參數。
- **地圖找房（`/map`）**
  - 以 Leaflet（`leaflet`、`react-leaflet`、`react-leaflet-cluster`）呈現招租物件的地理位置分佈與標記群聚。
  - 支援地圖範圍搜尋、點位互動與物件列表雙向聯動。
- **介面體驗**
  - 支援響應式版面配置（RWD）與深色／淺色主題即時切換。

### 2. 房東／管理員後台（需登入驗證）
- **物件與房屋狀態管理（`/admin`、`/property-status-assets`）**
  - 管理所有房產資產與狀態（出租中、空置招租、欠租、即將到期、維修中）。
  - 支援物件新增、編輯、刪除、多圖上傳與檢視、詳細資料側欄，以及地址轉經緯度（Geocoding）以串接地圖找房。
- **財務收支圖表（`/financial-chart`）**
  - 呈現物件營運與收支狀況的視覺化統計圖表。
- **管家報修派工（`/butler-repair-request`）**
  - 追蹤與管理租客報修申請與維修派工進度。
- **會員清單（`/members`）**
  - 檢視已註冊之系統帳號列表。

### 3. 身分驗證與安全性（`/login`、`/register`）
- 支援帳號註冊、登入、登出、受保護路由（`ProtectedRoute`）以及重新整理後自動恢復登入狀態。
- 採用 **JWT Access Token + HttpOnly Cookie Refresh Token** 機制，搭配 `bcryptjs` 密碼雜湊、`zod` 資料驗證、`helmet` 安全標頭、Origin 來源檢查與登入／註冊速率限制（Rate Limiting）。

---

## 技術棧

| 層級 | 技術與套件 |
| --- | --- |
| **前端框架** | React 18、Vite 6、React Router v7 |
| **樣式與 UI** | Tailwind CSS v4、Sass、shadcn/ui（`@base-ui/react`）、Lucide Icons、Embla Carousel、Tiptap |
| **地圖功能** | Leaflet、`react-leaflet`、`react-leaflet-cluster` |
| **HTTP 客戶端** | Axios |
| **後端框架** | Node.js、Express 5 |
| **資料庫與驗證** | MongoDB、Mongoose 9、Zod、JSON Web Token (`jsonwebtoken`)、`bcryptjs` |
| **安全與限流** | Helmet、CORS、`cookie-parser`、`express-rate-limit` / Cloudflare Rate Limiting |
| **部署架構** | Cloudflare Workers（Static Assets + Durable Objects `ApiServer`）、MongoDB Atlas |

---

## 專案目錄結構

```text
reactNode/
├── frontend/                   # 前端應用（React + Vite）
│   └── src/
│       ├── api/                # API 封裝（驗證、公開首頁、房產資產）
│       ├── components/         # 共用元件與 shadcn/ui 元件
│       ├── constants/          # 台灣縣市與房屋特色常數
│       ├── contexts/           # 主題切換 Context（深淺色模式）
│       ├── layouts/            # 後台側邊欄與主版面配置
│       ├── styles/             # Tailwind CSS 與 SCSS 樣式
│       ├── types/              # TypeScript 型別定義
│       └── views/              # 頁面視圖
│           ├── dashboard/      # 公開首頁（列表找房、地圖找房）
│           ├── admin/          # 管理後台（物件狀態、財務圖表、報修派工）
│           ├── auth/           # 登入、註冊、AuthContext、受保護路由
│           └── member/         # 會員清單頁
├── backend/                    # 後端 API（Express + Mongoose）
│   ├── controllers/            # 商業邏輯控制器（auth、propertyStatusAssets）
│   ├── middleware/             # 驗證（requireAuth）與速率限制（rateLimit）
│   ├── models/                 # Mongoose Schema（User、RefreshToken、PropertyStatusAssets）
│   ├── routes/                 # API 路由定義
│   ├── scripts/                # 工具腳本（如經緯度補齊腳本 backfillCoordinates.js）
│   ├── utils/                  # Geocoding 與執行環境工具
│   ├── app.js                  # Express 應用程式設定
│   ├── index.js                # 本機 Node.js 啟動入口
│   └── worker.mjs              # Cloudflare Workers 與 Durable Object 入口
├── shared/                     # 前後端共用資料（房屋特色定義 propertyFeatures.json）
├── wrangler.jsonc              # Cloudflare Workers 部署與綁定設定



```

---

## API 端點概覽

| 模組 | 方法與路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| **健康檢查** | `GET /api/health` | 公開 | 檢查後端服務運作狀態 |
| **身分驗證** | `POST /api/auth/register` | 公開（限流） | 註冊新帳號 |
| | `POST /api/auth/login` | 公開（限流） | 登入並核發憑證 |
| | `POST /api/auth/logout` | 公開 | 登出並撤銷 Refresh Token |
| | `POST /api/auth/refresh` | 公開 | 換發新的 Access Token |
| | `GET /api/auth/me` | 需登入 | 取得目前登入使用者資訊 |
| | `GET /api/auth/users` / `members` | 需登入 | 取得會員清單 |
| **房產資產** | `GET /api/property-status-assets/public/vacant` | 公開 | 查詢公開空置招租物件（支援篩選與地圖範圍） |
| | `GET /api/property-status-assets` | 需登入 | 取得全部房產物件清單 |
| | `GET /api/property-status-assets/geocode` | 需登入 | 將地址轉換為經緯度座標 |
| | `GET /api/property-status-assets/:id` | 需登入 | 取得單一物件詳細資料 |
| | `POST /api/property-status-assets` | 需登入 | 新增房產物件 |
| | `PATCH /api/property-status-assets/:id` | 需登入 | 更新房產物件資料 |
| | `DELETE /api/property-status-assets/:id` | 需登入 | 刪除房產物件 |

---

## 快速開始（本機開發）

### 1. 環境需求
- Node.js（建議 v20 以上）
- MongoDB（本機服務或 MongoDB Atlas）

### 2. 安裝相依套件
於專案根目錄、前端與後端目錄安裝套件：
```bash
npm install
npm --prefix frontend install
npm --prefix backend install
```



### 3. 啟動開發伺服器
確認 MongoDB 已啟動後，在專案根目錄執行：
```bash
npm run dev
```
此指令會透過 `concurrently` 同時啟動：
- **後端 API**：`http://localhost:4000`
- **前端 Vite 開發伺服器**：`http://localhost:5173`

---

## 建置與雲端部署

本專案支援一鍵打包並部署至 Cloudflare Workers：

```bash
# 僅建置前端靜態檔案（輸出至 frontend/dist）
npm run build

# 本機模擬 Cloudflare Workers 環境（需先設定 .dev.vars）
npm run cf:dev

# 建置並部署至 Cloudflare Workers
npm run deploy
```

> 完整的 Cloudflare Workers 與 MongoDB Atlas 首次部署設定，請參閱 [`Deploy.md`](./Deploy.md)。
