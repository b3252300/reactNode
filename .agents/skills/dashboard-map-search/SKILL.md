---
name: dashboard-map-search
description: 在 React + Express + MongoDB 專案的公開首頁（Dashboard）實作「地圖找房」功能，採用 Leaflet（leaflet + react-leaflet）呈現空置招租物件分佈、租金膠囊標記、群聚聚合、地圖範圍搜尋與列表雙向聯動，並涵蓋後端經緯度欄位與地址轉座標（Geocoding）策略。
---

# 獨立頁地圖找房功能（Dashboard Map Search）

本技能定義「房屋人資產 — 智慧物業包租代管系統」公開**地圖找房獨立頁面（路由 `/map`）**的實作方向與技術規格。既有的首頁（路由 `/`）保留卡片式網格搜尋，並與 `/map` 並存提供用戶兩種找房模式；兩頁皆**免登入即可瀏覽**，並嚴格遵守公開資料隱私規範（僅呈現 `status === 'vacant'` 且經 `serializePublicAsset()` 過濾的欄位）。

## 開始前

1. 閱讀既有技能 [dashboard/SKILL.md](../dashboard/SKILL.md) 與 [property-status-assets/SKILL.md](../property-status-assets/SKILL.md)，確保與首頁篩選選項常數（`Filter.jsx`）、卡片詳情彈窗（`CardDetailModal.jsx`）及後台物件 CRUD 保持一致。
2. 確認專案前端使用 **React 18（`^18.3.1`）+ Vite 6 + React Router v7 + Tailwind CSS v4**，視覺沿用深色黑金風格（Slate `#090d16` / `#0B1120` + Amber `#f59e0b`）。
3. 確認路由位置：`/map` 必須掛載於 `frontend/src/views/App.jsx` 的公開路由區（**不可**包在 `<ProtectedRoute />` 內），且建議搭配 `React.lazy()` + `<Suspense>` 進行程式碼分割，讓只瀏覽 `/` 的訪客不需載入 Leaflet 套件。
4. 本功能不另外建立獨立資料庫集合，直接擴充 `PropertyStatusAssets` 模型與 `/api/property-status-assets/public/vacant` 端點。

## 套件選型與安裝注意事項

- **核心地圖套件**：
  - `leaflet`：輕量、開源、免信用卡與 API Key 門檻的互動地圖引擎。
  - `react-leaflet@^4.2.1`：**務必鎖定 v4**（本專案為 React 18；`react-leaflet` v5 僅支援 React 19，誤裝會導致 peer dependency 或執行期錯誤）。
  - `@types/leaflet`（devDependency，供 TypeScript 檔案使用）。
- **標記群聚（建議加裝）**：
  - `react-leaflet-cluster`（或 `leaflet.markercluster`）：當同一行政區或同棟大樓有多筆空房時，自動聚合為數量圓圈，點擊後展開或放大檢視。
- **CSS 與圖示避坑**：
  - 須於入口或地圖元件匯入 `leaflet/dist/leaflet.css`。
  - Leaflet 預設 Marker PNG 在 Vite 打包常出現破圖；本功能改採自訂 `L.divIcon` 繪製「月租金膠囊標記」，既避免破圖又更符合租屋平台視覺。
- **底圖圖磚（Tile Layer）**：
  - 統一使用標準 **OpenStreetMap** 圖磚（`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`），街道、路名、捷運站與地標辨識度最佳（不需要深色底圖或底圖切換鈕），並保留正確的圖磚版權宣告（`attribution`）。

## 資料模型與經緯度（Geocoding）方向

目前 `PropertyStatusAssets` 僅有 `city` 與 `address`，尚未儲存座標，需分三階段補齊：

### 1. 資料庫 Schema 擴充（`backend/models/PropertyStatusAssets.js`）

- 新增兩個選填數值欄位：
  - `lat`：`{ type: Number, default: null, min: -90, max: 90 }`
  - `lng`：`{ type: Number, default: null, min: -180, max: 180 }`
- 為加速地圖視窗範圍查詢，可建立複合索引：`{ status: 1, lat: 1, lng: 1 }`。

### 2. 地址轉經緯度策略（Geocoding）

- **後端自動地理編碼（主要流程）**：
  - 於 `backend/utils/geocode.js` 封裝地理編碼工具，使用免費的 OpenStreetMap **Nominatim API**（查詢字串以 `${city}${address}` 組合，並加上 `countrycodes=tw` 提高台灣地址命中率）。
  - 請求須附上合規的 `User-Agent` Header，並加入簡易快取與逾時保護（如 3–5 秒 timeout）；**不可讓地理編碼失敗阻斷物件的新增或儲存**（失敗時 `lat`/`lng` 維持 `null` 並記錄 warning）。
  - 在 `createPropertyAsset` 與 `updatePropertyAsset` 中：若用戶端未手動提供 `lat`/`lng`，且 `city` 或 `address` 有值或發生變更，則自動呼叫 geocode 寫入座標。
