# Kaiyn Announce Bot

最小可用的 Discord 彩色 Embed 公告機器人。

## 功能

- Slash command：`/announce`
- 管理員可透過 Modal 多行輸入框發送彩色 Embed 公告
- 支援標題、內容、顏色、footer、大圖、縮圖、時間戳
- 不使用資料庫
- 不需要 Docker
- 可部署到 VPS / Railway / Render

## 檔案結構

```txt
kaiyn-announce-bot/
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── index.js
    ├── deploy-commands.js
    ├── commands/
    │   └── announce.js
    └── utils/
        └── color.js
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
- `Use Slash Commands`

Invite URL 範例：

```txt
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147503104&scope=bot+applications.commands
```

請把 `YOUR_CLIENT_ID` 換成你的 Client ID。

## 安裝

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

```bash
npm start
```

開發時可使用：

```bash
npm run dev
```

## Slash Command 使用範例

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

## 測試方式

1. 邀請 Bot 到測試伺服器。
2. 確認 Bot 具有：
   - View Channels
   - Send Messages
   - Embed Links
   - Use Slash Commands
3. 執行：

```bash
npm run deploy
npm start
```

4. 在 Discord 輸入 `/announce`。
5. 選擇公告頻道，填入 title、color 等短參數。
6. 送出後，在 Modal 多行輸入框貼上公告內容。
7. 按下 Modal 的送出按鈕。
8. 成功後應收到 ephemeral 回覆：

```txt
公告已發送到 #channel
```

9. 若色碼錯誤，例如 `blue`，應收到：

```txt
色碼格式錯誤，請使用 #RRGGBB，例如 #2F80ED。
```

10. 若使用者沒有 `Manage Messages` 或 `Administrator` 權限，應收到：

```txt
你沒有權限使用此指令。
```

## 更新 Slash Command

如果你修改了 `/announce` 的參數，例如本專案從 `description` 參數改成 Modal 多行輸入框，請重新執行：

```bash
npm run deploy
```

## 部署提醒

- Node.js 版本需為 20+
- 不要把 `.env` commit 到 GitHub
- Railway / Render / VPS 上請用環境變數設定：
  - `DISCORD_TOKEN`
  - `CLIENT_ID`
  - `GUILD_ID`
