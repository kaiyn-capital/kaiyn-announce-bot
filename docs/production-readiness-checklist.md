# Production Readiness Checklist

本文件整理 Kaiyn Announce Bot 上線前與營運期間需要確認的項目，涵蓋 runtime、環境變數、建置流程、權限設定、穩定性與部署策略。

## Runtime and Build

- Node.js 版本需符合 `package.json` 中的 `engines.node`：`>=24 <25`。
- 使用 `npm ci` 進行乾淨安裝，確保依賴版本與 `package-lock.json` 一致。
- 使用 `npm run build` 編譯 TypeScript 並產生 `dist/`。
- 啟動前確認 `dist/index.js` 已存在。
- `dist/` 應由部署環境產生，不提交至版本控制。

建議 production build 流程：

```bash
npm ci
npm run build
```

建議 production start command：

```bash
npm start
```

## Quality Gates

上線前應完成下列檢查：

- `npm run typecheck`：確認 TypeScript 型別正確。
- `npm run build`：確認專案可正常編譯。
- `npm test`：執行單元測試。
- GitHub Actions CI：確認 push / pull request 時會執行 install、typecheck、build 與 test。

建議本機驗證流程：

```bash
npm run typecheck
npm run build
npm test
```

## Environment Variables

production 環境需設定：

```env
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
```

檢查項目：

- `DISCORD_TOKEN` 對應正確的 Discord Bot。
- `CLIENT_ID` 對應同一個 Discord Application。
- `GUILD_ID` 對應目標 Discord server。
- 測試環境與 production 環境使用不同設定時，需避免混用。
- secrets 僅存放於 `.env` 或部署平台 variables，不寫入 git、README 或 logs。

## Discord Permissions

Bot 邀請時需包含下列 scopes：

- `bot`
- `applications.commands`

Bot 在目標頻道需具備：

- `View Channels`
- `Send Messages`
- `Embed Links`

驗證功能額外需要：

- `Manage Roles`
- Bot 的最高身分組高於要發放的驗證身分組。
- 驗證身分組不是 `@everyone`。
- 驗證身分組不是 Discord 或整合服務管理的 managed role。

管理指令權限：

- `/announce`：使用者需具備 `Manage Messages` 或 `Administrator`。
- `/setup-verify`：使用者需具備 `Manage Guild` 或 `Administrator`。

## Slash Command Deployment

Slash command definition 有變更時，需重新註冊 guild commands：

```bash
npm run deploy
```

適合重新註冊的情境：

- 新增 command。
- 移除 command。
- 修改 command 名稱、參數、必填狀態或描述。

Runtime service 的 start command 應維持為：

```bash
npm start
```

command registration 與 service startup 分離，有助於降低部署過程中的副作用。

## Railway Configuration

Railway service 建議設定：

- Environment：`production`
- Build command：`npm run build`
- Start command：`npm start`
- Deploy branch：`main`
- GitHub autodeploy：enabled
- Wait for CI：enabled
- Restart policy：`Always`
- Service variables：`DISCORD_TOKEN`、`CLIENT_ID`、`GUILD_ID`

部署細節請參考：

- [railway-deployment.md](railway-deployment.md)

## Operational Readiness

上線後需確認部署平台支援：

- 長時間常駐 Node.js process。
- process crash 後自動重啟。
- 平台重啟或重新部署後自動啟動 service。
- stdout / stderr logs 檢視。
- 最近錯誤 log 保留。
- 不因 idle 狀態導致 Bot 離線。

Runtime logs 應能協助追查：

- Discord login failure。
- slash command interaction error。
- channel permission error。
- role hierarchy error。
- missing environment variable。
- graceful shutdown。

## Release Checklist

上線或重大更新前確認：

- CI 全部通過。
- production variables 已設定且對應正確 Discord App / Guild。
- `npm run deploy` 已在 command definition 變更後執行。
- Railway 使用正確 branch 部署。
- deployment logs 顯示 Bot 成功登入。
- Discord 伺服器中可看到 Bot online。
- `/announce` 可成功送出測試公告。
- `/setup-verify` 可成功建立驗證面板。
- 測試帳號可透過驗證按鈕取得指定身分組。

## Maintenance Notes

- 新增或修改 Discord interaction 時，建議同步補上可測試的 pure logic。
- 權限相關邏輯應保留明確錯誤訊息，方便部署後排查 Discord 設定問題。
- 當功能規模擴大或 log 查詢需求增加時，可評估導入 structured logging。