- **後台手動拖曳圖釘微調（消除 Nominatim 誤差）**：
  - 在 `frontend/src/views/admin/PropertyStatusAssets/EditDialog.tsx` 內嵌 `LocationPickerMap.tsx` 迷你 Leaflet 地圖，搭配受保護的 `GET /api/property-status-assets/geocode` 端點提供「依地址自動定位 → 點擊地圖或拖曳圖釘微調 → 儲存精準 `lat`/`lng`」流程（完整規格見 [property-status-assets/SKILL.md](../property-status-assets/SKILL.md)）。
  - 當管理員於後台手動設定精準座標後，前台 `/map` 立即以精準標記呈現，不再顯示「約略定位」標記。
- **既有資料補齊與前端降級處理**：
  - 既有資料庫中 `lat`/`lng` 為 `null` 的舊物件，可提供一支一次性腳本（遵守 Nominatim 1 req/sec 速率限制）批次補算座標。
  - 前端地圖繪製前**必須過濾掉無效座標**（`Number.isFinite(asset.lat) && Number.isFinite(asset.lng)`），絕對不可將 `null` 或 `NaN` 傳給 Leaflet，避免拋出 `Invalid LatLng` 錯誤；若當前結果有未定位物件，於地圖角落顯示提示徽章（例如「另有 X 筆物件尚未定位，請於列表檢視」）。

## 後端 API 實作方向

檔案位置：`backend/controllers/propertyStatusAssets.controller.js`

1. **Zod 驗證規則擴充**：
   - `assetBaseSchema` / `createAssetSchema` 新增可選的 `lat`（`-90` 至 `90` 或 `null`）與 `lng`（`-180` 至 `180` 或 `null`）。
   - `publicVacantQuerySchema` 新增可選的地圖邊界（Bounding Box）參數：`north`、`south`、`east`、`west`（皆為有效數值）。
2. **公開列表查詢（`listPublicVacantAssets`）**：
   - 當同時提供 `north`、`south`、`east`、`west` 四個邊界參數時，加入條件：
     - `lat: { $gte: south, $lte: north }`
     - `lng: { $gte: west, $lte: east }`
   - 此條件與既有的 `q`、`city`、`roomType`、`minRent`、`maxRent`、`managementFeeType`、`layout`、`sort` 並存，維持 `status: 'vacant'` 強制鎖定。
3. **序列化輸出（`serializeAsset` / `serializePublicAsset`）**：
   - 兩者皆補上 `lat: typeof normalized.lat === 'number' ? normalized.lat : null` 與 `lng: typeof normalized.lng === 'number' ? normalized.lng : null`。
   - 確認 `serializePublicAsset` 仍絕不回傳承租人個資與內部財務欄位。

## 前端介面與互動方向

### 1. API 型別與參數擴充（`frontend/src/api/home.ts`）

- `PublicPropertyAsset` 補上 `lat: number | null` 與 `lng: number | null`（順手確認 `features?: number[]` 同步）。
- `PublicVacantQueryParams` 補上選填邊界參數：`north?: number`、`south?: number`、`east?: number`、`west?: number`。

### 2. 獨立路由與雙模式入口（`App.jsx`、`Header.jsx`、`Home.jsx`）

- **公開路由設定（`frontend/src/views/App.jsx`）**：
  - 新增 `<Route path="/map" element={<Suspense fallback={...}><MapSearchPage /></Suspense>} />`，與 `<Route index element={<Home />} />` 並列於公開區塊。
  - 使用 `React.lazy(() => import('./dashboard/MapSearch/MapSearchPage'))`，避免影響首頁初始打包體積。
- **保留首頁卡片搜尋並提供雙入口**：
  - **頂部導覽列（`frontend/src/views/dashboard/Header.jsx`）**：加入「列表找房（`/`）」與「地圖找房（`/map`）」導覽切換按鈕，並依當前 `useLocation().pathname` 顯示選中高亮狀態。
  - **首頁篩選列（`frontend/src/views/dashboard/Filter.jsx`）**：於結果統計列右側提供「切換地圖找房」快捷按鈕，點擊時將目前的篩選條件（`q`、`city`、`roomType`、`rentRangeId`、`managementFeeType`、`layout`、`sort`）序列化為 URL query string 跳轉至 `/map?...`，讓使用者無縫銜接；地圖頁也可帶相同條件一鍵返回「列表檢視（`/?...`）」。
- **URL 查詢參數同步**：
  - `/` 與 `/map` 透過 `useSearchParams()` 讀取初始篩選條件，支援重新整理保留狀態與分享搜尋結果連結。

### 3. 地圖獨立頁模組拆分（`frontend/src/views/dashboard/MapSearch/`）

`/map` 採 **全螢幕滿版（`h-screen flex flex-col overflow-hidden`）** 沉浸式版面（無需顯示首頁 Hero 與 Footer），建議拆分為以下職責單一的元件：

