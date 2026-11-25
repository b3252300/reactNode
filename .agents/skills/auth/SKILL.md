---
name: auth
description: 在 React + Node.js (Express) 全端專案中實作註冊、登入、登出、會員清單與驗證流程 (registration / login / logout / member list / authentication)。專用開發登入、登出、註冊、會員列表、JWT、cookie、session、token、refresh token、受保護路由 (protected route)、使用者驗證、auth middleware,或要在 React 與 Node 專案加入帳號系統與會員管理,即使沒有明說「skill」也要使用。也適用於審查或修正既有的驗證程式碼。
---

# React + Node 帳號註冊、登入、會員清單與驗證 Skill

這個 skill 規範如何在 React 前端與 Node.js (Express) 後端實作安全的註冊、登入、登出與會員清單查詢。
目標是產出「能直接用在專案裡」且「安全預設值正確」的程式碼,而不是只能跑的範例。

## 溝通方式

使用者的母語是繁體中文,且不容易記住英文技術名詞。所以:
- 用繁體中文回覆
- 第一次出現的英文術語,附上簡短中文解釋(例如:`httpOnly cookie`,JavaScript 讀不到的 cookie,可防 XSS 偷 token)
- 每一行都要有完整的備註說明
- 每次新增或修改程式碼,都要在檔案、模組、元件或主要函式旁加上繁體中文註解,說明它的用途;安全性或非直覺的實作另外簡短說明原因,不要逐行寫無意義註解

## 預設架構(使用者沒有指定時採用)

| 項目 | 選擇 | 原因 |
|---|---|---|
| 驗證方式 | JWT access token + refresh token | 前後端分離的 React + Node 最常見 |
| token 存放 | **httpOnly cookie**,不放 localStorage | localStorage 可被 XSS 攻擊讀走,httpOnly cookie 讀不到 |
| access token 效期 | 15 分鐘 | 被偷了也很快失效 |
| refresh token 效期 | 7 天,存在資料庫(只存雜湊值),每次使用就換發新的 (rotation) | 登出時可以真正讓它失效 |
| 密碼雜湊 | bcrypt(cost 12) | 業界標準,內建 salt |
| 輸入驗證 | zod | 型別明確,錯誤訊息好處理 |

如果使用者明確要求 session 或其他方案,照使用者的要求,並說明取捨,不要硬套預設。
實作前先確認:資料庫用什麼(MongoDB / PostgreSQL / MySQL)?前後端是否同網域?沒有答案就先假設並在回覆中寫明假設。

## 工作流程

1. **確認現況**:看專案有沒有既有的 auth 程式、資料庫、前端路由套件,沿用既有慣例
2. **後端**:依 `references/node-backend.md` 實作 register / login / logout / refresh / me 端點與 `requireAuth` middleware;若需求包含會員清單,額外增加 `GET /api/users` 或 `GET /api/members` 端點,只返回必要欄位
3. **前端**:依 `references/react-frontend.md` 實作 AuthContext、axios 設定、註冊頁、登入頁、ProtectedRoute;若要顯示會員清單,再增加內建的 MembersPage 或 MemberTable,並用 `withCredentials: true` 調用受保護 API
4. **安全檢查**:最後對照下方「安全檢查清單」逐項確認,特別確認會員清單不含 password hash、密碼明文與敏感 token
5. **說明如何測試**:給出 curl 或瀏覽器操作步驟;註冊至少測試成功、格式錯誤、重複電子郵件、頻率限制、登入 cookie 與回應未包含密碼;會員清單至少測試未登入 401、已登入可取得列表、且列表只包含公開欄位

## 不可妥協的安全規則

這些規則的理由都和「被攻擊時損失多大」有關,所以不要為了方便省略:

- 密碼只存雜湊值,絕不存明文,也絕不寫進 log
- 註冊輸入要經過驗證,密碼只以 bcrypt 雜湊後寫入資料庫;不可直接信任前端驗證
- 註冊端點要限制請求頻率,並安全處理已存在的電子郵件,不可回傳資料庫錯誤或敏感資訊
- 登入失敗一律回覆同樣的訊息(「帳號或密碼錯誤」),不要區分「帳號不存在」或「密碼錯誤」,否則攻擊者能探測哪些帳號存在
- 帳號不存在時也要執行一次 bcrypt 比對,避免從回應時間判斷帳號是否存在
- Cookie 必須設 `httpOnly`;正式環境必須設 `secure`(只走 HTTPS);設 `sameSite`
- 登入端點要加 rate limiting(限制嘗試次數),防暴力破解
- 密鑰(JWT secret)從環境變數讀取,不寫死在程式碼,也不提交到 Git
- 登出必須:清除 cookie **並且**讓資料庫中的 refresh token 失效。只刪前端狀態不算登出
- 會員清單 API 只回傳必要欄位,不得返回 `passwordHash`、明文密碼、重設 token、session 資訊或其他敏感資料
- CORS 的 `origin` 要寫明確網址,搭配 `credentials: true` 時不能用 `*`

