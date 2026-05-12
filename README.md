# Kaiyn Announce Bot

最小可用的 Discord 彩色 Embed 公告與中文驗證機器人。

## 執行環境

- Node.js v24 LTS
- npm

## 功能

- Slash command：`/announce`
- Slash command：`/setup-verify`
- 管理員可透過 Modal 多行輸入框發送彩色 Embed 公告
- 管理員可發送中文驗證面板，讓新成員點擊按鈕取得 Verified 身分組
- 支援標題、內容、顏色、footer、大圖、縮圖、時間戳
- 不使用資料庫
- 不需要 CAPTCHA、防小號、反 VPN、付款或會員系統
- 不需要 Docker
- 可部署到 VPS / Railway / Render

## 檔案結構

```txt
kaiyn-announce-bot/
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── index.ts
    ├── deploy-commands.ts
    ├── commands/
    │   ├── announce.ts
    │   └── setup-verify.ts
    ├── types/
    │   ├── command.ts
    │   └── discord.d.ts
    └── utils/
        └── color.ts
```

## 建立 Discord App / Bot

1. 前往 Discord Developer Portal：
   https://discord.com/developers/applications
2. 點擊 `New Application` 建立應用程式。
3. 進入左側 `Bot` 頁面，點擊 `Add Bot`。
4. 在 `Bot` 頁面取得 Bot Token。

請不要把 `DISCORD_TOKEN` commit 到 GitHub。

## 取得 CLIENT_ID

1. 進入 Discord Developer Portal 的應用程式。
2. 打開 `OAuth2` 頁面。
3. 複製 `Client ID`。

## 取得 GUILD_ID

1. Discord 開啟 Developer Mode：
   `User Settings` → `Advanced` → `Developer Mode`
2. 對你的伺服器點右鍵。
3. 點擊 `Copy Server ID`。

## 邀請 Bot

需要的 scopes：

- `bot`
- `applications.commands`

需要的 permissions：

- `View Channels`
- `Send Messages`
- `Embed Links`
- `Manage Roles`
- `Use Slash Commands`

Invite URL 範例：

```txt
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2415938560&scope=bot+applications.commands
```

請把 `YOUR_CLIENT_ID` 換成你的 Client ID。

驗證功能需要 Bot 的最高身分組高於要發放的 Verified 身分組。請在 Discord 伺服器設定的 `Roles` 頁面，把 Bot 身分組拖到 Verified 身分組上方。

## 安裝

請先確認使用 Node.js v24 LTS：

```bash
node -v
```

```bash
npm install
```

## 建立 .env

```bash
cp .env.example .env
```

填入：

```env
DISCORD_TOKEN=你的 Bot Token
CLIENT_ID=你的 Client ID
GUILD_ID=你的測試伺服器 ID
```

## 註冊 Slash Command

Guild slash command 通常會很快生效：

```bash
npm run deploy
```

## 啟動 Bot

正式啟動前先編譯 TypeScript：

```bash
npm run build
```

```bash
npm start
```

開發時可使用：

```bash
npm run dev
```

只檢查 TypeScript 型別、不輸出 `dist/`：

```bash
npm run typecheck
```

執行單元測試前先編譯：

```bash
npm run build
npm test
```

## `/announce` 使用範例

```txt
/announce channel:#announcements title:"Kaiyn Capital｜重要公告" color:"#2F80ED"
```

送出 `/announce` 後，Bot 會跳出 Modal 多行輸入框。請把公告內容貼到 `公告內容` 欄位中，可以保留換行與空行。

公告內容範例：

```txt
Kaiyn Capital 慨影资本社区与 Bitget/Binance 交易所已建立深度合作关系，以群组邀请码注册任一交易所即可加入策略群，并根据不同交易额/入金金额享有多款社区自研 TradingView 指标使用权。

请使用以下连结注册交易所，并入金 200USDT 以上即可进群。

Bitget：https://kaiyn.org/bitget 邀请码：5nmb

Binance：https://kaiyn.org/binance 邀请码：148898758
```