| 檔案 | 職責 |
|---|---|
| `MapSearchPage.jsx` | `/map` 頁面主容器：頂部共用 `Header` + 精簡單列篩選條 `MapFilterBar`，下方 `flex-1 min-h-0` 滿版分欄（桌面版左側可捲動精簡物件卡片清單＋右側全高互動地圖；行動版以底部浮動鈕切換地圖／列表），並掛載既有的 `CardDetailModal`。 |
| `MapFilterBar.jsx` | 地圖頁專用的精簡橫向篩選列，複用 `Filter.jsx` 匯出的選項常數（`CITY_OPTIONS`、`ROOM_TYPE_OPTIONS`、`RENT_RANGE_OPTIONS`、`MANAGEMENT_FEE_OPTIONS`、`LAYOUT_OPTIONS`、`SORT_OPTIONS`），節省垂直空間並提供「返回列表檢視」按鈕。 |
| `PropertyMarker.jsx` | 自訂 `L.divIcon` 租金膠囊標記（如 `NT$ 18,000`），依 `isHovered` / `isSelected` 切換 Slate／Amber 樣式與 `zIndexOffset`，並內含精簡 Popup（縮圖、租金、房型、坪數、地址與「查看詳情」按鈕）。 |
| `MapController.jsx` | 使用 `useMap()` 與 `useMapEvents()` 處理程式化視角控制：切換縣市時 `flyTo` 至該縣市中心點、點擊側欄物件時平滑移動視角、拖曳／縮放結束（`moveend`）時記錄最新邊界供「搜尋此區域」使用。 |
| `cityCoordinates.ts`（或擴充 `frontend/src/constants/taiwanCities.ts`） | 維護台灣 22 縣市預設中心座標 `[lat, lng]` 與預設縮放層級 `zoom`（全台預設中心約 `[23.9739, 120.982]`、`zoom: 7`；台北市約 `[25.033, 121.5654]`、`zoom: 12`）。 |

### 4. 核心互動體驗規格

- **雙向高亮聯動**：
  - 滑鼠移入側欄卡片 → 地圖上對應的租金膠囊標記高亮放大並置頂。
  - 點擊地圖標記 → 開啟 Popup，並讓側欄列表自動 `scrollIntoView` 且高亮對應卡片。
  - 點擊 Popup 內的「查看詳情」→ 直接呼叫 `onSelect(asset)` 開啟既有的 `CardDetailModal`。
- **搜尋此地圖區域（Bounds Search）**：
  - 使用者拖曳或縮放地圖後，於地圖上方中央顯示浮動按鈕「搜尋此地圖區域」（與「重設地圖範圍」），點擊後以當前地圖 `getBounds()` 的 `north/south/east/west` 呼叫 `getPublicVacantAssetsApi`。
  - 避免在每次 `moveend` 未經防抖就直接打 API，減少後端負載與畫面閃爍。
- **縣市篩選自動定位**：
  - 當使用者於 `Filter` 選擇特定 `city`（如「台北市」）時，先清除舊的地圖邊界限制（避免原本停在高雄的 bounds 把台北物件全濾掉），並讓地圖自動 `flyTo` 至該縣市中心。

## 分階段實作建議順序

1. **階段一（資料與後端）**：擴充 `PropertyStatusAssets` schema（`lat`/`lng`）、建立 `geocode.js` 工具、更新 controller 驗證與 `listPublicVacantAssets` 邊界查詢，並補齊測試用空置物件座標。
2. **階段二（套件與獨立頁基礎架構）**：安裝 `leaflet` 與 `react-leaflet@^4.2.1`，於 `App.jsx` 註冊公開路由 `/map`（`React.lazy`），建立 `MapSearchPage`、`MapFilterBar` 與 `Header.jsx`／`Filter.jsx` 雙模式入口，確認標準 OpenStreetMap 底圖、租金膠囊標記與 `CardDetailModal` 正常顯示。
3. **階段三（進階互動與優化）**：加入 `react-leaflet-cluster` 聚合、列表與地圖雙向聯動、縣市 `flyTo`、「搜尋此地圖區域」按鈕、`/` 與 `/map` 透過 URL query 帶條件切換、未定位物件提示與行動版 RWD 切換。

## 驗收與測試

1. **套件與建置檢查**：
   - 執行 `npm --prefix frontend run build` 確認 React 18 與 `react-leaflet@4`、Leaflet CSS 與 `/map` lazy chunk 打包無型別或模組錯誤。
   - 執行 `node -c backend/controllers/propertyStatusAssets.controller.js` 與 `node -c backend/models/PropertyStatusAssets.js` 確認後端語法正確。
2. **公開路由與隱私檢查**：
   - 未登入狀態直接開啟 `/map` 不會被導向 `/login`。
   - 未登入狀態呼叫 `GET /api/property-status-assets/public/vacant?north=25.2&south=24.9&east=121.7&west=121.4`，應回傳 `200`，只包含該範圍內的 `vacant` 物件且含 `lat`/`lng`，不含任何承租人個資。
3. **地圖互動與異常防護**：
   - 從 `/` 帶篩選條件切換至 `/map`（與返回 `/`）、切換縣市、套用租金與房型篩選、點擊租金標記開啟詳情彈窗，均須流暢無 console error。
   - 資料庫中存在 `lat: null, lng: null` 的物件時，地圖頁不會崩潰且會顯示未定位提示。