## 安全檢查清單

完成後逐項檢查並回報結果:
- [ ] 註冊輸入由 zod 驗證,伺服器端檢查電子郵件與密碼
- [ ] 註冊密碼經 bcrypt 雜湊後才存入資料庫,沒有記錄明文密碼
- [ ] register 有 rate limit,且電子郵件唯一性由資料庫約束保證
- [ ] 密碼用 bcrypt 雜湊
- [ ] token 在 httpOnly cookie,前端程式碼完全碰不到 token
- [ ] 登入錯誤訊息統一
- [ ] login 有 rate limit
- [ ] 登出會撤銷 refresh token
- [ ] 會員清單 API 只回傳必要欄位,不含 `passwordHash`、明文密碼或敏感 token
- [ ] `.env` 在 `.gitignore`,且有提供 `.env.example`
- [ ] CORS 與 cookie 設定在開發與正式環境都正確
- [ ] 受保護的 API 都掛了 `requireAuth`
- [ ] 輸入有用 zod 驗證

## 會員清單擴充

當使用者要求「新增會員清單」或「member list」時,這個 skill 應該補上以下預設行為:

- 後端新增 `GET /api/users` 或 `GET /api/members` API
- 只要登入者通過 `requireAuth`,就能取列表
- 若專案有角色權限管理,可額外要求 `admin` 或 `manager` 才能查看全部會員
- 回傳資料只含公開欄位,例如 `id`, `name`, `email`, `createdAt`
- 不回傳 `passwordHash`, `password`, refresh token, session token 或其他敏感欄位
- 前端用 `useEffect` 讀取列表後渲染表格或卡片,並在未登入時導向登入頁

範例資料回應:

```json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@example.com", "createdAt": "2026-11-11T08:00:00.000Z" }
  ]
}
```

若專案沒有權限模式,預設保持簡單:「已登入使用者可查看公開會員列表」,避免過度設計造成後續維護負擔。

## 常見問題(除錯時先看這裡)

- **登入成功但之後請求都 401**:前端 axios 沒設 `withCredentials: true`,或後端 CORS 沒開 `credentials: true`
- **cookie 沒被瀏覽器存下來**:前後端不同網域時,`sameSite` 與 `secure` 設定不匹配;本機開發建議用 Vite proxy 讓兩者同源
- **重新整理頁面就被登出**:AuthContext 在載入時沒有呼叫 `/api/auth/me` 恢復登入狀態
- **refresh 後無限迴圈**:axios 攔截器沒有排除 `/auth/refresh` 本身,或沒有限制只重試一次
- **會員清單為空或 403**:列表 API 沒有掛 `requireAuth`,或路由的 `protect` / `requireAuth` 沒套上,也可能是前端沒有帶 cookie 或後端漏掉 `credentials: true`
- **會員資料中出現密碼欄位**:後端序列化時直接回傳整個 User model,應該只選 `id`, `name`, `email`, `createdAt` 等公開欄位

## 範例

**輸入**:「幫我加註冊和登入功能」
**做法**:先簡短說明採用的預設架構與假設,再依序提供後端註冊/登入流程、前端註冊/登入頁,程式碼附上繁體中文用途註解,最後附安全檢查清單與測試步驟。

**輸入**:「幫我加會員清單」
**做法**:先確認是否需要登入才可查看,接著實作受保護的 `GET /api/users` 端點,只回傳 `id`、`name`、`email`、`createdAt` 等公開欄位,前端再以表格或卡片呈現,並在每筆資料上避免顯示敏感資訊。

**輸入**:「我的登入一直 401」
**做法**:不重寫整套,先依「常見問題」逐項排查,請使用者貼出 axios 設定、CORS 設定、瀏覽器 Network 面板的 Set-Cookie 標頭。