色碼也可以省略 `#`，例如 `2F80ED`。

## `/setup-verify` 使用範例

```txt
/setup-verify channel:#verify role:@Verified
```

完整自訂範例：

```txt
/setup-verify channel:#verify role:@Verified title:"Kaiyn Capital｜社群驗證" color:"#2F80ED" image:"https://example.com/verify.png" button_label:"✅ 完成驗證"
```

送出 `/setup-verify` 後，Bot 會跳出 Modal 多行輸入框。請把驗證面板內容貼到 `驗證面板內容` 欄位中，可以保留換行與空行。

參數：

- `channel`：要發送驗證面板的文字頻道，必填。
- `role`：驗證成功後要給予的身分組，必填。
- `title`：驗證面板標題，選填，預設 `Kaiyn Capital｜社群驗證`。
- `color`：Embed 顏色，選填，預設 `#2F80ED`。支援 `#2F80ED` 或 `2F80ED`。
- `image`：驗證面板大圖 URL，選填。
- `button_label`：按鈕文字，選填，預設 `✅ 完成驗證`。

權限規則：

- 只有 `Administrator` 或 `Manage Guild` 權限的成員可以使用 `/setup-verify`。
- 沒有權限時會收到 ephemeral message：`你沒有權限使用此指令。`
- Bot 需要 `Manage Roles`、`Send Messages`、`Embed Links`。
- Bot 在目標頻道也需要 `View Channels`。
- Bot 的最高身分組必須高於要發放的 Verified 身分組。

驗證流程：

1. 管理員執行 `/setup-verify`。
2. Bot 跳出 Modal 多行輸入框。
3. 管理員輸入驗證面板內容並送出。
4. Bot 在指定頻道發送中文 Embed 驗證面板。
5. 新成員點擊綠色驗證按鈕。
6. 如果已經有該身分組，Bot 回覆 ephemeral：`你已經完成驗證。`
7. 如果尚未驗證，Bot 發放身分組並回覆 ephemeral：`✅ 驗證成功，你現在可以查看社群頻道。`
8. 如果發放失敗，Bot 回覆 ephemeral：`驗證失敗，請聯絡管理員。`

## 測試方式

1. 邀請 Bot 到測試伺服器。
2. 確認 Bot 具有：
   - View Channels
   - Send Messages
   - Embed Links
   - Manage Roles
   - Use Slash Commands
3. 確認 Bot 的最高身分組高於 Verified 身分組。
4. 執行：

```bash
npm run deploy
npm start
```

5. 在 Discord 輸入 `/announce`，確認公告功能仍可使用。
6. 在 Discord 輸入 `/setup-verify channel:#verify role:@Verified`。
7. 在 Modal 多行輸入框填入驗證面板內容並送出。
8. 確認指定頻道出現中文 Embed 驗證面板與綠色按鈕。
9. 用沒有 Verified 身分組的帳號點擊按鈕，應收到：

```txt
✅ 驗證成功，你現在可以查看社群頻道。
```

10. 再次點擊按鈕，應收到：

```txt
你已經完成驗證。
```

11. 若色碼錯誤，例如 `blue`，應收到：

```txt
色碼格式錯誤，請使用 #RRGGBB，例如 #2F80ED。
```

12. 若使用者沒有 `/announce` 權限，應收到：

```txt
你沒有權限使用此指令。
```

13. 若使用者沒有 `/setup-verify` 權限，應收到：

```txt
你沒有權限使用此指令。
```

14. 若 Bot 缺少頻道權限、`Manage Roles`，或 Bot 身分組排序低於 Verified 身分組，應收到清楚的錯誤原因。

## 更新 Slash Command

如果你修改了 slash command 的參數，請重新執行：

```bash
npm run deploy
```

## 部署提醒

- Node.js 版本需為 20+
- 不要把 `.env` commit 到 GitHub
- `.gitignore` 已忽略 `.env` 與 `node_modules/`
- Railway / Render / VPS 上請用環境變數設定：
  - `DISCORD_TOKEN`
  - `CLIENT_ID`
  - `GUILD_ID`
