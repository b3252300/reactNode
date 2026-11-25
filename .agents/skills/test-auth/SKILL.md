---
name: test-auth
description: 本指南用瀏覽器與 `curl` 驗收 React 登入頁及 Express 驗證 API。專案目前沒有設定自動化測試框架，因此以下測試需手動執行
---

## 執行與授權

- 執行本機命令、啟動或停止服務、開啟瀏覽器、呼叫 API，或清理測試檔案前，先確認使用者已授權該操作，並遵守工具顯示的確認流程。
- 若使用者或工具拒絕操作，立即停止該操作；不得改用其他工具或命令重試、繞過授權，或聲稱測試已執行。改提供使用者可自行操作的步驟。
- 只在使用者確認為本機或專用測試環境後，才執行會改變資料、建立 Cookie、登出或消耗登入額度的測試。
- 登入測試只使用使用者提供或確認的測試帳號；不得讀取、輸出或記錄 `.env` 機密、密碼、Cookie 或 token。
- 錯誤帳密與登入頻率限制測試會影響帳號或來源的後續登入，除非使用者明確要求且確認為專用測試環境，否則標記為未測。
- 測試後只清理本指南建立的指定暫存檔；若清理操作遭拒，告知使用者檔案位置，不得嘗試其他刪除方式。


# 測試前準備

1. 啟動 MongoDB，並確認 `backend/.env` 已依 `backend/.env.example` 設定。
2. 在第一個終端機啟動後端：

   ```bash
   cd backend
   npm run dev
   ```

3. 在第二個終端機啟動前端：

   ```bash
   cd frontend
   npm run dev
   ```

4. 瀏覽器開啟 `http://localhost:5173`。準備一組已註冊的測試帳號；若尚無帳號，先到 `/register` 建立。註冊密碼至少 8 個字元。
5. 僅使用測試帳號與測試密碼；不要在共用或正式環境測試錯誤密碼或登入頻率限制。

## 瀏覽器測試

| 編號 | 情境 | 操作 | 預期結果 |
|---|---|---|---|
| L-01 | 登入頁顯示 | 開啟 `http://localhost:5173/login` | 顯示電子郵件、密碼欄位與「登入」按鈕，欄位標籤正確對應輸入框。 |
| L-02 | 必填欄位驗證 | 不填資料直接按「登入」 | 瀏覽器阻止送出，提示必填欄位需填寫。 |
| L-03 | 電子郵件格式驗證 | 輸入格式錯誤的電子郵件並送出 | 瀏覽器阻止送出，不會成功登入。 |
| L-04 | 登入成功 | 輸入已註冊帳號與正確密碼後送出 | 送出期間按鈕顯示「登入中…」且不可重複送出；成功後導向首頁。 |
| L-05 | 返回原受保護頁面 | 登出後直接開啟 `http://localhost:5173/members`，再登入 | 未登入時導向登入頁；登入成功後返回 `/members`。 |
| L-06 | 錯誤帳密 | 使用錯誤密碼登入；再以不存在的電子郵件登入 | 兩種情況都停留在登入頁並顯示「帳號或密碼錯誤」，不可透露帳號是否存在。 |
| L-07 | 登入服務無法連線 | 停止後端後送出登入表單 | 顯示連線或登入失敗提示，不得顯示登入成功；恢復後端可重新操作。 |
| L-08 | 登入狀態保留 | 登入成功後重新整理頁面 | 前端以 `/api/auth/me` 還原登入者狀態，不應被錯誤導回登入頁。 |
| L-09 | 登出 | 登入後使用應用程式的登出功能 | 前端回到未登入狀態；重新開啟 `/members` 時被導向登入頁。 |

### 檢查瀏覽器 Cookie 與回應

完成 L-04 後，在瀏覽器開發者工具的「應用程式 / 儲存空間 → Cookie」檢查目前網站：

- 有 `access_token` 與 `refresh_token` 兩個 Cookie。
- 兩者都標示 `HttpOnly`，前端 JavaScript 無法直接讀取。
- `SameSite` 符合環境設定；正式環境的 Cookie 應標示 `Secure`。
- 登入 API 的使用者資料只含公開欄位（例如 `id`、`email`、`name`），不含密碼、`passwordHash` 或 token。

## API 測試（curl）

以下命令使用 `http://localhost:4000` 直接呼叫 API。將電子郵件及密碼換成已註冊的測試帳號；密碼只在本機測試，不要貼到公開 issue、紀錄或共用終端機。

### A. 正確帳密登入

```bash
curl -i -c /tmp/react-node-auth-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"ReplaceWithTestPassword"}' \
  http://localhost:4000/api/auth/login
```

預期：

- HTTP 狀態碼為 `200`。
- JSON 回應的 `user` 只包含公開欄位，不含密碼、`passwordHash` 或 token。
- `Set-Cookie` 設定 `access_token` 和 `refresh_token`，且包含 `HttpOnly`、`SameSite`；正式環境也須有 `Secure`。

### B. 使用登入 Cookie 查詢目前使用者

```bash
curl -i -b /tmp/react-node-auth-cookies.txt \
  http://localhost:4000/api/auth/me
```

預期 HTTP 狀態碼為 `200`；回應中的 `user` 是目前登入者的公開資料，不含密碼或 token。

### C. 查詢受保護的會員清單

```bash
curl -i -b /tmp/react-node-auth-cookies.txt \
  http://localhost:4000/api/auth/users
```

預期 HTTP 狀態碼為 `200`，回應包含 `users` 陣列；每筆資料只包含 `id`、`name`、`email`、`createdAt` 等公開欄位，不含密碼或 token。

### D. 錯誤帳密與錯誤輸入

使用已存在帳號但輸入錯誤密碼：

```bash
curl -i \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"WrongTestPassword"}' \
  http://localhost:4000/api/auth/login
```

預期 HTTP 狀態碼為 `401`，訊息為「帳號或密碼錯誤」。再將電子郵件改成不存在的地址重試，狀態碼與訊息應相同。

輸入格式錯誤的資料：

```bash
curl -i \
  -H 'Content-Type: application/json' \
  -d '{"email":"not-an-email","password":""}' \
  http://localhost:4000/api/auth/login
```

預期 HTTP 狀態碼為 `400`，訊息為「輸入格式錯誤」。

### E. 未登入時查詢受保護 API

不帶 Cookie 查詢目前使用者：

```bash
curl -i http://localhost:4000/api/auth/me
```

預期 HTTP 狀態碼為 `401`。同樣地，不帶 Cookie 呼叫會員清單也應回傳 `401`：

```bash
curl -i http://localhost:4000/api/auth/users
```

### F. 登出並確認 Cookie 失效

沿用 A 建立的 Cookie jar：

```bash
curl -i -X POST \
  -b /tmp/react-node-auth-cookies.txt \
  -c /tmp/react-node-auth-cookies.txt \
  http://localhost:4000/api/auth/logout
```

預期 HTTP 狀態碼為 `204`，回應清除登入 Cookie，且後端撤銷 refresh token。再次執行 B，預期為 `401`。

完成測試後，刪除本機 Cookie jar：

```bash
rm /tmp/react-node-auth-cookies.txt
```

## 登入頻率限制測試

後端限制同一來源在 15 分鐘內最多登入 10 次。此測試會影響該來源後續登入，**僅在本機或專用測試環境執行**，不要在正式環境執行。

1. 以錯誤密碼連續呼叫登入 API，直到超過 10 次。
2. 預期被限制的請求回傳 HTTP `429`，訊息為「嘗試次數過多，請稍後再試」。
3. 等待 15 分鐘，或依測試環境的速率限制設定重置，再確認正確帳密可正常登入。

## 測試紀錄

| 測試項目 | 結果（通過 / 失敗 / 未測） | 備註 |
|---|---|---|
| 瀏覽器 L-01 至 L-03 |  |  |
| 瀏覽器 L-04 至 L-06 |  |  |
| 瀏覽器 L-07 至 L-09 |  |  |
| Cookie 與回應欄位 |  |  |
| API A 至 C |  |  |
| API D 至 F |  |  |
| 登入頻率限制 |  |  |

## 測試結果回報
測試完後要條列式測試哪些，測試過就打勾。